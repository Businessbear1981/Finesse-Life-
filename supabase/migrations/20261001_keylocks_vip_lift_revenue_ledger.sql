-- Finesse — two independent KeyLocks + append-only revenue ledger
-- Public entrance KeyLock and the Lobby VIP / Penthouse private lift use SEPARATE
-- challenges, sessions, rate limits and audit events. Tables are written ONLY by
-- the service role from API routes; RLS is enabled with no client policies
-- except members reading their own audit trail.
-- Apply: SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261001_keylocks_vip_lift_revenue_ledger.sql

-- ── Challenges (both locks) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS keylock_challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock          TEXT NOT NULL CHECK (lock IN ('entrance', 'vip_lift')),
  subject_hash  TEXT NOT NULL,              -- sha256(user_id) or sha256(ip+ua) — never raw
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nonce         TEXT NOT NULL,
  mode          TEXT NOT NULL DEFAULT 'verify' CHECK (mode IN ('verify', 'enroll')),
  attempts      INT  NOT NULL DEFAULT 0,
  max_attempts  INT  NOT NULL DEFAULT 5,
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_keylock_challenges_subject ON keylock_challenges(lock, subject_hash, created_at DESC);
ALTER TABLE keylock_challenges ENABLE ROW LEVEL SECURITY;

-- ── VIP private-lift PIN (member-chosen, scrypt hash only) ───────────────
CREATE TABLE IF NOT EXISTS vip_lift_pins (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash    TEXT NOT NULL,                -- scrypt$N$salt$hash
  set_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE vip_lift_pins ENABLE ROW LEVEL SECURITY;

-- ── VIP lift sessions (short-lived, cookie carries random token; DB stores hash) ─
CREATE TABLE IF NOT EXISTS vip_lift_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  destination  TEXT NOT NULL CHECK (destination IN ('vip-room', 'penthouse')),
  challenge_id UUID REFERENCES keylock_challenges(id) ON DELETE SET NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vip_lift_sessions_user ON vip_lift_sessions(user_id, expires_at DESC);
ALTER TABLE vip_lift_sessions ENABLE ROW LEVEL SECURITY;

-- ── Access audit trail ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_audit_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock         TEXT NOT NULL CHECK (lock IN ('entrance', 'vip_lift')),
  event_type   TEXT NOT NULL,              -- e.g. vip.keylock_challenge_started
  outcome      TEXT NOT NULL,              -- ok | invalid | expired | rate_limited | not_entitled | enrolled | locked
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_hash TEXT NOT NULL,
  challenge_id UUID,
  trace_id     TEXT NOT NULL,
  track        TEXT CHECK (track IN ('finesse', 'carpe_diem')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_audit_subject ON access_audit_events(lock, subject_hash, created_at DESC);
ALTER TABLE access_audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "member_reads_own_audit" ON access_audit_events;
CREATE POLICY "member_reads_own_audit" ON access_audit_events FOR SELECT USING (auth.uid() = user_id);

-- ── Append-only revenue / product event ledger ───────────────────────────
-- Views, recommendations and pledges are NOT revenue. Booked states require a
-- provider receipt; reversals reference the original row and never mutate it.
CREATE TABLE IF NOT EXISTS revenue_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type          TEXT NOT NULL,
  idempotency_key     TEXT NOT NULL UNIQUE,
  trace_id            TEXT NOT NULL,
  room_id             TEXT NOT NULL,
  track               TEXT CHECK (track IN ('finesse', 'carpe_diem')),
  member_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id            TEXT,
  provider_id         TEXT,
  provider_receipt_id TEXT,
  campaign_id         TEXT,
  click_id            TEXT,
  conversion_id       TEXT,
  amount_minor        BIGINT,
  currency            CHAR(3),
  state               TEXT NOT NULL CHECK (state IN ('impression','intent','outbound_click','quote','hold','authorized','confirmed','settled','reversed','refunded')),
  reverses_event_id   UUID REFERENCES revenue_events(id),
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booked_requires_receipt CHECK (
    state NOT IN ('confirmed','settled','reversed','refunded')
    OR (provider_id IS NOT NULL AND provider_receipt_id IS NOT NULL)
  ),
  CONSTRAINT unbooked_has_no_amount CHECK (
    state IN ('confirmed','settled','reversed','refunded') OR COALESCE(amount_minor, 0) = 0
  ),
  CONSTRAINT reversal_references_original CHECK (
    state NOT IN ('reversed','refunded') OR reverses_event_id IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_revenue_events_room ON revenue_events(room_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_member ON revenue_events(member_id, occurred_at DESC);
ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION revenue_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'revenue_events is append-only; write a reversal row instead';
END $$;
DROP TRIGGER IF EXISTS trg_revenue_events_append_only ON revenue_events;
CREATE TRIGGER trg_revenue_events_append_only BEFORE UPDATE OR DELETE ON revenue_events
  FOR EACH ROW EXECUTE FUNCTION revenue_events_append_only();

-- Housekeeping (schedule with pg_cron if available):
-- DELETE FROM keylock_challenges WHERE expires_at < now() - interval '1 day';
-- DELETE FROM vip_lift_sessions  WHERE expires_at < now() - interval '1 day';
