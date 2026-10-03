// AI token usage ledger — SERVER-ONLY (uses the service-role client). Never import in client components.
//
// recordAiUsage() is fire-and-forget: it never throws and never blocks a member's
// response. It stores token COUNTS and an estimated cost — never prompt text,
// completions, or images (those can carry member PII).

import {createServiceClient} from '@/lib/supabase/service';

export type UsageCounts = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheWriteTokens?: number | null;
};

export type UsageRecord = UsageCounts & {
  feature: string;
  model: string;
  provider?: string;
  userId?: string | null;
  latencyMs?: number | null;
  ok?: boolean;
  traceId?: string | null;
};

// List prices in USD per 1M tokens. ESTIMATES for dashboards only — the provider
// invoice is the source of truth. Override with AI_PRICING_JSON, e.g.
// {"claude-sonnet-4-6":{"in":3,"out":15,"cacheRead":0.3,"cacheWrite":3.75}}
type Price = {in: number; out: number; cacheRead: number; cacheWrite: number};
const DEFAULT_PRICES: Record<string, Price> = {
  'claude-opus':   {in: 15, out: 75, cacheRead: 1.5, cacheWrite: 18.75},
  'claude-sonnet': {in: 3,  out: 15, cacheRead: 0.3, cacheWrite: 3.75},
  'claude-haiku':  {in: 1,  out: 5,  cacheRead: 0.1, cacheWrite: 1.25},
};

function loadPrices(): Record<string, Price> {
  const raw = process.env.AI_PRICING_JSON;
  if (!raw) return DEFAULT_PRICES;
  try {
    return {...DEFAULT_PRICES, ...(JSON.parse(raw) as Record<string, Price>)};
  } catch {
    return DEFAULT_PRICES;
  }
}

/** Strip a provider prefix ("anthropic/claude-sonnet-4-6" → "claude-sonnet-4-6"). */
export function normalizeModel(model: string): string {
  return model.replace(/^[a-z0-9-]+\//i, '').toLowerCase();
}

export function priceFor(model: string, prices = loadPrices()): Price | null {
  const id = normalizeModel(model);
  if (prices[id]) return prices[id];
  // Longest family prefix wins ("claude-sonnet-4-6" → "claude-sonnet").
  const family = Object.keys(prices)
    .filter((k) => id.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return family ? prices[family] : null;
}

const clampInt = (n: number | null | undefined) =>
  Number.isFinite(n) && (n as number) > 0 ? Math.min(Math.floor(n as number), 2_000_000_000) : 0;

/** Estimated cost in micro-dollars (USD × 1e6). Unknown models cost 0 (flagged in the dashboard). */
export function estimateCostMicros(model: string, u: UsageCounts, prices = loadPrices()): number {
  const p = priceFor(model, prices);
  if (!p) return 0;
  // Anthropic reports cache reads/writes separately from uncached input.
  const usd =
    (clampInt(u.inputTokens) * p.in +
      clampInt(u.outputTokens) * p.out +
      clampInt(u.cacheReadTokens) * p.cacheRead +
      clampInt(u.cacheWriteTokens) * p.cacheWrite) /
    1_000_000;
  return Math.round(usd * 1_000_000);
}

const FEATURE_RE = /^[a-z0-9_.:-]{1,64}$/;

export function toRow(r: UsageRecord) {
  const feature = FEATURE_RE.test(r.feature) ? r.feature : 'unknown';
  return {
    feature,
    provider: (r.provider ?? 'anthropic').slice(0, 32),
    model: normalizeModel(r.model).slice(0, 96) || 'unknown',
    user_id: r.userId ?? null,
    input_tokens: clampInt(r.inputTokens),
    output_tokens: clampInt(r.outputTokens),
    cache_read_tokens: clampInt(r.cacheReadTokens),
    cache_write_tokens: clampInt(r.cacheWriteTokens),
    est_cost_micros: estimateCostMicros(r.model, r),
    latency_ms: r.latencyMs == null ? null : clampInt(r.latencyMs),
    ok: r.ok ?? true,
    trace_id: r.traceId ? r.traceId.slice(0, 64) : null,
  };
}

/** Map an AI SDK (v6) LanguageModelUsage into our counts. */
export function fromSdkUsage(u: {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: {cacheReadTokens?: number; cacheWriteTokens?: number; noCacheTokens?: number};
} | undefined | null): UsageCounts {
  if (!u) return {};
  const cacheRead = u.inputTokenDetails?.cacheReadTokens ?? 0;
  const cacheWrite = u.inputTokenDetails?.cacheWriteTokens ?? 0;
  // SDK inputTokens includes cached tokens; bill the uncached remainder at the input rate.
  const uncached = u.inputTokenDetails?.noCacheTokens ?? Math.max(0, (u.inputTokens ?? 0) - cacheRead - cacheWrite);
  return {inputTokens: uncached, outputTokens: u.outputTokens, cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite};
}

export async function recordAiUsage(r: UsageRecord): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  try {
    const {error} = await createServiceClient().from('ai_usage_events').insert(toRow(r));
    if (error) console.warn('[ai-usage] insert failed', error.code);
  } catch (e) {
    console.warn('[ai-usage] insert threw', e instanceof Error ? e.message : 'unknown');
  }
}
