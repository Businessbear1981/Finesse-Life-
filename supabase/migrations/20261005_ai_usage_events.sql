-- Finesse — AI token usage ledger.
-- One row per model call (Nova, Stylist, Camera, Bernard, intelligence jobs).
-- Stores COUNTS and an estimated cost only — never prompts, completions, or images.
-- Writes come from the server (service role). Members may read their own rows;
-- admins read aggregates through /api/admin/ai-usage (service role after a role check).
-- Apply: SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261005_ai_usage_events.sql

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature             TEXT NOT NULL CHECK (feature ~ '^[a-z0-9_.:-]{1,64}$'),
  provider            TEXT NOT NULL DEFAULT 'anthropic' CHECK (char_length(provider) BETWEEN 1 AND 32),
  model               TEXT NOT NULL CHECK (char_length(model) BETWEEN 1 AND 96),
  input_tokens        INT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens       INT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cache_read_tokens   INT NOT NULL DEFAULT 0 CHECK (cache_read_tokens >= 0),
  cache_write_tokens  INT NOT NULL DEFAULT 0 CHECK (cache_write_tokens >= 0),
  total_tokens        INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  est_cost_micros     BIGINT NOT NULL DEFAULT 0 CHECK (est_cost_micros >= 0), -- USD * 1e6, estimate from list prices
  latency_ms          INT CHECK (latency_ms IS NULL OR latency_ms >= 0),
  ok                  BOOLEAN NOT NULL DEFAULT true,
  trace_id            TEXT CHECK (trace_id IS NULL OR char_length(trace_id) <= 64)
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_time    ON public.ai_usage_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user    ON public.ai_usage_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON public.ai_usage_events(feature, occurred_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events FORCE ROW LEVEL SECURITY;

-- Members: read-only, own rows. No member INSERT/UPDATE/DELETE policy exists, so the
-- ledger is append-only from the service role and cannot be forged or erased by clients.
DROP POLICY IF EXISTS ai_usage_owner_read ON public.ai_usage_events;
CREATE POLICY ai_usage_owner_read ON public.ai_usage_events FOR SELECT USING (auth.uid() = user_id);

REVOKE ALL ON public.ai_usage_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ai_usage_events FROM authenticated;
GRANT SELECT ON public.ai_usage_events TO authenticated;

-- Daily rollup for dashboards / the Obsidian export. security_invoker keeps RLS in force.
CREATE OR REPLACE VIEW public.ai_usage_daily WITH (security_invoker = true) AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  feature,
  model,
  count(*)                             AS calls,
  count(*) FILTER (WHERE NOT ok)       AS failures,
  sum(input_tokens)::bigint            AS input_tokens,
  sum(output_tokens)::bigint           AS output_tokens,
  sum(cache_read_tokens)::bigint       AS cache_read_tokens,
  sum(total_tokens)::bigint            AS total_tokens,
  sum(est_cost_micros)::bigint         AS est_cost_micros
FROM public.ai_usage_events
GROUP BY 1, 2, 3;

REVOKE ALL ON public.ai_usage_daily FROM anon;
GRANT SELECT ON public.ai_usage_daily TO authenticated;
