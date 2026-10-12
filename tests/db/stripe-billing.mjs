// Behaviour test for supabase/migrations/20261013_stripe_billing.sql on PGlite (Postgres in WASM).
// Fixture = auth.users stub + the production-shaped tables the billing migration and its
// dependencies touch. Supabase's default privileges (anon / authenticated get ALL on new tables
// and EXECUTE on new functions) are simulated with ALTER DEFAULT PRIVILEGES *before* the
// migrations run, so the migration's own revokes are what keep members out.
// Applies the real 20261001, 20261003, 20261009, 20261012_account_lifecycle, then 20261013.
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
const DAY = 864e5;

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null, email text, display_name text, avatar_url text);
alter table public.profiles enable row level security;
create policy "profiles_own_read" on public.profiles for select using (auth.uid() = id);
create policy "profiles_own_update" on public.profiles for update using (auth.uid() = id);

create table public.vault_accounts (id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade, balance_cents int not null default 0);
alter table public.vault_accounts enable row level security;
create table public.vault_transactions (id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade, amount_cents int not null);
alter table public.vault_transactions enable row level security;

create table public.scale_deals (id uuid primary key, title text not null default 'Deal', brand text not null default 'Brand',
  original_price_cents int not null default 20000, group_price_cents int not null default 15500,
  goal_count int not null, current_count int not null default 0, status text not null default 'open');
create table public.scale_joins (id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.scale_deals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(), unique (deal_id, user_id));
alter table public.scale_joins enable row level security;

-- stripe_events as 20260617_finesse_v2 / master created it (the migration must upgrade it)
create table public.stripe_events (id text primary key, type text not null, data jsonb not null default '{}',
  processed boolean not null default false, created_at timestamptz not null default now());
create table public.truth_checks (id serial primary key);
create table public.procurement_tokens (id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade, token text unique not null);
create table public.vip_codes (id uuid primary key default gen_random_uuid(), code text unique not null,
  created_by uuid references public.profiles(id) on delete set null, used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz, expires_at timestamptz, max_uses int not null default 1, use_count int not null default 0, is_active boolean not null default true);
create table public.vip_posts (id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade, content text);
alter table public.vip_posts enable row level security;
create table public.embassy_deals (id uuid primary key default gen_random_uuid(), brand text not null, title text not null,
  submitted_by uuid references auth.users(id));
