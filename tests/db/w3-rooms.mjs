// Behaviour test for the w3 room migrations on PGlite (Postgres in WASM):
//   20261016_w3_salon.sql · 20261016_w3_gym_sessions.sql · 20261016_w3_lab.sql · 20261016_w3_switchboard.sql
// Simulates PostgREST roles with SET ROLE + request.jwt.claims and Supabase's default privileges (anon /
// authenticated get ALL on new public tables), and recreates the tables as the older migrations left them —
// including their permissive "for all" owner policies — so what's tested is what these migrations change.
// Run: node tests/db/w3-rooms.mjs
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

const REPO = process.argv[2] ?? process.cwd();
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok, detail});
const migration = (f) => fs.readFileSync(`${REPO}/supabase/migrations/${f}`, 'utf8');
const FILES = ['20261016_w3_salon.sql', '20261016_w3_gym_sessions.sql', '20261016_w3_lab.sql', '20261016_w3_switchboard.sql'];

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create table public.profiles (id uuid primary key);
insert into public.profiles values ('${A}'), ('${B}');

-- As 20260617_master_finesse_schema.sql + 20260617_wire_all_modules.sql left them.
create table public.salon_bookings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  service_id text not null, service_name text not null, price_cents int not null, duration text, category text,
  edition text not null default 'finesse', requested_date text not null, requested_time text not null, notes text,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  created_at timestamptz not null default now());
alter table public.salon_bookings enable row level security;
create policy "salon_bookings_own" on public.salon_bookings using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "salon_own" on public.salon_bookings for all using (auth.uid() = user_id);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  r2_key text not null unique, url text not null, type text not null check (type in ('image','video','audio','3d')),
  size_bytes bigint, mime_type text, job_id text, created_at timestamptz not null default now());
alter table public.media_assets enable row level security;
create policy "media_assets_own" on public.media_assets using (auth.uid() = user_id) with check (auth.uid() = user_id);
create table public.media_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('video','voice','music','3d','image')), provider text not null, prompt text, style text,
  status text not null default 'queued' check (status in ('queued','processing','complete','failed')),
  result_url text, provider_job_id text, error_message text, created_at timestamptz not null default now(), completed_at timestamptz);
