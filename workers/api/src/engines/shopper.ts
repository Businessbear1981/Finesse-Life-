import type { Engine } from './types';
import { loadProfile } from './intelligence';
import { campaignView } from '../scale/service';

/**
 * Personal Shopper (skeleton). Builds a shortlist from the Exchange and open Scale campaigns within the
 * member's price band and top categories; when a shortlist item matches an open campaign it shows the
 * unit price, % saved and units to the next tier (Engines Spec: "Personal Shopper to Scale").
 * TODO: retailer/affiliate feeds, wholesaler quote ingestion, photo-based search (picture encouragement).
 */
export const shopperEngine: Engine = {
  id: 'personal_shopper', intents: ['shopper.shortlist', 'shopper.save'], consumes: ['campaign.opened'], emits: ['shopper.saved'],
  tier: 1, provider: 'internal', timeoutMs: 5000,
  async handle({ intent, payload, userId, read, agg }) {
    if (intent === 'shopper.save') {
      const p = payload as { title?: string; brand?: string; category?: string; price_cents?: number; source?: string; source_ref?: string; image_key?: string };
      if (!p.title || !p.source) throw new Error('title and source are required');
      const id = (await agg!.query<{ id: string }>(
        'insert into engines.shortlist_items(user_id, title, brand, category, price_cents, source, source_ref, image_key) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id',
        [userId, p.title, p.brand ?? null, p.category ?? null, p.price_cents ?? null, p.source, p.source_ref ?? null, p.image_key ?? null])).rows[0]!.id;
      return { kind: 'shopper.saved', result: { id }, events: [{ type: 'shopper.saved', payload: { category: p.category ?? null } }] };
    }
    const profile = await loadProfile(read, userId);
    const cats = Object.keys(profile.category_affinities).slice(0, 3);
    const max = Number(payload.max_cents ?? profile.price_range_preference.max_cents);
    const exchange = (await agg!.query<{ id: string; title: string; category: string; asking_price_cents: number }>(
      `select id, title, category, asking_price_cents from public.exchange_listings where status = 'active' and asking_price_cents <= $2
       and (cardinality($1::text[]) = 0 or category = any($1)) order by created_at desc limit 10`, [cats, max])).rows;
    const open = (await read.query<{ id: string }>("select id from scale.campaigns where status = 'open' order by closes_at limit 5")).rows;
    const campaigns = [];
    for (const c of open) {
      const v = await campaignView(agg!, c.id);
      campaigns.push({ id: v.id, title: v.title, unit_price_cents: v.unit_price_cents, saved_pct: v.saved_pct, next_tier: v.next_tier });
    }
    const saved = (await read.query('select id, title, category, price_cents, source from engines.shortlist_items order by created_at desc limit 20')).rows;
    return { kind: 'shopper.shortlist', result: { exchange, campaigns, saved, filters: { categories: cats, max_cents: max } } };
  },
};