alter table public.embassy_deals enable row level security;
`);

await db.exec(migration('20261001_keylocks_vip_lift_revenue_ledger.sql'));
await db.exec(migration('20261003_scale_pledge_states.sql'));
await db.exec(migration('20261009_security_floor.sql'));
await db.exec(migration('20261012_account_lifecycle.sql'));

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
const signUp = async (email) => (await db.query(`insert into auth.users (email) values ($1) returning id`, [email])).rows[0].id;
const profile = (id) => one(`select is_vip, vip_expires_at from public.profiles where id = $1`, [id]);
const near = (ts, ms, slack = 2 * DAY) => ts !== null && Math.abs(new Date(ts) - Date.now() - ms) < slack;

// ── 0. Pre-migration members (backfill input) ──────────────────────────────────────────────
const LIFER = await signUp('lifer@x.com');
const MONTHLY = await signUp('monthly@x.com');
const PLAIN = await signUp('plain@x.com');
const LAPSED = await signUp('lapsed@x.com');
await db.exec(`
  update public.profiles set is_vip = true, vip_expires_at = null where id = '${LIFER}';
  update public.profiles set is_vip = true, vip_expires_at = now() + interval '30 days' where id = '${MONTHLY}';
  update public.profiles set is_vip = true, vip_expires_at = now() - interval '5 days' where id = '${LAPSED}';
  insert into public.stripe_events (id, type, data) values ('evt_old', 'invoice.paid', '{"x":1}');`);
const before = {lifer: await profile(LIFER), monthly: await profile(MONTHLY)};

let applyError = null;
try { await db.exec(migration('20261013_stripe_billing.sql')); } catch (e) { applyError = e.message; }
check('migration applies', !applyError, applyError);

// ── 1. Backfill ───────────────────────────────────────────────────────────────────────────
const grantsOf = (id) => db.query(`select source, source_ref, expires_at, revoked_at from public.vip_grants where user_id = $1 order by created_at`, [id]).then((x) => x.rows);
let g = await grantsOf(LIFER);
check('backfill: lifetime VIP → one lifetime staff grant', g.length === 1 && g[0].source === 'staff' && g[0].expires_at === null, JSON.stringify(g));
g = await grantsOf(MONTHLY);
check('backfill: dated VIP → staff grant with the same expiry', g.length === 1 && g[0].source === 'staff'
  && +new Date(g[0].expires_at) === +new Date(before.monthly.vip_expires_at), JSON.stringify(g));
check('backfill: non-VIP gets no grant', (await grantsOf(PLAIN)).length === 0);
check('backfill: profiles unchanged', JSON.stringify(await profile(LIFER)) === JSON.stringify(before.lifer)
  && JSON.stringify(await profile(MONTHLY)) === JSON.stringify(before.monthly));
const ev0 = await one(`select id, type, data, received_at is not null as has_received, processed_at from public.stripe_events where id = 'evt_old'`);
check('stripe_events upgraded in place (received_at, processed_at), old rows kept', ev0?.has_received === true && ev0.processed_at === null && ev0.data.x === 1, JSON.stringify(ev0));

// ── 2. recompute_vip: code + subscription + lifetime + revoke ─────────────────────────────
const A = PLAIN;
const sub = (user, ref, expiresSql, active) => as('service_role', null, () =>
  exec(`select * from public.set_subscription_grant($1, $2, ${expiresSql}, $3)`, [user, ref, active]));
let r = await sub(A, 'sub_A1', `now() + interval '30 days'`, true);
let p = await profile(A);
check('subscription grant → VIP until period end', !r.error && p.is_vip && near(p.vip_expires_at, 30 * DAY) && r.r.rows[0].vip_source === 'subscription',
  r.error ?? JSON.stringify({p, row: r.r.rows[0]}));
r = await sub(A, 'sub_A1', `now() + interval '30 days'`, true);
check('replayed subscription grant does not duplicate', (await grantsOf(A)).length === 1);

await db.exec(`insert into public.vip_codes (code, max_uses) values ('FNS-STACK01', 5), ('FNS-STACK02', 5), ('FNS-ONEUSE01', 1)`);
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-STACK01', $1, 12)`, [A]));
p = await profile(A);
check('code on top of a subscription: code runs 12 months from now (not stacked on the sub)', r.r?.rows[0].result_status === 'granted'
  && near(p.vip_expires_at, 365 * DAY, 3 * DAY) && near(r.r.rows[0].result_expires, 365 * DAY, 3 * DAY), r.error ?? JSON.stringify({p, row: r.r?.rows[0]}));
r = await sub(A, 'sub_A1', 'null', false);
p = await profile(A);
check('revoking the subscription keeps the code grant', !r.error && p.is_vip && near(p.vip_expires_at, 365 * DAY, 3 * DAY), r.error ?? JSON.stringify(p));
g = await grantsOf(A);
check('revoke marks revoked_at, code grant untouched', g.find((x) => x.source === 'subscription')?.revoked_at !== null
  && g.find((x) => x.source === 'code')?.revoked_at === null, JSON.stringify(g));
