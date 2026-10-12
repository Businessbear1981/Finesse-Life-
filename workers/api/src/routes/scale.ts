import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../app';
import { requireAdmin, requireAuth } from '../auth';
import { campaignView, createCampaign, decline, openCampaign, pledge, ScaleError, updateShipment, withdraw } from '../scale/service';

export const scaleRoutes = new Hono<AppEnv>();
scaleRoutes.use('*', requireAuth);

const svc = <T>(c: any, fn: (tx: any) => Promise<T>) => c.var.deps.db.tx('app_service', c.var.claims, fn) as Promise<T>;
const read = <T>(c: any, fn: (tx: any) => Promise<T>) => c.var.deps.db.tx('app_user', c.var.claims, fn) as Promise<T>;

scaleRoutes.onError((e, c) => {
  if (e instanceof ScaleError) return c.json({ error: e.message }, e.code);
  throw e;
});

const Campaign = z.object({
  title: z.string().min(1).max(140), edition: z.enum(['her', 'him', 'both']).optional(), product: z.record(z.string(), z.unknown()).optional(),
  retail_cents: z.number().int().positive(), unit_goal: z.number().int().positive(), waitlist_size: z.number().int().min(0).optional(),
  max_per_member: z.number().int().positive().optional(), closes_at: z.string().datetime(), decline_window_hours: z.number().int().min(1).max(72).optional(),
  rebate_bps: z.number().int().min(0).max(10000).optional(),
  tiers: z.array(z.object({ min_units: z.number().int().min(0), unit_price_cents: z.number().int().positive(), unit_cost_cents: z.number().int().positive().optional() })).min(1),
  wholesale: z.record(z.string(), z.unknown()).optional(), fulfilment: z.record(z.string(), z.unknown()).optional(),
});

scaleRoutes.post('/campaigns', requireAdmin, async (c) => {
  const b = Campaign.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'invalid_body', issues: b.error.issues }, 400);
  const id = await svc(c, (tx) => createCampaign(tx, b.data, c.var.claims.uid));
  return c.json({ id }, 201);
});
scaleRoutes.post('/campaigns/:id/open', requireAdmin, async (c) => { await svc(c, (tx) => openCampaign(tx, c.req.param('id'))); return c.json({ ok: true }); });

scaleRoutes.get('/campaigns', async (c) => {
  const rows = await read(c, async (tx) => (await tx.query("select id from scale.campaigns where status in ('open','decision_window','charging','fulfilling') order by closes_at")).rows);
  const views = await svc(c, (tx) => Promise.all(rows.map((r: any) => campaignView(tx, r.id))));
  return c.json({ campaigns: views });
});
scaleRoutes.get('/campaigns/:id', async (c) => {
  const visible = await read(c, async (tx) => (await tx.query('select 1 from scale.campaigns where id = $1', [c.req.param('id')])).rowCount);
  if (!visible) return c.json({ error: 'campaign not found' }, 404);
  const view = await svc(c, (tx) => campaignView(tx, c.req.param('id')));
  const mine = await read(c, async (tx) => (await tx.query('select id, quantity, status, waitlist_position, amount_cents from scale.pledges where campaign_id = $1', [c.req.param('id')])).rows[0] ?? null);
  return c.json({ ...view, my_pledge: mine });
});

scaleRoutes.post('/campaigns/:id/pledge', async (c) => {
  const shipTo = z.object({
    name: z.string().min(1).max(120), line1: z.string().min(1).max(200), line2: z.string().max(200).optional(), city: z.string().min(1).max(100),
    state: z.string().max(100).optional(), postal_code: z.string().min(2).max(20), country: z.string().length(2),
  });
  const b = z.object({ quantity: z.number().int().positive(), payment_method_ref: z.string().min(3).max(200), ship_to: shipTo.optional() }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'invalid_body' }, 400);
  return c.json(await svc(c, (tx) => pledge(tx, c.req.param('id'), c.var.claims.uid, b.data.quantity, b.data.payment_method_ref, new Date(), b.data.ship_to ?? null)), 201);
});
scaleRoutes.post('/campaigns/:id/withdraw', async (c) => { await svc(c, (tx) => withdraw(tx, c.req.param('id'), c.var.claims.uid)); return c.json({ ok: true }); });
scaleRoutes.post('/campaigns/:id/decline', async (c) => c.json(await svc(c, (tx) => decline(tx, c.req.param('id'), c.var.claims.uid))));

scaleRoutes.get('/me/strikes', async (c) => c.json({ strikes: await read(c, async (tx) => (await tx.query('select id, campaign_id, reason, created_at, expires_at from scale.strikes where voided_at is null order by created_at desc')).rows) }));

/** 3PL webhook target (ops/admin until the provider's signed webhooks are wired). */
scaleRoutes.post('/shipments/:pledgeId', requireAdmin, async (c) => {
  const b = z.object({ status: z.enum(['accepted', 'shipped', 'in_transit', 'delivered', 'exception']), carrier: z.string().optional(), tracking: z.string().optional() }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'invalid_body' }, 400);
  await svc(c, (tx) => updateShipment(tx, c.req.param('pledgeId'), b.data.status, b.data.carrier, b.data.tracking));
  return c.json({ ok: true });
});
