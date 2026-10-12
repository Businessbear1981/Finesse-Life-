import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { createApp } from '../src/app';
import { pgDatabase } from '../src/db';
import { workosVerifier } from '../src/auth';
import { defaultRegistry } from '../src/engines';
import { open, seal, sha256Hex, type TokenKeys } from '../src/fin/crypto';
import { fakePlaid, livePlaid, minimizeAccount, verifyPlaidWebhook } from '../src/fin/plaid';
import { fakeFeedFm, feedFm } from '../src/jazz/feedfm';
import { ADMIN_URL, CLIENT_ID, freshDb, makeKeys, testEnv } from './helpers';

const key32 = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const KEYS: TokenKeys = { current: { version: 'v2', key: key32() }, previous: { version: 'v1', key: key32() } };

async function webhookSigner() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'wh1', alg: 'ES256', use: 'sig' };
  const sign = async (body: string, o: { iat?: number; alg?: string; hash?: string } = {}) =>
    new SignJWT({ request_body_sha256: o.hash ?? (await sha256Hex(body)) })
      .setProtectedHeader({ alg: 'ES256', kid: 'wh1', typ: 'JWT' }).setIssuedAt(o.iat ?? Math.floor(Date.now() / 1000)).sign(privateKey);
  return { jwk, sign };
}

describe('plaid token sealing', () => {
  it('round-trips, binds to user:item (AAD), and decrypts with the previous key after rotation', async () => {
    const s = await seal(KEYS, 'access-sandbox-123', 'u1:item1');
    expect(s.startsWith('v2.')).toBe(true);
    expect(s).not.toContain('access-sandbox');
    expect(await open(KEYS, s, 'u1:item1')).toBe('access-sandbox-123');
    await expect(open(KEYS, s, 'u2:item1')).rejects.toThrow();
    const old = await seal({ current: KEYS.previous! }, 'tok-old', 'a:b');
    expect(await open(KEYS, old, 'a:b')).toBe('tok-old');
    await expect(open({ current: { version: 'v9', key: key32() } }, old, 'a:b')).rejects.toThrow(/key version/);
  });
  it('minimizes accounts to name, last-4 mask, type and balances in cents', () => {
    expect(minimizeAccount({ account_id: 'a', name: 'Checking', mask: '123456', type: 'depository', subtype: 'checking', balances: { current: 10.005, available: null, iso_currency_code: 'USD' } }))
      .toEqual({ plaid_account_id: 'a', name: 'Checking', mask: '3456', type: 'depository', subtype: 'checking', current_cents: 1001, available_cents: null, iso_currency: 'USD' });
  });
});

describe('plaid webhook verification', () => {
  it('accepts a fresh ES256 JWT over the exact body; rejects tamper, age, alg, unknown kid, missing header', async () => {
    const { jwk, sign } = await webhookSigner();
    const plaid = fakePlaid({ webhookKey: jwk });
    const body = JSON.stringify({ webhook_type: 'ITEM', webhook_code: 'ERROR' });
    expect(await verifyPlaidWebhook(plaid, await sign(body), body)).toBe(true);
    expect(await verifyPlaidWebhook(plaid, await sign(body), body + ' ')).toBe(false);
    expect(await verifyPlaidWebhook(plaid, await sign(body, { iat: Math.floor(Date.now() / 1000) - 600 }), body)).toBe(false);
    expect(await verifyPlaidWebhook(plaid, await sign(body, { hash: 'ab' }), body)).toBe(false);
    expect(await verifyPlaidWebhook(plaid, null, body)).toBe(false);
    expect(await verifyPlaidWebhook(fakePlaid(), await sign(body), body)).toBe(false);
    const hs = await new SignJWT({ request_body_sha256: await sha256Hex(body) }).setProtectedHeader({ alg: 'HS256', kid: 'wh1' }).setIssuedAt().sign(new Uint8Array(32));
    expect(await verifyPlaidWebhook(plaid, hs, body)).toBe(false);
  });
});

