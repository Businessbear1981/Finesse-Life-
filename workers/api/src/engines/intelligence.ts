// Ported from src/lib/intelligence/{behavioral,market,logistics,engine}.ts.
// Same scoring as the Next.js version; Supabase calls replaced by SQL, the LLM behind ModelProvider.
import type { Tx } from '../db';
import type { Engine, EngineInput, ModelProvider } from './types';
import { parseJson } from '../model';

// ── Behavioral profile ──────────────────────────────────────────────────────
export interface SignalRow { kind: string; payload: Record<string, any>; context: Record<string, any> | null; created_at: string | Date }

export const SIGNAL_WEIGHTS: Record<string, number> = {
  checkout_complete: 12, accept_offer: 10, vault_fund: 9, scale_join: 8, make_offer: 7, add_to_registry: 6,
  wishlist_add: 5, purchase_intent: 5, checkout_start: 4, list_item: 3, view_listing: 1.5, view_item: 1,
  category_browse: 0.5, search_query: 0.5,
};

export function temporalWeight(createdAt: string | Date, now = Date.now()): number {
  const days = (now - new Date(createdAt).getTime()) / 86_400_000;
  return days <= 7 ? 1 : days <= 14 ? 0.85 : days <= 30 ? 0.6 : 0.3;
}

function affinities(signals: SignalRow[], key: (s: SignalRow) => string | undefined, top?: number) {
  const scores: Record<string, number> = {};
  for (const s of signals) {
    const k = key(s)?.trim();
    if (!k || k === 'All') continue;
    scores[k] = (scores[k] ?? 0) + (SIGNAL_WEIGHTS[s.kind] ?? 1) * temporalWeight(s.created_at);
  }
  const max = Math.max(...Object.values(scores), 1);
  const out = Object.entries(scores).map(([k, v]) => [k, Math.round((v / max) * 1000) / 1000] as const).sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(top ? out.slice(0, top) : out);
}

export interface BehavioralProfile {
  category_affinities: Record<string, number>;
  brand_affinities: Record<string, number>;
  price_range_preference: { min_cents: number; max_cents: number };
  buying_velocity: 'low' | 'medium' | 'high';
  style_signals: string[];
  signal_count: number;
}

export function computeProfile(signals: SignalRow[]): BehavioralProfile {
  const prices = signals.map((s) => s.payload.offer_price_cents ?? s.payload.asking_price_cents ?? s.payload.price_cents ?? s.payload.members_cents)
    .filter((p): p is number => typeof p === 'number' && p > 0 && p < 10_000_000).sort((a, b) => a - b);
  const price = prices.length < 3 ? { min_cents: 0, max_cents: 100_000 }
    : { min_cents: prices[Math.floor(prices.length * 0.15)]!, max_cents: prices[Math.floor(prices.length * 0.85)]! };
  const purchases = signals.filter((s) => ['checkout_complete', 'accept_offer', 'vault_fund'].includes(s.kind)).length;
  const tags = new Map<string, number>();
  for (const s of signals) for (const t of [...(s.context?.style_tags ?? []), ...(s.payload.style_tags ?? [])]) tags.set(t, (tags.get(t) ?? 0) + 1);
  return {
    category_affinities: affinities(signals, (s) => s.payload.category ?? s.payload.cat),
    brand_affinities: affinities(signals, (s) => s.payload.brand, 20),
    price_range_preference: price,
    buying_velocity: purchases >= 5 ? 'high' : purchases >= 2 ? 'medium' : 'low',
    style_signals: [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t),
    signal_count: signals.length,
  };
}

export async function loadProfile(read: Tx, userId: string): Promise<BehavioralProfile> {
  const { rows } = await read.query<SignalRow>(
    `select kind, payload, context, created_at from public.intelligence_signals
     where user_id::text = $1::text order by created_at desc limit 250`, [userId]);
  return computeProfile(rows);
}

// ── Market ──────────────────────────────────────────────────────────────────
export interface Listing { category: string | null; status: string; asking_price_cents: number; created_at: string | Date; views: number | null }
export interface MarketSignal { category: string; demand_score: number; supply_score: number; price_trend: 'rising' | 'falling' | 'stable'; avg_days_to_sell: number; avg_price_cents: number; listing_count: number }

