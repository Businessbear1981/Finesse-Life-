// Behaviour test for supabase/migrations/20261020_s4a_profiles_rls_policies.sql +
// 20261020_s4b_profiles_column_grants.sql on PGlite (Postgres
// compiled to WASM). Builds a minimal fixture that mirrors the pre-migration production state —
// table-wide SELECT on profiles plus the original VIP policies that read p.is_vip/p.vip_expires_at
// directly — then applies the migration and simulates member / VIP / anon / service_role requests
// with SET ROLE + request.jwt.claims (what PostgREST does). No database or network needed.
// Run: node tests/db/s4-profiles-rls.mjs
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

const REPO = process.argv[2] ?? process.cwd();
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok, detail});

const A = '00000000-0000-4000-8000-00000000000a'; // active VIP (lifetime)
const B = '00000000-0000-4000-8000-00000000000b'; // non-VIP
const C = '00000000-0000-4000-8000-00000000000c'; // VIP, expired
const N = '00000000-0000-4000-8000-00000000000d'; // non-VIP

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $$;
grant usage on schema auth to anon, authenticated, service_role;

-- profiles: public + private columns, exactly as the base migration leaves them
create table public.profiles (
  id uuid primary key, username text, display_name text, avatar_url text, vibe text, bio text,
  city text, interests text, created_at timestamptz not null default now(),
  public_photos jsonb default '[]'::jsonb, public_links jsonb default '[]'::jsonb,
  check_in text, has_private_profile boolean not null default false,
  email text, telegram_chat_id text, private_bio text, nightvision_data jsonb, style_dna jsonb,
  is_vip boolean not null default false, vip_expires_at timestamptz, role text not null default 'member',
  terms_accepted_at timestamptz, posting_suspended_at timestamptz);
alter table public.profiles enable row level security;
create policy "profiles_own_read" on public.profiles for select using (auth.uid() = id);
create policy "profiles_member_read" on public.profiles for select to authenticated using (true);

-- VIP feed tables + the ORIGINAL VIP policies (they read p.is_vip/p.vip_expires_at directly)
create table public.vip_posts (id uuid primary key default gen_random_uuid(), author_id uuid not null, content text);
alter table public.vip_posts enable row level security;
create policy "vip_posts_vip_read" on public.vip_posts for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_vip = true
            and (p.vip_expires_at is null or p.vip_expires_at > now())));
create policy "vip_posts_vip_insert" on public.vip_posts for insert to authenticated with check (
  author_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.is_vip = true and (p.vip_expires_at is null or p.vip_expires_at > now())));

create table public.vip_post_likes (id uuid primary key default gen_random_uuid(), post_id uuid, user_id uuid);
alter table public.vip_post_likes enable row level security;
create policy "vip_post_likes_vip_read" on public.vip_post_likes for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_vip = true
            and (p.vip_expires_at is null or p.vip_expires_at > now())));
create policy "vip_post_likes_vip_insert" on public.vip_post_likes for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.is_vip = true and (p.vip_expires_at is null or p.vip_expires_at > now())));

create table public.vip_exclusives (id uuid primary key default gen_random_uuid(), title text);
alter table public.vip_exclusives enable row level security;
create policy "vip_exclusives_vip_read" on public.vip_exclusives for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_vip = true
            and (p.vip_expires_at is null or p.vip_expires_at > now())));
`);

// Simulate the pre-existing broad grants (a table-wide SELECT on every table), then apply the migration.
await db.exec(`
  grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;`);

const S4_PARTS = ['20261020_s4a_profiles_rls_policies.sql', '20261020_s4b_profiles_column_grants.sql'];
const applyS4 = async () => {
  for (const f of S4_PARTS) await db.exec(fs.readFileSync(`${REPO}/supabase/migrations/${f}`, 'utf8'));
};
await applyS4();

await db.exec(`
  insert into public.profiles (id, username, display_name, email, is_vip, vip_expires_at, role, private_bio)
  values ('${A}','amara','Amara','a@x.com', true,  null, 'member', 'secret A'),
         ('${B}','bella','Bella','b@x.com', false, null, 'member', 'secret B'),
         ('${C}','coco','Coco','c@x.com',   true,  now() - interval '1 day', 'member', 'secret C'),
         ('${N}','nova','Nova','n@x.com',   false, null, 'member', 'secret N');
  insert into public.vip_posts (author_id, content) values ('${A}', 'vip post');
  insert into public.vip_exclusives (title) values ('exclusive');
