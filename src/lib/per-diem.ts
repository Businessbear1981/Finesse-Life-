// Per Diem — pure helpers shared by the API routes, the web room and tests (the mobile app keeps a
// mirror in mobile/src/lib/rooms/perdiem.ts). No fetch, no React, no server imports.

export type PerDiemItem = {time: string; label: string; cost_cents: number; done: boolean};
export type PerDiemStatus = 'draft' | 'planned' | 'done' | 'cancelled';
export type PerDiemPlan = {
  id: string;
  plan_date: string;
  occasion: string;
  budget_cents: number;
  items: PerDiemItem[];
  plan_text: string | null;
  nova_request_id: string | null;
  status: PerDiemStatus;
  updated_at: string;
};

export const OCCASIONS = ['Date night', 'Anniversary', 'Client dinner', 'Night out'] as const;
export const MAX_ITEMS = 20;

/** The planner brief: occasion, budget, and how to lay the night out so the stops can be read back. */
export function eveningBrief(occasion: string, budgetCents: number, extra?: string): string {
  const budget = budgetCents > 0 ? `$${Math.round(budgetCents / 100).toLocaleString('en-US')} all in, for two` : 'no fixed budget';
  return [
    `${occasion} — plan the evening around ${budget}.`,
    extra?.trim() ? extra.trim() : '',
    'Lay the recommended night out as stops, one per line: "7:00 PM — what and where — $estimate". Keep the total inside the budget.',
  ].filter(Boolean).join(' ').slice(0, 600);
}

const TIME = /^\s*(?:[-*•\d]+[.)]\s+|[-*•]\s*)?(?:\*\*)?\s*((?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)|(?:[01]?\d|2[0-3]):[0-5]\d)\b/i;
const COST = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?/;

function cleanLabel(s: string): string {
  return s
    .replace(/\*\*|__|`/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/^[\s—–\-:|·,]+|[\s—–\-:|·,]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 120);
}

function normTime(raw: string): string {
  const t = raw.replace(/\./g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  return t.replace(/(\d)(AM|PM)$/, '$1 $2');
}

function itemsFrom(lines: string[]): PerDiemItem[] {
  const out: PerDiemItem[] = [];
  for (const line of lines) {
    const m = TIME.exec(line);
    if (!m) continue;
    const rest = line.slice(m.index + m[0].length);
    const c = COST.exec(rest);
    const cost = c ? Number(c[1].replace(/,/g, '')) * 100 + (c[2] ? Number(c[2]) : 0) : 0;
    const label = cleanLabel(c ? rest.slice(0, c.index) + rest.slice(c.index + c[0].length) : rest);
    if (!label) continue;
    out.push({time: normTime(m[1]), label, cost_cents: Math.min(cost, 10_000_000), done: false});
  }
  return out;
}

/**
 * Read the stops of a night out of Nova's plan text. Prefers the lines after the last "recommend…"
 * heading (Nova gives options, then one recommended choice) when that section has at least two stops.
 * Returns [] when no timed lines are found — the plan text is still kept and shown as written.
 */
export function parsePlanItems(text: string | null | undefined): PerDiemItem[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).slice(0, 200);
  let lastRec = -1;
  lines.forEach((l, i) => { if (/recommend/i.test(l)) lastRec = i; });
  if (lastRec >= 0) {
    const rec = itemsFrom(lines.slice(lastRec));
    if (rec.length >= 2) return rec.slice(0, MAX_ITEMS);
  }
  const seen = new Set<string>();
  return itemsFrom(lines).filter((i) => {
    const k = `${i.time}|${i.label.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 8);
}

export function totals(items: PerDiemItem[], budgetCents: number) {
  const planned = items.reduce((s, i) => s + (Number.isFinite(i.cost_cents) ? i.cost_cents : 0), 0);
  const spent = items.filter((i) => i.done).reduce((s, i) => s + i.cost_cents, 0);
  return {planned, spent, left: budgetCents - planned, over: budgetCents > 0 && planned > budgetCents, pct: budgetCents > 0 ? Math.min(100, Math.round((planned / budgetCents) * 100)) : 0};
}

export const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;
