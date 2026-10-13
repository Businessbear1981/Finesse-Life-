// Shared PGlite harness for the w2 behaviour tests (entourage, departures, per diem, clubhouse).
// Not a test on its own. Simulates PostgREST roles with SET ROLE + request.jwt.claims and reproduces
// Supabase's default privileges (anon/authenticated get ALL on new public tables and EXECUTE on new
// functions), so the migration's own revokes are what's being tested.
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

export const ids = {
  A: '00000000-0000-4000-8000-0000000002a1',
  B: '00000000-0000-4000-8000-0000000002b1',
  C: '00000000-0000-4000-8000-0000000002c1',
  D: '00000000-0000-4000-8000-0000000002d1',
};

export async function harness(migrationFile) {
  const REPO = process.argv[2] ?? process.cwd();
  const db = new PGlite();
  const results = [];
  const check = (name, ok, detail = '') => results.push({name, ok: !!ok, detail});
  const sql = fs.readFileSync(`${REPO}/supabase/migrations/${migrationFile}`, 'utf8');

  await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create table public.profiles (id uuid primary key, username text, display_name text);
insert into public.profiles values
  ('${ids.A}', 'a', 'Ava'), ('${ids.B}', 'b', 'Ben'), ('${ids.C}', 'c', ''), ('${ids.D}', 'd', 'Dre');
`);

  let applyError = null;
  try { await db.exec(sql); } catch (e) { applyError = e.message; }
  check('migration applies', !applyError, applyError);

  async function as(role, sub, fn) {
    const claims = JSON.stringify(sub ? {sub, role} : {role});
    await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
  }
  const exec = async (q, params) => { try { return {r: await db.query(q, params)}; } catch (e) { return {error: e.message}; } };
  const member = (id, q, params) => as('authenticated', id, () => exec(q, params));
  const anon = (q, params) => as('anon', null, () => exec(q, params));
  const rows = (r) => r.r?.rows ?? [];

  async function reapply() {
    try { await db.exec(sql); check('migration re-applies cleanly', true); } catch (e) { check('migration re-applies cleanly', false, e.message); }
  }

  function finish() {
    for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
    const failed = results.filter((x) => !x.ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  }

  return {db, check, exec, member, anon, rows, reapply, finish};
}
