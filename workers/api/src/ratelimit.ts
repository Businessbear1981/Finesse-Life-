import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from './app';

/**
 * Per-client limit for /v1/* and /api/*. Uses the Cloudflare Rate Limiting binding when bound
 * (authoritative, per-colo counters); otherwise an in-isolate sliding window (dev/tests).
 * Key: the bearer token's hash prefix if present, else the client IP. Service-key callers are exempt.
 */
const local = new Map<string, number[]>();
export function rateLimit(limit = 120, windowMs = 60_000): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (c.req.header('x-service-key')) return next();
    const auth = c.req.header('authorization');
    const ip = c.req.header('cf-connecting-ip') ?? 'local';
    const key = auth ? `t:${await hash(auth)}` : `ip:${ip}`;
    let ok: boolean;
    if (c.env?.RATE_LIMITER) ok = (await c.env.RATE_LIMITER.limit({ key })).success;
    else {
      const now = Date.now();
      const a = (local.get(key) ?? []).filter((t) => now - t < windowMs);
      ok = a.length < limit;
      if (ok) a.push(now);
      local.set(key, a);
      if (local.size > 5000) local.clear();
    }
    if (!ok) return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': String(Math.ceil(windowMs / 1000)) });
    return next();
  };
}
async function hash(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return Array.from(d.slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}
export const _resetRateLimit = () => local.clear();
