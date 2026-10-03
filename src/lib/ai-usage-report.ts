// Pure aggregation for the AI usage dashboard + Obsidian export (no I/O, unit-tested).
import {priceFor} from '@/lib/ai-usage';

export type DailyRow = {
  day: string;
  feature: string;
  model: string;
  calls: number;
  failures: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  est_cost_micros: number;
};

export type Bucket = {
  key: string;
  calls: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  estCostUsd: number;
};

const empty = (key: string): Bucket => ({key, calls: 0, failures: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, totalTokens: 0, estCostUsd: 0});

function add(b: Bucket, r: DailyRow) {
  b.calls += Number(r.calls) || 0;
  b.failures += Number(r.failures) || 0;
  b.inputTokens += Number(r.input_tokens) || 0;
  b.outputTokens += Number(r.output_tokens) || 0;
  b.cacheReadTokens += Number(r.cache_read_tokens) || 0;
  b.totalTokens += Number(r.total_tokens) || 0;
  b.estCostUsd += (Number(r.est_cost_micros) || 0) / 1_000_000;
}

function group(rows: DailyRow[], keyOf: (r: DailyRow) => string): Bucket[] {
  const m = new Map<string, Bucket>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!m.has(k)) m.set(k, empty(k));
    add(m.get(k)!, r);
  }
  return [...m.values()].map((b) => ({...b, estCostUsd: Math.round(b.estCostUsd * 10_000) / 10_000}));
}

export function buildReport(rows: DailyRow[], since: string, days: number) {
  const totals = group(rows, () => 'total')[0] ?? empty('total');
  const byDay = group(rows, (r) => String(r.day).slice(0, 10)).sort((a, b) => a.key.localeCompare(b.key));
  const byFeature = group(rows, (r) => r.feature).sort((a, b) => b.totalTokens - a.totalTokens);
  const byModel = group(rows, (r) => r.model).sort((a, b) => b.totalTokens - a.totalTokens);
  const unpricedModels = byModel.filter((b) => !priceFor(b.key)).map((b) => b.key);
  return {range: {since, days}, totals, byDay, byFeature, byModel, unpricedModels, costIsEstimate: true as const};
}

export type UsageReport = ReturnType<typeof buildReport>;

export function clampDays(raw: string | null): number {
  const n = Number.parseInt(raw ?? '30', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 365) : 30;
}

/** ISO date (YYYY-MM-DD) `days` ago, UTC. */
export function sinceFor(days: number, now: number = Date.now()): string {
  return new Date(now - days * 86_400_000).toISOString().slice(0, 10);
}
