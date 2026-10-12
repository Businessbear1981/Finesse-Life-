import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../app';
import { requireAuth } from '../auth';
import { keysFromEnv } from '../fin/crypto';
import { PlaidError, verifyPlaidWebhook, type PlaidClient } from '../fin/plaid';
import { createLinkToken, disconnect, exchange, FinError, handleWebhook, recordConsent, syncAccounts, type PlaidWebhook } from '../fin/service';
import { JAZZ_POLICY } from '../policy';
import { jazzCompliance, MusicError } from '../jazz/feedfm';

const svc = <T>(c: any, fn: (tx: any) => Promise<T>) => c.var.deps.db.tx('app_service', c.var.claims ?? null, fn) as Promise<T>;
const read = <T>(c: any, fn: (tx: any) => Promise<T>) => c.var.deps.db.tx('app_user', c.var.claims, fn) as Promise<T>;
const parse = async <T extends z.ZodTypeAny>(c: any, s: T): Promise<z.infer<T>> => {
  const r = s.safeParse(await c.req.json().catch(() => null));
  if (!r.success) throw new FinError(400, 'invalid_body');
  return r.data;
};
const onErr = (e: any, c: any) => {
  if (e instanceof FinError) return c.json({ error: e.message }, e.code);
  if (e instanceof PlaidError || e instanceof MusicError) return c.json({ error: e.code }, e.status);
  throw e;
};

// ── Plaid ────────────────────────────────────────────────────────────────────
export const plaidRoutes = new Hono<AppEnv>();
plaidRoutes.onError(onErr);

/** Plaid → Worker. Public, verified by the Plaid-Verification JWT; always 200 after a verified receipt. */
plaidRoutes.post('/webhook', async (c) => {
  const plaid = c.var.deps.plaid;
  if (!plaid) return c.json({ error: 'plaid_not_configured' }, 503);
  const raw = await c.req.text();
  if (!(await verifyPlaidWebhook(plaid, c.req.header('plaid-verification'), raw))) return c.json({ error: 'invalid_signature' }, 401);
  let w: PlaidWebhook;
  try { w = JSON.parse(raw); } catch { return c.json({ error: 'invalid_json' }, 400); }
  if (!w?.webhook_type || !w?.webhook_code) return c.json({ error: 'invalid_body' }, 400);
  const action = await svc(c, (tx) => handleWebhook(tx, plaid, keysFromEnv(c.env), raw, w));
  return c.json({ ok: true, action });
});

plaidRoutes.use('*', requireAuth);
const need = (c: any) => {
  const plaid: PlaidClient | undefined = c.var.deps.plaid;
  const keys = keysFromEnv(c.env);
  if (!plaid || !keys) throw new FinError(503, 'plaid_not_configured');
  return { plaid, keys };
};

/** Step 1: the member agrees to specific scopes for a stated purpose. */
plaidRoutes.post('/consents', async (c) => {
  const b = await parse(c, z.object({ scopes: z.array(z.string()).min(1).max(5), purpose: z.string().min(3).max(300), accepted: z.literal(true) }));
  const id = await svc(c, (tx) => recordConsent(tx, c.var.claims.uid, b.scopes, b.purpose, c.req.header('user-agent')));
  return c.json({ consent_id: id }, 201);
});

/** Step 2: Link token for Plaid Link, tied to an active consent. */
plaidRoutes.post('/link-token', async (c) => {
  const { plaid } = need(c);
  const b = await parse(c, z.object({ consent_id: z.string().uuid(), redirect_uri: z.string().url().optional() }));
  const webhook = c.env.PLAID_WEBHOOK_URL;
  return c.json(await svc(c, (tx) => createLinkToken(tx, plaid, c.var.claims.uid, b.consent_id, { webhook, redirectUri: b.redirect_uri })));
});

/** Step 3: public_token exchange happens here, server-side. The access token never leaves the Worker. */
plaidRoutes.post('/exchange', async (c) => {
  const { plaid, keys } = need(c);
  const b = await parse(c, z.object({ consent_id: z.string().uuid(), public_token: z.string().min(8).max(200) }));
  return c.json(await svc(c, (tx) => exchange(tx, plaid, keys, c.var.claims.uid, b.consent_id, b.public_token)), 201);
});

/** Member view (RLS): items + minimized accounts + consents. */
plaidRoutes.get('/items', async (c) => c.json(await read(c, async (tx) => ({
  items: (await tx.query("select id, institution_name, status, error_code, last_synced_at, created_at from fin.plaid_items where status <> 'revoked' order by created_at")).rows,
  accounts: (await tx.query('select id, item_id, name, mask, type, subtype, current_cents::float8 as current_cents, available_cents::float8 as available_cents, iso_currency, updated_at from fin.accounts order by name')).rows,
  consents: (await tx.query('select id, scopes, purpose, policy_version, granted_at, revoked_at from fin.consents order by granted_at desc')).rows,
}))));

const own = async (c: any, id: string) => {
  const ok = await read(c, async (tx) => (await tx.query('select 1 from fin.plaid_items where id = $1', [id])).rows.length > 0);
  if (!ok) throw new FinError(404, 'not_found');
};

plaidRoutes.post('/items/:id/sync', async (c) => {
  const { plaid, keys } = need(c);
  const id = z.string().uuid().safeParse(c.req.param('id'));
  if (!id.success) return c.json({ error: 'not_found' }, 404);
  await own(c, id.data);
  return c.json({ accounts: await svc(c, (tx) => syncAccounts(tx, plaid, keys, id.data)) });
});

/** Disconnect / revoke: removes the Item at Plaid, deletes token + accounts, revokes consent. */
plaidRoutes.delete('/items/:id', async (c) => {
  const id = z.string().uuid().safeParse(c.req.param('id'));
  if (!id.success) return c.json({ error: 'not_found' }, 404);
  await own(c, id.data);
  await svc(c, (tx) => disconnect(tx, c.var.deps.plaid ?? null, keysFromEnv(c.env), id.data, 'member_disconnect'));
  return c.json({ ok: true });
});

// ── Jazz Club (Feed.fm) ──────────────────────────────────────────────────────
export const jazzRoutes = new Hono<AppEnv>();
jazzRoutes.onError(onErr);
jazzRoutes.use('*', requireAuth);

/** Device credentials: the member's persistent Feed.fm client id + a short-lived access token. */
jazzRoutes.post('/session', async (c) => {
  const music = c.var.deps.music;
  if (!music) return c.json({ error: 'music_not_configured' }, 503);
  const uid = c.var.claims.uid;
  let clientId = await read(c, async (tx) => (await (tx as import("../db").Tx).query<{ feed_client_id: string }>('select feed_client_id from jazz.listeners where user_id = app.uid()')).rows[0]?.feed_client_id);
  if (!clientId) {
    const minted = await music.createClient();
    clientId = await svc(c, async (tx) => (await (tx as import("../db").Tx).query<{ feed_client_id: string }>(
      `insert into jazz.listeners(user_id, feed_client_id) values ($1,$2) on conflict (user_id) do update set user_id = excluded.user_id returning feed_client_id`, [uid, minted])).rows[0]!.feed_client_id);
  }
  const creds = await music.mintAccessToken(JAZZ_POLICY.accessTokenTtlSeconds);
  return c.json({
    client_id: clientId, token: creds.token, secret: creds.secret,
    expires_at: new Date(Date.now() + JAZZ_POLICY.accessTokenTtlSeconds * 1000).toISOString(),
    api_base: 'https://feed.fm/api/v3', ...jazzCompliance,
  });
});
