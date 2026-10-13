// Scale, the Exchange and the Embassy — the same data as the web rooms:
//   scale    → scale_deals (open), read as the member exactly like src/app/(hotel)/scale/page.tsx;
//              joining is POST /api/scale/join (bearer-aware: a pledge, never a charge)
//   exchange → src/app/api/exchange/{listings,list,offer} (cookie-only routes — see db.ts)
//   embassy  → scale_deals pipeline as src/app/(hotel)/embassy/page.tsx maps it; POST /api/embassy/deals
import {api} from '../api';
import {supabase} from '../supabase';
import {asMember, ok, pgFail, viaRoute, type Res} from './db';
import {dealTier, pipelineStatus, savingsPct, type ScaleDeal} from './logic';
import type {Side} from '../deco';

/* ─────────────── Scale ─────────────── */

export const readScaleDeals = () => asMember<{deals: ScaleDeal[]}>(async () => {
  const {data, error} = await supabase.from('scale_deals')
    .select('id, title, brand, description, image_url, original_price_cents, group_price_cents, goal_count, current_count, category, deadline, status')
    .eq('status', 'open').order('created_at', {ascending: false});
  return error ? pgFail(error, 'Nothing was loaded.') : ok({deals: (data ?? []) as ScaleDeal[]});
});

/** A pledge — no charge (web scale/page.tsx joinDeal). */
export function joinScale(deal: ScaleDeal, side: Side) {
  return api<{state?: string; message?: string; error?: string}>('/api/scale/join', {method: 'POST', json: {deal_id: deal.id, amount_cents: deal.group_price_cents, track: side === 'him' ? 'carpe_diem' : 'finesse'}});
}

/* ─────────────── Exchange ─────────────── */

export type Listing = {id: string; seller_id: string; title: string; description: string | null; brand: string | null; size: string | null; condition: string | null;
  asking_price_cents: number; category: string | null; photo_urls: string[] | null; status: string; platform_fee_cents?: number | null; seller_receives_cents?: number | null; created_at: string};
export type Offer = {id: string; listing_id: string; buyer_id: string; offer_price_cents: number; message: string | null; status: string; created_at: string; exchange_listings?: Listing | null};

export const EX_CATEGORIES = ['All', 'Sneakers', 'Fashion', 'Accessories', 'Tech', 'Collectibles'];
export const CONDITIONS: Array<[string, string]> = [['new_with_tags', 'New w/ tags'], ['excellent', 'Excellent'], ['good', 'Good'], ['fair', 'Fair']];

/** Browse (GET /api/exchange/listings): active listings, newest first, 24 a page. */
export const readListings = (category: string) => asMember<{listings: Listing[]}>(async () => {
  let q = supabase.from('exchange_listings').select('*').eq('status', 'active').order('created_at', {ascending: false}).range(0, 23);
  if (category && category !== 'All') q = q.eq('category', category);
  const {data, error} = await q;
  return error ? pgFail(error, 'Nothing was loaded.') : ok({listings: (data ?? []) as Listing[]});
});

/** My deals (?mine=1 and ?offers=1): what I listed, offers made to me, and offers I made. */
export const readMyDeals = () => asMember<{mine: Listing[]; received: Offer[]; made: Offer[]}>(async (uid) => {
  const [mine, made] = await Promise.all([
    supabase.from('exchange_listings').select('*').eq('seller_id', uid).order('created_at', {ascending: false}).range(0, 23),
    supabase.from('exchange_offers').select('*, exchange_listings(*)').eq('buyer_id', uid).order('created_at', {ascending: false}).range(0, 23),
  ]);
  if (mine.error) return pgFail(mine.error, 'Nothing was loaded.');
  if (made.error) return pgFail(made.error, 'Nothing was loaded.');
  const ids = ((mine.data ?? []) as Listing[]).map((l) => l.id);
  const received = ids.length
    ? await supabase.from('exchange_offers').select('*').in('listing_id', ids).order('created_at', {ascending: false}).limit(50)
    : {data: [], error: null};
  return ok({mine: (mine.data ?? []) as Listing[], received: received.error ? [] : ((received.data ?? []) as Offer[]), made: (made.data ?? []) as Offer[]});
});

