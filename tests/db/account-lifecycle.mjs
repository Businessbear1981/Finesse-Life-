// Behaviour test for supabase/migrations/20261012_account_lifecycle.sql on PGlite (Postgres in
// WASM). Fixture = auth.users stub + the production-shaped tables the migration touches, with
// the same FK behaviour as the real migrations (CASCADE, NO ACTION, SET NULL, no FK). Applies
// the real 20261001, 20261003, 20261005 and 20261009 first, then 20261012.
// Simulates PostgREST roles with SET ROLE + request.jwt.claims. No database or network needed.
// Run: npm run test:db
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

const REPO = process.argv[2] ?? process.cwd();
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok, detail});
const migration = (f) => fs.readFileSync(`${REPO}/supabase/migrations/${f}`, 'utf8');

const DEAL = '00000000-0000-4000-8000-0000000000d1';

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $$;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');

-- profiles as 20260609_finesse_mvp (username unique not null) + the master columns
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null, email text, display_name text, avatar_url text);
alter table public.profiles enable row level security;
create policy "profiles_own_read" on public.profiles for select using (auth.uid() = id);
create policy "profiles_own_update" on public.profiles for update using (auth.uid() = id);

-- Vault (20260611): cascade from profiles, account auto-created by trigger
create table public.vault_accounts (id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade, balance_cents int not null default 0);
alter table public.vault_accounts enable row level security;
create table public.vault_transactions (id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade, amount_cents int not null);
alter table public.vault_transactions enable row level security;
create policy "vault_txn_own_read" on public.vault_transactions for select using (auth.uid() = user_id);
create function public.create_vault_account() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.vault_accounts (user_id) values (new.id) on conflict do nothing; return new; end $$;
create trigger trg_create_vault_account after insert on public.profiles for each row execute function public.create_vault_account();

-- Scale (20260611)
create table public.scale_deals (id uuid primary key, goal_count int not null, current_count int not null default 0, status text not null default 'open');
create table public.scale_joins (id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.scale_deals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(), unique (deal_id, user_id));
alter table public.scale_joins enable row level security;

-- Tables 20261009 expects
create table public.stripe_events (id text primary key, data jsonb);
create table public.truth_checks (id serial primary key);
create table public.procurement_tokens (id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade, token text unique not null);
create table public.vip_codes (id uuid primary key default gen_random_uuid(), code text unique not null,
  created_by uuid references public.profiles(id) on delete set null, used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz, expires_at timestamptz, max_uses int not null default 1, use_count int not null default 0, is_active boolean not null default true);
create table public.vip_posts (id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade, content text);
alter table public.vip_posts enable row level security;

-- NO ACTION FKs (20260609_embassy, 20260610_exchange, 20260610_registry) — these used to block deletion
create table public.embassy_deals (id uuid primary key default gen_random_uuid(), brand text not null, title text not null,
  submitted_by uuid references auth.users(id));
alter table public.embassy_deals enable row level security;
create table public.exchange_listings (id uuid primary key default gen_random_uuid(), seller_id uuid references auth.users(id) on delete cascade, title text);
create table public.exchange_offers (id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.exchange_listings(id) on delete cascade, buyer_id uuid references auth.users(id), offer_price_cents bigint not null);
create table public.outings (id uuid primary key default gen_random_uuid(), creator_id uuid references auth.users(id), title text not null);
create table public.outing_participants (outing_id uuid references public.outings(id) on delete cascade,
  user_id uuid references auth.users(id), primary key (outing_id, user_id));
create table public.registry_items (id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade, name text not null, purchased_by uuid references public.profiles(id));
create table public.registry_pledges (id uuid primary key default gen_random_uuid(),
  item_id uuid references public.registry_items(id) on delete cascade, pledger_id uuid references auth.users(id), amount_cents bigint not null);

