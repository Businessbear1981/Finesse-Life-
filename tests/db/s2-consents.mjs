// Behaviour test for supabase/migrations/20261017_s2_consents.sql on PGlite (Postgres in WASM).
// Roles are simulated with SET ROLE + request.jwt.claims; Supabase default privileges are reproduced so the
// migration's own revokes are what's tested. Run: node tests/db/s2-consents.mjs
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
try { await db.exec(migration('20261017_s2_consents.sql')); } catch (e) { applyError = e.message; }
check('migration applies', !applyError, applyError);
let again = null;
try { await db.exec(migration('20261017_s2_consents.sql')); } catch (e) { again = e.message; }
check('migration is idempotent', !again, again);

async function as(role, sub, fn) {
  const claims = JSON.stringify(sub ? {sub, role} : {role});
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
const exec = async (sql, params) => { try { return {r: await db.query(sql, params)}; } catch (e) { return {error: e.message}; } };
const member = (id, sql, params) => as('authenticated', id, () => exec(sql, params));

const accept = `insert into public.member_consents (member_id, kind, platform) values ($1, $2, 'ios') on conflict (member_id, kind) do nothing returning kind, accepted_at`;

let r = await member(A, accept, [A, 'ai_processing']);
check('member records their own consent', !r.error && r.r.rows.length === 1, r.error);
r = await member(A, accept, [A, 'ai_processing']);
check('accepting twice is a no-op (upsert ignore)', !r.error && r.r.rows.length === 0, r.error);
r = await member(A, accept, [A, 'age_18']);
check('age_18 kind accepted', !r.error, r.error);
r = await member(A, accept, [A, 'photo_ai']);
check('photo_ai kind accepted', !r.error, r.error);
r = await member(A, accept, [A, 'marketing']);
check('unknown kinds rejected', !!r.error, r.error);
r = await member(A, accept, [B, 'ai_processing']);
check('member cannot consent for someone else', !!r.error, r.error);
r = await as('anon', null, () => exec(accept, [A, 'age_18']));
check('anon cannot write consents', !!r.error, r.error);

r = await member(A, `insert into public.member_consents (member_id, kind, accepted_at) values ($1, 'ai_processing', '2001-01-01') on conflict do nothing`, [B]);
check('forged member id still refused with a forged date', !!r.error, r.error);
await member(B, `insert into public.member_consents (member_id, kind, accepted_at) values ($1, 'ai_processing', '2001-01-01')`, [B]);
r = await member(B, `select accepted_at from public.member_consents where kind = 'ai_processing'`);
check('accepted_at is the server clock, not the client', r.r?.rows[0] && new Date(r.r.rows[0].accepted_at).getFullYear() >= 2025, JSON.stringify(r.r?.rows ?? r.error));

r = await member(A, `select member_id from public.member_consents`);
check('members only read their own consents', r.r?.rows.length === 3 && r.r.rows.every((x) => x.member_id === A), JSON.stringify(r.r?.rows ?? r.error));
r = await as('anon', null, () => exec(`select * from public.member_consents`));
check('anon cannot read consents', !!r.error || r.r.rows.length === 0, r.error);

r = await member(A, `update public.member_consents set accepted_at = now() - interval '1 year' where member_id = $1`, [A]);
check('nobody can edit a consent row', !!r.error || r.r.affectedRows === 0, r.error ?? `${r.r?.affectedRows} rows`);

r = await member(A, `delete from public.member_consents where member_id = $1 and kind = 'photo_ai'`, [B]);
check('member cannot withdraw someone else’s consent', !r.error && r.r.affectedRows === 0, r.error);
r = await member(A, `delete from public.member_consents where kind = 'photo_ai'`);
check('member can withdraw their own consent', !r.error && r.r.affectedRows === 1, r.error);

await db.exec(`delete from public.profiles where id = '${A}'`);
r = await db.query(`select count(*)::int as n from public.member_consents where member_id = $1`, [A]);
check('consents go with the account', r.rows[0].n === 0, JSON.stringify(r.rows));

let failed = 0;
for (const x of results) {
  if (!x.ok) failed++;
  console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : `  — ${x.detail}`}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
