import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pgDatabase } from '../src/db';
import { workosVerifier } from '../src/auth';
import { defaultRegistry } from '../src/engines';
import { resetCatalogue } from '../src/data';
import { ADMIN_URL, CLIENT_ID, freshDb, makeKeys, testEnv } from './helpers';

const run = ADMIN_URL ? describe : describe.skip;
run('/v1/data (Supabase replacement)', () => {
  let db: ReturnType<typeof pgDatabase>;
  let app: ReturnType<typeof createApp>;
  let sign: Awaited<ReturnType<typeof makeKeys>>['sign'];
  const env = testEnv({ SERVICE_API_KEY: 'svc-secret-123' } as any);

  beforeAll(async () => {
    resetCatalogue();
    db = pgDatabase(await freshDb('finesse_test_data'));
    const keys = await makeKeys(); sign = keys.sign;
    const verifier = workosVerifier(CLIENT_ID, keys.jwks);
    app = createApp(() => ({ db, verifier, registry: defaultRegistry() }));
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  const q = async (body: unknown, auth: Record<string, string>) => {
    const r = await app.request('/v1/data', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...auth } }, env);
    return { status: r.status, ...(await r.json() as any) };
  };

  it('/v1/me returns the internal user id', async () => {
    const t = await sign({ sub: 'user_d1' });
    const r = await (await app.request('/v1/me', { headers: { Authorization: `Bearer ${t}` } }, env)).json() as any;
    expect(r.user.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('member CRUD is bound by RLS; single/maybeSingle/count behave like PostgREST', async () => {
    const a = { Authorization: `Bearer ${await sign({ sub: 'user_d1' })}` };
    const b = { Authorization: `Bearer ${await sign({ sub: 'user_d2' })}` };
    const me = (await (await app.request('/v1/me', { headers: a }, env)).json() as any).user.id;
    const ins = await q({ table: 'member_staff', op: 'upsert', values: { user_id: me, shopper_name: 'Celeste' }, onConflict: 'user_id', returning: true, single: 'single' }, a);
    expect(ins.data).toMatchObject({ shopper_name: 'Celeste' });
    expect((await q({ table: 'member_staff', op: 'select', columns: 'shopper_name, name:nova_voice', filters: [{ col: 'user_id', op: 'eq', value: me }], single: 'single' }, a)).data).toEqual({ shopper_name: 'Celeste', name: 'Discreet' });
    expect((await q({ table: 'member_staff', op: 'select', filters: [{ col: 'user_id', op: 'eq', value: me }], single: 'maybe' }, b)).data).toBeNull();
    expect((await q({ table: 'member_staff', op: 'select', count: 'exact', head: true }, b)).count).toBe(0);
    const upd = await q({ table: 'member_staff', op: 'update', values: { shopper_name: 'Hacked' }, filters: [{ col: 'user_id', op: 'eq', value: me }], returning: true }, b);
    expect(upd.data).toEqual([]);
    expect((await q({ table: 'member_staff', op: 'delete' }, a)).error.code).toBe('21000');
    expect((await q({ table: 'member_staff', op: 'select', single: 'single', filters: [{ col: 'user_id', op: 'eq', value: '00000000-0000-0000-0000-000000000000' }] }, a)).error.code).toBe('PGRST116');
  });

  it('rejects unknown tables/columns and injection attempts', async () => {
    const a = { Authorization: `Bearer ${await sign({ sub: 'user_d1' })}` };
    expect((await q({ table: 'nope', op: 'select' }, a)).status).toBe(404);
    expect((await q({ table: 'profiles', op: 'select', columns: 'id; drop table x' }, a)).status).toBe(400);
    expect((await q({ table: 'profiles', op: 'select', filters: [{ col: 'id"--', op: 'eq', value: 1 }] }, a)).status).toBe(400);
    expect((await q({ table: 'profiles', op: 'select', filters: [{ col: 'username', op: 'ilike', value: "%' or 1=1 --" }] }, a)).data).toEqual([]);
  });

  it('service key runs as app_service; wrong key is refused; no key and no token is 401', async () => {
    expect((await q({ table: 'member_staff', op: 'select', count: 'exact', head: true }, { 'X-Service-Key': 'svc-secret-123' })).count).toBe(1);
    expect((await q({ table: 'member_staff', op: 'select' }, { 'X-Service-Key': 'wrong' })).status).toBe(401);
    expect((await q({ table: 'member_staff', op: 'select' }, {})).status).toBe(401);
  });

  it('or groups, in, order, limit', async () => {
    const s = { 'X-Service-Key': 'svc-secret-123' };
    const r = await q({ table: 'profiles', op: 'select', columns: 'username', or: [[{ col: 'username', op: 'ilike', value: 'member_%' }, { col: 'username', op: 'eq', value: 'x' }]], filters: [{ col: 'is_vip', op: 'in', value: [false] }], order: [{ col: 'username', ascending: true }], limit: 1 }, s);
    expect(r.data).toHaveLength(1);
  });
});
