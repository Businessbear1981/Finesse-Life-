import { describe, expect, it } from 'vitest';
import { EngineRegistry, defaultRegistry } from '../src/engines';
import type { Engine } from '../src/engines';
import { workosVerifier } from '../src/auth';
import { complianceEngine } from '../src/engines/compliance';
import { createApp } from '../src/app';
import { routeEvent } from '../src/outbox';
import { CLIENT_ID, makeKeys, testEnv } from './helpers';
import type { Database } from '../src/db';

const noDb: Database = { tx: () => { throw new Error('db not expected'); } };

describe('engine registry', () => {
  const fake = (id: string, intents: string[]): Engine => ({ id, intents, consumes: ['x'], emits: [], tier: 0, provider: 'internal', timeoutMs: 10, handle: async () => ({ kind: 'k', result: {} }) });

  it('routes intents to the engine that declares them (no switch)', () => {
    const r = defaultRegistry();
    expect(r.forIntent('behavioral_profile')?.id).toBe('profile');
    expect(r.forIntent('compliance_check')?.id).toBe('compliance');
    expect(r.forIntent('nope')).toBeUndefined();
  });
  it('rejects two engines claiming the same intent', () => {
    expect(() => new EngineRegistry().register(fake('a', ['i'])).register(fake('b', ['i']))).toThrow(/already handled/);
  });
  it('finds consumers of an event', () => {
    const r = new EngineRegistry().register(fake('a', ['i']));
    expect(routeEvent(r, { outbox_id: 1, topic: 'events', payload: { type: 'x' } })).toEqual(['a']);
  });
});

describe('compliance engine', () => {
  it('requires step-up for money actions', async () => {
    const out = await complianceEngine.handle({ intent: 'action.propose', payload: { action: 'charge', amount_cents: 500 }, userId: 'u', read: null as any });
    expect(out.commitments?.[0]).toMatchObject({ action: 'charge', amount_cents: 500, requires_step_up: true });
  });
  it('rejects bad amounts', async () => {
    await expect(complianceEngine.handle({ intent: 'action.propose', payload: { action: 'charge', amount_cents: -1 }, userId: 'u', read: null as any })).rejects.toThrow();
  });
});

describe('WorkOS verification', () => {
  it('accepts a valid token and reads step_up_at', async () => {
    const { jwks, sign } = await makeKeys();
    const v = workosVerifier(CLIENT_ID, jwks);
    const t = await v.verify(await sign({ sub: 'user_1', sid: 's', step_up_at: 123 }));
    expect(t).toMatchObject({ sub: 'user_1', sid: 's', step_up_at: 123 });
  });
  it('rejects wrong issuer and expired tokens', async () => {
    const { jwks, sign } = await makeKeys();
    const v = workosVerifier(CLIENT_ID, jwks);
    await expect(v.verify(await sign({ sub: 'u' }, { iss: 'https://evil.example' }))).rejects.toThrow();
    await expect(v.verify(await sign({ sub: 'u' }, { exp: '-1m' }))).rejects.toThrow();
  });
  it('rejects a token signed by another key', async () => {
    const a = await makeKeys(); const b = await makeKeys();
    await expect(workosVerifier(CLIENT_ID, a.jwks).verify(await b.sign({ sub: 'u' }))).rejects.toThrow();
  });
});

describe('HTTP surface without a database', () => {
  const app = createApp(() => ({ db: noDb, verifier: { verify: async () => { throw new Error('bad'); } }, registry: defaultRegistry() }));

  it('health', async () => {
    expect((await app.request('/health', {}, testEnv())).status).toBe(200);
  });
  it('protected routes need a bearer token', async () => {
    expect((await app.request('/v1/envelope', { method: 'POST', body: '{}' }, testEnv())).status).toBe(401);
    expect((await app.request('/api/profile', {}, testEnv())).status).toBe(401);
    expect((await app.request('/api/profile', { headers: { Authorization: 'Bearer x' } }, testEnv())).status).toBe(401);
  });
  it('keylock verifies against the hashed secret', async () => {
    const hash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // sha256("123456")
    const req = (code: string) => app.request('/api/keylock/house', { method: 'POST', body: JSON.stringify({ code }), headers: { 'Content-Type': 'application/json' } }, testEnv({ HOUSE_CODE_SHA256: hash }));
    expect(await (await req('123456')).json()).toEqual({ ok: true });
    expect(await (await req('654321')).json()).toEqual({ ok: false });
    expect((await req('12')).status).toBe(400);
  });
  it('keylock reports not configured without the secret', async () => {
    const r = await app.request('/api/keylock/house', { method: 'POST', body: JSON.stringify({ code: '123456' }) }, testEnv());
    expect(r.status).toBe(501);
  });
  it('lists engines', async () => {
    const r = await (await app.request('/v1/engines', {}, testEnv())).json() as any;
    expect(r.engines.map((e: any) => e.id)).toEqual(expect.arrayContaining(['profile', 'compliance', 'next_best_action', 'personalized_recs', 'price_intelligence', 'demand_forecast', 'market_analysis', 'logistics']));
  });
});
