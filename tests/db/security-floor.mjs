// Behaviour test for supabase/migrations/20261009_security_floor.sql on PGlite (Postgres
// compiled to WASM). Builds a minimal fixture that mirrors the pre-migration production
// policies, applies 20261003 + 20261009, then simulates member / anon / service_role requests
// with SET ROLE + request.jwt.claims (what PostgREST does). No database or network needed.
// Run: npm run test:db
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

const REPO = process.argv[2] ?? process.cwd();
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok, detail});

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const N = '00000000-0000-4000-8000-00000000000d';
const DEAL = '00000000-0000-4000-8000-0000000000d1';

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $$;
grant usage on schema auth to anon, authenticated, service_role;

create table public.profiles (id uuid primary key, username text, display_name text);
alter table public.profiles enable row level security;
create policy "profiles_own_read" on public.profiles for select using (auth.uid() = id);
create policy "profiles_own_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_own_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_public_read" on public.profiles for select using (true);

create table public.vault_accounts (id uuid primary key default gen_random_uuid(), user_id uuid unique, balance_cents int not null default 0);
alter table public.vault_accounts enable row level security;
create policy "vault_own_read" on public.vault_accounts for select using (auth.uid() = user_id);
create policy "vault_own_update" on public.vault_accounts for update using (auth.uid() = user_id);
create policy "vault_own_insert" on public.vault_accounts for insert with check (auth.uid() = user_id);
create table public.vault_transactions (id uuid primary key default gen_random_uuid(), user_id uuid, amount_cents int);
alter table public.vault_transactions enable row level security;
create policy "vault_txn_own_read" on public.vault_transactions for select using (auth.uid() = user_id);
create policy "vault_txn_own_insert" on public.vault_transactions for insert with check (auth.uid() = user_id);

create table public.scale_deals (id uuid primary key, goal_count int not null, current_count int not null default 0, status text not null default 'open');
create table public.scale_joins (id uuid primary key default gen_random_uuid(), deal_id uuid references public.scale_deals(id),
  user_id uuid, joined_at timestamptz not null default now(), unique (deal_id, user_id));
alter table public.scale_joins enable row level security;
create policy "scale_joins_own" on public.scale_joins using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scale_joins_read" on public.scale_joins for select using (true);
create policy "scale_joins_own_insert" on public.scale_joins for insert to authenticated with check (user_id = auth.uid());
create or replace function public.increment_scale_count() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.scale_deals set current_count = current_count + 1,
  status = case when current_count + 1 >= goal_count then 'met' else status end where id = new.deal_id; return new; end $$;
create trigger trg_scale_join_count after insert on public.scale_joins for each row execute procedure public.increment_scale_count();
create trigger trg_increment_scale_count after insert on public.scale_joins for each row execute procedure public.increment_scale_count();

create table public.stripe_events (id text primary key, data jsonb);
create table public.truth_checks (id serial primary key);
create table public.procurement_tokens (id uuid primary key default gen_random_uuid(), user_id uuid not null, token text unique not null,
  status text not null default 'unused', expires_at timestamptz not null, redeemed_at timestamptz);
alter table public.procurement_tokens enable row level security;
create policy "procurement_tokens_own_read" on public.procurement_tokens for select using (auth.uid() = user_id);
create policy "procurement_tokens_own_insert" on public.procurement_tokens for insert with check (auth.uid() = user_id);
create table public.embassy_deals (id uuid primary key default gen_random_uuid(), brand text not null, title text not null);
alter table public.embassy_deals enable row level security;
create policy "staff_only" on public.embassy_deals for all using (auth.uid() is not null);
create table public.vip_codes (id uuid primary key default gen_random_uuid(), code text unique not null, used_by uuid, used_at timestamptz,
  expires_at timestamptz, max_uses int not null default 1, use_count int not null default 0, is_active boolean not null default true);