alter table public.media_jobs enable row level security;
create policy "media_jobs_own" on public.media_jobs using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null, connected boolean not null default false, access_token_enc text, connected_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, platform));
alter table public.social_accounts enable row level security;
create policy "social_accounts_own" on public.social_accounts using (auth.uid() = user_id) with check (auth.uid() = user_id);
create table public.social_broadcasts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  platforms text[] not null default '{}', content text not null, results jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued','sent','partial','failed')), created_at timestamptz not null default now());
alter table public.social_broadcasts enable row level security;
create policy "social_broadcasts_own" on public.social_broadcasts using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pre-existing bad state: a tokenless "connected" account.
insert into public.social_accounts (user_id, platform, connected, connected_at) values ('${A}', 'twitter', true, now());
`);

let applyError = null;
for (const f of FILES) {
  try { await db.exec(migration(f)); } catch (e) { applyError = `${f}: ${e.message}`; break; }
}
check('migrations apply', !applyError, applyError);

async function as(role, sub, fn) {
  const claims = JSON.stringify(sub ? {sub, role} : {role});
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
const exec = async (sql, params) => { try { return {r: await db.query(sql, params)}; } catch (e) { return {error: e.message}; } };
const member = (id, sql, params) => as('authenticated', id, () => exec(sql, params));
const anon = (sql, params) => as('anon', null, () => exec(sql, params));
const service = (sql, params) => as('service_role', null, () => exec(sql, params));
const rows = (r) => r.r?.rows ?? [];

// ── Salon ────────────────────────────────────────────────────────────────────────────────
const BOOK = `insert into public.salon_bookings (user_id, service_id, service_name, price_cents, requested_date, requested_time, status)
  values ($1, 'custom', 'Silk press', 0, '2026-10-20', '16:00', $2) returning id`;
let r = await member(A, BOOK, [A, 'pending']);
check('member can request a booking (pending)', !r.error, r.error);
const bookingA = rows(r)[0]?.id;
r = await member(A, BOOK, [A, 'confirmed']);
check('member cannot insert a confirmed booking', !!r.error, r.error);
r = await member(A, BOOK, [B, 'pending']);
check('member cannot request for someone else', !!r.error, r.error);
r = await member(B, `select * from public.salon_bookings`);
check('other members cannot see the booking', rows(r).length === 0, r.error ?? String(rows(r).length));
r = await member(A, `update public.salon_bookings set status = 'confirmed' where id = $1 returning id`, [bookingA]);
check('member cannot confirm their own booking', !!r.error || rows(r).length === 0, r.error ?? 'updated');
r = await member(B, `update public.salon_bookings set status = 'cancelled' where id = $1 returning id`, [bookingA]);
check('other member cannot cancel it', !!r.error || rows(r).length === 0, r.error ?? 'updated');
r = await member(A, `update public.salon_bookings set status = 'cancelled' where id = $1 returning id`, [bookingA]);
check('member can cancel their pending request', rows(r).length === 1, r.error);
r = await member(A, `update public.salon_bookings set status = 'pending' where id = $1 returning id`, [bookingA]);
check('a cancelled request cannot be revived', !!r.error || rows(r).length === 0, r.error ?? 'updated');
r = await member(A, `delete from public.salon_bookings where id = $1`, [bookingA]);
check('members cannot delete booking history', !!r.error, r.error);
r = await anon(`select * from public.salon_bookings`);
check('anon cannot read bookings', !!r.error, r.error);
r = await service(`update public.salon_bookings set status = 'confirmed' where user_id = $1 returning id`, [A]);
check('service role (salon partner) can confirm', rows(r).length === 1, r.error);

// ── Gym sessions ─────────────────────────────────────────────────────────────────────────
const SESS = `insert into public.gym_sessions (user_id, day, at_time, kind, title) values ($1, '2026-10-19', $2, $3, 'Barre') returning id`;
r = await member(A, SESS, [A, '07:00', 'class']);
check('member can plan a session', !r.error, r.error);
const sessA = rows(r)[0]?.id;
r = await member(A, SESS, [A, '7am', 'class']);
check('time must be HH:MM', !!r.error, r.error);
r = await member(A, SESS, [A, '07:00', 'brunch']);
check('kind is constrained', !!r.error, r.error);
r = await member(A, SESS, [B, '07:00', 'class']);
check('member cannot plan for someone else', !!r.error, r.error);
r = await member(B, `select * from public.gym_sessions`);
check('sessions are private', rows(r).length === 0, r.error);
r = await member(B, `update public.gym_sessions set done = true where id = $1 returning id`, [sessA]);
check('other member cannot mark it done', rows(r).length === 0, r.error);
r = await member(A, `update public.gym_sessions set done = true where id = $1 returning id`, [sessA]);
check('owner can mark it done', rows(r).length === 1, r.error);
r = await anon(`select * from public.gym_sessions`);
check('anon cannot read sessions', !!r.error, r.error);

// ── Lab: media_jobs ──────────────────────────────────────────────────────────────────────
const JOB = `insert into public.media_jobs (user_id, type, provider, prompt, status) values ($1, 'voice', 'elevenlabs', 'hello', $2) returning id`;
r = await member(A, JOB, [A, 'needs_key']);
check('member can save a needs_key draft', !r.error, r.error);
const jobNeeds = rows(r)[0]?.id;
r = await member(A, JOB, [A, 'queued']);
const jobQ = rows(r)[0]?.id;
check('member can queue a draft', !r.error, r.error);
r = await member(A, JOB, [A, 'complete']);
check('member cannot insert a complete job', !!r.error, r.error);
r = await member(A, `insert into public.media_jobs (user_id, type, provider, status, result_url) values ($1, 'image', 'higgsfield', 'queued', 'https://x/y.png')`, [A]);
check('member cannot insert a result url', !!r.error, r.error);
r = await member(A, `update public.media_jobs set status = 'complete' where id = $1`, [jobQ]);
check('member cannot mark their job complete', !!r.error, r.error);
r = await member(A, `update public.media_jobs set result_url = 'https://fake' where id = $1`, [jobQ]);
check('member cannot write result_url', !!r.error, r.error);
r = await member(A, `update public.media_jobs set status = 'approved' where id = $1`, [jobNeeds]);
check('member cannot approve a job with no result', !!r.error, r.error);
r = await service(`update public.media_jobs set status = 'complete', result_url = 'https://cdn/x.mp3', result_key = 'voice/x.mp3' where id = $1 returning id`, [jobQ]);
check('service role writes vendor results', rows(r).length === 1, r.error);
r = await member(B, `update public.media_jobs set status = 'approved' where id = $1 returning id`, [jobQ]);
check('other member cannot approve it', !!r.error || rows(r).length === 0, r.error ?? 'updated');
r = await member(B, `select * from public.media_jobs`);
check('jobs are private', rows(r).length === 0, r.error);
r = await member(A, `update public.media_jobs set status = 'approved' where id = $1 returning approved_at`, [jobQ]);
check('member approves a complete job (approved_at stamped)', rows(r).length === 1 && rows(r)[0].approved_at !== null, r.error);
r = await member(A, `update public.media_jobs set status = 'discarded' where id = $1 returning id`, [jobQ]);
check('an approved job cannot be discarded', !!r.error || rows(r).length === 0, r.error ?? 'updated');
r = await exec(`select status from public.media_jobs where id = $1`, [jobQ]);
check('approved job stays approved', rows(r)[0]?.status === 'approved', JSON.stringify(rows(r)));
r = await member(A, `update public.media_jobs set status = 'discarded' where id = $1 returning id`, [jobNeeds]);
check('member can discard a needs_key draft', rows(r).length === 1, r.error);
r = await member(A, `insert into public.media_assets (user_id, r2_key, url, type, job_id) values ($1, 'voice/x.mp3', 'https://cdn/x.mp3', 'audio', $2)`, [A, jobQ]);
check('member can keep an approved result in their library', !r.error, r.error);
r = await anon(`select * from public.media_jobs`);
check('anon cannot read jobs', !!r.error, r.error);

// ── Switchboard ──────────────────────────────────────────────────────────────────────────
r = await exec(`select connected, connected_at from public.social_accounts where user_id = $1`, [A]);
check('tokenless "connected" rows were reset', rows(r)[0]?.connected === false && rows(r)[0]?.connected_at === null, JSON.stringify(rows(r)));
r = await member(A, `insert into public.social_accounts (user_id, platform, connected) values ($1, 'instagram', false)`, [A]);
check('members cannot create account links', !!r.error, r.error);
r = await member(A, `update public.social_accounts set connected = true where user_id = $1`, [A]);
check('members cannot flip connected', !!r.error, r.error);
r = await service(`update public.social_accounts set connected = true where user_id = $1`, [A]);
check('connected requires a token, even for the service role', !!r.error, r.error);
r = await service(`update public.social_accounts set connected = true, access_token_enc = 'v1:aaa:bbb', connected_at = now() where user_id = $1 returning id`, [A]);
check('a sealed token makes a real link', rows(r).length === 1, r.error);
r = await member(B, `select * from public.social_accounts`);
check('links are private', rows(r).length === 0, r.error);
r = await member(B, `delete from public.social_accounts where user_id = $1 returning id`, [A]);
check('other member cannot disconnect it', rows(r).length === 0, r.error);
r = await member(A, `insert into public.social_broadcasts (user_id, platforms, content, status) values ($1, '{twitter}', 'hi', 'sent')`, [A]);
check('member logs their own broadcast', !r.error, r.error);
r = await member(A, `update public.social_broadcasts set status = 'sent'`);
check('broadcast log is append-only for members', !!r.error, r.error);
r = await member(A, `delete from public.social_accounts where user_id = $1 returning id`, [A]);
check('member can disconnect their own link', rows(r).length === 1, r.error);
r = await anon(`select * from public.social_accounts`);
check('anon cannot read links', !!r.error, r.error);

// ── Cascade + idempotence ────────────────────────────────────────────────────────────────
await exec(`delete from public.profiles where id = $1`, [A]);
r = await exec(`select (select count(*) from public.gym_sessions where user_id = $1)::int g, (select count(*) from public.media_jobs where user_id = $1)::int j`, [A]);
check('deleting the profile deletes sessions and jobs', rows(r)[0]?.g === 0 && rows(r)[0]?.j === 0, JSON.stringify(rows(r)));

let again = null;
for (const f of FILES) {
  try { await db.exec(migration(f)); } catch (e) { again = `${f}: ${e.message}`; break; }
}
check('migrations re-apply cleanly', !again, again);

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
