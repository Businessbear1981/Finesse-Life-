import 'server-only';
import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/data/server';
import {safeEqual} from '@/lib/net/webhook-auth';
import type {AuthUser} from '@/lib/data/query';

/** Session user or a 401 response. Never trust a user_id from the request body. */
export async function requireUser(): Promise<AuthUser | NextResponse> {
  const user = await currentUser();
  return user ?? NextResponse.json({error: 'Unauthorized'}, {status: 401});
}

/** Server-to-server calls (cron, Worker, other routes) present INTERNAL_API_SECRET. Fails closed. */
export function requireInternal(req: Request): NextResponse | null {
  const got = req.headers.get('x-internal-secret');
  return safeEqual(got, process.env.INTERNAL_API_SECRET) ? null : NextResponse.json({error: 'forbidden'}, {status: 403});
}

/**
 * Sliding-window limiter, per key, in-process. On Vercel this is per-instance and therefore a
 * floor, not a ceiling; the authoritative limit for member traffic is the Worker's Cloudflare
 * Rate Limiting binding. Good enough to stop a single client hammering an LLM route.
 */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    const retry = Math.ceil((windowMs - (now - arr[0])) / 1000);
    return NextResponse.json({error: 'rate limited'}, {status: 429, headers: {'Retry-After': String(retry)}});
  }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
  return null;
}

/** Auth + per-user limit for expensive (LLM / third-party) routes: default 20 req/min. */
export async function guardExpensive(route: string, limit = 20, windowMs = 60_000): Promise<AuthUser | NextResponse> {
  const u = await requireUser();
  if (u instanceof NextResponse) return u;
  return rateLimit(`${route}:${u.id}`, limit, windowMs) ?? u;
}

/** Admin/owner session user, or null. Role comes from profiles (RLS-bound read of the member's own row). */
export async function requireAdmin(): Promise<AuthUser | null> {
  const {createClient} = await import('@/lib/data/server');
  const dbc = await createClient();
  const {data: {user}} = await dbc.auth.getUser();
  if (!user) return null;
  const {data: profile} = await dbc.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return profile && ['admin', 'owner'].includes(profile.role) ? user : null;
}
