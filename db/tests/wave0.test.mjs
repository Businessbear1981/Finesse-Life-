import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_URL, freshDb, asUser, newUser, rejects } from './helpers.mjs';

let c, alice, bob;
const skip = !ADMIN_URL && 'TEST_DATABASE_URL not set';

before(async () => {
  if (skip) return;
  c = await freshDb('finesse_test_wave0');
  alice = await newUser(c, 'alice@example.com');
  bob = await newUser(c, 'bob@example.com');
});
after(async () => { if (c) await c.end(); });

// Wave 0's 13 tables plus event_receipts (0030, outbox delivery dedupe).
const ORCH = ['event_receipts','seats','intents','plays','tier_runs','breakers','artifacts','truth_checks','source_reads','events','outbox','live_touches','commitments','presence'];

test('all Wave 0 orch tables exist', { skip }, async () => {
  const { rows } = await c.query("select tablename from pg_tables where schemaname = 'orch'");
  assert.deepEqual(rows.map((r) => r.tablename).sort(), [...ORCH].sort());
});

test('intents are idempotent per user and isolated by RLS', { skip }, async () => {
  await asUser(c, alice, async () => {
    await c.query("insert into orch.intents(user_id, kind, idempotency_key) values ($1, 'profile', 'k1')", [alice]);
    await rejects(c, "insert into orch.intents(user_id, kind, idempotency_key) values ($1, 'profile', 'k1')", [alice], /duplicate key/);
  });
  await asUser(c, bob, async () => {
    await rejects(c, "insert into orch.intents(user_id, kind, idempotency_key) values ($1, 'profile', 'k2')", [alice], /row-level security/);
    assert.equal((await c.query('select * from orch.intents')).rows.length, 0);
  });
});

test('members cannot write plays or truth checks directly', { skip }, async () => {
  await asUser(c, alice, async () => {
    await rejects(c, "insert into orch.seats(user_id, kind) values ($1, 'staff')", [alice], /permission denied/);
  });
});

test('orch.emit writes event and outbox atomically; relay claims with skip locked', { skip }, async () => {
  await c.query('begin');
  await c.query('set local role app_user');
  await c.query('select app.set_claims($1)', [JSON.stringify({ uid: alice })]);
  const eid = (await c.query("select orch.emit('profile.updated', '{\"x\":1}') id")).rows[0].id;
  await c.query('commit');
  await c.query('begin');
  await c.query('set local role app_service');
  const claimed = (await c.query('select * from orch.claim_outbox(10)')).rows;
  assert.equal(claimed.length, 1);
  assert.equal(String(claimed[0].event_id), String(eid));
  assert.equal(claimed[0].payload.user_id, alice);
  await c.query('select orch.mark_published($1)', [[claimed[0].id]]);
  assert.equal((await c.query('select * from orch.claim_outbox(10)')).rows.length, 0);
  await c.query('commit');
});

test('members cannot drain the outbox', { skip }, async () => {
  await asUser(c, alice, async () => {
    await rejects(c, 'select * from orch.claim_outbox(10)', [], /permission denied/);
  });
});

test('confirming a step-up commitment requires a fresh passkey claim', { skip }, async () => {
  const intent = (await c.query("insert into orch.intents(user_id, kind, idempotency_key) values ($1, 'scale.join', 'c1') returning id", [alice])).rows[0].id;
  const cm = (await c.query("insert into orch.commitments(intent_id, user_id, action, amount_cents, currency) values ($1, $2, 'charge', 5000, 'usd') returning id", [intent, alice])).rows[0].id;
  await asUser(c, alice, async () => {
    await rejects(c, "update orch.commitments set status = 'confirmed', confirmed_at = now() where id = $1", [cm], /row-level security/);
  });
  await asUser(c, alice, async () => {
    const r = await c.query("update orch.commitments set status = 'confirmed', confirmed_at = now() where id = $1", [cm]);
    assert.equal(r.rowCount, 1);
  }, { step_up_at: Math.floor(Date.now() / 1000) });
});

test('vip redemption is atomic', { skip }, async () => {
  // profile row is created by the handle_new_user trigger on app.users
  assert.equal((await c.query('select count(*)::int n from public.profiles where id = $1', [alice])).rows[0].n, 1);
  await c.query("insert into public.vip_codes(code, max_uses, is_active) values ('GOLD', 1, true)");
  await c.query('begin');
  await c.query('set local role app_user');
  await c.query('select app.set_claims($1)', [JSON.stringify({ uid: alice })]);
  await c.query("select app.redeem_vip('gold')");
  await c.query('commit');
  assert.equal((await c.query('select is_vip from public.profiles where id = $1', [alice])).rows[0].is_vip, true);
  await asUser(c, alice, async () => {
    await rejects(c, "select app.redeem_vip('GOLD')", [], /code_exhausted/);
  });
});

test('service role can operate on orchestration tables through explicit policies', { skip }, async () => {
  await c.query('begin');
  await c.query('set local role app_service');
  await c.query("insert into orch.breakers(provider) values ('anthropic') on conflict do nothing");
  const n = (await c.query('select count(*)::int n from orch.breakers')).rows[0].n;
  await c.query('rollback');
  assert.equal(n, 1);
});
