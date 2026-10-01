-- Scale — explicit pledge state machine (30-Sep-2026 reconciliation).
-- A pledge is NOT revenue and NEVER triggers a charge. Money only moves after the
-- goal is met AND a processor payment succeeds (Stripe webhook → paid).
--   pledged ─┬─> goal_met ──> payment_requested ──> paid ──> fulfilled
--            │                                       └────> refunded
--            ├─> cancelled (member, before payment_requested)
--   waitlisted (joined after goal met) ──> pledged when a slot frees
-- Apply: SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261003_scale_pledge_states.sql

ALTER TABLE public.scale_joins
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'pledged',
  ADD COLUMN IF NOT EXISTS state_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS payment_ref TEXT,
  ADD COLUMN IF NOT EXISTS track TEXT;

DO $$ BEGIN
  ALTER TABLE public.scale_joins ADD CONSTRAINT scale_joins_state_check
    CHECK (state IN ('pledged','waitlisted','goal_met','payment_requested','paid','fulfilled','refunded','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.scale_joins ADD CONSTRAINT scale_joins_paid_has_ref
    CHECK (state NOT IN ('paid','fulfilled','refunded') OR payment_ref IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Append-only history of every transition.
CREATE TABLE IF NOT EXISTS public.scale_join_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  join_id     UUID NOT NULL REFERENCES public.scale_joins(id) ON DELETE CASCADE,
  from_state  TEXT,
  to_state    TEXT NOT NULL,
  actor       TEXT NOT NULL,              -- member | system | processor | staff
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scale_join_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scale_join_events_owner_read ON public.scale_join_events;
CREATE POLICY scale_join_events_owner_read ON public.scale_join_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scale_joins j WHERE j.id = join_id AND j.user_id = auth.uid()));

-- Legal transitions only.
CREATE OR REPLACE FUNCTION public.scale_join_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state NOT IN ('pledged','waitlisted') THEN RAISE EXCEPTION 'new pledge must start pledged/waitlisted'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  ok := (OLD.state, NEW.state) IN (
    ('pledged','goal_met'), ('pledged','cancelled'),
    ('waitlisted','pledged'), ('waitlisted','cancelled'), ('waitlisted','goal_met'),
    ('goal_met','payment_requested'), ('goal_met','cancelled'),
    ('payment_requested','paid'), ('payment_requested','cancelled'),
    ('paid','fulfilled'), ('paid','refunded'), ('fulfilled','refunded'));
  IF NOT ok THEN RAISE EXCEPTION 'illegal scale transition % -> %', OLD.state, NEW.state; END IF;
  NEW.state_changed_at := now();
  INSERT INTO public.scale_join_events(join_id, from_state, to_state, actor)
    VALUES (NEW.id, OLD.state, NEW.state, coalesce(current_setting('finesse.actor', true), 'system'));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_scale_join_guard ON public.scale_joins;
CREATE TRIGGER trg_scale_join_guard BEFORE INSERT OR UPDATE ON public.scale_joins
  FOR EACH ROW EXECUTE FUNCTION public.scale_join_guard();

-- Members may cancel their own pledge before any payment request. Nothing else.
DROP POLICY IF EXISTS scale_joins_own_cancel ON public.scale_joins;
CREATE POLICY scale_joins_own_cancel ON public.scale_joins FOR UPDATE
  USING (user_id = auth.uid() AND state IN ('pledged','waitlisted','goal_met'))
  WITH CHECK (user_id = auth.uid() AND state = 'cancelled');

-- Count only live pledges; mark the group goal_met (NOT charged) when the goal is reached.
CREATE OR REPLACE FUNCTION public.increment_scale_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d RECORD;
BEGIN
  IF NEW.state <> 'pledged' THEN RETURN NEW; END IF;
  UPDATE public.scale_deals
     SET current_count = current_count + 1,
         status = CASE WHEN current_count + 1 >= goal_count THEN 'met' ELSE status END
   WHERE id = NEW.deal_id
   RETURNING * INTO d;
  IF d.status = 'met' THEN
    UPDATE public.scale_joins SET state = 'goal_met' WHERE deal_id = NEW.deal_id AND state = 'pledged';
  END IF;
  RETURN NEW;
END $$;

-- Free a slot on cancel; promote the earliest waitlisted member.
CREATE OR REPLACE FUNCTION public.scale_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nxt UUID; was_counted BOOLEAN;
BEGIN
  IF NEW.state = 'cancelled' AND OLD.state <> 'cancelled' THEN
    was_counted := OLD.state IN ('pledged','goal_met');
    IF was_counted THEN
      UPDATE public.scale_deals SET current_count = greatest(current_count - 1, 0) WHERE id = NEW.deal_id;
      SELECT id INTO nxt FROM public.scale_joins WHERE deal_id = NEW.deal_id AND state = 'waitlisted' ORDER BY joined_at LIMIT 1;
      IF nxt IS NOT NULL THEN
        UPDATE public.scale_joins SET state = CASE WHEN OLD.state = 'goal_met' THEN 'goal_met' ELSE 'pledged' END WHERE id = nxt;
        UPDATE public.scale_deals SET current_count = current_count + 1 WHERE id = NEW.deal_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_scale_on_cancel ON public.scale_joins;
CREATE TRIGGER trg_scale_on_cancel AFTER UPDATE ON public.scale_joins
  FOR EACH ROW EXECUTE FUNCTION public.scale_on_cancel();