export function computeMarketSignals(listings: Listing[], now = Date.now()): MarketSignal[] {
  const by: Record<string, Listing[]> = {};
  for (const l of listings) (by[l.category ?? 'Uncategorized'] ??= []).push(l);
  return Object.entries(by).map(([category, items]) => {
    const sold = items.filter((i) => i.status === 'sold');
    const active = items.filter((i) => i.status === 'active');
    const avgViews = items.reduce((s, i) => s + (i.views ?? 0), 0) / items.length;
    const sorted = [...items].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    const half = Math.ceil(sorted.length / 2);
    const avg = (xs: Listing[]) => xs.reduce((s, i) => s + i.asking_price_cents, 0) / Math.max(xs.length, 1);
    const recent = avg(sorted.slice(0, half)), older = avg(sorted.slice(half));
    const priced = items.map((i) => i.asking_price_cents).filter((p) => p > 0);
    return {
      category,
      demand_score: Math.min(100, Math.round((sold.length / items.length) * 65 + Math.min(avgViews / 8, 35))),
      supply_score: Math.min(100, Math.round((active.length / (sold.length + 1)) * 60)),
      price_trend: sorted.length > 1 && recent > older * 1.06 ? 'rising' : sorted.length > 1 && recent < older * 0.94 ? 'falling' : 'stable',
      avg_days_to_sell: sold.length ? Math.round(sold.reduce((s, i) => s + (now - +new Date(i.created_at)) / 86_400_000, 0) / sold.length) : 30,
      avg_price_cents: priced.length ? Math.round(priced.reduce((a, b) => a + b, 0) / priced.length) : 0,
      listing_count: items.length,
    } satisfies MarketSignal;
  }).sort((a, b) => b.demand_score - a.demand_score);
}

export function detectAnomalies(signals: MarketSignal[]) {
  const out: { type: string; category: string; detail: string; urgency: 'low' | 'medium' | 'high' }[] = [];
  for (const s of signals) {
    if (s.demand_score >= 80 && s.supply_score <= 20) out.push({ type: 'demand_spike', category: s.category, detail: `High demand (${s.demand_score}/100) with low supply — list ${s.category} items now.`, urgency: 'high' });
    if (s.supply_score >= 80 && s.demand_score <= 30) out.push({ type: 'oversupply', category: s.category, detail: `${s.category} is oversupplied — buyers can negotiate harder.`, urgency: 'medium' });
    if (s.price_trend === 'falling' && s.demand_score >= 50) out.push({ type: 'price_pressure', category: s.category, detail: `${s.category} prices are falling despite steady demand.`, urgency: 'low' });
  }
  return out;
}

async function marketSignals(agg: Tx, category?: string): Promise<MarketSignal[]> {
  const key = `market_signals_${category ?? 'all'}`;
  const cached = (await agg.query<{ data: { signals: MarketSignal[] } }>(
    'select data from public.market_intelligence_cache where cache_key = $1 and expires_at > now()', [key])).rows[0];
  if (cached) return cached.data.signals;
  const { rows } = await agg.query<Listing>(
    `select category, status, asking_price_cents, created_at, views from public.exchange_listings
     where ($1::text is null or category = $1) order by created_at desc limit 1000`, [category ?? null]);
  const signals = computeMarketSignals(rows);
  await agg.query(
    `insert into public.market_intelligence_cache(cache_key, data, computed_at, expires_at) values ($1, $2, now(), now() + interval '1 hour')
     on conflict (cache_key) do update set data = excluded.data, computed_at = now(), expires_at = excluded.expires_at`, [key, { signals }]);
  return signals;
}

