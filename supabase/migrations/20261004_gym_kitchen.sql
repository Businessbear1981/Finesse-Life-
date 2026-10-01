-- Finesse — The Gym (26) and The Kitchen (27): member-owned logs.
-- Health data is member-only, deletable, and never shared without explicit consent.
-- The Kitchen keeps plan → cart → order intent → authorized → fulfilled distinct.
-- Apply: SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261004_gym_kitchen.sql

CREATE TABLE IF NOT EXISTS public.gym_sets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise      TEXT NOT NULL CHECK (char_length(exercise) BETWEEN 1 AND 80),
  reps          INT  CHECK (reps IS NULL OR reps BETWEEN 0 AND 500),
  weight_kg     NUMERIC(6,2) CHECK (weight_kg IS NULL OR weight_kg BETWEEN 0 AND 1000),
  duration_s    INT  CHECK (duration_s IS NULL OR duration_s BETWEEN 0 AND 86400),
  rpe           NUMERIC(3,1) CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  rest_s        INT  CHECK (rest_s IS NULL OR rest_s BETWEEN 0 AND 3600),
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','healthkit','health_connect')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gym_sets_user_time ON public.gym_sets(user_id, performed_at DESC);
ALTER TABLE public.gym_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gym_sets_owner ON public.gym_sets;
CREATE POLICY gym_sets_owner ON public.gym_sets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.kitchen_plans (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,
  daily_kcal      INT CHECK (daily_kcal IS NULL OR daily_kcal BETWEEN 800 AND 6000),
  meals           JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{day, slot, name, kcal|null}]
  grocery_list    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{item, qty}]
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);
ALTER TABLE public.kitchen_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kitchen_plans_owner ON public.kitchen_plans;
CREATE POLICY kitchen_plans_owner ON public.kitchen_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- One order intent per week. Members can create (intent) and cancel; authorized /
-- fulfilled require a grocery partner receipt and the service role.
CREATE TABLE IF NOT EXISTS public.kitchen_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  items         JSONB NOT NULL,
  state         TEXT NOT NULL DEFAULT 'intent' CHECK (state IN ('intent','authorized','fulfilled','cancelled')),
  partner       TEXT,
  partner_ref   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kitchen_authorized_has_ref CHECK (state NOT IN ('authorized','fulfilled') OR partner_ref IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_user ON public.kitchen_orders(user_id, week_start DESC);
ALTER TABLE public.kitchen_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kitchen_orders_owner_read ON public.kitchen_orders;
CREATE POLICY kitchen_orders_owner_read ON public.kitchen_orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS kitchen_orders_owner_insert ON public.kitchen_orders;
CREATE POLICY kitchen_orders_owner_insert ON public.kitchen_orders FOR INSERT WITH CHECK (auth.uid() = user_id AND state = 'intent' AND partner_ref IS NULL);
DROP POLICY IF EXISTS kitchen_orders_owner_cancel ON public.kitchen_orders;
CREATE POLICY kitchen_orders_owner_cancel ON public.kitchen_orders FOR UPDATE
  USING (auth.uid() = user_id AND state = 'intent') WITH CHECK (auth.uid() = user_id AND state IN ('intent','cancelled'));

-- Camera → Closet: keep a reference to the private photo so the look never points at an expiring URL.
ALTER TABLE public.wardrobe_looks ADD COLUMN IF NOT EXISTS camera_item_id UUID REFERENCES public.camera_items(id) ON DELETE SET NULL;
