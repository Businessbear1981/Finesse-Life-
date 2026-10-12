// Behaviour test for supabase/migrations/20261014_live_map.sql on PGlite (Postgres in WASM).
// Simulates PostgREST roles with SET ROLE + request.jwt.claims, and Supabase's default
// privileges (anon/authenticated get ALL on new public tables and EXECUTE on new functions),
// so the migration's own revokes are what's being tested. No database or network needed.
// Run: npm run test:db
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

const REPO = process.argv[2] ?? process.cwd();
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok, detail});
const migration = (f) => fs.readFileSync(`${REPO}/supabase/migrations/${f}`, 'utf8');

const F = '00000000-0000-4000-8000-00000000000f';
const M = '00000000-0000-4000-8000-00000000000a';
const X = '00000000-0000-4000-8000-00000000000b';
const V = '00000000-0000-4000-8000-00000000000c'; // viewer

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
create table public.profiles (id uuid primary key, username text, gender text);
insert into public.profiles values
  ('${F}', 'f', 'feminine'), ('${M}', 'm', 'masculine'), ('${X}', 'x', null), ('${V}', 'v', 'nonbinary');
`);

let applyError = null;
try { await db.exec(migration('20261014_live_map.sql')); } catch (e) { applyError = e.message; }
check('migration applies', !applyError, applyError);

async function as(role, sub, fn) {
  const claims = JSON.stringify(sub ? {sub, role} : {role});
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
const exec = async (sql, params) => { try { return {r: await db.query(sql, params)}; } catch (e) { return {error: e.message}; } };
const member = (id, sql, params) => as('authenticated', id, () => exec(sql, params));
const BBOX = `select * from public.map_snapshot(40.70, -74.02, 40.80, -73.93)`;

// ── Ping: coarse, colour from profile ────────────────────────────────────────────────────
let r = await member(F, `select public.map_ping(40.741234, -73.989876)`);
check('member can share presence', !r.error, r.error);
await member(M, `select public.map_ping(40.7419, -73.9881)`);
await member(X, `select public.map_ping(40.7502, -73.9934)`);
await member(V, `select public.map_ping(40.7300, -74.0000)`);

r = await exec(`select cell_lat, cell_lng, kind from public.map_presence where member_id = $1`, [F]);
const cell = r.r.rows[0];
check('raw fix is never stored (snapped to the 0.002° grid)',
  Math.abs(cell.cell_lat - 40.742) < 1e-9 && Math.abs(cell.cell_lng - -73.99) < 1e-9, JSON.stringify(cell));
check('feminine → pink kind f', cell.kind === 'f', cell.kind);
r = await exec(`select member_id, kind from public.map_presence order by kind`);
const kinds = Object.fromEntries(r.r.rows.map((x) => [x.member_id, x.kind]));
check('masculine → blue kind m', kinds[M] === 'm', kinds[M]);
check('unset gender → neutral kind x', kinds[X] === 'x', kinds[X]);
check('nonbinary → neutral kind x', kinds[V] === 'x', kinds[V]);

r = await member(F, `select public.map_ping(91, 0)`);
check('out-of-range latitude rejected', !!r.error && /bad_location/.test(r.error), r.error);
r = await member(F, `select public.map_ping('NaN'::float8, 0)`);
check('NaN rejected', !!r.error && /bad_location/.test(r.error), r.error);
r = await as('anon', null, () => exec(`select public.map_ping(40.7, -73.9)`));
check('signed-out cannot ping', !!r.error, r.error);

// ── Snapshot: anonymous, excludes caller, bounded ─────────────────────────────────────────
r = await member(V, BBOX);
check('snapshot works for a member', !r.error, r.error);
const rows = r.r?.rows ?? [];
check('snapshot excludes the caller', rows.length === 3, String(rows.length));
check('snapshot returns only lat, lng, kind (no ids)',
  rows.length > 0 && Object.keys(rows[0]).sort().join() === 'kind,lat,lng', Object.keys(rows[0] ?? {}).join());
const fdot = rows.find((x) => x.kind === 'f');
check('dot is spread inside its cell (≤ 0.0009° from the cell centre)',
  !!fdot && Math.abs(fdot.lat - 40.742) <= 0.0009 && Math.abs(fdot.lng - -73.99) <= 0.0009, JSON.stringify(fdot));
const again = (await member(V, BBOX)).r.rows.find((x) => x.kind === 'f');
check('spread is stable between polls (no jitter flicker)', again.lat === fdot.lat && again.lng === fdot.lng);

r = await as('anon', null, () => exec(BBOX));
check('signed-out cannot read the snapshot', !!r.error, r.error);
r = await member(V, `select * from public.map_snapshot(0, 0, 10, 10)`);
check('oversized bbox rejected', !!r.error && /bad_bbox/.test(r.error), r.error);
r = await member(V, `select * from public.map_snapshot(41, -73, 40, -74)`);
check('inverted bbox rejected', !!r.error && /bad_bbox/.test(r.error), r.error);

// ── Direct table access is closed ─────────────────────────────────────────────────────────
r = await member(V, `select * from public.map_presence`);
check('members cannot read map_presence directly', !!r.error, r.error ?? `${r.r.rows.length} rows`);
r = await member(F, `update public.map_presence set cell_lat = 0`);
check('members cannot write map_presence directly', !!r.error, r.error);
r = await as('anon', null, () => exec(`select * from public.map_presence`));
check('anon cannot read map_presence', !!r.error, r.error);

// ── Freshness ─────────────────────────────────────────────────────────────────────────────
await exec(`update public.map_presence set seen_at = now() - interval '20 minutes' where member_id = $1`, [X]);
r = await member(V, BBOX);
check('presence older than 15 minutes is not returned', r.r.rows.length === 2, String(r.r.rows.length));
await member(F, `select public.map_ping(40.7412, -73.9898)`);
r = await exec(`select count(*)::int n from public.map_presence where member_id = $1`, [X]);
check('stale presence is purged on the next ping', r.r.rows[0].n === 0, String(r.r.rows[0].n));

// ── Ghost mode + sharing flag ────────────────────────────────────────────────────────────
r = await member(F, `select public.map_sharing() s`);
check('map_sharing true while sharing', r.r?.rows[0].s === true, r.error);
r = await member(F, `select public.map_ghost()`);
check('member can go ghost', !r.error, r.error);
r = await member(F, `select public.map_sharing() s`);
check('map_sharing false after ghost', r.r.rows[0].s === false);
r = await member(V, BBOX);
check('ghosted member disappears from the snapshot', !r.r.rows.some((x) => x.kind === 'f'));

// ── Events ───────────────────────────────────────────────────────────────────────────────
await exec(`insert into public.map_events (title, venue, lat, lng, starts_at, ends_at) values
  ('Rooftop Session', 'The Penthouse', 40.744, -73.987, now(), now() + interval '3 hours'),
  ('Old Party', 'Gone', 40.75, -73.99, now() - interval '5 hours', now() - interval '1 hour')`);
r = await member(V, `select title from public.map_events`);
check('members see live/upcoming events only', r.r?.rows.length === 1 && r.r.rows[0].title === 'Rooftop Session', r.error ?? JSON.stringify(r.r.rows));
r = await member(V, `insert into public.map_events (title, lat, lng, starts_at, ends_at) values ('x', 0, 0, now(), now() + interval '1 hour')`);
check('members cannot create events', !!r.error, r.error);
r = await as('anon', null, () => exec(`select * from public.map_events`));
check('anon cannot read events', !!r.error || r.r.rows.length === 0, r.error);
r = await exec(`insert into public.map_events (title, lat, lng, starts_at, ends_at) values ('bad', 0, 0, now(), now() - interval '1 hour')`);
check('event must end after it starts', !!r.error, r.error);

// ── Account deletion cascades ────────────────────────────────────────────────────────────
await member(M, `select public.map_ping(40.7419, -73.9881)`);
await exec(`delete from public.profiles where id = $1`, [M]);
r = await exec(`select count(*)::int n from public.map_presence where member_id = $1`, [M]);
check('deleting the profile deletes presence', r.r.rows[0].n === 0);

try { await db.exec(migration('20261014_live_map.sql')); r = {}; } catch (e) { r = {error: e.message}; }
check('migration re-applies cleanly', !r.error, r.error);

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
