// The Wardrobe's data — the same tables and queries as src/app/api/wardrobe/{looks,looks/[id]/like,wishlist}.
// Those routes read the cookie only, so reads run as the member under RLS (wardrobe_looks read-all /
// own-write, wardrobe_look_likes own, wardrobe_wishlist own); writes try the route first (see db.ts).
import {apiUpload} from '../api';
import {supabase} from '../supabase';
import {asMember, ok, pgFail, viaRoute, type Res} from './db';

export type Look = {id: string; user_id: string; photo_url: string | null; caption: string | null; brands: string[] | null; likes_count: number; created_at: string;
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
  const looks = (data ?? []) as Look[];
  const ids = looks.map((l) => l.id);
  const mine = ids.length ? await supabase.from('wardrobe_look_likes').select('look_id').eq('user_id', uid).in('look_id', ids) : {data: [], error: null};
  return ok({looks, liked: ((mine.data ?? []) as Array<{look_id: string}>).map((r) => r.look_id)});
});

export const readWishlist = () => asMember<{items: Wish[]}>(async (uid) => {
  const {data, error} = await supabase.from('wardrobe_wishlist').select('*').eq('user_id', uid).order('created_at', {ascending: false});
  return error ? pgFail(error, 'Nothing was loaded.') : ok({items: (data ?? []) as Wish[]});
});

/** Upload the photo (POST /api/upload, type photo — as the web does), then save the look. */
export async function postLook(file: {uri: string; mimeType?: string | null; fileName?: string | null}, caption: string, brands: string[]): Promise<Res<{look?: Look}>> {
  const up = await apiUpload<{url?: string}>('/api/upload', file, {type: 'photo'});
  if (!up.ok || !up.body.url) {
    const why = up.status === 0 ? 'The house line is down.' : up.status === 413 ? 'That photo is over 5 MB.' : up.status === 415 ? 'JPEG, PNG, WebP or GIF only.' : up.body.error ?? up.body.message ?? 'The photo could not be uploaded.';
    return {ok: false, status: up.status, body: {message: `${why} Nothing was posted.`}};
  }
  const json = {photo_url: up.body.url, brands, caption: caption.slice(0, 120) || null};
  return viaRoute<{look?: Look}>('/api/wardrobe/looks', {method: 'POST', json}, async (uid) => {
    const {data, error} = await supabase.from('wardrobe_looks').insert({user_id: uid, ...json}).select().single();
    return error ? pgFail(error, 'Nothing was posted.') : ok({look: data as Look}, 201);
  });
}

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