// ── Logistics (pure) ────────────────────────────────────────────────────────
type TQ = 'basic' | 'good' | 'excellent';
export interface ShipmentSpec { weight_oz: number; value_cents: number; category: string; from_zip?: string; to_zip?: string }
export interface Quote { carrier: string; service: string; estimated_days: number; rate_cents: number; risk_score: number; tracking_quality: TQ; insurance_included: boolean }
const PREF: Record<string, string[]> = { Sneakers: ['UPS', 'FedEx'], Fashion: ['UPS', 'USPS'], Accessories: ['FedEx', 'UPS'], Tech: ['FedEx', 'UPS'], Collectibles: ['FedEx', 'UPS'], Bags: ['FedEx', 'UPS'], Shoes: ['UPS', 'FedEx'], Jewelry: ['FedEx'], Watches: ['FedEx', 'UPS'] };
const SERVICES: [string, string, number, number, TQ, number][] = [
  ['USPS', 'Ground Advantage', 700, 5, 'basic', 8], ['USPS', 'Priority Mail', 980, 3, 'good', 10], ['USPS', 'Priority Express', 2850, 1, 'good', 18],
  ['UPS', 'Ground', 1100, 5, 'excellent', 11], ['UPS', '3-Day Select', 1650, 3, 'excellent', 14], ['UPS', '2nd Day Air', 2200, 2, 'excellent', 18], ['UPS', 'Next Day Air', 3900, 1, 'excellent', 28],
  ['FedEx', 'Ground', 1050, 5, 'excellent', 11], ['FedEx', 'Express Saver', 1800, 3, 'excellent', 15], ['FedEx', '2Day', 2400, 2, 'excellent', 20], ['FedEx', 'Overnight', 4200, 1, 'excellent', 30],
  ['DHL', 'Express Worldwide', 3500, 3, 'excellent', 25],
];

export function quoteLogistics(spec: ShipmentSpec) {
  const preferred = PREF[spec.category] ?? ['UPS', 'FedEx'];
  const insurance = spec.value_cents <= 10000 ? 0 : Math.round((spec.value_cents - 10000) / 100);
  const quotes: Quote[] = SERVICES
    .filter(([c, s, , d]) => !(spec.value_cents >= 25000 && c === 'USPS' && s === 'Ground Advantage') && !(spec.value_cents >= 100000 && d > 3))
    .map(([carrier, service, base, days, tq, perOz]) => {
      let risk = spec.value_cents >= 100000 ? 0.3 : spec.value_cents >= 25000 ? 0.15 : 0;
      if (service.toLowerCase().includes('ground')) risk += 0.15;
      if (carrier === 'USPS' && service !== 'Priority Express') risk += 0.1;
      risk -= tq === 'excellent' ? 0.15 : tq === 'good' ? 0.05 : 0;
      return {
        carrier, service, estimated_days: days, tracking_quality: tq, insurance_included: insurance > 0,
        rate_cents: Math.round((base + Math.max(0, spec.weight_oz - 16) * perOz + insurance) * (preferred.includes(carrier) ? 0.95 : 1)),
        risk_score: Math.round(Math.min(1, Math.max(0, risk)) * 1000) / 1000,
      };
    }).sort((a, b) => a.rate_cents - b.rate_cents);
  const score = (q: Quote) => q.rate_cents / 100 + q.risk_score * 50 + q.estimated_days * 3 + (q.tracking_quality === 'excellent' ? -5 : q.tracking_quality === 'good' ? -2 : 0);
  const recommended = [...quotes].sort((a, b) => score(a) - score(b))[0]!;
  const notes: string[] = [];
  if (spec.value_cents >= 25000) notes.push('High-value item: request signature confirmation and purchase additional insurance.');
  if (recommended.carrier === 'FedEx' || recommended.carrier === 'UPS') notes.push('Take photos of the item and packaging before sealing the box.');
  if (spec.category === 'Sneakers') notes.push('Ship in original box if available — adds value and reduces damage risk.');
  if (spec.category === 'Watches' || spec.category === 'Jewelry') notes.push('Declare accurate item value for proper insurance coverage.');
  return { quotes: quotes.slice(0, 8), recommended, notes: notes.join(' ') || 'Standard packaging guidelines apply.' };
}

// ── Engines ─────────────────────────────────────────────────────────────────
const ACTIONS = ['browse_category', 'make_offer', 'add_to_registry', 'check_vault', 'list_item', 'explore_market', 'join_scale', 'complete_nightvision', 'explore_exchange'];
const need = (i: EngineInput) => { if (!i.agg) throw new Error('aggregate reader missing'); return i.agg; };
async function ask<T>(model: ModelProvider | undefined, prompt: string): Promise<T | null> {
  if (!model) return null;
  try { return parseJson<T>(await model.complete(prompt, { fast: true })); } catch { return null; }
}