`);

async function as(role, sub, fn) {
  const claims = JSON.stringify(sub ? {sub, role} : {role});
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
  try { return await fn(); }
  finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
const exec = async (sql) => { try { const r = await db.query(sql); return {r}; } catch (e) { return {error: e.message}; } };
const one = async (sql) => (await db.query(sql)).rows[0];

// ── Column-level privacy on profiles ────────────────────────────────────────────────────────
let r = await as('authenticated', A, () => exec(`select * from public.profiles`));
check('select * on profiles is denied (columns revoked)', !!r.error && /permission denied/.test(r.error), r.error);

r = await as('authenticated', A, () => exec(`select display_name, city from public.profiles where id = '${B}'`));
check('member reads public columns of another row', !r.error && r.r.rows[0].display_name === 'Bella', r.error ?? JSON.stringify(r.r.rows));

r = await as('authenticated', A, () => exec(`select email from public.profiles where id = '${B}'`));
check('member cannot read another member email', !!r.error && /permission denied/.test(r.error), r.error);

r = await as('authenticated', A, () => exec(`select private_bio from public.profiles where id = '${A}'`));
check('member cannot read own private_bio via the table (column revoked)', !!r.error && /permission denied/.test(r.error), r.error);

// ── Own full row via the RPC ────────────────────────────────────────────────────────────────
r = await as('authenticated', A, () => exec(`select * from public.get_own_profile()`));
check('get_own_profile returns the caller\'s own full row', !r.error && r.r.rows.length === 1
  && r.r.rows[0].id === A && r.r.rows[0].email === 'a@x.com' && r.r.rows[0].private_bio === 'secret A', r.error ?? JSON.stringify(r.r?.rows));

r = await as('authenticated', A, () => exec(`select id from public.get_own_profile()`));
check('get_own_profile cannot be pointed at another member', !r.error && r.r.rows.length === 1 && r.r.rows[0].id === A, r.error);

r = await as('anon', null, () => exec(`select * from public.get_own_profile()`));
check('anon cannot call get_own_profile', !!r.error && /permission denied/.test(r.error), r.error);

// ── current_member_is_vip ───────────────────────────────────────────────────────────────────
r = await as('authenticated', A, () => exec(`select public.current_member_is_vip() as v`));
check('active VIP helper returns true', !r.error && r.r.rows[0].v === true, r.error ?? JSON.stringify(r.r?.rows));
r = await as('authenticated', B, () => exec(`select public.current_member_is_vip() as v`));
check('non-VIP helper returns false', !r.error && r.r.rows[0].v === false, r.error ?? JSON.stringify(r.r?.rows));
r = await as('authenticated', C, () => exec(`select public.current_member_is_vip() as v`));
check('expired VIP helper returns false', !r.error && r.r.rows[0].v === false, r.error ?? JSON.stringify(r.r?.rows));
r = await as('anon', null, () => exec(`select public.current_member_is_vip() as v`));
check('anon cannot call the VIP helper', !!r.error && /permission denied/.test(r.error), r.error);

// ── VIP policies still work (read + write) after the rewrite ────────────────────────────────
r = await as('authenticated', A, () => exec(`select count(*)::int n from public.vip_posts`));
check('active VIP can read the VIP feed', !r.error && r.r.rows[0].n === 1, r.error ?? JSON.stringify(r.r?.rows));
r = await as('authenticated', B, () => exec(`select count(*)::int n from public.vip_posts`));
check('non-VIP reads no VIP posts', !r.error && r.r.rows[0].n === 0, r.error ?? JSON.stringify(r.r?.rows));
r = await as('authenticated', C, () => exec(`select count(*)::int n from public.vip_posts`));
check('expired VIP reads no VIP posts', !r.error && r.r.rows[0].n === 0, r.error ?? JSON.stringify(r.r?.rows));

r = await as('authenticated', A, () => exec(`insert into public.vip_posts (author_id, content) values ('${A}', 'mine')`));
check('active VIP can post to the VIP feed', !r.error, r.error);
r = await as('authenticated', B, () => exec(`insert into public.vip_posts (author_id, content) values ('${B}', 'nope')`));
check('non-VIP cannot post to the VIP feed', !!r.error, r.error);
r = await as('authenticated', A, () => exec(`insert into public.vip_posts (author_id, content) values ('${B}', 'spoof')`));
check('VIP cannot post as another member', !!r.error, r.error);

const POST = (await one(`select id from public.vip_posts limit 1`)).id;

r = await as('authenticated', A, () => exec(`insert into public.vip_post_likes (post_id, user_id) values ('${POST}', '${A}')`));
check('active VIP can like a VIP post', !r.error, r.error);
r = await as('authenticated', B, () => exec(`insert into public.vip_post_likes (post_id, user_id) values ('${POST}', '${B}')`));
check('non-VIP cannot like a VIP post', !!r.error, r.error);

r = await as('authenticated', A, () => exec(`select count(*)::int n from public.vip_exclusives`));
check('active VIP can read VIP exclusives', !r.error && r.r.rows[0].n === 1, r.error ?? JSON.stringify(r.r?.rows));
r = await as('authenticated', B, () => exec(`select count(*)::int n from public.vip_exclusives`));
check('non-VIP reads no VIP exclusives', !r.error && r.r.rows[0].n === 0, r.error ?? JSON.stringify(r.r?.rows));

// ── anon is closed out of profiles and the VIP feed ─────────────────────────────────────────
r = await as('anon', null, () => exec(`select count(*)::int n from public.profiles`));
check('anon reads no profiles (denied or empty)', !!r.error || r.r.rows[0].n === 0, r.error ?? JSON.stringify(r.r?.rows));
r = await as('anon', null, () => exec(`select count(*)::int n from public.vip_posts`));
check('anon reads no VIP posts (denied or empty)', !!r.error || r.r.rows[0].n === 0, r.error ?? JSON.stringify(r.r?.rows));

// ── server (service role) is unaffected ─────────────────────────────────────────────────────
r = await as('service_role', null, () => exec(`select * from public.profiles where id = '${B}'`));
check('service role still reads every column', !r.error && r.r.rows[0].email === 'b@x.com', r.error);

// ── idempotent re-apply ─────────────────────────────────────────────────────────────────────
try { await applyS4(); r = {}; } catch (e) { r = {error: e.message}; }
check('migration re-applies cleanly', !r.error, r.error);

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