describe('live adapters (fetch-level)', () => {
  it('Plaid: posts client_id/secret in the body to the right host and surfaces error_code', async () => {
    const calls: Array<{ url: string; body: any }> = [];
    const f = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)); calls.push({ url, body });
      if (url.endsWith('/item/public_token/exchange')) return new Response(JSON.stringify({ error_code: 'INVALID_PUBLIC_TOKEN' }), { status: 400 });
      return new Response(JSON.stringify({ link_token: 'link-sandbox-1', expiration: 'x' }), { status: 200 });
    }) as unknown as typeof fetch;
    const p = livePlaid({ clientId: 'cid', secret: 'sec', env: 'sandbox', fetchImpl: f });
    expect((await p.createLinkToken({ clientUserId: 'u1', webhook: 'https://api.example/v1/plaid/webhook' })).link_token).toBe('link-sandbox-1');
    expect(calls[0]).toMatchObject({ url: 'https://sandbox.plaid.com/link/token/create', body: { client_id: 'cid', secret: 'sec', products: ['transactions'], user: { client_user_id: 'u1' }, webhook: 'https://api.example/v1/plaid/webhook' } });
    await expect(p.exchangePublicToken('public-x')).rejects.toMatchObject({ code: 'INVALID_PUBLIC_TOKEN' });
  });
  it('Feed.fm: Basic auth, treats success:false with HTTP 200 as an error', async () => {
    let auth = '';
    const f = (async (url: string, init: RequestInit) => {
      auth = String((init.headers as Record<string, string>).Authorization);
      if (url.endsWith('/access_token')) return new Response(JSON.stringify({ success: true, access_token: { token: 't', secret: 's' } }));
      return new Response(JSON.stringify({ success: false, error: { code: 9 } }), { status: 200 });
    }) as unknown as typeof fetch;
    const m = feedFm({ token: 'demo', secret: 'demo', fetchImpl: f });
    expect(await m.mintAccessToken(3600)).toEqual({ token: 't', secret: 's' });
    expect(auth).toBe('Basic ' + btoa('demo:demo'));
    await expect(m.createClient()).rejects.toMatchObject({ code: 'feedfm_9' });
  });
});

