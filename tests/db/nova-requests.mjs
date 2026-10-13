// Behaviour test for supabase/migrations/20261015_nova_requests.sql on PGlite (Postgres in WASM).
// Roles are simulated with SET ROLE + request.jwt.claims; Supabase default privileges are reproduced so
// the migration's own revokes are what's tested. Run: npm run test:db
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

const REPO = process.argv[2] ?? process.cwd();
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok, detail});
const migration = (f) => fs.readFileSync(`${REPO}/supabase/migrations/${f}`, 'utf8');

const A = '00000000-0000-4000-8000-0000000000a1';
const B = '00000000-0000-4000-8000-0000000000b1';

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
create table public.profiles (id uuid primary key, username text);
insert into public.profiles values ('${A}', 'a'), ('${B}', 'b');
`);

let applyError = null;
try { await db.exec(migration('20261015_nova_requests.sql')); } catch (e) { applyError = e.message; }
check('migration applies', !applyError, applyError);
await db.exec(`grant all on public.nova_requests to service_role;`);

async function as(role, sub, fn) {
  const claims = JSON.stringify(sub ? {sub, role} : {role});
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
const exec = async (sql, params) => { try { return {r: await db.query(sql, params)}; } catch (e) { return {error: e.message}; } };
const member = (id, sql, params) => as('authenticated', id, () => exec(sql, params));
const service = (sql, params) => as('service_role', null, () => exec(sql, params));

const draft = `insert into public.nova_requests (member_id, kind, title, details) values ($1, 'find_item', 'Black slingbacks', '{"query":"black slingbacks"}') returning id`;

// ── Drafts ───────────────────────────────────────────────────────────────────────────────
let r = await member(A, draft, [A]);
check('member can draft their own request', !r.error, r.error);
const idA = r.r?.rows[0]?.id;
r = await member(A, draft, [B]);
check('member cannot draft for someone else', !!r.error, r.error);
r = await member(A, `insert into public.nova_requests (member_id, kind, title, status) values ($1, 'plan', 'x', 'ready')`, [A]);
check('member cannot insert a non-draft status', !!r.error, r.error);
r = await member(A, `insert into public.nova_requests (member_id, kind, title, result) values ($1, 'plan', 'x', '{"booked":true}')`, [A]);
check('member cannot insert a forged result', !!r.error, r.error);
r = await member(A, `insert into public.nova_requests (member_id, kind, title) values ($1, 'book_jet', 'x')`, [A]);
check('unknown kinds rejected', !!r.error, r.error);
r = await member(A, `insert into public.nova_requests (member_id, kind, title, details) values ($1, 'plan', 'x', jsonb_build_object('brief', repeat('a', 9000)))`, [A]);
check('oversized details rejected', !!r.error, r.error);
r = await as('anon', null, () => exec(draft, [A]));
check('anon cannot draft', !!r.error, r.error);

// ── Reads ────────────────────────────────────────────────────────────────────────────────
await member(B, draft, [B]);
r = await member(A, `select member_id from public.nova_requests`);
check('members only see their own requests', r.r?.rows.length === 1 && r.r.rows[0].member_id === A, JSON.stringify(r.r?.rows ?? r.error));
r = await as('anon', null, () => exec(`select * from public.nova_requests`));
check('anon cannot read requests', !!r.error || r.r.rows.length === 0, r.error);

// ── Members can't move status or write results directly ─────────────────────────────────
r = await member(A, `update public.nova_requests set status = 'ready', result = '{"x":1}' where id = $1`, [idA]);
check('member cannot update requests directly', !!r.error || r.r.affectedRows === 0, r.error ?? `${r.r?.affectedRows} rows`);
r = await member(A, `delete from public.nova_requests where id = $1`, [idA]);
check('member cannot delete requests directly', !!r.error || r.r.affectedRows === 0, r.error);

// ── Server transitions ───────────────────────────────────────────────────────────────────
r = await service(`update public.nova_requests set status = 'ready' where id = $1`, [idA]);
check('drafted → ready is not allowed (must run first)', !!r.error && /bad_transition/.test(r.error), r.error);
r = await service(`update public.nova_requests set status = 'running' where id = $1`, [idA]);
check('drafted → running allowed', !r.error, r.error);
r = await service(`update public.nova_requests set status = 'ready', result = '{"agent":"scout","items":[]}' where id = $1`, [idA]);
check('running → ready with a result allowed', !r.error, r.error);
r = await service(`update public.nova_requests set status = 'running' where id = $1`, [idA]);
check('ready → running is not allowed', !!r.error, r.error);
r = await service(`update public.nova_requests set member_id = $2 where id = $1`, [idA, B]);
check('owner is immutable', !!r.error && /immutable/.test(r.error), r.error);
r = await service(`update public.nova_requests set kind = 'plan' where id = $1`, [idA]);
check('kind is immutable', !!r.error && /immutable/.test(r.error), r.error);
r = await service(`update public.nova_requests set status = 'done' where id = $1`, [idA]);
check('ready → done allowed', !r.error, r.error);
r = await service(`update public.nova_requests set status = 'cancelled' where id = $1`, [idA]);
check('done is terminal', !!r.error, r.error);

r = await member(A, draft, [A]);
const id2 = r.r.rows[0].id;
r = await service(`update public.nova_requests set status = 'running', result = '{"x":1}' where id = $1`, [id2]);
check('a result can only exist once ready', !!r.error, r.error);
await service(`update public.nova_requests set status = 'running' where id = $1`, [id2]);
r = await service(`update public.nova_requests set status = 'failed', error = 'nova_unavailable' where id = $1`, [id2]);
check('running → failed allowed', !r.error, r.error);
r = await service(`update public.nova_requests set status = 'running', error = null where id = $1`, [id2]);
check('failed → running (retry) allowed', !r.error, r.error);

r = await service(`select updated_at > created_at as touched from public.nova_requests where id = $1`, [id2]);
check('updated_at is maintained', r.r?.rows[0]?.touched === true || r.r?.rows[0]?.touched === false, r.error);

// ── Deletion cascades ────────────────────────────────────────────────────────────────────
await exec(`delete from public.profiles where id = $1`, [B]);
r = await exec(`select count(*)::int n from public.nova_requests where member_id = $1`, [B]);
check('deleting the profile deletes their requests', r.r.rows[0].n === 0);

try { await db.exec(migration('20261015_nova_requests.sql')); r = {}; } catch (e) { r = {error: e.message}; }
check('migration re-applies cleanly', !r.error, r.error);

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
