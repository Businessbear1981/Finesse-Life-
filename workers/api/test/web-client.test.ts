// End-to-end: the Next.js query builder (src/lib/data/query.ts) driving the real Worker /v1/data
// over Postgres, exactly as the web app does in production minus the network hop.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pgDatabase } from '../src/db';
import { workosVerifier } from '../src/auth';
import { defaultRegistry } from '../src/engines';
import { resetCatalogue } from '../src/data';
import { DataClient, type Transport } from '../../../src/lib/data/query';
import { ADMIN_URL, CLIENT_ID, freshDb, makeKeys, testEnv } from './helpers';

const run = ADMIN_URL ? describe : describe.skip;
run('web query builder -> Worker -> Postgres', () => {
  let db: ReturnType<typeof pgDatabase>;
  let app: ReturnType<typeof createApp>;
  let sign: Awaited<ReturnType<typeof makeKeys>>['sign'];
  const env = testEnv({ SERVICE_API_KEY: 'svc-secret-123' } as any);
  const client = (headers: Record<string, string>) => {
    const t: Transport = async (body) => (await (await app.request('/v1/data', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers } }, env)).json()) as any;
    return new DataClient(t, { getUser: async () => ({ data: { user: null }, error: null }) } as any);
  };

  beforeAll(async () => {
    resetCatalogue();
    db = pgDatabase(await freshDb('finesse_test_webclient'));
    const keys = await makeKeys(); sign = keys.sign;
    app = createApp(() => ({ db, verifier: workosVerifier(CLIENT_ID, keys.jwks), registry: defaultRegistry() }));
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it('chained calls round-trip with RLS isolation', async () => {
    const ha = { Authorization: `Bearer ${await sign({ sub: 'user_w1' })}` };
    const hb = { Authorization: `Bearer ${await sign({ sub: 'user_w2' })}` };
    const me = ((await (await app.request('/v1/me', { headers: ha }, env)).json()) as any).user.id;
    const a = client(ha), b = client(hb);
    const up = await a.from('member_staff').upsert({ user_id: me, shopper_name: 'Ines' }, { onConflict: 'user_id' }).select('shopper_name').single();
    expect(up.error).toBeNull();
    expect(up.data).toEqual({ shopper_name: 'Ines' });
    const got = await a.from('member_staff').select('shopper_name').eq('user_id', me).maybeSingle();
    expect(got.data).toEqual({ shopper_name: 'Ines' });
    expect((await b.from('member_staff').select('*').eq('user_id', me)).data).toEqual([]);
    const { count } = await client({ 'X-Service-Key': 'svc-secret-123' }).from('member_staff').select('*', { count: 'exact', head: true });
    expect(count).toBe(1);
  });

  it('room content: catalog readable by members, member items private', async () => {
    const ha = { Authorization: `Bearer ${await sign({ sub: 'user_w1' })}` };
    const hb = { Authorization: `Bearer ${await sign({ sub: 'user_w2' })}` };
    const me = ((await (await app.request('/v1/me', { headers: ha }, env)).json()) as any).user.id;
    const a = client(ha), b = client(hb);
    const cat = await a.from('room_catalog').select('kind, data').eq('room', 'gym').order('position');
    expect(cat.error).toBeNull();
    expect((cat.data as any[]).some((r) => r.kind === 'fem_classes')).toBe(true);
    expect((await a.from('room_catalog').insert({ room: 'gym', kind: 'x', data: {} })).error).not.toBeNull();
    const ins = await a.from('room_member_items').insert({ user_id: me, room: 'kitchen', kind: 'reservations', data: { name: 'Uchi' } }).select('id').single();
    expect(ins.error).toBeNull();
    expect((await b.from('room_member_items').select('*')).data).toEqual([]);
    expect((await a.from('room_member_items').select('kind')).data).toEqual([{ kind: 'reservations' }]);
    // nothing member-specific is seeded
    expect((await client({ 'X-Service-Key': 'svc-secret-123' }).from('room_catalog').select('*', { count: 'exact', head: true }).in('kind', ['reservations', 'recent_orders', 'demo_listings', 'masc_brief'])).count).toBe(0);
  });

  it('atlas rooms 24/28-31 tables are owner-isolated through the web client', async () => {
    const ha = { Authorization: `Bearer ${await sign({ sub: 'user_w1' })}` };
    const hb = { Authorization: `Bearer ${await sign({ sub: 'user_w2' })}` };
    const me = ((await (await app.request('/v1/me', { headers: ha }, env)).json()) as any).user.id;
    const a = client(ha), b = client(hb);
    const rows: [string, Record<string, unknown>][] = [
      ['diary_items', { day: '2026-10-12', title: 'Salon booked', status: 'needs_you' }],
      ['closet_rotations', { week_start: '2026-10-12', looks: [{ day: 0, item_ids: [] }] }],
      ['camera_scans', {}],
      ['ballroom_proposals', { starts_at: '2026-10-20T19:00:00Z', venue: { name: 'Uchi' } }],
      ['identity_projections', { public_card: { display_name: 'S' } }],
    ];
    for (const [t, v] of rows) {
      const r = await a.from(t).insert({ ...v, user_id: me }).select('user_id').single();
      expect(r.error, t + ' ' + JSON.stringify(r.error)).toBeNull();
      expect((await b.from(t).select('*')).data, t).toEqual([]);
      // cannot write as someone else
      expect((await b.from(t).insert({ ...v, user_id: me })).error, t).not.toBeNull();
    }
    const appr = await a.from('diary_items').update({ status: 'approved' }).eq('title', 'Salon booked').select('status').single();
    expect(appr.data).toEqual({ status: 'approved' });
  });
});