r = await sub(A, 'sub_A1', `now() + interval '400 days'`, true);
p = await profile(A);
check('reactivated subscription (later expiry) un-revokes and wins', !r.error && near(p.vip_expires_at, 400 * DAY) && r.r.rows[0].vip_source === 'subscription', r.error ?? JSON.stringify(p));
r = await sub(A, 'sub_A1', 'null', false);
check('revoke again → back to the code expiry', near((await profile(A)).vip_expires_at, 365 * DAY, 3 * DAY));
await db.exec(`insert into public.vip_grants (user_id, source, source_ref, expires_at) values ('${A}', 'staff', 'comp', null)`);
r = await as('service_role', null, () => exec(`select * from public.recompute_vip($1)`, [A]));
p = await profile(A);
check('lifetime grant wins over dated grants', !r.error && p.is_vip && p.vip_expires_at === null && r.r.rows[0].vip_source === 'staff', r.error ?? JSON.stringify(p));
await db.exec(`update public.vip_grants set revoked_at = now() where user_id = '${A}' and source_ref = 'comp'`);
await as('service_role', null, () => exec(`select * from public.recompute_vip($1)`, [A]));
check('revoked lifetime grant no longer counts', near((await profile(A)).vip_expires_at, 365 * DAY, 3 * DAY));
await db.exec(`update public.vip_grants set expires_at = now() - interval '1 day' where user_id = '${A}' and source = 'code'`);
r = await as('service_role', null, () => exec(`select * from public.recompute_vip($1)`, [A]));
p = await profile(A);
check('only expired / revoked grants → not VIP, expiry cleared', !r.error && p.is_vip === false && p.vip_expires_at === null && r.r.rows[0].vip_active === false, r.error ?? JSON.stringify(p));
r = await as('service_role', null, () => exec(`select * from public.recompute_vip($1)`, [LAPSED]));
p = await profile(LAPSED);
check('backfilled lapsed VIP recomputes to not VIP', !r.error && p.is_vip === false, r.error ?? JSON.stringify(p));
r = await as('service_role', null, () => exec(`select * from public.set_subscription_grant($1, 'sub_x', now() + interval '1 day', true)`, ['00000000-0000-4000-8000-00000000ffff']));
check('set_subscription_grant for an unknown member returns nothing (no FK error)', !r.error && r.r.rows.length === 0, r.error);
r = await as('service_role', null, () => exec(`select * from public.set_subscription_grant($1, 'sub_x', null, true)`, [A]));
check('an active subscription grant must carry an expiry (never lifetime by accident)', !!r.error, 'accepted null expiry');

