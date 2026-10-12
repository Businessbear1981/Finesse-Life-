import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_URL, freshDb, asUser, newUser, rejects } from './helpers.mjs';

let c, alice, bob;
const skip = !ADMIN_URL && 'TEST_DATABASE_URL not set';

before(async () => {
  if (skip) return;
  c = await freshDb('finesse_test_platform');
  alice = await newUser(c, 'alice@example.com');
  bob = await newUser(c, 'bob@example.com');
  await c.query("insert into public.member_staff(user_id) values ($1), ($2)", [alice, bob]);
});
after(async () => { if (c) await c.end(); });

test('all migrations apply on a clean database', { skip }, async () => {
  const { rows } = await c.query('select count(*)::int n from public.schema_migrations');
  assert.ok(rows[0].n >= 27);
});

test('every public and orch table has RLS enabled', { skip }, async () => {
  const { rows } = await c.query("select schemaname||'.'||tablename t from pg_tables where schemaname in ('public','orch','scale','social','engines') and tablename <> 'schema_migrations' and not rowsecurity");
  assert.deepEqual(rows, []);
});

test('app.uid() reflects per-transaction claims and resets after', { skip }, async () => {
  await asUser(c, alice, async () => {
    const { rows } = await c.query('select app.uid() u');
    assert.equal(rows[0].u, alice);
  });
  const { rows } = await c.query('select app.uid() u');
  assert.equal(rows[0].u, null);
});

test('owner RLS: a member sees only their own rows', { skip }, async () => {
  await asUser(c, alice, async () => {
    const { rows } = await c.query('select user_id from public.member_staff');
    assert.deepEqual(rows.map((r) => r.user_id), [alice]);
    const upd = await c.query("update public.member_staff set shopper_name = 'X' where user_id = $1", [bob]);
    assert.equal(upd.rowCount, 0);
  });
});

test('no claims means no rows', { skip }, async () => {
  await c.query('begin');
  await c.query('set local role app_user');
  const { rows } = await c.query('select * from public.member_staff');
  await c.query('rollback');
  assert.equal(rows.length, 0);
});

test('audit chronicle is hash-chained, append-only and verifiable', { skip }, async () => {
  await c.query("insert into public.social_connections(user_id, provider, handle) values ($1, 'instagram', '@alice')", [alice]);
  await c.query("update public.social_connections set handle = '@alice2' where user_id = $1", [alice]);
  const { rows } = await c.query("select op, prev_hash is not null as chained from app.audit_log where table_name = 'public.social_connections' order by id");
  assert.deepEqual(rows.map((r) => r.op), ['INSERT', 'UPDATE']);
  assert.equal((await c.query('select app.verify_chronicle() b')).rows[0].b, null);
  await asUser(c, alice, async () => {
    await rejects(c, 'delete from app.audit_log', [], /permission denied/);
  });
  // tampering is detected
  await c.query('begin');
  await c.query("update app.audit_log set prev_hash = '\\x00' where id = (select max(id) from app.audit_log)");
  assert.notEqual((await c.query('select app.verify_chronicle() b')).rows[0].b, null);
  await c.query('rollback');
});

test('social tokens are not readable by members', { skip }, async () => {
  await asUser(c, alice, async () => {
    await rejects(c, 'select access_token_enc from public.social_connections', [], /permission denied/);
    const { rows } = await c.query('select provider from public.social_connections');
    assert.equal(rows.length, 1);
  });
});
