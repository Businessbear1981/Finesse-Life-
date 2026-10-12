-- Finesse — per-member AI rate limit (BACKEND_MAP §6 item 5).
-- One row per ADMITTED AI call: member, bucket, time. No prompt or reply content.
-- The server (service role) calls public.ai_rate_take BEFORE each model call; it counts and
-- inserts under a per-member/bucket advisory lock, so parallel requests can't slip past the limit.
-- (ai_usage_events can't serve this: it is written after the model answers, fire-and-forget.)
-- Limits are passed in by the server (src/lib/ai-rate-limit.ts, env-overridable).
-- Apply BEFORE deploying the code that calls it — the limiter fails closed (429) without it.
-- Apply: SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261012_ai_rate_limit.sql

CREATE TABLE IF NOT EXISTS public.ai_rate_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket      TEXT NOT NULL CHECK (bucket ~ '^[a-z0-9_.:-]{1,32}$'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_rate_user_bucket_time
  ON public.ai_rate_events(user_id, bucket, occurred_at DESC);

-- RLS on with no policies: members and anon can't read or write. Not FORCEd, so the
-- SECURITY DEFINER function below (running as the table owner) can still write.
ALTER TABLE public.ai_rate_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_rate_events FROM anon, authenticated;

-- p_rules: [{"window_s": 600, "max": 30}, {"window_s": 86400, "max": 300}]
-- Returns allowed=false + retry_after_s (seconds until the tightest full window frees a slot),
-- or allowed=true after recording the call. Also prunes this member's rows older than the
-- longest window.
CREATE OR REPLACE FUNCTION public.ai_rate_take(p_user UUID, p_bucket TEXT, p_rules JSONB)
RETURNS TABLE(allowed BOOLEAN, retry_after_s INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r          JSONB;
  w          INTEGER;
  m          INTEGER;
  n          INTEGER;
  pivot      TIMESTAMPTZ;
  retry      INTEGER := 0;
  max_window INTEGER := 0;
BEGIN
  IF p_user IS NULL OR p_bucket IS NULL OR p_bucket !~ '^[a-z0-9_.:-]{1,32}$'
     OR p_rules IS NULL OR jsonb_typeof(p_rules) <> 'array' OR jsonb_array_length(p_rules) = 0 THEN
    RAISE EXCEPTION 'ai_rate_take: invalid arguments' USING ERRCODE = '22023';
  END IF;

  -- Serialise takes for this member+bucket (transaction-scoped).
  PERFORM pg_advisory_xact_lock(hashtextextended('ai_rate:' || p_user::text || ':' || p_bucket, 0));

  FOR r IN SELECT value FROM jsonb_array_elements(p_rules) LOOP
    w := (r ->> 'window_s')::INTEGER;
    m := (r ->> 'max')::INTEGER;
    IF w IS NULL OR m IS NULL OR w < 1 OR w > 2592000 OR m < 1 THEN
      RAISE EXCEPTION 'ai_rate_take: invalid rule %', r USING ERRCODE = '22023';
    END IF;
    max_window := greatest(max_window, w);

    SELECT count(*) INTO n FROM public.ai_rate_events e
     WHERE e.user_id = p_user AND e.bucket = p_bucket
       AND e.occurred_at > now() - make_interval(secs => w);

    IF n >= m THEN
      -- The window is full while its m-th most recent call is inside it.
      SELECT e.occurred_at INTO pivot FROM public.ai_rate_events e
       WHERE e.user_id = p_user AND e.bucket = p_bucket
         AND e.occurred_at > now() - make_interval(secs => w)
       ORDER BY e.occurred_at DESC
       OFFSET m - 1 LIMIT 1;
      retry := greatest(retry, greatest(1, ceil(extract(epoch FROM (pivot + make_interval(secs => w) - now())))::INTEGER));
    END IF;
  END LOOP;

  IF retry > 0 THEN
    RETURN QUERY SELECT false, retry;
    RETURN;
  END IF;

  INSERT INTO public.ai_rate_events(user_id, bucket) VALUES (p_user, p_bucket);
  DELETE FROM public.ai_rate_events e
   WHERE e.user_id = p_user AND e.bucket = p_bucket
     AND e.occurred_at < now() - make_interval(secs => max_window);
  RETURN QUERY SELECT true, 0;
END
$$;

REVOKE ALL ON FUNCTION public.ai_rate_take(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_rate_take(UUID, TEXT, JSONB) TO service_role;
