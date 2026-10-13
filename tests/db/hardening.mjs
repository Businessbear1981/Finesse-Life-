// Behaviour test for supabase/migrations/20261018_hardening.sql on PGlite (Postgres in WASM).
// Applies the real nova_requests migration first; stubs the other tables the hardening hooks into.
// Run: npm run test:db
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

const REPO = process.argv[2] ?? process.cwd();
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok, detail});
const migration = (f) => fs.readFileSync(`${REPO}/supabase/migrations/${f}`, 'utf8');
const A = '00000000-0000-4000-8000-0000000000a1';

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
create table public.profiles (id uuid primary key, username text);
insert into public.profiles values ('${A}', 'a');
create table public.vip_grants (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
  source text not null, source_ref text, expires_at timestamptz, created_at timestamptz not null default now(), revoked_at timestamptz);
create table public.posts (id uuid primary key default gen_random_uuid(), author_id uuid, content text, moderation_hidden boolean not null default false);
create table public.social_accounts (id uuid primary key default gen_random_uuid(), user_id uuid, platform text, access_token_enc text, connected boolean not null default false);
insert into public.social_accounts (user_id, platform, access_token_enc, connected) values ('${A}', 'x', 'raw-legacy-token-value', true);
create table public.entourage_people (id uuid primary key default gen_random_uuid(), member_id uuid not null, name text);
alter table public.entourage_people enable row level security;
create policy own on public.entourage_people for all using (member_id = auth.uid()) with check (member_id = auth.uid());
`);
await db.exec(migration('20261015_nova_requests.sql'));

let applyError = null;
try { await db.exec(migration('20261018_hardening.sql')); } catch (e) { applyError = e.message; }
check('migration applies', !applyError, applyError);
await db.exec(`grant all on all tables in schema public to service_role; grant usage on all sequences in schema public to service_role;`);

async function as(role, sub, fn) {
  const claims = JSON.stringify(sub ? {sub, role} : {role});
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
const exec = async (sql, params) => { try { return {r: await db.query(sql, params)}; } catch (e) { return {error: e.message}; } };
const service = (sql, params) => as('service_role', null, () => exec(sql, params));
const member = (sql, params) => as('authenticated', A, () => exec(sql, params));

// ── Ledger: append + chain ────────────────────────────────────────────────────────────
let r = await service(`select public.ledger_append('system', null, null, 'boot', 'house', null, '{}'::jsonb) s`);
check('service role can append', !r.error, r.error);
await service(`select public.ledger_append('staff', $1, null, 'note', 'house', 'x', '{"k":1}'::jsonb)`, [A]);
await service(`select public.ledger_append('member', $1, null, 'note', 'house', 'y', '{}'::jsonb)`, [A]);
r = await exec(`select seq, prev_hash, row_hash from public.house_ledger order by seq`);
const rows = r.r.rows;
check('first row chains from genesis', rows[0].prev_hash === 'genesis');
check('each row chains to the previous row hash', rows[1].prev_hash === rows[0].row_hash && rows[2].prev_hash === rows[1].row_hash);
check('hashes are sha-256 hex', /^[0-9a-f]{64}$/.test(rows[2].row_hash));
r = await service(`select public.ledger_verify() v`);
check('intact chain verifies (NULL)', r.r?.rows[0].v === null, JSON.stringify(r.r?.rows ?? r.error));

// ── Agent charter on the ledger ───────────────────────────────────────────────────────
r = await service(`select public.ledger_append('agent', null, null, 'acted', 'house', null, '{}'::jsonb)`);
check('agent row without a charter is rejected by the table', !!r.error && /charter/.test(r.error), r.error);
r = await service(`select public.ledger_append('agent', null, 'nova_requests.find_item:scout', 'acted', 'house', null, '{}'::jsonb)`);
check('agent row with a charter is accepted', !r.error, r.error);

// ── Append-only, for everyone ─────────────────────────────────────────────────────────
r = await exec(`update public.house_ledger set action = 'edited' where seq = 1`);
check('owner cannot UPDATE the ledger', !!r.error && /append-only/.test(r.error), r.error);
r = await exec(`delete from public.house_ledger where seq = 1`);
check('owner cannot DELETE from the ledger', !!r.error && /append-only/.test(r.error), r.error);
r = await exec(`truncate public.house_ledger`);
check('owner cannot TRUNCATE the ledger', !!r.error && /append-only/.test(r.error), r.error);
r = await member(`select * from public.house_ledger`);
check('members cannot read the ledger', !!r.error, r.error);
r = await member(`select public.ledger_append('member', null, null, 'x', 'house', null, '{}'::jsonb)`);
check('members cannot append to the ledger', !!r.error, r.error);
r = await member(`insert into public.house_ledger (actor_kind, action, subject_kind, prev_hash, row_hash) values ('system', 'x', 'y', 'genesis', 'z')`);
check('members cannot insert directly', !!r.error, r.error);

// ── Tamper detection (a compromised operator disables the guards and edits a row) ─────
await exec(`alter table public.house_ledger disable trigger house_ledger_no_update`);
await exec(`update public.house_ledger set details = '{"k":999}'::jsonb where seq = 2`);
await exec(`alter table public.house_ledger enable trigger house_ledger_no_update`);
r = await service(`select public.ledger_verify() v`);
check('verify names the tampered row', Number(r.r?.rows[0].v) === 2, JSON.stringify(r.r?.rows ?? r.error));

// ── Nova requests: only the chartered agent may produce a result ───────────────────────
const draft = async (kind, details) => (await member(`insert into public.nova_requests (member_id, kind, title, details) values ($1, $2, 'T', $3::jsonb) returning id`, [A, kind, JSON.stringify(details)])).r.rows[0].id;
const id1 = await draft('find_item', {query: 'boots'});
await service(`update public.nova_requests set status = 'running' where id = $1`, [id1]);
r = await service(`update public.nova_requests set status = 'ready', result = '{"agent":"price-hunter","prices":[]}' where id = $1`, [id1]);
check('wrong agent for the kind is rejected', !!r.error && /agent_not_chartered/.test(r.error), r.error);
r = await service(`update public.nova_requests set status = 'ready', result = '{"items":[]}' where id = $1`, [id1]);
check('result with no agent is rejected', !!r.error && /agent_not_chartered/.test(r.error), r.error);
r = await service(`update public.nova_requests set status = 'ready', result = '{"agent":"scout","items":[]}' where id = $1`, [id1]);
check('chartered agent result is accepted', !r.error, r.error);
r = await exec(`select count(*)::int n from public.house_ledger where action = 'agent_result' and subject_id = $1 and charter = 'nova_requests.find_item:scout'`, [id1]);
check('agent result is recorded on the ledger with its charter', r.r.rows[0].n === 1);
const id2 = await draft('plan', {topic: 'table', brief: 'Dinner'});
await service(`update public.nova_requests set status = 'running' where id = $1`, [id2]);
r = await service(`update public.nova_requests set status = 'ready', result = '{"agent":"planner","plan":"x","booked":true}' where id = $1`, [id2]);
check('a plan cannot claim a booking', !!r.error && /plans_cannot_claim_booking/.test(r.error), r.error);
r = await service(`update public.nova_requests set status = 'ready', result = '{"agent":"planner","plan":"x","booked":false}' where id = $1`, [id2]);
check('an honest plan is accepted', !r.error, r.error);

// ── Hooks: VIP grants + moderation ────────────────────────────────────────────────────
r = await service(`insert into public.vip_grants (user_id, source) values ($1, 'staff') returning id`, [A]);
const g = r.r?.rows[0]?.id;
await service(`update public.vip_grants set revoked_at = now() where id = $1`, [g]);
r = await exec(`select array_agg(action order by seq) a from public.house_ledger where subject_kind = 'vip_grant' and subject_id = $1`, [g]);
check('VIP grant and revoke are on the ledger', JSON.stringify(r.r.rows[0].a) === '["vip_grant","vip_revoke"]', JSON.stringify(r.r.rows[0].a));
r = await service(`insert into public.posts (author_id, content) values ($1, 'hi') returning id`, [A]);
const p = r.r.rows[0].id;
await service(`update public.posts set moderation_hidden = true where id = $1`, [p]);
r = await exec(`select actor_kind from public.house_ledger where action = 'content_hidden' and subject_id = $1`, [p]);
check('moderation hide is on the ledger', r.r.rows.length === 1, JSON.stringify(r.r.rows));

// ── Secret-shaped values refused ──────────────────────────────────────────────────────
r = await exec(`select access_token_enc, connected from public.social_accounts where platform = 'x'`);
check('pre-existing raw token was cleared and disconnected', r.r.rows[0].access_token_enc === null && r.r.rows[0].connected === false, JSON.stringify(r.r.rows[0]));
const sealed = 'v1:' + 'A'.repeat(16) + ':' + 'B'.repeat(40) + '==';
for (const [label, value] of [
  ['raw OAuth token', 'ya29.a0AfH6SMBx-raw-token'],
  ['JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig'],
  ['sk- API key', 'sk-ant-api03-abcdefghijklmnop'],
  ['connection string', 'postgres://postgres:pw@db.example.com:5432/postgres'],
  ['private key', '-----BEGIN PRIVATE KEY-----MIIE'],
]) {
  r = await service(`insert into public.social_accounts (user_id, platform, access_token_enc) values ($1, 'ig', $2)`, [A, value]);
  check(`social token refuses a ${label}`, !!r.error && /social_accounts_token_sealed/.test(r.error), r.error);
}
r = await service(`insert into public.social_accounts (user_id, platform, access_token_enc, connected) values ($1, 'tt', $2, true)`, [A, sealed]);
check('a sealed v1 token is accepted', !r.error, r.error);

// ── FORCE RLS: a table owner without BYPASSRLS can't read across members ─────────────
await db.exec(`create role job_owner nologin; grant usage on schema auth, public to job_owner; alter table public.entourage_people owner to job_owner;`);
await exec(`insert into public.entourage_people (member_id, name) values ($1, 'Mum')`, [A]);
r = await as('job_owner', null, () => exec(`select count(*)::int n from public.entourage_people`));
check('forced RLS: owner job with no member token sees no rows', r.r?.rows[0].n === 0, JSON.stringify(r.r?.rows ?? r.error));
r = await as('job_owner', A, () => exec(`select count(*)::int n from public.entourage_people`));
check('forced RLS: owner acting with a member token sees only that member', r.r?.rows[0].n === 1, JSON.stringify(r.r?.rows ?? r.error));

r = await exec(`select rolbypassrls from pg_roles where rolname in ('anon','authenticated') and rolbypassrls`);
check('anon and authenticated never bypass RLS', r.r.rows.length === 0);

try { await db.exec(migration('20261018_hardening.sql')); r = {}; } catch (e) { r = {error: e.message}; }
check('migration re-applies cleanly', !r.error, r.error);

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