// ── 3. redeem_vip_code: 20261009 contract still holds and now writes a code grant ─────────
const B = MONTHLY;   // backfilled staff grant, +30 days
const C = await signUp('c@x.com');
const D = await signUp('d@x.com');
r = await as('authenticated', D, () => exec(`select * from public.redeem_vip_code('FNS-ONEUSE01', $1, 12)`, [D]));
check('members cannot call redeem_vip_code directly', !!r.error && /permission denied/.test(r.error), r.error);
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code(' fns-oneuse01 ', $1, 12)`, [D]));
p = await profile(D);
g = await grantsOf(D);
check('service role redeems: ~12 months, one code grant', r.r?.rows[0].result_status === 'granted' && p.is_vip && near(p.vip_expires_at, 365 * DAY, 3 * DAY)
  && g.length === 1 && g[0].source === 'code', r.error ?? JSON.stringify({p, g}));
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-ONEUSE01', $1, 12)`, [C]));
check('single-use code is exhausted', r.r?.rows[0].result_status === 'exhausted', r.error ?? JSON.stringify(r.r?.rows));
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-STACK02', $1, 12)`, [D]));
check('second code extends from the current code expiry', r.r?.rows[0].result_status === 'granted' && new Date((await profile(D)).vip_expires_at) - Date.now() > 700 * DAY, r.error ?? JSON.stringify(r.r?.rows));
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-STACK02', $1, 12)`, [D]));
check('same member cannot reuse a code', r.r?.rows[0].result_status === 'already_redeemed', r.error ?? JSON.stringify(r.r?.rows));
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-STACK02', $1, 12)`, [B]));
check('code stacks on a backfilled staff grant (30 days + 12 months)', r.r?.rows[0].result_status === 'granted' && near((await profile(B)).vip_expires_at, 395 * DAY, 4 * DAY), r.error ?? JSON.stringify(await profile(B)));
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-STACK02', $1, 12)`, [LIFER]));
check('lifetime VIP stays lifetime (result_expires null)', r.r?.rows[0].result_status === 'granted' && r.r.rows[0].result_expires === null && (await profile(LIFER)).vip_expires_at === null, r.error ?? JSON.stringify(r.r?.rows));
// Staff set VIP directly on the profile after the migration (no grant): redemption must not take it away.
await db.exec(`update public.profiles set is_vip = true, vip_expires_at = null where id = '${C}'`);
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-STACK02', $1, 12)`, [C]));
g = await grantsOf(C);
check('profile-only lifetime VIP is adopted as a staff grant and stays lifetime', r.r?.rows[0].result_status === 'granted' && (await profile(C)).vip_expires_at === null
  && g.some((x) => x.source === 'staff' && x.source_ref === 'legacy-profile' && x.expires_at === null), r.error ?? JSON.stringify(g));
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('NOPE', $1, 12)`, [D]));
check('unknown code is invalid', r.r?.rows[0].result_status === 'invalid', r.error);
r = await as('service_role', null, () => exec(`select * from public.redeem_vip_code('FNS-STACK02', '00000000-0000-4000-8000-00000000ffff', 12)`));
check('unknown member → no_profile', r.r?.rows[0].result_status === 'no_profile', r.error ?? JSON.stringify(r.r?.rows));

// ── 4. Members cannot write billing state ─────────────────────────────────────────────────
await db.exec(`
  insert into public.billing_customers (user_id, stripe_customer_id) values ('${D}', 'cus_D'), ('${B}', 'cus_B');
  insert into public.billing_subscriptions (id, user_id, status, current_period_end, raw)
    values ('sub_D1', '${D}', 'active', now() + interval '30 days', '{"metadata":{"user_id":"${D}"},"customer":"cus_D"}'),
           ('sub_B1', '${B}', 'active', now() + interval '30 days', '{}');`);
const denied = async (label, sql) => {
  const res = await as('authenticated', D, () => exec(sql));
  const n = res.r?.affectedRows ?? 0;
  check(`member cannot ${label}`, !!res.error || n === 0, res.error ?? `affected ${n}`);
};
await denied('insert a VIP grant', `insert into public.vip_grants (user_id, source, expires_at) values ('${D}', 'staff', null)`);
await denied('extend own VIP grant', `update public.vip_grants set expires_at = null where user_id = '${D}'`);
await denied('un-revoke a grant', `update public.vip_grants set revoked_at = null where user_id = '${A}'`);
await denied('delete own VIP grants', `delete from public.vip_grants where user_id = '${D}'`);
await denied('map a Stripe customer', `insert into public.billing_customers (user_id, stripe_customer_id) values ('${D}', 'cus_evil')`);
await denied("re-point own customer to someone else's", `update public.billing_customers set stripe_customer_id = 'cus_B' where user_id = '${D}'`);
await denied('insert a subscription', `insert into public.billing_subscriptions (id, user_id, status) values ('sub_evil', '${D}', 'active')`);
await denied('change own subscription status', `update public.billing_subscriptions set status = 'active', current_period_end = now() + interval '9 years' where user_id = '${D}'`);
await denied('write stripe_events', `insert into public.stripe_events (id, type) values ('evt_evil', 'x')`);
r = await as('authenticated', D, () => exec(`select * from public.set_subscription_grant($1, 'sub_evil', now() + interval '9 years', true)`, [D]));
check('member cannot call set_subscription_grant', !!r.error && /permission denied/.test(r.error), r.error);
r = await as('authenticated', D, () => exec(`select * from public.recompute_vip($1)`, [D]));
check('member cannot call recompute_vip', !!r.error && /permission denied/.test(r.error), r.error);
r = await as('anon', null, () => exec(`select * from public.recompute_vip($1)`, [D]));
check('anon cannot call recompute_vip', !!r.error && /permission denied/.test(r.error), r.error);
r = await as('authenticated', D, () => exec(`select
  (select count(*) from public.vip_grants)::int as grants, (select count(*) from public.billing_customers)::int as customers,
  (select count(*) from public.billing_subscriptions)::int as subs`));
check('member reads only their own grants / customer / subscriptions', !r.error && r.r.rows[0].grants === 2 && r.r.rows[0].customers === 1 && r.r.rows[0].subs === 1,
  r.error ?? JSON.stringify(r.r.rows[0]));
r = await as('authenticated', D, () => exec(`select count(*)::int n from public.stripe_events`));
check('stripe_events unreadable by members', !!r.error || r.r.rows[0].n === 0, r.error);
r = await as('anon', null, () => exec(`select count(*)::int n from public.vip_grants`));
check('anon reads no grants', !!r.error || r.r.rows[0].n === 0, r.error);

// ── 5. Scale: processor marks paid / refunded ─────────────────────────────────────────────
await db.exec(`insert into public.scale_deals (id, goal_count, group_price_cents) values ('${DEAL}', 1, 15500)`);
r = await as('authenticated', D, () => exec(`insert into public.scale_joins (deal_id, user_id) values ($1, $2) returning id`, [DEAL, D]));
const JOIN = r.r?.rows[0].id;
check('fixture: pledge reaches goal_met', (await one(`select state from public.scale_joins where id = $1`, [JOIN]))?.state === 'goal_met', r.error);
r = await as('service_role', null, () => exec(`select public.scale_mark_paid($1, 'pi_1') as s`, [JOIN]));
check('goal_met is not payable yet (conflict, unchanged)', r.r?.rows[0].s === 'conflict' && (await one(`select state from public.scale_joins where id = $1`, [JOIN])).state === 'goal_met', r.error ?? JSON.stringify(r.r?.rows));
await as('service_role', null, () => exec(`update public.scale_joins set state = 'payment_requested' where id = $1`, [JOIN]));
r = await as('authenticated', D, () => exec(`select public.scale_mark_paid($1, 'pi_fake') as s`, [JOIN]));
check('member cannot call scale_mark_paid', !!r.error && /permission denied/.test(r.error), r.error);
r = await as('authenticated', D, () => exec(`update public.scale_joins set state = 'paid', payment_ref = 'pi_fake' where id = $1`, [JOIN]));
check('member still cannot mark own pledge paid (20261009 guard)', (await one(`select state from public.scale_joins where id = $1`, [JOIN])).state === 'payment_requested', r.error);
r = await as('service_role', null, () => exec(`select public.scale_mark_paid($1, 'pi_1') as s`, [JOIN]));
let j = await one(`select state, payment_ref from public.scale_joins where id = $1`, [JOIN]);
let lastEv = await one(`select from_state, to_state, actor from public.scale_join_events where join_id = $1 order by created_at desc, to_state = 'paid' desc limit 1`, [JOIN]);
check('processor marks payment_requested → paid with payment_ref', r.r?.rows[0].s === 'paid' && j.state === 'paid' && j.payment_ref === 'pi_1', r.error ?? JSON.stringify(j));
check("transition recorded with actor 'processor'", lastEv?.to_state === 'paid' && lastEv.actor === 'processor', JSON.stringify(lastEv));
r = await as('service_role', null, () => exec(`select public.scale_mark_paid($1, 'pi_1') as s`, [JOIN]));
check('replay of the same payment → already_paid', r.r?.rows[0].s === 'already_paid', r.error ?? JSON.stringify(r.r?.rows));
r = await as('service_role', null, () => exec(`select public.scale_mark_paid($1, 'pi_2') as s`, [JOIN]));
check('a second payment for a paid pledge → conflict (caller refunds it)', r.r?.rows[0].s === 'conflict' && (await one(`select payment_ref from public.scale_joins where id = $1`, [JOIN])).payment_ref === 'pi_1', r.error);
r = await as('service_role', null, () => exec(`select public.scale_mark_paid('00000000-0000-4000-8000-00000000eeee', 'pi_3') as s`));
check('unknown pledge → not_found', r.r?.rows[0].s === 'not_found', r.error);
r = await as('service_role', null, () => exec(`select public.scale_mark_refunded('pi_1') as n`));
j = await one(`select state from public.scale_joins where id = $1`, [JOIN]);
lastEv = await one(`select to_state, actor from public.scale_join_events where join_id = $1 and to_state = 'refunded'`, [JOIN]);
check('full refund → refunded, actor processor', r.r?.rows[0].n === 1 && j.state === 'refunded' && lastEv?.actor === 'processor', r.error ?? JSON.stringify({j, lastEv}));
r = await as('service_role', null, () => exec(`select public.scale_mark_refunded('pi_1') as n`));
check('refund replay is a no-op', r.r?.rows[0].n === 0, r.error);

// ── 6. delete_member_data handles the billing tables ──────────────────────────────────────
await db.exec(`
  insert into public.stripe_events (id, type, data) values
    ('evt_D', 'checkout.session.completed', '{"client_reference_id":"${D}"}'),
    ('evt_other', 'invoice.paid', '{"customer":"cus_B"}');
  insert into public.revenue_events (event_type, idempotency_key, trace_id, room_id, member_id, state, provider_id, provider_receipt_id, amount_minor, currency)
    values ('vip.subscription_payment', 'stripe:invoice:in_D', 'tr', 'vip-room', '${D}', 'confirmed', 'stripe', 'in_D', 2499, 'USD');`);
r = await as('authenticated', D, () => exec(`select public.delete_member_data($1)`, [D]));
check('members cannot call delete_member_data', !!r.error && /permission denied/.test(r.error), r.error);
r = await as('service_role', null, () => exec(`select public.delete_member_data($1) as s`, [D]));
const s = r.r?.rows[0].s;
check('delete_member_data reports billing work', !r.error && s?.deleted?.['billing_customers.user_id'] === 1 && s.deleted['vip_grants.user_id'] === 2
  && s.anonymised['billing_subscriptions.user_id'] === 1 && s.anonymised['stripe_events.data'] === 1, r.error ?? JSON.stringify(s));
r = await exec(`delete from auth.users where id = $1`, [D]);
check('auth user delete succeeds afterwards', !r.error, r.error);
const bs = await one(`select user_id, raw from public.billing_subscriptions where id = 'sub_D1'`);
check('subscription history kept, anonymised, metadata stripped', bs && bs.user_id === null && bs.raw.metadata === undefined && bs.raw.customer === 'cus_D', JSON.stringify(bs));
check('customer mapping and grants gone', (await count(`select (select count(*) from public.billing_customers where stripe_customer_id = 'cus_D') + (select count(*) from public.vip_grants where user_id = $1) as n`, [D])) == 0);
check("webhook payload naming the member redacted; others untouched; ids kept",
  (await one(`select data from public.stripe_events where id = 'evt_D'`))?.data?.redacted === true
  && (await one(`select data from public.stripe_events where id = 'evt_other'`))?.data?.customer === 'cus_B');
check('revenue row kept, member anonymised', (await one(`select member_id from public.revenue_events where idempotency_key = 'stripe:invoice:in_D'`))?.member_id === null);
check("other member's billing untouched", (await count(`select count(*)::int n from public.billing_subscriptions where user_id = $1`, [B])) === 1
  && (await count(`select count(*)::int n from public.billing_customers where user_id = $1`, [B])) === 1);
r = await as('service_role', null, () => exec(`select public.delete_member_data($1) as s`, [D]));
check('delete_member_data still idempotent', !r.error && Object.keys(r.r.rows[0].s.deleted).length === 0, r.error ?? JSON.stringify(r.r?.rows[0]));

// ── 7. Re-apply ───────────────────────────────────────────────────────────────────────────
const grantCount = await count(`select count(*)::int n from public.vip_grants`);
try { await db.exec(migration('20261013_stripe_billing.sql')); r = {}; } catch (e) { r = {error: e.message}; }
check('migration re-applies cleanly', !r.error, r.error);
check('re-apply adds no grants (backfill is one-shot per member)', (await count(`select count(*)::int n from public.vip_grants`)) === grantCount);
r = await as('authenticated', B, () => exec(`insert into public.vip_grants (user_id, source) values ($1, 'staff')`, [B]));
check('re-apply keeps member writes revoked', !!r.error, 'insert succeeded');

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
