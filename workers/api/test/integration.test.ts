import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pgDatabase } from '../src/db';
import { workosVerifier } from '../src/auth';
import { defaultRegistry } from '../src/engines';
import { relayOutbox } from '../src/outbox';
import { ADMIN_URL, CLIENT_ID, freshDb, makeKeys, testEnv } from './helpers';
import type { OutboxMessage } from '../src/env';

const run = ADMIN_URL ? describe : describe.skip;

run('Worker against Postgres', () => {
  let db: ReturnType<typeof pgDatabase>;
  let app: ReturnType<typeof createApp>;
  let sign: Awaited<ReturnType<typeof makeKeys>>['sign'];

  beforeAll(async () => {
    const url = await freshDb('finesse_test_worker');
    db = pgDatabase(url);
    const keys = await makeKeys();
    sign = keys.sign;
    const verifier = workosVerifier(CLIENT_ID, keys.jwks);
    app = createApp(() => ({ db, verifier, registry: defaultRegistry() }));
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  const call = async (path: string, token: string, init: RequestInit = {}) => {
    const r = await app.request(path, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } }, testEnv());
    return { status: r.status, body: await r.json() as any };
  };

  it('first request provisions app.users + profile; claims scope reads', async () => {
    const t = await sign({ sub: 'user_alice' });
    const r = await call('/api/profile', t);
    expect(r.status).toBe(200);
    expect(r.body.profile).not.toBeNull();
  });

  it('PATCH profile and PUT check-in write only the caller\'s rows', async () => {
    const a = await sign({ sub: 'user_alice' });
    const b = await sign({ sub: 'user_bob' });
    expect((await call('/api/profile', a, { method: 'PATCH', body: JSON.stringify({ display_name: 'Alice', age: 30, city: 'Austin' }) })).status).toBe(200);
    expect((await call('/api/profile', a, { method: 'PATCH', body: JSON.stringify({ is_vip: true }) })).status).toBe(400);
    const ci = { answers: { travel: 'Paris' }, nova: { voice: 'Warm', posting: 'Ask first' }, shopper: { name: 'Celeste' } };
    expect((await call('/api/check-in', a, { method: 'PUT', body: JSON.stringify(ci) })).status).toBe(200);
    expect((await call('/api/profile', b)).body.profile.display_name ?? null).not.toBe('Alice');
  });

  it('envelope runs an engine end to end, verifies, and is idempotent', async () => {
    const a = await sign({ sub: 'user_alice' });
    const env = { intent: 'profile.summary', payload: {}, idempotency_key: 'idem-0001' };
    const r1 = await call('/v1/envelope', a, { method: 'POST', body: JSON.stringify(env) });
    expect(r1.status).toBe(200);
    expect(r1.body).toMatchObject({ status: 'done', replayed: false, result: { answered: 1, checkin_complete: true } });
    expect(r1.body.truth.checks[0]).toMatchObject({ verdict: 'verified', gated: false });
    const r2 = await call('/v1/envelope', a, { method: 'POST', body: JSON.stringify(env) });
    expect(r2.body).toMatchObject({ status: 'done', replayed: true, intent_id: r1.body.intent_id });
    const r3 = await call('/v1/envelope', a, { method: 'POST', body: JSON.stringify({ ...env, intent: 'compliance_check', payload: { action: 'x' } }) });
    expect(r3.status).toBe(409);
  });

  it('unknown intents are rejected clearly', async () => {
    const a = await sign({ sub: 'user_alice' });
    expect((await call('/v1/envelope', a, { method: 'POST', body: JSON.stringify({ intent: 'nope', idempotency_key: 'idem-0002' }) })).status).toBe(400);
  });

  it('money commitments need a passkey step-up to confirm', async () => {
    const plain = await sign({ sub: 'user_alice' });
    const r = await call('/v1/envelope', plain, { method: 'POST', body: JSON.stringify({ intent: 'action.propose', payload: { action: 'charge', amount_cents: 2500 }, idempotency_key: 'idem-0004' }) });
    expect(r.body.status).toBe('awaiting_confirmation');
    const id = r.body.commitment_ids[0];
    expect((await call(`/v1/commitments/${id}/confirm`, plain, { method: 'POST' })).body).toEqual({ error: 'step_up_required' });
    const stepped = await sign({ sub: 'user_alice', step_up_at: Math.floor(Date.now() / 1000) });
    expect((await call(`/v1/commitments/${id}/confirm`, stepped, { method: 'POST' })).status).toBe(200);
    const bob = await sign({ sub: 'user_bob', step_up_at: Math.floor(Date.now() / 1000) });
    expect((await call(`/v1/commitments/${id}/confirm`, bob, { method: 'POST' })).status).toBe(404);
  });

  it('outbox relay publishes each event once', async () => {
    const sent: OutboxMessage[] = [];
    const q = { sendBatch: async (m: { body: OutboxMessage }[]) => { sent.push(...m.map((x) => x.body)); } };
    const n = await relayOutbox(db, q);
    expect(n).toBeGreaterThan(0);
    expect(sent.map((s) => s.payload.type)).toContain('intent.completed');
    expect(await relayOutbox(db, q)).toBe(0);
  });

  it('breaker opens after repeated failures and blocks the engine', async () => {
    await db.tx('app_service', null, (tx) => tx.query("insert into orch.breakers(provider, state, failures, opened_at, retry_after) values ('internal', 'open', 5, now(), now() + interval '1 minute') on conflict (provider) do update set state = 'open', retry_after = excluded.retry_after"));
    const a = await sign({ sub: 'user_alice' });
    const r = await call('/v1/envelope', a, { method: 'POST', body: JSON.stringify({ intent: 'profile.summary', idempotency_key: 'idem-0005' }) });
    expect(r.status).toBe(502);
    expect(r.body.error).toMatch(/breaker open/);
    await db.tx('app_service', null, (tx) => tx.query("delete from orch.breakers where provider = 'internal'"));
  });

  it('ported intelligence intents run through the envelope against real tables', async () => {
    await db.tx('app_service', null, async (tx) => {
      const u = (await tx.query<{ id: string }>("select id from app.users limit 1")).rows[0]!.id;
      for (let i = 0; i < 4; i++) await tx.query("insert into public.exchange_listings(seller_id, title, asking_price_cents, category, condition, status) values ($1, 'Rolex Daytona', 2500000, 'Watches', 'excellent', $2)", [u, i < 3 ? 'sold' : 'active']).catch(() => {});
    });
    const a = await sign({ sub: 'user_alice' });
    for (const [intent, payload] of [
      ['market_analysis', {}], ['demand_forecast', { category: 'Watches' }], ['price_intelligence', { mode: 'anomalies' }],
      ['logistics_optimize', { value_cents: 30000, category: 'Bags' }], ['next_best_action', { page: 'lobby' }], ['personalized_recs', { count: 2 }],
    ] as const) {
      const r = await call('/v1/envelope', a, { method: 'POST', body: JSON.stringify({ intent, payload, idempotency_key: `intel-${intent}` }) });
      expect(r.status, `${intent}: ${JSON.stringify(r.body)}`).toBe(200);
    }
  });

  it('vip redeem works once', async () => {
    await db.tx('app_service', null, (tx) => tx.query("insert into public.vip_codes(code, max_uses, is_active) values ('LION', 1, true)"));
    const a = await sign({ sub: 'user_alice' });
    expect((await call('/api/vip/redeem', a, { method: 'POST', body: JSON.stringify({ code: 'lion' }) })).status).toBe(200);
    expect((await call('/api/vip/redeem', a, { method: 'POST', body: JSON.stringify({ code: 'lion' }) })).status).toBe(409);
  });

  it('upload signing and social connect are explicit stubs until credentials exist', async () => {
    const a = await sign({ sub: 'user_alice' });
    expect((await call('/api/uploads/sign', a, { method: 'POST', body: JSON.stringify({ contentType: 'image/jpeg' }) })).status).toBe(501);
    expect((await call('/api/connect/instagram', a)).status).toBe(501);
    expect((await call('/api/style-read', a)).status).toBe(501);
  });
});