const run = ADMIN_URL ? describe : describe.skip;
run('Plaid + Jazz Club against Postgres', () => {
  let db: ReturnType<typeof pgDatabase>;
  let app: ReturnType<typeof createApp>;
  let bare: ReturnType<typeof createApp>;
  let sign: Awaited<ReturnType<typeof makeKeys>>['sign'];
  let wh: Awaited<ReturnType<typeof webhookSigner>>;
  let plaid: ReturnType<typeof fakePlaid>;
  const music = fakeFeedFm();
  const env = testEnv({ PLAID_TOKEN_KEY: KEYS.current.key, PLAID_TOKEN_KEY_VERSION: 'v2', PLAID_WEBHOOK_URL: 'https://api.finesselife.vip/v1/plaid/webhook' });

  beforeAll(async () => {
    db = pgDatabase(await freshDb('finesse_test_plaid'));
    const keys = await makeKeys(); sign = keys.sign;
    wh = await webhookSigner();
    plaid = fakePlaid({ webhookKey: wh.jwk });
    const verifier = workosVerifier(CLIENT_ID, keys.jwks);
    app = createApp(() => ({ db, verifier, registry: defaultRegistry(), plaid, music }));
    bare = createApp(() => ({ db, verifier, registry: defaultRegistry() }));
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  const call = async (path: string, token: string | null, init: RequestInit = {}, a = app) => {
    const r = await a.request(path, { ...init, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...(init.headers ?? {}) } }, env);
    return { status: r.status, body: (await r.json()) as any };
  };
  const post = (path: string, t: string | null, b: unknown) => call(path, t, { method: 'POST', body: JSON.stringify(b) });
  const hook = async (b: object) => { const raw = JSON.stringify(b); return call('/v1/plaid/webhook', null, { method: 'POST', body: raw, headers: { 'Plaid-Verification': await wh.sign(raw) } }); };
  const consent = async (t: string) => (await post('/v1/plaid/consents', t, { scopes: ['accounts', 'balances'], purpose: 'Per Diem budget view', accepted: true })).body.consent_id as string;

  it('requires auth, explicit acceptance, allowed scopes, and a consent before a link token', async () => {
    const a = await sign({ sub: 'user_alice' });
    expect((await post('/v1/plaid/consents', null, {})).status).toBe(401);
    expect((await post('/v1/plaid/consents', a, { scopes: ['accounts'], purpose: 'x budget', accepted: false })).status).toBe(400);
    expect((await post('/v1/plaid/consents', a, { scopes: ['transactions'], purpose: 'x budget', accepted: true })).status).toBe(400);
    expect((await post('/v1/plaid/link-token', a, { consent_id: crypto.randomUUID() })).status).toBe(403);
    const cid = await consent(a);
    const lt = await post('/v1/plaid/link-token', a, { consent_id: cid });
    expect(lt.status).toBe(200);
    expect(lt.body.link_token).toMatch(/^link-sandbox-fake-/);
  });

  it('exchanges server-side, stores only ciphertext, syncs minimized accounts; members cannot read secrets', async () => {
    const a = await sign({ sub: 'user_alice' });
    const cid = await consent(a);
    const ex = await post('/v1/plaid/exchange', a, { consent_id: cid, public_token: 'public-fake-ins_109508' });
    expect(ex.status).toBe(201);
    expect(ex.body).toMatchObject({ accounts: 2, institution_name: 'Institution ins_109508' });
    expect(JSON.stringify(ex.body)).not.toContain('access-');
    const items = await call('/v1/plaid/items', a);
    expect(items.body.items).toHaveLength(1);
    expect(items.body.accounts.map((x: any) => [x.mask, x.current_cents])).toEqual([['0000', 11050], ['3333', 41000]]);
    const secret = await db.tx('app_service', null, async (tx) => (await tx.query<{ access_token_enc: string }>('select access_token_enc from fin.plaid_item_secrets')).rows[0]!.access_token_enc);
    expect(secret.startsWith('v2.')).toBe(true);
    expect(secret).not.toContain('access-fake');
    const uid = await db.tx('app_service', null, async (tx) => (await tx.query<{ id: string }>("select id from app.users where workos_user_id = 'user_alice'")).rows[0]!.id);
    await expect(db.tx('app_user', { uid, sub: 'user_alice' }, (tx) => tx.query('select * from fin.plaid_item_secrets'))).rejects.toThrow(/permission denied/);
    await expect(db.tx('app_user', { uid, sub: 'user_alice' }, (tx) => tx.query("update fin.plaid_items set status = 'active'"))).rejects.toThrow(/permission denied/);
    expect((await post('/v1/plaid/exchange', a, { consent_id: cid, public_token: 'bogus-token' })).status).toBe(400);
  });

  it('RLS: another member sees nothing and cannot sync or disconnect it', async () => {
    const a = await sign({ sub: 'user_alice' });
    const b = await sign({ sub: 'user_bob' });
    const id = (await call('/v1/plaid/items', a)).body.items[0].id;
    const bv = await call('/v1/plaid/items', b);
    expect([bv.body.items.length, bv.body.accounts.length, bv.body.consents.length]).toEqual([0, 0, 0]);
    expect((await call(`/v1/plaid/items/${id}`, b, { method: 'DELETE' })).status).toBe(404);
    expect((await post(`/v1/plaid/items/${id}/sync`, b, {})).status).toBe(404);
    expect((await post(`/v1/plaid/items/${id}/sync`, a, {})).body.accounts).toBe(2);
  });

  it('webhooks: rejects unsigned, dedupes, marks login-required, re-syncs, and revokes on USER_PERMISSION_REVOKED', async () => {
    const a = await sign({ sub: 'user_alice' });
    const item = await db.tx('app_service', null, async (tx) => (await tx.query<{ id: string; plaid_item_id: string }>('select id, plaid_item_id from fin.plaid_items limit 1')).rows[0]!);
    expect((await call('/v1/plaid/webhook', null, { method: 'POST', body: '{"webhook_type":"ITEM"}' })).status).toBe(401);
    const err = { webhook_type: 'ITEM', webhook_code: 'ERROR', item_id: item.plaid_item_id, error: { error_code: 'ITEM_LOGIN_REQUIRED' } };
    expect((await hook(err)).body.action).toBe('error');
    expect((await hook(err)).body.action).toBe('duplicate');
    expect((await call('/v1/plaid/items', a)).body.items[0].status).toBe('login_required');
    expect((await hook({ webhook_type: 'ITEM', webhook_code: 'LOGIN_REPAIRED', item_id: item.plaid_item_id })).body.action).toBe('synced');
    expect((await call('/v1/plaid/items', a)).body.items[0].status).toBe('active');
    expect((await hook({ webhook_type: 'ITEM', webhook_code: 'USER_PERMISSION_REVOKED', item_id: item.plaid_item_id })).body.action).toBe('revoked');
    const v = await call('/v1/plaid/items', a);
    expect([v.body.items.length, v.body.accounts.length]).toEqual([0, 0]);
    const left = await db.tx('app_service', null, async (tx) => (await tx.query('select 1 from fin.plaid_item_secrets where item_id = $1', [item.id])).rows.length);
    expect(left).toBe(0);
  });

  it('member disconnect removes the Item at Plaid, deletes token + accounts, and revokes consent', async () => {
    const a = await sign({ sub: 'user_alice' });
    const cid = await consent(a);
    const before = plaid.removed.length;
    await post('/v1/plaid/exchange', a, { consent_id: cid, public_token: 'public-fake-ins_3' });
    const id = (await call('/v1/plaid/items', a)).body.items[0].id;
    expect((await call(`/v1/plaid/items/${id}`, a, { method: 'DELETE' })).status).toBe(200);
    expect(plaid.removed.length).toBe(before + 1);
    const v = await call('/v1/plaid/items', a);
    expect(v.body.items).toHaveLength(0);
    expect(v.body.consents.find((c: any) => c.id === cid).revoked_at).not.toBeNull();
    expect((await post('/v1/plaid/link-token', a, { consent_id: cid })).status).toBe(403);
  });

  it('fails closed with 503 when Plaid/Feed.fm are not configured', async () => {
    const a = await sign({ sub: 'user_alice' });
    expect((await call('/v1/plaid/link-token', a, { method: 'POST', body: JSON.stringify({ consent_id: crypto.randomUUID() }) }, bare)).status).toBe(503);
    expect((await call('/v1/plaid/webhook', null, { method: 'POST', body: '{}' }, bare)).status).toBe(503);
    expect((await call('/v1/jazz/session', a, { method: 'POST' }, bare)).status).toBe(503);
  });

  it('Jazz Club: one persistent Feed.fm client per member, fresh short-lived token each session, compliance copy', async () => {
    const a = await sign({ sub: 'user_alice' });
    const b = await sign({ sub: 'user_bob' });
    const s1 = await post('/v1/jazz/session', a, {});
    const s2 = await post('/v1/jazz/session', a, {});
    const s3 = await post('/v1/jazz/session', b, {});
    expect(s1.status).toBe(200);
    expect(s1.body.client_id).toBe(s2.body.client_id);
    expect(s3.body.client_id).not.toBe(s1.body.client_id);
    expect(s1.body.token).not.toBe(s2.body.token);
    expect(s1.body).toMatchObject({ attribution: 'Powered by Feed.fm', api_base: 'https://feed.fm/api/v3' });
    expect(JSON.stringify(s1.body)).not.toMatch(/FEEDFM/);
    expect((await post('/v1/jazz/session', null, {})).status).toBe(401);
  });
});