const base = { consumes: [] as string[], provider: 'model', timeoutMs: 8000 };

export const nextBestActionEngine: Engine = {
  ...base, id: 'next_best_action', intents: ['next_best_action'], emits: [], tier: 1,
  async handle(i) {
    const p = await loadProfile(i.read, i.userId);
    const cats = Object.keys(p.category_affinities).slice(0, 4);
    const m = await ask<{ action: string; reason: string; confidence: number }>(i.model,
      `You are the Finesse intelligence engine. Predict the single most useful next action.\nTop categories: ${cats.join(', ') || 'none'}\nVelocity: ${p.buying_velocity}\nPage: ${String(i.payload.page ?? 'unknown')}\nValid actions: ${ACTIONS.join(', ')}\nJSON only: {"action":"string","reason":"one sentence","confidence":0.0}`);
    const result = m && ACTIONS.includes(m.action) && typeof m.confidence === 'number' ? { ...m, source: 'model' }
      : cats[0] ? { action: 'browse_category', reason: `Your ${cats[0]} affinity is highest — browse new listings.`, confidence: 0.35, source: 'rules' }
      : { action: 'complete_nightvision', reason: 'Complete your style profile to unlock personalized intelligence.', confidence: 0.35, source: 'rules' };
    return { kind: 'next_best_action', result };
  },
};

export const personalizedRecsEngine: Engine = {
  ...base, id: 'personalized_recs', intents: ['personalized_recs'], emits: [], tier: 1,
  async handle(i) {
    const count = Math.min(Math.max(Number(i.payload.count ?? 5), 1), 10);
    const p = await loadProfile(i.read, i.userId);
    const cats = Object.keys(p.category_affinities).slice(0, 3);
    const brands = Object.keys(p.brand_affinities).slice(0, 4);
    const m = await ask<{ recommendations: { title: string; category: string; price_range: string; why: string }[] }>(i.model,
      `Generate ${count} specific luxury item recommendations.\nCategories: ${cats.join(', ') || 'Fashion, Accessories'}\nBrands: ${brands.join(', ') || 'luxury'}\nPrice: $${Math.round(p.price_range_preference.min_cents / 100)}–$${Math.round(p.price_range_preference.max_cents / 100)}\nJSON only: {"recommendations":[{"title":"","category":"","price_range":"","why":""}]}`);
    let recs = Array.isArray(m?.recommendations) ? m!.recommendations.slice(0, count) : [];
    let source = 'model';
    if (!recs.length) {
      // Deterministic fallback: newest active Exchange listings in the member's top categories.
      source = 'catalog';
      const { rows } = await need(i).query<{ title: string; category: string; asking_price_cents: number }>(
        `select title, category, asking_price_cents from public.exchange_listings
         where status = 'active' and (cardinality($1::text[]) = 0 or category = any($1)) order by created_at desc limit $2`, [cats, count]);
      recs = rows.map((r) => ({ title: r.title, category: r.category, price_range: `$${Math.round(r.asking_price_cents / 100)}`, why: cats.includes(r.category) ? `Matches your ${r.category} affinity.` : 'New on the Exchange.' }));
    }
    return { kind: 'personalized_recs', result: { recommendations: recs, source } };
  },
};