alter table public.vip_codes enable row level security;
`);

await db.exec(fs.readFileSync(`${REPO}/supabase/migrations/20261003_scale_pledge_states.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${REPO}/supabase/migrations/20261009_security_floor.sql`, 'utf8'));
await db.exec(`grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;
  insert into public.profiles (id, username) values ('${A}','a'), ('${B}','b'), ('${C}','c');
  insert into public.vault_accounts (user_id, balance_cents) values ('${A}', 500);
  insert into public.scale_deals (id, goal_count) values ('${DEAL}', 2);
  insert into public.embassy_deals (brand, title) values ('X', 'seed');
  insert into public.vip_codes (code, max_uses) values ('FNS-ONEUSE01', 1), ('FNS-TWOUSE02', 5);`);

async function as(role, sub, fn) {
  const claims = JSON.stringify(sub ? {sub, role} : {role});
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
  }
}
const exec = async (sql) => { try { const r = await db.query(sql); return {r}; } catch (e) { return {error: e.message}; } };
const one = async (sql) => (await db.query(sql)).rows[0];

// 1 — profiles
let r = await as('authenticated', A, () => exec(`update public.profiles set is_vip = true where id = '${A}'`));
check('member cannot set own is_vip', !!r.error && /server-managed/.test(r.error), r.error);
r = await as('authenticated', A, () => exec(`update public.profiles set role = 'owner' where id = '${A}'`));
check('member cannot set own role', !!r.error, r.error);
r = await as('authenticated', A, () => exec(`update public.profiles set display_name = 'Amara' where id = '${A}'`));
check('member can still edit display_name', !r.error && (await one(`select display_name from public.profiles where id='${A}'`)).display_name === 'Amara', r.error);
r = await as('authenticated', N, () => exec(`insert into public.profiles (id, username, is_vip, role) values ('${N}', 'n', true, 'owner')`));
const nrow = await one(`select is_vip, role from public.profiles where id='${N}'`);
check('member self-insert is forced to member/non-VIP', !r.error && nrow.is_vip === false && nrow.role === 'member', JSON.stringify({r: r.error, nrow}));
r = await as('anon', null, () => exec(`select count(*)::int as n from public.profiles`));
check('anonymous visitors read no profiles', !r.error && r.r.rows[0].n === 0, r.error ?? JSON.stringify(r.r.rows));
r = await as('authenticated', A, () => exec(`select count(*)::int as n from public.profiles`));
check('members can read member profiles', !r.error && r.r.rows[0].n === 4, r.error ?? JSON.stringify(r.r.rows));

// 2 — vault
r = await as('authenticated', A, () => exec(`update public.vault_accounts set balance_cents = 999999 where user_id = '${A}'`));
check('member cannot change own vault balance', (await one(`select balance_cents from public.vault_accounts where user_id='${A}'`)).balance_cents === 500, r.error);
r = await as('authenticated', A, () => exec(`insert into public.vault_transactions (user_id, amount_cents) values ('${A}', 100000)`));
check('member cannot insert vault credits', !!r.error, r.error);
r = await as('authenticated', A, () => exec(`select balance_cents from public.vault_accounts`));
check('member still reads own vault', !r.error && r.r.rows.length === 1, r.error);

// 3 — scale
r = await as('authenticated', A, () => exec(`insert into public.scale_joins (deal_id, user_id, state) values ('${DEAL}', '${A}', 'paid')`));
check('member cannot insert a paid pledge', !!r.error, r.error);
r = await as('authenticated', A, () => exec(`insert into public.scale_joins (deal_id, user_id) values ('${DEAL}', '${A}')`));
check('member can pledge', !r.error, r.error);
check('a pledge is counted once', (await one(`select current_count from public.scale_deals`)).current_count === 1);
r = await as('authenticated', A, () => exec(`update public.scale_joins set state = 'goal_met' where user_id = '${A}'`));
check('member cannot advance own pledge', !!r.error || (await one(`select state from public.scale_joins where user_id='${A}'`)).state === 'pledged', r.error);
r = await as('authenticated', A, () => exec(`delete from public.scale_joins where user_id = '${A}'`));
check('member cannot delete pledge (no count games)', (await one(`select count(*)::int n from public.scale_joins`)).n === 1, r.error);
r = await as('authenticated', A, () => exec(`update public.scale_joins set state = 'cancelled' where user_id = '${A}'`));
check('member can cancel own pledge', !r.error && (await one(`select current_count from public.scale_deals`)).current_count === 0, r.error);
r = await as('authenticated', B, () => exec(`insert into public.scale_joins (deal_id, user_id) values ('${DEAL}', '${B}')`));
const rc = await as('authenticated', C, () => exec(`insert into public.scale_joins (deal_id, user_id) values ('${DEAL}', '${C}')`));
const deal = await one(`select current_count, status from public.scale_deals`);
const metStates = (await db.query(`select state from public.scale_joins where user_id in ('${B}','${C}') order by user_id`)).rows.map((x) => x.state);
check('goal reached: system trigger promotes pledges to goal_met', !r.error && !rc.error && deal.current_count === 2 && deal.status === 'met' && metStates.every((s) => s === 'goal_met'), JSON.stringify({b: r.error, c: rc.error, deal, metStates}));
r = await as('authenticated', B, () => exec(`select count(*)::int as n from public.scale_joins`));
check('members see only their own pledges', !r.error && r.r.rows[0].n === 1, r.error ?? JSON.stringify(r.r.rows));
r = await as('authenticated', B, () => exec(`update public.scale_joins set state = 'cancelled' where user_id = '${B}'`));
check('member can cancel from goal_met', !r.error && (await one(`select current_count from public.scale_deals`)).current_count === 1, r.error);
const ev = await one(`select count(*)::int n from public.scale_join_events`);
check('transitions are recorded', ev.n >= 4, JSON.stringify(ev));
r = await as('service_role', null, () => exec(`update public.scale_joins set state = 'payment_requested' where user_id = '${C}'`));
check('server can still advance pledges', !r.error, r.error);

// 4/5/6 — other tables
r = await as('authenticated', A, () => exec(`insert into public.procurement_tokens (user_id, token, expires_at) values ('${A}', 'FSS-VIP-SELF', now() + interval '1 day')`));
check('member cannot mint procurement tokens', !!r.error, r.error);
r = await as('authenticated', A, () => exec(`update public.embassy_deals set title = 'hijacked'`));
check('member cannot edit embassy deals', (await one(`select title from public.embassy_deals`)).title === 'seed', r.error);
r = await as('authenticated', A, () => exec(`insert into public.embassy_deals (brand, title) values ('Y', 'submitted')`));
check('member can still submit embassy deals', !r.error, r.error);
r = await as('anon', null, () => exec(`select count(*) from public.stripe_events`));
check('stripe_events closed to anon', !r.error && Number(r.r.rows[0].count) === 0, r.error);

// 7 — VIP codes
r = await as('authenticated', A, () => exec(`select * from public.redeem_vip_code('FNS-ONEUSE01', '${A}', 12)`));
check('members cannot call redeem_vip_code directly', !!r.error && /permission denied/.test(r.error), r.error);
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code(' fns-oneuse01 ', '${A}', 12)`));
const prof = await one(`select is_vip, vip_expires_at from public.profiles where id='${A}'`);
check('service role redeems and grants ~12 months', !r.error && r.r.rows[0].result_status === 'granted' && prof.is_vip === true
  && Math.abs(new Date(prof.vip_expires_at) - Date.now() - 365 * 864e5) < 3 * 864e5, r.error ?? JSON.stringify(r.r.rows));
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-ONEUSE01', '${B}', 12)`));
check('single-use code is exhausted', r.r?.rows[0].result_status === 'exhausted', r.error ?? JSON.stringify(r.r.rows));
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-TWOUSE02', '${A}', 12)`));
const ext = await one(`select vip_expires_at from public.profiles where id='${A}'`);
check('second code extends from current expiry', r.r?.rows[0].result_status === 'granted' && new Date(ext.vip_expires_at) - Date.now() > 700 * 864e5, r.error ?? JSON.stringify(r.r.rows));
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-TWOUSE02', '${A}', 12)`));
check('same member cannot reuse a code', r.r?.rows[0].result_status === 'already_redeemed', r.error ?? JSON.stringify(r.r?.rows));
await db.exec(`update public.profiles set is_vip = true, vip_expires_at = null where id = '${C}'`);
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-TWOUSE02', '${C}', 12)`));
check('lifetime VIP stays lifetime', r.r?.rows[0].result_status === 'granted' && (await one(`select vip_expires_at from public.profiles where id='${C}'`)).vip_expires_at === null, r.error);
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('NOPE', '${B}', 12)`));
check('unknown code is invalid', r.r?.rows[0].result_status === 'invalid', r.error);

// idempotent re-apply
try { await db.exec(fs.readFileSync(`${REPO}/supabase/migrations/20261009_security_floor.sql`, "utf8")); r = {}; } catch (e) { r = {error: e.message}; }
check('migration re-applies cleanly', !r.error, r.error);

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
