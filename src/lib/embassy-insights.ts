// Embassy insights derived from real deal rows (scale_deals + embassy_deals) — no invented market figures.
// Pure; used by src/app/(hotel)/embassy/page.tsx and tests/embassy-insights.test.ts.

export type PipelineDeal = {
  id: string;
  brand: string;
  item: string;
  source: string;
  retail: number; // dollars
  members_price: number; // dollars
  status: 'live' | 'pending' | 'review';
  category: string;
  tier: 'budget' | 'mid' | 'contemporary' | 'premium' | 'factory';
  margin_pct: number; // member savings vs retail, 0–100
  joins?: number; // Scale group-buy joins so far
};

export type CategoryTrend = {category: string; deals: number; live: number; avg_savings_pct: number; top_brand: string; joins: number};
export type BrandSignal = {name: string; deals: number; live: number; avg_savings_pct: number; categories: string[]; status: 'active' | 'prospect'};

export function tierFor(retailCents: number): PipelineDeal['tier'] {
  return retailCents >= 100000 ? 'premium' : retailCents >= 30000 ? 'contemporary' : retailCents >= 5000 ? 'mid' : 'budget';
}

export function savingsPct(retail: number, members: number): number {
  if (!(retail > 0) || !(members >= 0) || members > retail) return 0;
  return Math.round(((retail - members) / retail) * 100);
}

type ScaleRow = {id: string; title: string; brand: string; original_price_cents: number; group_price_cents: number; goal_count: number; current_count: number; category: string | null; status: string};
type EmbassyRow = {id: string; brand: string; item: string; source: string | null; retail_price_cents: number | null; members_price_cents: number | null; category: string | null; tier: string | null; status: string | null};

export function fromScale(d: ScaleRow): PipelineDeal {
  const status: PipelineDeal['status'] = d.status === 'met' ? 'live' : d.status === 'open' ? (d.current_count >= d.goal_count * 0.5 ? 'live' : 'pending') : 'review';
  return {
    id: `scale-${d.id}`, brand: d.brand, item: d.title, source: 'Scale group buy',
    retail: d.original_price_cents / 100, members_price: d.group_price_cents / 100, status,
    category: cap(d.category ?? 'Other'), tier: tierFor(d.original_price_cents),
    margin_pct: savingsPct(d.original_price_cents, d.group_price_cents), joins: d.current_count,
  };
}

const TIERS = ['budget', 'mid', 'contemporary', 'premium', 'factory'] as const;
export function fromEmbassy(d: EmbassyRow): PipelineDeal {
  const retail = Number(d.retail_price_cents ?? 0);
  const members = Number(d.members_price_cents ?? 0);
  const status: PipelineDeal['status'] = d.status === 'live' ? 'live' : d.status === 'pending' ? 'pending' : 'review';
  const tier = (TIERS as readonly string[]).includes(d.tier ?? '') ? (d.tier as PipelineDeal['tier']) : tierFor(retail);
  return {
    id: `embassy-${d.id}`, brand: d.brand, item: d.item, source: d.source || 'Submitted',
    retail: retail / 100, members_price: members / 100, status, category: cap(d.category ?? 'Other'), tier,
    margin_pct: savingsPct(retail, members),
  };
}

function cap(s: string) {
  const t = s.trim();
  return t ? t[0].toUpperCase() + t.slice(1) : 'Other';
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Category view: how many deals, how many live, average member savings, the brand with the most deals. */
export function categoryTrends(deals: PipelineDeal[]): CategoryTrend[] {
  const by = new Map<string, PipelineDeal[]>();
  for (const d of deals) by.set(d.category, [...(by.get(d.category) ?? []), d]);
  return [...by.entries()].map(([category, ds]) => {
    const brandCount = new Map<string, number>();
    for (const d of ds) brandCount.set(d.brand, (brandCount.get(d.brand) ?? 0) + 1);
    const top = [...brandCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '';
    return {
      category, deals: ds.length, live: ds.filter((d) => d.status === 'live').length,
      avg_savings_pct: avg(ds.map((d) => d.margin_pct).filter((m) => m > 0)), top_brand: top,
      joins: ds.reduce((n, d) => n + (d.joins ?? 0), 0),
    };
  }).sort((a, b) => b.joins - a.joins || b.deals - a.deals || a.category.localeCompare(b.category));
}

/** Brand view: active = at least one live deal; otherwise still in the pipeline. */
export function brandSignals(deals: PipelineDeal[], limit = 8): BrandSignal[] {
  const by = new Map<string, PipelineDeal[]>();
  for (const d of deals) by.set(d.brand, [...(by.get(d.brand) ?? []), d]);
  return [...by.entries()].map(([name, ds]) => {
    const live = ds.filter((d) => d.status === 'live').length;
    return {
      name, deals: ds.length, live, avg_savings_pct: avg(ds.map((d) => d.margin_pct).filter((m) => m > 0)),
      categories: [...new Set(ds.map((d) => d.category))].slice(0, 3), status: live > 0 ? ('active' as const) : ('prospect' as const),
    };
  }).sort((a, b) => b.live - a.live || b.deals - a.deals || b.avg_savings_pct - a.avg_savings_pct || a.name.localeCompare(b.name)).slice(0, limit);
}
