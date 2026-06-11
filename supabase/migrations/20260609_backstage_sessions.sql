-- KeyLock: backstage session table
-- The entry timestamp (millisecond precision) is the cipher seed.
-- Nobody can brute-force the exact moment someone walked through the door.

CREATE TABLE IF NOT EXISTS backstage_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL UNIQUE,
  nonce       TEXT NOT NULL,
  entered_at  TIMESTAMPTZ NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_backstage_sessions_key ON backstage_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_backstage_sessions_user ON backstage_sessions(user_id);

-- RLS: users can only see their own sessions
ALTER TABLE backstage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON backstage_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Auto-cleanup: delete expired sessions older than 24h
-- Run this as a Supabase cron or pg_cron job:
-- SELECT cron.schedule('cleanup-backstage-sessions', '0 * * * *',
--   $$DELETE FROM backstage_sessions WHERE expires_at < now() - interval '24 hours'$$);
