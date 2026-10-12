// The Bag, the Registry, the Lab and the Switchboard — the same tables and queries as the web rooms:
//   bag      → src/app/api/bag/items (+ [id] PATCH/DELETE)            bag_items, owner-only
//   registry → src/app/api/registry/items, /registry/outings          registry_items, outings
//   lab      → /api/lab/jobs (+ /:id, /:id/approve, /:id/discard) — media_jobs
//   lines    → src/app/api/switchboard/accounts                        social_accounts, owner read-only
// The bag/registry/switchboard routes read the cookie only; see db.ts for how the app reaches the same rows.
import {api} from '../api';
import {supabase} from '../supabase';
import {asMember, ok, pgFail, viaRoute, type Res} from './db';

/* ─────────────── Bag (the member's collection) ─────────────── */

export type Edition = 'finesse' | 'carpe_diem';
export type BagItem = {id: string; name: string; brand: string | null; category: string | null; value_est_cents: number | null; color: string | null; acquired_year: string | null; photo_url: string | null; note: string | null; edition: Edition; created_at: string};

export const readBag = (edition: Edition) => asMember<{items: BagItem[]}>(async (uid) => {
  const {data, error} = await supabase.from('bag_items').select('*').eq('user_id', uid).eq('edition', edition).order('created_at', {ascending: false});
  return error ? pgFail(error, 'Nothing was loaded.') : ok({items: (data ?? []) as BagItem[]});
});

export type NewBagItem = {name: string; brand: string; category: string; value_est_cents?: number; color?: string; acquired_year?: string; note?: string; edition: Edition};

export function addBagItem(x: NewBagItem): Promise<Res<{item?: BagItem}>> {
  const json = {name: x.name.trim(), brand: x.brand.trim(), category: x.category, value_est_cents: x.value_est_cents ?? 0,
    color: x.color?.trim() || undefined, acquired_year: x.acquired_year?.trim() || undefined, note: x.note?.trim() || undefined, edition: x.edition};
  return viaRoute<{item?: BagItem}>('/api/bag/items', {method: 'POST', json}, async (uid) => {
    const {data, error} = await supabase.from('bag_items').insert({
      user_id: uid, name: json.name, brand: json.brand, category: json.category || 'other', value_est_cents: json.value_est_cents,
      color: json.color ?? null, acquired_year: json.acquired_year ?? null, photo_url: null, note: json.note ?? null, edition: json.edition,
    }).select().single();
    return error ? pgFail(error, 'Nothing was saved.') : ok({item: data as BagItem}, 201);
  });
}

export function updateBagNote(id: string, note: string): Promise<Res<{item?: BagItem}>> {
  return viaRoute<{item?: BagItem}>(`/api/bag/items/${id}`, {method: 'PATCH', json: {note}}, async (uid) => {
    const {data, error} = await supabase.from('bag_items').update({note, updated_at: new Date().toISOString()}).eq('id', id).eq('user_id', uid).select().single();
    return error ? pgFail(error, 'Nothing was saved.') : ok({item: data as BagItem});
  });
}

export function deleteBagItem(id: string): Promise<Res<{ok?: boolean}>> {
  return viaRoute<{ok?: boolean}>(`/api/bag/items/${id}`, {method: 'DELETE'}, async (uid) => {
    const {error} = await supabase.from('bag_items').delete().eq('id', id).eq('user_id', uid);
    return error ? pgFail(error, 'Nothing was removed.') : ok({ok: true});
  });
}

/* ─────────────── Registry ─────────────── */

export type Wish = {id: string; title: string; brand: string | null; price_cents: number | null; pledged_cents: number | null; category: string | null; occasion: string | null; photo_url: string | null; source: string | null};
export type Outing = {id: string; title: string; partner: string; occasion_type: string; date: string | null; note: string; status: string};

/** GET /api/registry/items + /api/registry/outings, as the member. */
export const readRegistry = () => asMember<{items: Wish[]; outings: Outing[]}>(async (uid) => {
  const [items, outings] = await Promise.all([
    supabase.from('registry_items').select('id, name, brand, price_cents, pledged_cents, category, occasion, image_url, source')
      .eq('user_id', uid).eq('purchased', false).order('created_at', {ascending: false}),
    supabase.from('outings').select('id, title, partner, occasion_type, date_at, note, status').eq('host_id', uid).order('created_at', {ascending: false}),
  ]);
  if (items.error) return pgFail(items.error, 'Nothing was loaded.');
  if (outings.error) return pgFail(outings.error, 'Nothing was loaded.');
  type ItemRow = {id: string; name: string; brand: string | null; price_cents: number | null; pledged_cents: number | null; category: string | null; occasion: string | null; image_url: string | null; source: string | null};
  type OutingRow = {id: string; title: string; partner: string | null; occasion_type: string | null; date_at: string | null; note: string | null; status: string};
  return ok({
    items: ((items.data ?? []) as ItemRow[]).map((r) => ({id: r.id, title: r.name, brand: r.brand, price_cents: r.price_cents, pledged_cents: r.pledged_cents, category: r.category, occasion: r.occasion, photo_url: r.image_url, source: r.source})),
    outings: ((outings.data ?? []) as OutingRow[]).map((r) => ({id: r.id, title: r.title, partner: r.partner ?? '', occasion_type: r.occasion_type ?? '', date: r.date_at, note: r.note ?? '', status: r.status})),
  });
});

