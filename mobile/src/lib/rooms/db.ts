// Shared plumbing for the wired rooms.
//
// Two ways to the same data:
//  • `api()` (lib/api.ts) for routes that read the member's bearer token (createClient from
//    src/lib/supabase/server.ts — posts, nova, nova/requests, stylist/analyze-photo, embassy/deals,
//    scrapbook/log, ballroom/*, carpe-diem/garage, integrations/alpaca, intelligence/market, upload).
//  • The member's own Supabase session under RLS, for tables whose web routes still authenticate by
//    COOKIE only (wardrobe/*, bag/*, registry/items|outings, exchange/*, switchboard/*). Those routes
//    answer a bearer call as signed out (empty lists / 401), so the app runs the SAME query the route
//    runs, as the member, under the same owner-only policies. `viaRoute` tries the route first for
//    writes and falls back to RLS only when the route said 401 while this device holds a session —
//    so the moment a route learns bearer auth, the app uses it without a release.
//
// NEVER use `viaRoute` (or any direct insert) for content other members see — Lounge posts, Wardrobe looks,
// Exchange listings, outings. Those go through their route only, because the route is where the house rules
// check and the text / photo filters run (src/lib/moderation.ts). If the route refuses, the member sees why.
import {api} from '../api';
import {supabase} from '../supabase';

export type Res<T> = {ok: boolean; status: number; body: T & {message?: string; error?: string}};
type PgError = {message?: string; code?: string; details?: string | null} | null;

export async function memberId(): Promise<string | null> {
  try {
    const {data} = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export const ok = <T>(body: T, status = 200): Res<T> => ({ok: true, status, body: body as Res<T>['body']});
export const signedOut = <T>(): Res<T> => ({ok: false, status: 401, body: {error: 'signed_out'} as Res<T>['body']});

/** Map a PostgREST / network error to the status codes the room states already understand. */
export function pgFail<T>(error: PgError, nothing = 'Nothing was changed.'): Res<T> {
  const msg = error?.message ?? '';
  if (!error?.code && /fetch|network|timed? ?out|load failed/i.test(msg)) {
    return {ok: false, status: 0, body: {message: `The house line is down. ${nothing}`} as Res<T>['body']};
  }
  // Table or column not there yet: the room's migration isn't applied on this server.
  if (error?.code === '42P01' || error?.code === 'PGRST205' || error?.code === '42703' || error?.code === 'PGRST204') {
    return {ok: false, status: 503, body: {error: 'room_not_open', message: 'This room opens once the house switches it on.'} as Res<T>['body']};
  }
  if (error?.code === '42501') return {ok: false, status: 403, body: {message: `The house didn’t allow that. ${nothing}`} as Res<T>['body']};
  return {ok: false, status: 500, body: {message: `Something went wrong on the house side. ${nothing}`} as Res<T>['body']};
}

/** Run a query as the signed-in member. `run` gets the member id; signed out → 401 without touching the network. */
export async function asMember<T>(run: (uid: string) => Promise<Res<T>>): Promise<Res<T>> {
  const uid = await memberId();
  if (!uid) return signedOut<T>();
  try {
    return await run(uid);
  } catch (e) {
    return pgFail<T>({message: (e as Error)?.message ?? 'network'});
  }
}

/** Route first; RLS fallback only when a cookie-only route didn't see this device's session. Private, owner-only rows only. */
export async function viaRoute<T>(path: string, init: {method?: string; json?: unknown}, fallback: (uid: string) => Promise<Res<T>>): Promise<Res<T>> {
  const r = await api<T>(path, init);
  if (r.status === 401) {
    const uid = await memberId();
    if (uid) {
      try { return await fallback(uid); } catch (e) { return pgFail<T>({message: (e as Error)?.message ?? 'network'}); }
    }
  }
  return r as Res<T>;
}
