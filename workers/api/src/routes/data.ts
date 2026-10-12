import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { requireAuth } from '../auth';
import { DataError, DataQuery, runData } from '../data';

async function sha(s: string) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([sha(a), sha(b)]);
  let d = 0; for (let i = 0; i < x.length; i++) d |= x[i]! ^ y[i]!;
  return d === 0;
}

export const dataRoutes = new Hono<AppEnv>();

/**
 * POST /v1/data — member requests run as app_user under RLS (WorkOS token).
 * Server-to-server requests from the Next.js app's former service-role code paths present
 * X-Service-Key (secret SERVICE_API_KEY) and run as app_service.
 */
dataRoutes.post('/', async (c, next) => {
  const key = c.req.header('x-service-key');
  if (key) {
    if (!c.env.SERVICE_API_KEY || !(await safeEqual(key, c.env.SERVICE_API_KEY))) return c.json({ error: { message: 'invalid service key', code: '28000' } }, 401);
    c.set('service', true);
    return next();
  }
  return requireAuth(c, next);
}, async (c) => {
  const parsed = DataQuery.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ data: null, error: { message: 'invalid query', code: 'PGRST100', details: parsed.error.issues } }, 400);
  const service = c.get('service') === true;
  try {
    const out = await c.var.deps.db.tx(service ? 'app_service' : 'app_user', service ? null : c.var.claims, (tx) => runData(tx, parsed.data));
    return c.json({ data: out.data, count: out.count, error: null });
  } catch (e: any) {
    if (e instanceof DataError) return c.json({ data: null, error: { message: e.message, code: e.code } }, e.status as 400);
    // Postgres errors (RLS, constraints) are returned in the same shape the Supabase client used.
    if (typeof e?.code === 'string') return c.json({ data: null, error: { message: e.message, code: e.code, details: e.detail ?? null } }, 400);
    throw e;
  }
});

/** Who am I: internal user id + profile basics (replaces supabase.auth.getUser()). */
export const meRoute = new Hono<AppEnv>();
meRoute.get('/', requireAuth, async (c) => {
  const p = await c.var.deps.db.tx('app_service', c.var.claims, async (tx) =>
    (await tx.query<{ email: string | null }>('select email from app.users where id = $1', [c.var.claims.uid])).rows[0]);
  return c.json({ user: { id: c.var.claims.uid, workos_user_id: c.var.claims.sub, email: p?.email ?? null, role: c.var.claims.role ?? null } });
});