-- CASCADE member content (20261002) and a no-FK member column (20260611_intelligence_engine)
create table public.diary_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, body text);
create table public.intelligence_audit (id uuid primary key default gen_random_uuid(), user_id uuid not null, intent text not null, reviewed_by uuid);
`);

await db.exec(migration('20261001_keylocks_vip_lift_revenue_ledger.sql'));
await db.exec(migration('20261003_scale_pledge_states.sql'));
await db.exec(migration('20261005_ai_usage_events.sql'));
await db.exec(migration('20261009_security_floor.sql'));

let applyError = null;
try { await db.exec(migration('20261012_account_lifecycle.sql')); } catch (e) { applyError = e.message; }
check('migration applies', !applyError, applyError);

await db.exec(`grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;
  revoke insert, update, delete, truncate on public.ai_usage_events from authenticated;`);

async function as(role, sub, fn) {
  const claims = JSON.stringify(sub ? {sub, role} : {role});
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
  }
}
const exec = async (sql, params) => { try { return {r: await db.query(sql, params)}; } catch (e) { return {error: e.message}; } };
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const count = async (sql, params) => (await one(sql, params)).n;
// Supabase Auth inserts into auth.users as supabase_auth_admin with no JWT claims.
const signUp = async (email, meta = {}) =>
  exec(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify(meta)]);

// ── 1. handle_new_user: username collisions ──────────────────────────────────────────────
const j1 = await signUp('john@example.com', {full_name: 'John One'});
const j2 = await signUp('john@another.org');
check('first john signs up', !j1.error, j1.error);
check('second john signs up (used to fail on profiles.username)', !j2.error, j2.error);
const [JOHN1, JOHN2] = [j1.r?.rows[0].id, j2.r?.rows[0].id];
const p1 = await one(`select username, email, display_name, is_vip, role from public.profiles where id = $1`, [JOHN1]);
const p2 = await one(`select username from public.profiles where id = $1`, [JOHN2]);
check('first john keeps the plain local part', p1?.username === 'john', JSON.stringify(p1));
check('second john gets a short suffix', /^john_\d{4}$/.test(p2?.username ?? ''), JSON.stringify(p2));
check('signup keeps email + metadata, entitlements default', p1?.email === 'john@example.com' && p1.display_name === 'John One' && p1.is_vip === false && p1.role === 'member', JSON.stringify(p1));
check('vault account still auto-created on signup', (await count(`select count(*)::int n from public.vault_accounts where user_id = $1`, [JOHN1])) === 1);

let ok = true;
for (let i = 0; i < 12; i++) ok = ok && !(await signUp(`john+${i}@x${i}.com`)).error;
const johns = await db.query(`select username from public.profiles where username like 'john%'`);
check('14 johns: all succeed, all usernames distinct', ok && johns.rows.length === 14 && new Set(johns.rows.map((x) => x.username)).size === 14,
  JSON.stringify(johns.rows.map((x) => x.username)));

const odd = await signUp('Mary.Jane+tag@Example.com');
const oddName = (await one(`select username from public.profiles where id = $1`, [odd.r?.rows[0].id]))?.username;
check('local part lower-cased and reduced to [a-z0-9_]', !odd.error && oddName === 'mary_jane_tag', odd.error ?? oddName);
const noMail = await signUp(null);
const sym = await signUp('+++@example.com');
const names = (await db.query(`select username from public.profiles where id in ($1, $2)`, [noMail.r?.rows[0].id, sym.r?.rows[0].id])).rows.map((x) => x.username);
check('no e-mail / symbol-only local part → member, member_NNNN', !noMail.error && !sym.error && names.includes('member') && names.some((n) => /^member_\d{4}$/.test(n)),
  JSON.stringify({names, e: noMail.error ?? sym.error}));

// Loop-safety: a unique clash that is NOT the username can't be fixed by suffixing — the
// trigger must give up with an error, not spin forever.
await db.exec(`create unique index tmp_profiles_email on public.profiles (email)`);
const dup = await signUp('john@example.com');
check('non-username unique clash fails loudly (bounded retries)', !!dup.error && /unique|duplicate/i.test(dup.error), dup.error);
await db.exec(`drop index tmp_profiles_email`);

// Members still can't use the profile to grant themselves VIP (20261009 intact).
const selfVip = await as('authenticated', JOHN1, () => exec(`update public.profiles set is_vip = true where id = $1`, [JOHN1]));
check('20261009 entitlement guard still active', !!selfVip.error && /server-managed/.test(selfVip.error), selfVip.error);

// ── 2. Account deletion ──────────────────────────────────────────────────────────────────
const A = JOHN1; // the member deleting their account
const B = JOHN2; // another member whose data must be untouched
await db.exec(`
insert into public.scale_deals (id, goal_count) values ('${DEAL}', 5);
insert into public.vault_transactions (user_id, amount_cents) values ('${A}', 120), ('${B}', 80);
insert into public.revenue_events (event_type, idempotency_key, trace_id, room_id, member_id, state, provider_id, provider_receipt_id, amount_minor, currency)
  values ('vip.subscription', 'k-a-1', 'tr', 'vip-room', '${A}', 'settled', 'stripe', 'pi_1', 2500, 'USD'),
         ('vip.subscription', 'k-b-1', 'tr', 'vip-room', '${B}', 'settled', 'stripe', 'pi_2', 2500, 'USD');
