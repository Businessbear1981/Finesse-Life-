// The Wardrobe's data — the same tables and queries as src/app/api/wardrobe/{looks,looks/[id]/like,wishlist}.
// Reads run as the member under RLS (wardrobe_looks: hidden looks and blocked members' looks drop out —
// 20261019_r1_ugc.sql; likes and wishlist own-only). Posting a look goes through the route only (filters);
// likes and the private wishlist try the route first (see db.ts).
import {api, apiUpload} from '../api';
import {supabase} from '../supabase';
import {asMember, ok, pgFail, viaRoute, type Res} from './db';

export type Look = {id: string; user_id: string; photo_url: string | null; caption: string | null; brands: string[] | null; likes_count: number; created_at: string; moderation_hidden?: boolean | null;
  profiles?: {display_name?: string | null; username?: string | null; avatar_url?: string | null; city?: string | null} | null};
export type Wish = {id: string; brand: string; item: string; price_est_cents: number | null; added_label: string | null; created_at: string};

export const readMyLooks = () => asMember<{looks: Look[]}>(async (uid) => {
  const {data, error} = await supabase.from('wardrobe_looks').select('*').eq('user_id', uid).order('created_at', {ascending: false});
  return error ? pgFail(error, 'Nothing was loaded.') : ok({looks: (data ?? []) as Look[]});
});

/** Community feed (GET /api/wardrobe/looks?feed=true): most liked first, plus which ones I like. */
export const readFeed = () => asMember<{looks: Look[]; liked: string[]}>(async (uid) => {
  const {data, error} = await supabase.from('wardrobe_looks')
    .select('*, profiles:user_id(display_name, username, avatar_url, city)')
    .order('likes_count', {ascending: false}).order('created_at', {ascending: false}).limit(40);
  if (error) return pgFail(error, 'Nothing was loaded.');
  // RLS already drops hidden looks and blocked members' looks (20261019_r1_ugc.sql); the same rule is applied
  // here too so the floor is right on a server that hasn't had that migration yet.
  const blocks = await supabase.from('member_blocks').select('blocked_id').eq('blocker_id', uid);
  const blocked = new Set(((blocks.error ? [] : blocks.data) ?? []).map((b: {blocked_id: string}) => b.blocked_id));
  const looks = ((data ?? []) as Look[]).filter((l) => l.user_id === uid || (!l.moderation_hidden && !blocked.has(l.user_id)));
  const ids = looks.map((l) => l.id);
  const mine = ids.length ? await supabase.from('wardrobe_look_likes').select('look_id').eq('user_id', uid).in('look_id', ids) : {data: [], error: null};
  return ok({looks, liked: ((mine.data ?? []) as Array<{look_id: string}>).map((r) => r.look_id)});
});

export const readWishlist = () => asMember<{items: Wish[]}>(async (uid) => {
  const {data, error} = await supabase.from('wardrobe_wishlist').select('*').eq('user_id', uid).order('created_at', {ascending: false});
  return error ? pgFail(error, 'Nothing was loaded.') : ok({items: (data ?? []) as Wish[]});
});

/** Upload the look's photo (POST /api/upload, type photo — as the web does). Returns the stored URL. */
export async function uploadLookPhoto(file: {uri: string; mimeType?: string | null; fileName?: string | null}): Promise<Res<{url?: string}>> {
  const up = await apiUpload<{url?: string}>('/api/upload', file, {type: 'photo'});
  if (!up.ok || !up.body.url) {
    const why = up.status === 0 ? 'The house line is down.' : up.status === 401 ? 'Sign in first.' : up.status === 413 ? 'That photo is over 5 MB.' : up.status === 415 ? 'JPEG, PNG, WebP or GIF only.' : up.body.error ?? up.body.message ?? 'The photo could not be uploaded.';
    return {ok: false, status: up.status, body: {message: `${why} Nothing was posted.`}};
  }
  return ok({url: up.body.url});
}

/**
 * Save a look (POST /api/wardrobe/looks, bearer-aware). The route is the ONLY path: it checks the house rules
 * (403 terms_required), filters the caption and brands (422) and only accepts the member's own upload — there is
 * deliberately no direct-insert fallback that would skip those checks.
 */
export const saveLook = (photo_url: string, caption: string, brands: string[]) =>
  api<{look?: Look; error?: string; message?: string}>('/api/wardrobe/looks', {method: 'POST', json: {photo_url, brands, caption: caption.slice(0, 120) || null}});

/** Like / unlike (POST /api/wardrobe/looks/:id/like toggles). Returns the new state. */
export async function toggleLike(id: string, likedNow: boolean): Promise<Res<{liked?: boolean}>> {
  return viaRoute<{liked?: boolean}>(`/api/wardrobe/looks/${id}/like`, {method: 'POST'}, async (uid) => {
    // Under RLS the member can only add/remove their own like row; the shared counter is the route's job.
    const q = likedNow
      ? await supabase.from('wardrobe_look_likes').delete().eq('user_id', uid).eq('look_id', id)
      : await supabase.from('wardrobe_look_likes').insert({user_id: uid, look_id: id});
    return q.error ? pgFail(q.error) : ok({liked: !likedNow});
  });
}

export async function addWish(w: {brand: string; item: string; price_est_cents: number}): Promise<Res<{item?: Wish}>> {
  const added_label = new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const json = {brand: w.brand.trim(), item: w.item.trim(), price_est_cents: w.price_est_cents, added_label};
  return viaRoute<{item?: Wish}>('/api/wardrobe/wishlist', {method: 'POST', json}, async (uid) => {
    const {data, error} = await supabase.from('wardrobe_wishlist').insert({user_id: uid, ...json}).select().single();
    return error ? pgFail(error, 'Nothing was saved.') : ok({item: data as Wish}, 201);
  });
}

export async function removeWish(id: string): Promise<Res<{ok?: boolean}>> {
  return viaRoute<{ok?: boolean}>('/api/wardrobe/wishlist', {method: 'DELETE', json: {id}}, async (uid) => {
    const {error} = await supabase.from('wardrobe_wishlist').delete().eq('id', id).eq('user_id', uid);
    return error ? pgFail(error) : ok({ok: true});
  });
}