/**
 * Add a wish. Straight to registry_items as the member (the route's own insert, under RLS): POST /api/registry/items
 * answers a cookie-less call with a fake "demo_" success, so it can't be used from the app until it reads bearer auth.
 */
export const addRegistryWish = (w: {title: string; brand?: string; price_cents: number; category?: string; occasion?: string}) => asMember<{id?: string}>(async (uid) => {
  const {data, error} = await supabase.from('registry_items').insert({
    user_id: uid, name: w.title.trim(), brand: w.brand?.trim() || null, price_cents: w.price_cents, category: w.category ?? 'Other',
    occasion: w.occasion?.trim() || null, source: 'upload', image_url: null,
  }).select('id').single();
  return error ? pgFail(error, 'Nothing was saved.') : ok({id: (data as {id: string}).id}, 201);
});

export function addOuting(o: {title: string; partner?: string; occasion_type?: string; date?: string; note?: string}): Promise<Res<{outing?: Outing}>> {
  const json = {title: o.title.trim(), partner: o.partner?.trim() || undefined, occasion_type: o.occasion_type || undefined, date: o.date || undefined, note: o.note?.trim() || undefined};
  return viaRoute<{outing?: Outing}>('/api/registry/outings', {method: 'POST', json}, async (uid) => {
    const {data, error} = await supabase.from('outings').insert({
      host_id: uid, title: json.title, partner: json.partner ?? null, occasion_type: json.occasion_type ?? null, date_at: json.date || null, note: json.note ?? null, status: 'open',
    }).select('id').single();
    return error ? pgFail(error, 'Nothing was saved.') : ok({outing: {id: (data as {id: string}).id, title: json.title, partner: json.partner ?? '', occasion_type: json.occasion_type ?? '', date: json.date ?? null, note: json.note ?? '', status: 'open'}}, 201);
  });
}

/* ─────────────── Lab (src/app/api/lab/jobs — bearer-aware) ─────────────── */

export type LabJob = {id: string; type: string; prompt: string; style: string | null; status: string; result_url: string | null; result_mime: string | null; error_message: string | null; created_at: string};
export type Studio = {type: string; name: string; vendor: string; connected: boolean};
export type LabData = {open: boolean; jobs: LabJob[]; studios: Studio[]};
const LAB_STATUS: Record<string, string> = {queued: 'Queued', needs_key: 'Studio not connected · saved', processing: 'Developing', complete: 'Ready for your review', failed: 'Failed', approved: 'Kept in your library', discarded: 'Discarded'};
export const labStatus = (s: string) => LAB_STATUS[s] ?? s;

/** GET /api/lab/jobs. A 404 means this server doesn't have the Lab's jobs route yet → `open: false`. */
export async function readLab(): Promise<Res<LabData>> {
  const r = await api<{jobs?: LabJob[]; studios?: Studio[]}>('/api/lab/jobs');
  if (r.status === 404) return ok({open: false, jobs: [], studios: []});
  if (!r.ok) return {ok: false, status: r.status, body: {...r.body, open: true, jobs: [], studios: []}};
  return ok({open: true, jobs: Array.isArray(r.body.jobs) ? r.body.jobs : [], studios: Array.isArray(r.body.studios) ? r.body.studios : []});
}

/** POST /api/lab/jobs {type, prompt}. If the studio's vendor isn't connected the server keeps a 'needs_key' draft and sends nothing. */
export function startLabJob(type: string, prompt: string) {
  return api<{job?: LabJob; message?: string; error?: string}>('/api/lab/jobs', {method: 'POST', json: {type, prompt: prompt.trim().slice(0, 1000)}});
}

export function labAct(id: string, act: 'check' | 'approve' | 'discard') {
  return act === 'check'
    ? api<{job?: LabJob; message?: string; error?: string}>(`/api/lab/jobs/${id}`)
    : api<{job?: LabJob; message?: string; error?: string}>(`/api/lab/jobs/${id}/${act}`, {method: 'POST'});
}

/* ─────────────── Switchboard (read-only status) ─────────────── */

export type Line = {platform: string; connected_at: string | null};
export type Broadcast = {id: string; platforms: string[] | null; content: string | null; status: string | null; created_at: string};

/**
 * Connected lines = rows with a real OAuth token (20261016_w3_switchboard.sql: connected implies access_token_enc).
 * The token itself is never selected — the filter runs on the server.
 */
export const readSwitchboard = () => asMember<{lines: Line[]; broadcasts: Broadcast[]}>(async (uid) => {
  const [acc, bc] = await Promise.all([
    supabase.from('social_accounts').select('platform, connected_at').eq('user_id', uid).eq('connected', true).not('access_token_enc', 'is', null),
    supabase.from('social_broadcasts').select('id, platforms, content, status, created_at').eq('user_id', uid).order('created_at', {ascending: false}).limit(20),
  ]);
  if (acc.error) return pgFail(acc.error, 'Nothing was loaded.');
  return ok({lines: (acc.data ?? []) as Line[], broadcasts: bc.error ? [] : ((bc.data ?? []) as Broadcast[])});
});