export type NewListing = {title: string; brand?: string; size?: string; condition: string; asking_price_cents: number; category?: string; description?: string};

/**
 * POST /api/exchange/list (bearer-aware). The route is the only path for a listing: it checks the house rules
 * (403 terms_required), runs the text filter (422) and the photo rule — no direct-insert fallback that skips them.
 */
export function listItem(x: NewListing): Promise<Res<{id?: string; platform_fee_cents?: number; seller_receives_cents?: number}>> {
  const json = {title: x.title.trim(), brand: x.brand?.trim() || undefined, size: x.size?.trim() || undefined, condition: x.condition, asking_price_cents: x.asking_price_cents,
    category: x.category || undefined, description: x.description?.trim() || undefined, photo_urls: [] as string[]};
  return api<{id?: string; platform_fee_cents?: number; seller_receives_cents?: number}>('/api/exchange/list', {method: 'POST', json}) as Promise<Res<{id?: string; platform_fee_cents?: number; seller_receives_cents?: number}>>;
}

/** An offer (POST /api/exchange/offer) — with the route's own checks when it runs as the member. */
export function makeOffer(listing: Listing, offerCents: number, message?: string): Promise<Res<{id?: string}>> {
  const json = {listing_id: listing.id, offer_price_cents: offerCents, message: message?.trim() || undefined};
  return viaRoute<{id?: string}>('/api/exchange/offer', {method: 'POST', json}, async (uid) => {
    if (offerCents < 100) return {ok: false, status: 400, body: {message: 'Minimum offer is $1.'}};
    const {data: l, error: le} = await supabase.from('exchange_listings').select('seller_id, status').eq('id', listing.id).single();
    if (le || !l) return {ok: false, status: 404, body: {message: 'Listing not found.'}};
    if ((l as {seller_id: string}).seller_id === uid) return {ok: false, status: 400, body: {message: 'You can’t offer on your own listing.'}};
    if ((l as {status: string}).status !== 'active') return {ok: false, status: 400, body: {message: 'That listing is no longer active.'}};
    const {data, error} = await supabase.from('exchange_offers').insert({listing_id: listing.id, buyer_id: uid, offer_price_cents: offerCents, message: json.message ?? null, status: 'pending'}).select('id').single();
    return error ? pgFail(error, 'No offer was sent.') : ok({id: (data as {id: string}).id});
  });
}

/* ─────────────── Embassy ─────────────── */

export type PipelineDeal = {id: string; brand: string; item: string; retail_cents: number; members_cents: number; status: 'live' | 'pending' | 'review'; category: string; tier: string; savings: number; current: number; goal: number};

export const readEmbassy = () => asMember<{deals: PipelineDeal[]}>(async () => {
  const {data, error} = await supabase.from('scale_deals')
    .select('id, title, brand, description, original_price_cents, group_price_cents, goal_count, current_count, category, status')
    .order('created_at', {ascending: false});
  if (error) return pgFail(error, 'Nothing was loaded.');
  return ok({deals: ((data ?? []) as ScaleDeal[]).map((d) => ({
    id: d.id, brand: d.brand ?? '—', item: d.title, retail_cents: d.original_price_cents, members_cents: d.group_price_cents,
    status: pipelineStatus(d), category: d.category ?? 'Accessories', tier: dealTier(d.original_price_cents),
    savings: savingsPct(d.original_price_cents, d.group_price_cents), current: d.current_count, goal: d.goal_count,
  }))});
});

export const EMBASSY_CATEGORIES = ['Bags', 'Clothes', 'Shoes', 'Accessories', 'Outerwear', 'Fragrance', 'Jewelry', 'Other'];

/** Suggest a deal for the house to source (POST /api/embassy/deals — pending ops review). */
export function suggestDeal(d: {brand: string; item: string; retail?: number; members?: number; category?: string}) {
  return api<{success?: boolean; message?: string; error?: string}>('/api/embassy/deals', {method: 'POST', json: {
    brand: d.brand.trim(), item: d.item.trim(), source: 'Member suggestion', category: d.category,
    ...(d.retail ? {retail_price: d.retail} : {}), ...(d.members ? {members_price: d.members} : {}),
  }});
}
