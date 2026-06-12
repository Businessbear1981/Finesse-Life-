// ─── Market Intelligence Engine ───────────────────────────────────────────────
// Real-time supply/demand analysis from Exchange + Scale data.
// Powers price recommendations, demand forecasting, and trend detection.

import { createServiceClient } from '@/lib/supabase/service';
import { complete } from '@/lib/ai';
import type { MarketSignal, PriceRecommendation } from './types';

interface RawListing {
  category: string;
  status: string;
  asking_price_cents: number;
  created_at: string;
  views: number;
  brand?: string;
}

// Pull and cache market signals from Exchange data
export async function getMarketSignals(category?: string): Promise<MarketSignal[]> {
  const db = createServiceClient();

  // Check cache first
  const cacheKey = `market_signals_${category ?? 'all'}`;
  const { data: cached } = await db
    .from('market_intelligence_cache')
    .select('data, expires_at')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached?.data) {
    return (cached.data as { signals: MarketSignal[] }).signals;
  }

  // Compute fresh
  let q = db
    .from('exchange_listings')
    .select('category, status, asking_price_cents, created_at, views, brand');

  if (category) q = q.eq('category', category);

  const { data: listings } = await q
    .order('created_at', { ascending: false })
    .limit(1000);

  if (!listings || listings.length === 0) return [];

  const byCategory: Record<string, RawListing[]> = {};
  for (const l of listings as RawListing[]) {
    const cat = l.category ?? 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(l);
  }

  const signals: MarketSignal[] = Object.entries(byCategory).map(([cat, items]) => {
    const sold = items.filter((i) => i.status === 'sold');
    const active = items.filter((i) => i.status === 'active');
    const avgViews = items.reduce((s, i) => s + (i.views ?? 0), 0) / Math.max(items.length, 1);

    const soldRatio = sold.length / Math.max(items.length, 1);
    const demandScore = Math.min(
      100,
      Math.round(soldRatio * 65 + Math.min(avgViews / 8, 35)),
    );
    const supplyScore = Math.min(
      100,
      Math.round((active.length / Math.max(sold.length + 1, 1)) * 60),
    );

    // Price trend: compare 2nd half (older) vs 1st half (recent) by creation date
    const sorted = [...items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const half = Math.ceil(sorted.length / 2);
    const recentAvg =
      sorted.slice(0, half).reduce((s, i) => s + i.asking_price_cents, 0) /
      Math.max(half, 1);
    const olderAvg =
      sorted.slice(half).reduce((s, i) => s + i.asking_price_cents, 0) /
      Math.max(sorted.length - half, 1);

    let priceTrend: MarketSignal['price_trend'] = 'stable';
    if (recentAvg > olderAvg * 1.06) priceTrend = 'rising';
    else if (recentAvg < olderAvg * 0.94) priceTrend = 'falling';

    const allPrices = items.map((i) => i.asking_price_cents).filter((p) => p > 0);
    const avgPrice =
      allPrices.length > 0
        ? Math.round(allPrices.reduce((s, p) => s + p, 0) / allPrices.length)
        : 0;

    // Days to sell: average age of sold listings
    const avgDaysToSell =
      sold.length > 0
        ? Math.round(
            sold.reduce((sum, s) => {
              const days =
                (Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / sold.length,
          )
        : 30;

    return {
      category: cat,
      demand_score: demandScore,
      supply_score: supplyScore,
      price_trend: priceTrend,
      avg_days_to_sell: avgDaysToSell,
      avg_price_cents: avgPrice,
      listing_count: items.length,
    } satisfies MarketSignal;
  });

  // Cache for 1 hour
  await db
    .from('market_intelligence_cache')
    .upsert({
      cache_key: cacheKey,
      data: { signals },
      computed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .eq('cache_key', cacheKey);

  return signals.sort((a, b) => b.demand_score - a.demand_score);
}

// AI-powered price recommendation for a new listing
export async function recommendListingPrice(item: {
  title: string;
  brand?: string;
  category: string;
  condition: string;
}): Promise<PriceRecommendation> {
  const db = createServiceClient();

  const keyword = (item.brand ?? item.title.split(' ').slice(0, 2).join(' ')).trim();

  const { data: comps } = await db
    .from('exchange_listings')
    .select('title, asking_price_cents, condition, status')
    .eq('category', item.category)
    .ilike('title', `%${keyword}%`)
    .order('created_at', { ascending: false })
    .limit(12);

  const compLines =
    comps && comps.length > 0
      ? (
          comps as Array<{
            title: string;
            asking_price_cents: number;
            condition: string;
            status: string;
          }>
        )
          .map(
            (c) =>
              `• ${c.title} — $${(c.asking_price_cents / 100).toFixed(0)} (${c.condition}, ${c.status})`,
          )
          .join('\n')
      : 'No direct comparables on platform.';

  const prompt = `You are the Finesse Exchange price intelligence engine. Recommend a listing price range.

Item: "${item.title}"${item.brand ? ` by ${item.brand}` : ''}
Category: ${item.category}
Condition: ${item.condition}

Recent Exchange data:
${compLines}

Consider: condition premium/discount, brand desirability, platform 8% fee.

Return JSON only:
{"recommended_cents":integer,"low_cents":integer,"high_cents":integer,"reasoning":"one sentence","confidence":0.0}`;

  try {
    const text = await complete(prompt, { model: 'anthropic/claude-haiku-4-5-20251001' });
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const p = JSON.parse(match[0]) as PriceRecommendation;
      if (p.recommended_cents && p.reasoning) return p;
    }
  } catch {
    // Fallback
  }

  // Data-driven fallback: median of comparables
  const compPrices =
    (comps as Array<{ asking_price_cents: number }>)
      ?.map((c) => c.asking_price_cents)
      .filter((p) => p > 0)
      .sort((a, b) => a - b) ?? [];

  const median =
    compPrices.length > 0 ? compPrices[Math.floor(compPrices.length / 2)] : 5000;

  return {
    recommended_cents: median,
    low_cents: Math.round(median * 0.85),
    high_cents: Math.round(median * 1.15),
    reasoning: `Based on ${compPrices.length} Exchange comparables.`,
    confidence: compPrices.length > 3 ? 0.65 : 0.3,
  };
}

// Detect anomalies — underpriced listings, dead categories, demand spikes
export async function detectMarketAnomalies(): Promise<
  Array<{ type: string; category: string; detail: string; urgency: 'low' | 'medium' | 'high' }>
> {
  const signals = await getMarketSignals();
  const anomalies: Array<{
    type: string;
    category: string;
    detail: string;
    urgency: 'low' | 'medium' | 'high';
  }> = [];

  for (const s of signals) {
    // Demand spike: high demand, low supply → opportunity for sellers
    if (s.demand_score >= 80 && s.supply_score <= 20) {
      anomalies.push({
        type: 'demand_spike',
        category: s.category,
        detail: `High demand (${s.demand_score}/100) with low supply — list ${s.category} items now.`,
        urgency: 'high',
      });
    }

    // Oversupply: too many listings, low demand → buyers market
    if (s.supply_score >= 80 && s.demand_score <= 30) {
      anomalies.push({
        type: 'oversupply',
        category: s.category,
        detail: `${s.category} is oversupplied — buyers can negotiate harder.`,
        urgency: 'medium',
      });
    }

    // Price pressure: falling prices with decent demand
    if (s.price_trend === 'falling' && s.demand_score >= 50) {
      anomalies.push({
        type: 'price_pressure',
        category: s.category,
        detail: `${s.category} prices falling despite demand — potential arbitrage window.`,
        urgency: 'medium',
      });
    }

    // Fast-moving: items selling quickly
    if (s.avg_days_to_sell <= 3 && s.demand_score >= 70) {
      anomalies.push({
        type: 'fast_moving',
        category: s.category,
        detail: `${s.category} items selling in avg ${s.avg_days_to_sell} days — high velocity market.`,
        urgency: 'low',
      });
    }
  }

  return anomalies.slice(0, 10);
}
