// Per-member AI rate limit — SERVER-ONLY (uses the service-role client).
//
// Why not count ai_usage_events? That ledger row is written fire-and-forget AFTER the model
// answers (and skipped when the service key is missing), so a burst of parallel requests would
// all pass a count taken before any of them finished. The limiter instead takes a slot BEFORE the
// model call through public.ai_rate_take (supabase/migrations/20261012_ai_rate_limit.sql), which
// counts and inserts under a per-member advisory lock — atomic across serverless instances.
//
// Fails CLOSED: if the limiter can't be reached (migration not applied, no service key, network)
// the call is refused with 429 rather than running unmetered model spend.

import {NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/service';

export type AiBucket = 'nova' | 'image';
export type RateRule = {windowS: number; max: number};
export type RateDecision = {allowed: true; retryAfterS: 0} | {allowed: false; retryAfterS: number};

const TEN_MIN = 600;
const DAY = 86_400;

/** Defaults; each is overridable by a positive-integer env var (invalid values fall back). */
const DEFAULTS: Record<AiBucket, {burstEnv: string; burst: number; dailyEnv: string; daily: number}> = {
  // Text Nova calls (Nova, agents, market price, Telegram).
  nova: {burstEnv: 'AI_RATE_NOVA_PER_10MIN', burst: 30, dailyEnv: 'AI_RATE_NOVA_PER_DAY', daily: 300},
  // Anything that sends images to the model (Nova vision, Stylist photo, NightVision, Scout image).
  image: {burstEnv: 'AI_RATE_IMAGE_PER_10MIN', burst: 6, dailyEnv: 'AI_RATE_IMAGE_PER_DAY', daily: 40},
};

function envInt(env: Record<string, string | undefined>, key: string, fallback: number): number {
  const raw = env[key]?.trim();
  if (!raw || !/^\d{1,7}$/.test(raw)) return fallback;
  const n = Number(raw);
  return n >= 1 ? n : fallback;
}

export function rulesFor(bucket: AiBucket, env: Record<string, string | undefined> = process.env): RateRule[] {
  const d = DEFAULTS[bucket];
  return [
    {windowS: TEN_MIN, max: envInt(env, d.burstEnv, d.burst)},
    {windowS: DAY, max: envInt(env, d.dailyEnv, d.daily)},
  ];
}

/**
 * Pure mirror of public.ai_rate_take: given the member's previous call times (ms), may one more
 * call run at `nowMs`? When refused, retryAfterS is when the tightest exceeded window frees a slot.
 * A window is full when the max-th most recent call is still inside it.
 */
export function evaluateRateLimit(timestampsMs: readonly number[], rules: readonly RateRule[], nowMs: number): RateDecision {
  const desc = [...timestampsMs].filter((t) => t <= nowMs).sort((a, b) => b - a);
  let retry = 0;
  for (const {windowS, max} of rules) {
    const windowMs = windowS * 1000;
    const inWindow = desc.filter((t) => t > nowMs - windowMs);
    if (inWindow.length >= max) {
      const pivot = inWindow[max - 1];
      retry = Math.max(retry, Math.max(1, Math.ceil((pivot + windowMs - nowMs) / 1000)));
    }
  }
  return retry > 0 ? {allowed: false, retryAfterS: retry} : {allowed: true, retryAfterS: 0};
}

let warned = false;

/** Atomically take one slot for this member in this bucket. Never throws; fails closed. */
export async function takeAiRateLimit(userId: string, bucket: AiBucket): Promise<RateDecision> {
  const rules = rulesFor(bucket);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    if (!warned) { warned = true; console.error('[ai-rate-limit] service role not configured — refusing AI calls (fail closed)'); }
    return {allowed: false, retryAfterS: 60};
  }
  try {
    const {data, error} = await createServiceClient().rpc('ai_rate_take', {
      p_user: userId,
      p_bucket: bucket,
      p_rules: rules.map((r) => ({window_s: r.windowS, max: r.max})),
    });
    const row = (Array.isArray(data) ? data[0] : data) as {allowed?: boolean; retry_after_s?: number} | null;
    if (error || !row || typeof row.allowed !== 'boolean') {
      console.error('[ai-rate-limit] ai_rate_take failed — refusing (fail closed)', error?.code ?? 'no_row');
      return {allowed: false, retryAfterS: 60};
    }
    if (row.allowed) return {allowed: true, retryAfterS: 0};
    const retry = Number(row.retry_after_s);
    return {allowed: false, retryAfterS: Number.isFinite(retry) && retry >= 1 ? Math.ceil(retry) : 60};
  } catch (e) {
    console.error('[ai-rate-limit] limiter threw — refusing (fail closed)', e instanceof Error ? e.message : 'unknown');
    return {allowed: false, retryAfterS: 60};
  }
}

export function rateLimitedResponse(retryAfterS: number): NextResponse {
  const s = Math.max(1, Math.ceil(retryAfterS));
  return NextResponse.json(
    {error: 'rate_limited', retryAfterS: s},
    {status: 429, headers: {'Retry-After': String(s), 'Cache-Control': 'no-store'}},
  );
}

/** Route helper: null when the call may proceed, else the 429 response to return. */
export async function guardAiCall(userId: string, bucket: AiBucket): Promise<NextResponse | null> {
  const d = await takeAiRateLimit(userId, bucket);
  return d.allowed ? null : rateLimitedResponse(d.retryAfterS);
}
