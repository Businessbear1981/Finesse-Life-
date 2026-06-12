// ─── Behavioral Intelligence Engine ──────────────────────────────────────────
// Computes consumer buying tendencies from accumulated signals.
// Self-improves as users interact — no central data store of raw behavior,
// only derived insights. Federated-learning ready: weights can be trained
// locally and only gradient aggregates shared.

import { complete } from '@/lib/ai';
import { getRecentSignals, getSignalCounts } from './bus';
import type { BehavioralProfile, Signal } from './types';

// Signal weights: higher = stronger buying intent signal
const SIGNAL_WEIGHTS: Record<string, number> = {
  checkout_complete: 12,
  accept_offer: 10,
  vault_fund: 9,
  scale_join: 8,
  make_offer: 7,
  add_to_registry: 6,
  wishlist_add: 5,
  purchase_intent: 5,
  checkout_start: 4,
  list_item: 3,
  view_listing: 1.5,
  view_item: 1,
  category_browse: 0.5,
  search_query: 0.5,
};

// Temporal decay: signals older than 30 days count for less
function temporalWeight(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return 1.0;
  if (ageDays <= 14) return 0.85;
  if (ageDays <= 30) return 0.6;
  return 0.3;
}

function computeCategoryAffinities(signals: Signal[]): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const signal of signals) {
    const category =
      ((signal.payload.category as string) ?? (signal.payload.cat as string))?.trim();
    if (!category || category === 'All') continue;

    const intentWeight = SIGNAL_WEIGHTS[signal.kind] ?? 1;
    const decay = temporalWeight(signal.created_at ?? new Date().toISOString());
    scores[category] = (scores[category] ?? 0) + intentWeight * decay;
  }

  const vals: number[] = Object.values(scores);
  const max = Math.max(...vals, 1);
  return Object.fromEntries(
    Object.entries(scores)
      .map(([k, v]) => [k, Math.round((v / max) * 1000) / 1000])
      .sort(([, a], [, b]) => (b as number) - (a as number)),
  );
}

function computeBrandAffinities(signals: Signal[]): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const signal of signals) {
    const brand = (signal.payload.brand as string)?.trim();
    if (!brand) continue;
    const intentWeight = SIGNAL_WEIGHTS[signal.kind] ?? 1;
    const decay = temporalWeight(signal.created_at ?? new Date().toISOString());
    scores[brand] = (scores[brand] ?? 0) + intentWeight * decay;
  }

  const brandVals: number[] = Object.values(scores);
  const max = Math.max(...brandVals, 1);
  return Object.fromEntries(
    Object.entries(scores)
      .map(([k, v]) => [k, Math.round((v / max) * 1000) / 1000])
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 20),
  );
}

function computePriceRange(signals: Signal[]): { min_cents: number; max_cents: number } {
  const prices: number[] = [];

  for (const signal of signals) {
    const p =
      (signal.payload.offer_price_cents as number) ??
      (signal.payload.asking_price_cents as number) ??
      (signal.payload.price_cents as number) ??
      (signal.payload.members_cents as number);
    if (typeof p === 'number' && p > 0 && p < 100_000_00) prices.push(p);
  }

  if (prices.length < 3) return { min_cents: 0, max_cents: 100_000 };

  const sorted = [...prices].sort((a, b) => a - b);
  const p15 = sorted[Math.floor(sorted.length * 0.15)] ?? sorted[0];
  const p85 = sorted[Math.floor(sorted.length * 0.85)] ?? sorted[sorted.length - 1];
  return { min_cents: p15, max_cents: p85 };
}

function computeBuyingVelocity(
  counts: Record<string, number>,
): BehavioralProfile['buying_velocity'] {
  const purchaseSignals =
    (counts['checkout_complete'] ?? 0) +
    (counts['accept_offer'] ?? 0) +
    (counts['vault_fund'] ?? 0);

  if (purchaseSignals >= 5) return 'high';
  if (purchaseSignals >= 2) return 'medium';
  return 'low';
}

function extractStyleSignals(signals: Signal[]): string[] {
  const tags = new Map<string, number>(); // tag → frequency

  for (const signal of signals) {
    if (Array.isArray(signal.context?.style_tags)) {
      for (const t of signal.context.style_tags as string[]) {
        tags.set(t, (tags.get(t) ?? 0) + 1);
      }
    }
    if (Array.isArray(signal.payload.style_tags)) {
      for (const t of signal.payload.style_tags as string[]) {
        tags.set(t, (tags.get(t) ?? 0) + 1);
      }
    }
  }

  return Array.from(tags.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([tag]) => tag);
}

