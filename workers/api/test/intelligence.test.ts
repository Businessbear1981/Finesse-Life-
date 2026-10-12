import { describe, expect, it } from 'vitest';
import { computeMarketSignals, computeProfile, detectAnomalies, forecastFrom, quoteLogistics, nextBestActionEngine, personalizedRecsEngine } from '../src/engines/intelligence';
import { fakeModel } from '../src/model';
import type { Tx } from '../src/db';

const now = new Date().toISOString();
const tx = (rows: Record<string, any[]>): Tx => ({
  query: async (sql: string) => {
    const key = Object.keys(rows).find((k) => sql.includes(k));
    const r = key ? rows[key]! : [];
    return { rows: r as any[], rowCount: r.length };
  },
});

describe('behavioral profile (port)', () => {
  it('weights purchases over views and normalises affinities', () => {
    const p = computeProfile([
      { kind: 'checkout_complete', payload: { category: 'Bags', brand: 'Hermès', price_cents: 900000 }, context: null, created_at: now },
      { kind: 'view_item', payload: { category: 'Shoes', price_cents: 50000 }, context: { style_tags: ['Old Hollywood'] }, created_at: now },
      { kind: 'view_item', payload: { category: 'Shoes', price_cents: 60000 }, context: null, created_at: now },
    ]);
    expect(p.category_affinities).toEqual({ Bags: 1, Shoes: 0.167 });
    expect(p.buying_velocity).toBe('low');
    expect(p.style_signals).toEqual(['Old Hollywood']);
    expect(p.price_range_preference.min_cents).toBe(50000);
  });
});

describe('market (port)', () => {
  const listings = [
    ...Array.from({ length: 8 }, () => ({ category: 'Watches', status: 'sold', asking_price_cents: 500000, created_at: now, views: 400 })),
    { category: 'Watches', status: 'active', asking_price_cents: 520000, created_at: now, views: 10 },
    ...Array.from({ length: 10 }, () => ({ category: 'Scarves', status: 'active', asking_price_cents: 20000, created_at: now, views: 0 })),
  ];
  it('scores demand/supply and flags anomalies', () => {
    const s = computeMarketSignals(listings);
    expect(s[0]!.category).toBe('Watches');
    expect(s[0]!.demand_score).toBeGreaterThanOrEqual(80);
    const types = detectAnomalies(s).map((a) => `${a.type}:${a.category}`);
    expect(types).toContain('demand_spike:Watches');
    expect(types).toContain('oversupply:Scarves');
  });
  it('forecasts with bands', () => {
    expect(forecastFrom(computeMarketSignals(listings), 'Watches').recommendation).toMatch(/High demand/);
    expect(forecastFrom([], 'Nope')).toMatchObject({ confidence: 0.2, recommendation: 'Insufficient data for forecast.' });
  });
});

describe('logistics (port)', () => {
  it('drops slow services for very high value and prefers insured carriers', () => {
    const r = quoteLogistics({ weight_oz: 20, value_cents: 150000, category: 'Watches' });
    expect(r.quotes.every((q) => q.estimated_days <= 3)).toBe(true);
    expect(r.quotes.every((q) => q.insurance_included)).toBe(true);
    expect(r.notes).toMatch(/signature/);
  });
});

describe('model-backed engines', () => {
  it('next best action uses the model when valid, rules otherwise', async () => {
    const read = tx({ intelligence_signals: [{ kind: 'wishlist_add', payload: { category: 'Bags' }, context: null, created_at: now }] });
    const m = await nextBestActionEngine.handle({ intent: 'next_best_action', payload: {}, userId: 'u', read, model: fakeModel('{"action":"join_scale","reason":"r","confidence":0.9}') });
    expect(m.result).toMatchObject({ action: 'join_scale', source: 'model' });
    const bad = await nextBestActionEngine.handle({ intent: 'next_best_action', payload: {}, userId: 'u', read, model: fakeModel('{"action":"hack","confidence":1}') });
    expect(bad.result).toMatchObject({ action: 'browse_category', source: 'rules' });
  });
  it('recs fall back to the catalog when the model returns nothing', async () => {
    const read = tx({ intelligence_signals: [] });
    const agg = tx({ exchange_listings: [{ title: 'Kelly 28', category: 'Bags', asking_price_cents: 1200000 }] });
    const r = await personalizedRecsEngine.handle({ intent: 'personalized_recs', payload: { count: 3 }, userId: 'u', read, agg, model: fakeModel('') });
    expect(r.result).toMatchObject({ source: 'catalog', recommendations: [{ title: 'Kelly 28', price_range: '$12000' }] });
  });
});
