-- ─── Intelligence Engine Schema ───────────────────────────────────────────────
-- Phase 1: Behavioral signals, market intelligence, audit trail (EU AI Act)

-- ── Behavioral Signals ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intelligence_signals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         TEXT        NOT NULL,
  payload      JSONB       NOT NULL DEFAULT '{}',
  context      JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_isig_user        ON intelligence_signals (user_id);
CREATE INDEX IF NOT EXISTS idx_isig_kind        ON intelligence_signals (kind);
CREATE INDEX IF NOT EXISTS idx_isig_user_kind   ON intelligence_signals (user_id, kind);
CREATE INDEX IF NOT EXISTS idx_isig_created     ON intelligence_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_isig_payload_cat ON intelligence_signals USING GIN (payload jsonb_path_ops);

-- ── Audit Trail (EU AI Act — post-market monitoring) ──────────────────────────
CREATE TABLE IF NOT EXISTS intelligence_audit (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID          NOT NULL,
  intent               TEXT          NOT NULL,
  model_used           TEXT          NOT NULL,
  input_hash           TEXT          NOT NULL,
  output_summary       TEXT          NOT NULL,
  confidence           NUMERIC(4,3)  NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  risk_level           TEXT          NOT NULL CHECK (risk_level IN ('minimal','limited','high')),
  requires_human_review BOOLEAN      NOT NULL DEFAULT FALSE,
  reviewed_by          UUID,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iaudit_user    ON intelligence_audit (user_id);
CREATE INDEX IF NOT EXISTS idx_iaudit_intent  ON intelligence_audit (intent);
CREATE INDEX IF NOT EXISTS idx_iaudit_risk    ON intelligence_audit (risk_level);
CREATE INDEX IF NOT EXISTS idx_iaudit_review  ON intelligence_audit (requires_human_review) WHERE requires_human_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_iaudit_created ON intelligence_audit (created_at DESC);

-- ── Integration Health ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_health (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL UNIQUE,
  status       TEXT        NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy','degraded','down','unconfigured')),
  latency_ms   INTEGER,
  error_rate   NUMERIC(4,3) DEFAULT 0,
  last_checked TIMESTAMPTZ DEFAULT now(),
  metadata     JSONB       DEFAULT '{}'
);

-- ── Market Intelligence Cache ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_intelligence_cache (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key    TEXT        NOT NULL UNIQUE,
  data         JSONB       NOT NULL,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_mic_key     ON market_intelligence_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_mic_expires ON market_intelligence_cache (expires_at);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE intelligence_signals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_audit       ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_health       ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence_cache ENABLE ROW LEVEL SECURITY;

-- Members read their own signals (transparency / GDPR right of access)
CREATE POLICY "isig_own_read"  ON intelligence_signals FOR SELECT USING (auth.uid() = user_id);
-- Service role bypasses RLS for writes (no public insert policy)

-- Members read their own audit trail
CREATE POLICY "iaudit_own_read" ON intelligence_audit FOR SELECT USING (auth.uid() = user_id);

-- Integration health is publicly readable (dashboard)
CREATE POLICY "ihealth_public_read" ON integration_health FOR SELECT USING (TRUE);

-- Market cache is publicly readable
CREATE POLICY "mic_public_read" ON market_intelligence_cache FOR SELECT USING (TRUE);