insert into public.ai_usage_events (user_id, feature, model, input_tokens) values ('${A}', 'nova', 'claude', 10);
insert into public.access_audit_events (lock, event_type, outcome, user_id, subject_hash, trace_id) values ('vip_lift', 'vip.keylock_verified', 'ok', '${A}', 'h', 'tr');
insert into public.vip_lift_pins (user_id, pin_hash) values ('${A}', 'scrypt$x');
insert into public.embassy_deals (brand, title, submitted_by) values ('Brand', 'A submitted', '${A}');
insert into public.exchange_listings (id, seller_id, title) values ('00000000-0000-4000-8000-0000000000e1', '${B}', 'B jacket');
insert into public.exchange_offers (listing_id, buyer_id, offer_price_cents) values ('00000000-0000-4000-8000-0000000000e1', '${A}', 100);
insert into public.outings (id, creator_id, title) values ('00000000-0000-4000-8000-0000000000f1', '${A}', 'A dinner'), ('00000000-0000-4000-8000-0000000000f2', '${B}', 'B brunch');
insert into public.outing_participants (outing_id, user_id) values ('00000000-0000-4000-8000-0000000000f2', '${A}'), ('00000000-0000-4000-8000-0000000000f2', '${B}');
insert into public.registry_items (id, user_id, name, purchased_by) values ('00000000-0000-4000-8000-0000000000c1', '${B}', 'B watch', '${A}');
insert into public.registry_pledges (item_id, pledger_id, amount_cents) values ('00000000-0000-4000-8000-0000000000c1', '${A}', 500);
insert into public.diary_items (user_id, body) values ('${A}', 'private'), ('${B}', 'b private');
insert into public.intelligence_audit (user_id, intent) values ('${A}', 'style'), ('${B}', 'style');
insert into public.vip_codes (code, created_by, used_by) values ('FNS-A', '${A}', '${A}');
`);
let r = await as('authenticated', A, () => exec(`insert into public.scale_joins (deal_id, user_id) values ($1, $2)`, [DEAL, A]));
check('fixture: member pledges', !r.error, r.error);
await as('authenticated', B, () => exec(`insert into public.scale_joins (deal_id, user_id) values ($1, $2)`, [DEAL, B]));
check('fixture: deal counts 2 pledges', (await one(`select current_count from public.scale_deals`)).current_count === 2);

// Before the RPC, deleting the auth user is blocked by NO ACTION FKs.
r = await exec(`delete from auth.users where id = $1`, [A]);
check('without delete_member_data the auth delete is blocked (NO ACTION FKs)', !!r.error, 'delete unexpectedly succeeded');

r = await as('authenticated', A, () => exec(`select public.delete_member_data($1)`, [A]));
check('members cannot call delete_member_data', !!r.error && /permission denied/.test(r.error), r.error);
r = await as('anon', null, () => exec(`select public.delete_member_data($1)`, [A]));
check('anon cannot call delete_member_data', !!r.error && /permission denied/.test(r.error), r.error);

r = await as('service_role', null, () => exec(`select public.delete_member_data($1) as s`, [A]));
const summary = r.r?.rows[0].s;
check('service role runs delete_member_data', !r.error && summary?.scale_pledges_cancelled === 1, r.error ?? JSON.stringify(summary));

// What auth.admin.deleteUser() does at the database level.
r = await exec(`delete from auth.users where id = $1`, [A]);
check('auth user delete now succeeds', !r.error, r.error);
check('profile is gone', (await count(`select count(*)::int n from public.profiles where id = $1`, [A])) === 0);
check('member content deleted (cascade): diary, vault account, lift PIN',
  (await count(`select (select count(*) from public.diary_items where user_id = $1) + (select count(*) from public.vault_accounts where user_id = $1)
                     + (select count(*) from public.vip_lift_pins where user_id = $1) as n`, [A])) == 0);
check('member content deleted (no-action FKs): own outing, participation, offer, pledge',
  (await count(`select count(*)::int n from public.outings where title = 'A dinner'`)) === 0
  && (await count(`select count(*)::int n from public.outing_participants`)) === 1
  && (await count(`select count(*)::int n from public.exchange_offers`)) === 0
  && (await count(`select count(*)::int n from public.registry_pledges`)) === 0, JSON.stringify(summary));
check('no-FK member rows deleted (intelligence_audit)', (await count(`select count(*)::int n from public.intelligence_audit`)) === 1);

const rev = await one(`select member_id, amount_minor, state from public.revenue_events where idempotency_key = 'k-a-1'`);
check('revenue_events row retained, member_id anonymised', rev && rev.member_id === null && Number(rev.amount_minor) === 2500 && rev.state === 'settled', JSON.stringify(rev));
const vt = await db.query(`select user_id, amount_cents from public.vault_transactions order by amount_cents desc`);
check('vault_transactions retained, user anonymised', vt.rows.length === 2 && vt.rows[0].user_id === null && vt.rows[1].user_id === B, JSON.stringify(vt.rows));
check('ai_usage_events retained, user anonymised', (await count(`select count(*)::int n from public.ai_usage_events where user_id is null`)) === 1);
check('access_audit_events retained, user anonymised', (await count(`select count(*)::int n from public.access_audit_events where user_id is null`)) === 1);
const sj = await one(`select user_id, state from public.scale_joins where user_id is null`);
check('scale pledge retained as cancelled + anonymised; history kept', sj?.state === 'cancelled'
  && (await count(`select count(*)::int n from public.scale_join_events e join public.scale_joins j on j.id = e.join_id where j.user_id is null and e.to_state = 'cancelled'`)) === 1,
  JSON.stringify(sj));
check('deal count released (2 → 1)', (await one(`select current_count from public.scale_deals`)).current_count === 1);
check('shared rows kept, link removed: embassy deal, registry purchase, vip code',
  (await one(`select submitted_by from public.embassy_deals where title = 'A submitted'`))?.submitted_by === null
  && (await one(`select purchased_by from public.registry_items`)).purchased_by === null
  && (await one(`select created_by, used_by from public.vip_codes where code = 'FNS-A'`)).used_by === null);
check("other member's data untouched",
  (await count(`select count(*)::int n from public.profiles where id = $1`, [B])) === 1
  && (await count(`select count(*)::int n from public.revenue_events where member_id = $1`, [B])) === 1
  && (await count(`select count(*)::int n from public.diary_items where user_id = $1`, [B])) === 1
  && (await count(`select count(*)::int n from public.outings where creator_id = $1`, [B])) === 1
  && (await count(`select count(*)::int n from public.scale_joins where user_id = $1 and state = 'pledged'`, [B])) === 1);

// revenue_events is still append-only for everything else
r = await exec(`update public.revenue_events set amount_minor = 1 where idempotency_key = 'k-b-1'`);
check('revenue_events: amounts still immutable', !!r.error && /append-only/.test(r.error), r.error);
r = await exec(`delete from public.revenue_events where idempotency_key = 'k-a-1'`);
check('revenue_events: rows still undeletable', !!r.error && /append-only/.test(r.error), r.error);
r = await exec(`update public.revenue_events set member_id = $1 where idempotency_key = 'k-a-1'`, [B]);
check('revenue_events: cannot re-attribute an anonymised row', !!r.error && /append-only/.test(r.error), r.error);
r = await exec(`update public.revenue_events set member_id = null, amount_minor = 1 where idempotency_key = 'k-b-1'`);
check('revenue_events: anonymising cannot smuggle other changes', !!r.error && /append-only/.test(r.error), r.error);

r = await as('service_role', null, () => exec(`select public.delete_member_data($1) as s`, [A]));
check('delete_member_data is idempotent (retry after a failed auth delete)', !r.error && r.r.rows[0].s.scale_pledges_cancelled === 0, r.error);

// ── 3. Audit lock value ──────────────────────────────────────────────────────────────────
r = await exec(`insert into public.access_audit_events (lock, event_type, outcome, subject_hash, trace_id) values ('account', 'account.delete', 'ok', 'h', 'tr')`);
check("access_audit_events accepts lock = 'account'", !r.error, r.error);
r = await exec(`insert into public.access_audit_events (lock, event_type, outcome, subject_hash, trace_id) values ('nope', 'x', 'ok', 'h', 'tr')`);
check('access_audit_events still rejects unknown locks', !!r.error, r.error);

// idempotent re-apply
try { await db.exec(migration('20261012_account_lifecycle.sql')); r = {}; } catch (e) { r = {error: e.message}; }
check('migration re-applies cleanly', !r.error, r.error);
const j3 = await signUp('john@third.net');
check('signup still works after re-apply', !j3.error, j3.error);

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