export const priceIntelligenceEngine: Engine = {
  ...base, id: 'price_intelligence', intents: ['price_intelligence'], emits: [], tier: 1,
  async handle(i) {
    const agg = need(i);
    const mode = String(i.payload.mode ?? 'signals');
    if (mode === 'anomalies') return { kind: 'price.anomalies', result: { anomalies: detectAnomalies(await marketSignals(agg)) } };
    if (mode === 'recommend') {
      const item = i.payload.item as { title?: string; brand?: string; category?: string; condition?: string } | undefined;
      if (!item?.title || !item.category) throw new Error('item.title and item.category are required');
      const kw = (item.brand ?? item.title.split(' ').slice(0, 2).join(' ')).trim();
      const { rows } = await agg.query<{ asking_price_cents: number }>(
        `select asking_price_cents from public.exchange_listings where category = $1 and title ilike $2 and asking_price_cents > 0
         order by created_at desc limit 12`, [item.category, `%${kw.replace(/[%_]/g, '')}%`]);
      const prices = rows.map((r) => r.asking_price_cents).sort((a, b) => a - b);
      const m = await ask<{ recommended_cents: number; low_cents: number; high_cents: number; reasoning: string; confidence: number }>(i.model,
        `Recommend a listing price for "${item.title}" (${item.category}, ${item.condition ?? 'unknown'}). Comparables (cents): ${prices.join(', ') || 'none'}. Platform fee 8%. JSON only: {"recommended_cents":0,"low_cents":0,"high_cents":0,"reasoning":"","confidence":0.0}`);
      if (m?.recommended_cents && m.reasoning) return { kind: 'price.recommendation', result: { ...m, comparables: prices.length, source: 'model' } };
      const median = prices.length ? prices[Math.floor(prices.length / 2)]! : 5000;
      return { kind: 'price.recommendation', result: { recommended_cents: median, low_cents: Math.round(median * 0.85), high_cents: Math.round(median * 1.15), reasoning: `Based on ${prices.length} Exchange comparables.`, confidence: prices.length > 3 ? 0.65 : 0.3, comparables: prices.length, source: 'comparables' } };
    }
    return { kind: 'price.signals', result: { signals: await marketSignals(agg, i.payload.category as string | undefined) } };
  },
};

export function forecastFrom(signals: MarketSignal[], category?: string) {
  const top = signals.find((s) => !category || s.category === category) ?? (category ? undefined : signals[0]);
  const recommendation = !top ? 'Insufficient data for forecast.'
    : top.demand_score >= 75 ? `High demand (${top.demand_score}/100) — list ${top.category} items now for fastest sale.`
    : top.demand_score >= 45 ? `Moderate demand (${top.demand_score}/100) — standard pricing applies.`
    : `Soft demand (${top.demand_score}/100) — price competitively or wait for demand recovery.`;
  return { category: category ?? 'all', demand_score: top?.demand_score ?? 0, supply_score: top?.supply_score ?? 0, price_trend: top?.price_trend ?? 'stable', avg_days_to_sell: top?.avg_days_to_sell ?? 30, recommendation, confidence: top ? 0.78 : 0.2 };
}

export const demandForecastEngine: Engine = {
  ...base, id: 'demand_forecast', intents: ['demand_forecast'], emits: [], tier: 0, provider: 'internal', timeoutMs: 4000,
  async handle(i) {
    const category = i.payload.category as string | undefined;
    return { kind: 'demand_forecast', result: forecastFrom(await marketSignals(need(i), category), category) };
  },
};

export const marketAnalysisEngine: Engine = {
  ...base, id: 'market_analysis', intents: ['market_analysis'], emits: [], tier: 0, provider: 'internal', timeoutMs: 4000,
  async handle(i) {
    const signals = await marketSignals(need(i), i.payload.category as string | undefined);
    return { kind: 'market_analysis', result: { signals, anomalies: detectAnomalies(signals) } };
  },
};

export const logisticsEngine: Engine = {
  ...base, id: 'logistics', intents: ['logistics_optimize'], emits: [], tier: 0, provider: 'internal', timeoutMs: 1000,
  async handle(i) {
    const p = i.payload;
    const spec: ShipmentSpec = { weight_oz: Number(p.weight_oz ?? 16), value_cents: Number(p.value_cents ?? 5000), category: String(p.category ?? 'Fashion'), from_zip: p.from_zip as string | undefined, to_zip: p.to_zip as string | undefined };
    if (!(spec.weight_oz > 0) || !(spec.value_cents >= 0)) throw new Error('weight_oz and value_cents must be positive');
    return { kind: 'logistics.quote', result: quoteLogistics(spec) };
  },
};

export const intelligenceEngines = [nextBestActionEngine, personalizedRecsEngine, priceIntelligenceEngine, demandForecastEngine, marketAnalysisEngine, logisticsEngine];
