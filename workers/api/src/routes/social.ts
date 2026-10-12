import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../app';
import { requireAdmin, requireAuth } from '../auth';
import { rate, recompute } from '../social/standing';
import { claim, codeFor, ReferralError } from '../social/referrals';

export const socialRoutes = new Hono<AppEnv>();
socialRoutes.use('*', requireAuth);
const svc = <T>(c: any, fn: (tx: any) => Promise<T>) => c.var.deps.db.tx('app_service', c.var.claims, fn) as Promise<T>;
const read = <T>(c: any, fn: (tx: any) => Promise<T>) => c.var.deps.db.tx('app_user', c.var.claims, fn) as Promise<T>;

socialRoutes.onError((e: any, c) => {
  if (e instanceof ReferralError || typeof e.code === 'number') return c.json({ error: e.message }, e.code);
  throw e;
});

/** Member sees band, top reasons and one way to improve — never the raw number (Workflow §2). */
socialRoutes.get('/standing', async (c) => {
  const s = await read(c, async (tx) => (await tx.query('select band, building, reasons, confidence, computed_at, version from social.standing where user_id = app.uid()')).rows[0]);
  return c.json({ standing: s ?? { band: 'Arrival', building: true, reasons: null } });
});

socialRoutes.post('/ratings', async (c) => {
  const b = z.object({ ratee_id: z.string().uuid(), score: z.number().int().min(1).max(5), outing_id: z.string().uuid().optional() }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'invalid_body' }, 400);
  await svc(c, (tx) => rate(tx, c.var.claims.uid, b.data.ratee_id, b.data.score, b.data.outing_id));
  return c.json({ ok: true }, 201);
});

socialRoutes.post('/reports', async (c) => {
  const b = z.object({ target_id: z.string().uuid(), reason: z.string().min(3).max(500) }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'invalid_body' }, 400);
  if (b.data.target_id === c.var.claims.uid) return c.json({ error: 'cannot report yourself' }, 400);
  await svc(c, (tx) => tx.query('insert into social.reports(reporter_id, target_id, reason) values ($1,$2,$3) on conflict do nothing', [c.var.claims.uid, b.data.target_id, b.data.reason]));
  return c.json({ ok: true }, 201);
});

socialRoutes.post('/disputes', async (c) => {
  const b = z.object({ subject: z.string().min(1).max(120), note: z.string().min(1).max(2000) }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'invalid_body' }, 400);
  await svc(c, (tx) => tx.query('insert into social.disputes(user_id, subject, note) values ($1,$2,$3)', [c.var.claims.uid, b.data.subject, b.data.note]));
  return c.json({ ok: true }, 201);
});

socialRoutes.post('/standing/recompute', requireAdmin, async (c) => c.json({ members: await svc(c, (tx) => recompute(tx)) }));

socialRoutes.get('/referrals', async (c) => {
  const code = await svc(c, (tx) => codeFor(tx, c.var.claims.uid));
  const rows = await read(c, async (tx) => (await tx.query("select status, created_at, payout_cents from social.referrals where referrer_id = app.uid() order by created_at desc")).rows);
  return c.json({ code, link: `https://finesselife.vip/r/${code}`, referrals: rows });
});

socialRoutes.post('/referrals/claim', async (c) => {
  const b = z.object({ code: z.string().min(6).max(12), device_hash: z.string().max(128).optional() }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'invalid_body' }, 400);
  return c.json(await svc(c, (tx) => claim(tx, c.var.claims.uid, b.data.code, { device_hash: b.data.device_hash })), 201);
});