export async function buildBehavioralProfile(userId: string): Promise<BehavioralProfile> {
  const [signals, counts] = await Promise.all([
    getRecentSignals(userId, undefined, 250),
    getSignalCounts(userId, 60),
  ]);

  return {
    user_id: userId,
    category_affinities: computeCategoryAffinities(signals),
    brand_affinities: computeBrandAffinities(signals),
    price_range_preference: computePriceRange(signals),
    buying_velocity: computeBuyingVelocity(counts),
    style_signals: extractStyleSignals(signals),
    last_updated: new Date().toISOString(),
  };
}

export async function predictNextAction(
  userId: string,
  currentContext: { page: string; item?: Record<string, unknown> },
): Promise<{ action: string; reason: string; confidence: number }> {
  const profile = await buildBehavioralProfile(userId);

  const topCategories = Object.entries(profile.category_affinities)
    .slice(0, 4)
    .map(([k]) => k);

  const topBrands = Object.entries(profile.brand_affinities)
    .slice(0, 3)
    .map(([k]) => k);

  const prompt = `You are the Finesse intelligence engine. Predict the single most useful next action for this member.

Member profile:
- Top categories: ${topCategories.join(', ') || 'not yet established'}
- Affinity brands: ${topBrands.join(', ') || 'not yet established'}
- Buying velocity: ${profile.buying_velocity}
- Price range: $${Math.round(profile.price_range_preference.min_cents / 100)}–$${Math.round(profile.price_range_preference.max_cents / 100)}
- Style signals: ${profile.style_signals.slice(0, 5).join(', ') || 'none yet'}
- Current page: ${currentContext.page}
${currentContext.item ? `- Currently viewing: ${JSON.stringify(currentContext.item)}` : ''}

Valid actions: browse_category, make_offer, add_to_registry, check_vault, list_item, explore_market, join_scale, complete_nightvision, explore_exchange

Respond with JSON only — no markdown, no prose:
{"action":"string","reason":"one sentence","confidence":0.0}`;

  try {
    const text = await complete(prompt, { model: 'anthropic/claude-haiku-4-5-20251001' });
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as {
        action: string;
        reason: string;
        confidence: number;
      };
      if (parsed.action && typeof parsed.confidence === 'number') return parsed;
    }
  } catch {
    // Fallback
  }

  // Data-driven fallback: suggest action based on top category
  const topCat = topCategories[0];
  return {
    action: topCat ? 'browse_category' : 'complete_nightvision',
    reason: topCat
      ? `Your ${topCat} affinity is highest — browse new listings.`
      : 'Complete your style profile to unlock personalized intelligence.',
    confidence: 0.35,
  };
}

// Generate personalized item recommendations
export async function generatePersonalizedRecs(
  userId: string,
  count = 5,
): Promise<Array<{ title: string; category: string; price_range: string; why: string }>> {
  const profile = await buildBehavioralProfile(userId);

  const topCats = Object.entries(profile.category_affinities).slice(0, 3).map(([k]) => k);
  const topBrands = Object.entries(profile.brand_affinities).slice(0, 4).map(([k]) => k);
  const priceMin = Math.round(profile.price_range_preference.min_cents / 100);
  const priceMax = Math.round(profile.price_range_preference.max_cents / 100);

  const prompt = `You are the Finesse intelligence engine. Generate ${count} specific luxury item recommendations for this member.

Profile:
- Top categories: ${topCats.join(', ') || 'Fashion, Accessories'}
- Affinity brands: ${topBrands.join(', ') || 'luxury brands'}
- Price range: $${priceMin}–$${priceMax}
- Style signals: ${profile.style_signals.slice(0, 6).join(', ')}

Rules: Be hyper-specific (exact model names). Match price range. Prioritize resale availability. Only luxury/premium items.

Return JSON only:
{"recommendations":[{"title":"string","category":"string","price_range":"$X–$Y","why":"one sentence"}]}`;

  try {
    const text = await complete(prompt, { model: 'anthropic/claude-haiku-4-5-20251001' });
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as {
        recommendations: Array<{ title: string; category: string; price_range: string; why: string }>;
      };
      if (Array.isArray(parsed.recommendations)) return parsed.recommendations.slice(0, count);
    }
  } catch {
    // Fallback
  }

  return [];
}
