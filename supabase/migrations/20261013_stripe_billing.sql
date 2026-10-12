-- Stripe billing (13-Oct-2026): VIP membership subscriptions + Scale group-buy payments.
-- Spec + API contract: docs/PAYMENTS.md. Entitlements stay server-managed (ADR-0004).
--
--   1. billing_customers      Stripe customer ↔ member (service-role write, owner read)
--   2. billing_subscriptions  latest Stripe subscription state per subscription (service write, owner read)
--   3. vip_grants             the ONLY inputs to VIP: code | subscription | staff (service write, owner read)
--   4. stripe_events          webhook idempotency log (id, type, data, received_at, processed_at);
--                             replaces the old `payload` column the webhook wrote by mistake
--   5. recompute_vip(user)    profiles.is_vip / vip_expires_at from active grants (lifetime wins,
--                             else the latest expiry); set_subscription_grant(...) for the webhook
--   6. redeem_vip_code        redefined: same signature + return contract, now records a `code` grant
--   7. scale_mark_paid / scale_mark_refunded   processor transitions (finesse.actor = 'processor')
--   8. backfill               every existing VIP without grants gets one `staff` grant from their
--                             current profile values, so nobody loses access
--   9. delete_member_data     redefined (20261012 + billing tables): customer link + grants deleted,
--                             subscriptions kept anonymised, webhook payloads naming the member redacted
--
-- Depends on: 20261001 (revenue_events), 20261003 (scale_joins.state), 20261009 (redeem_vip_code,
-- profiles entitlement guard, scale guard), 20261012_account_lifecycle (delete_member_data).
-- NOTE: re-applying 20261012 after this file would drop the billing steps from delete_member_data —
-- re-apply this file afterwards.
-- Re-runnable. Tested by tests/db/stripe-billing.mjs (npm run test:db).
-- Apply (principal approval required — AGENTS.md):
--   SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261013_stripe_billing.sql

-- ── 1. billing_customers ──────────────────────────────────────────────────────────────────
create table if not exists public.billing_customers (
  user_id            uuid        primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text        not null unique,
  created_at         timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
drop policy if exists "billing_customers_own_read" on public.billing_customers;
create policy "billing_customers_own_read" on public.billing_customers for select to authenticated
  using (user_id = auth.uid());

-- ── 2. billing_subscriptions ──────────────────────────────────────────────────────────────
-- One row per Stripe subscription; the webhook re-fetches the subscription from Stripe and
-- overwrites the row, so the row is always the latest known truth (order-independent).
-- user_id is SET NULL on member deletion: the billing history outlives the member, anonymised.
create table if not exists public.billing_subscriptions (
  id                   text        primary key,                -- Stripe subscription id (sub_…)
  user_id              uuid        references public.profiles(id) on delete set null,
  status               text        not null,
  price_id             text,
  current_period_end   timestamptz,
  cancel_at_period_end boolean     not null default false,
  updated_at           timestamptz not null default now(),
  raw                  jsonb       not null default '{}'
);
do $$ begin
  alter table public.billing_subscriptions add constraint billing_subscriptions_status_check
    check (status in ('active','canceled','incomplete','incomplete_expired','past_due','paused','trialing','unpaid'));
exception when duplicate_object then null; end $$;
create index if not exists idx_billing_subscriptions_user on public.billing_subscriptions (user_id, updated_at desc);
alter table public.billing_subscriptions enable row level security;
drop policy if exists "billing_subscriptions_own_read" on public.billing_subscriptions;
create policy "billing_subscriptions_own_read" on public.billing_subscriptions for select to authenticated
  using (user_id = auth.uid());

-- ── 3. vip_grants ─────────────────────────────────────────────────────────────────────────
-- expires_at null = lifetime. A grant is active while revoked_at is null and it has not expired.
-- source_ref: code → vip_codes.id, subscription → Stripe subscription id, staff → free text.
create table if not exists public.vip_grants (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  source      text        not null,
  source_ref  text,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
do $$ begin
  alter table public.vip_grants add constraint vip_grants_source_check check (source in ('code', 'subscription', 'staff'));
exception when duplicate_object then null; end $$;
create unique index if not exists uq_vip_grants_ref on public.vip_grants (user_id, source, source_ref);
create index if not exists idx_vip_grants_user on public.vip_grants (user_id) where revoked_at is null;
alter table public.vip_grants enable row level security;
drop policy if exists "vip_grants_own_read" on public.vip_grants;
create policy "vip_grants_own_read" on public.vip_grants for select to authenticated
  using (user_id = auth.uid());

-- Members and anonymous visitors never write billing state (RLS already has no write policies;
-- the table privileges say so too).
do $$
declare t text;
begin
  foreach t in array array['billing_customers', 'billing_subscriptions', 'vip_grants'] loop
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke insert, update, delete, truncate on public.%I from authenticated', t);
    end if;
  end loop;
end $$;

-- ── 4. stripe_events ──────────────────────────────────────────────────────────────────────
-- Production may already have the 20260617 shape (id, type, data, processed, created_at).
create table if not exists public.stripe_events (
  id           text        primary key,
  type         text,
  data         jsonb       not null default '{}',
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.stripe_events
  add column if not exists type         text,
  add column if not exists data         jsonb not null default '{}',
  add column if not exists received_at  timestamptz not null default now(),
  add column if not exists processed_at timestamptz;
alter table public.stripe_events enable row level security;   -- no policies: service role only
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.stripe_events from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.stripe_events from authenticated;
  end if;
end $$;

-- ── 5. recompute_vip + set_subscription_grant ─────────────────────────────────────────────
-- Derives profiles.is_vip / vip_expires_at from active grants: any lifetime grant → VIP with no
-- expiry; else VIP until the latest expiry; no active grant → not VIP (vip_expires_at null).
-- Returns the resulting state and the grant source that decides it.
create or replace function public.recompute_vip(p_user uuid)
returns table (vip_active boolean, vip_expires timestamptz, vip_source text)
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then return; end if;

  select vg.source, vg.expires_at into g
    from public.vip_grants vg
   where vg.user_id = p_user and vg.revoked_at is null
     and (vg.expires_at is null or vg.expires_at > now())
   order by vg.expires_at desc nulls first, vg.created_at desc
   limit 1;

  if found then
    update public.profiles set is_vip = true, vip_expires_at = g.expires_at
     where id = p_user and (is_vip is distinct from true or vip_expires_at is distinct from g.expires_at);
    return query select true, g.expires_at, g.source;
  else
    update public.profiles set is_vip = false, vip_expires_at = null
     where id = p_user and (is_vip is distinct from false or vip_expires_at is not null);
    return query select false, null::timestamptz, null::text;
  end if;
end $$;

-- Webhook entry point: upsert (active) or revoke (inactive) the member's grant for one Stripe
-- subscription, then recompute. Code and staff grants are never touched. Empty result = no profile.
create or replace function public.set_subscription_grant(
  p_user uuid, p_subscription_id text, p_expires_at timestamptz, p_active boolean)
returns table (vip_active boolean, vip_expires timestamptz, vip_source text)
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_subscription_id is null then raise exception 'p_user and p_subscription_id are required'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then return; end if;
  if p_active then
    if p_expires_at is null then raise exception 'a subscription grant needs an expiry'; end if;
    insert into public.vip_grants (user_id, source, source_ref, expires_at)
    values (p_user, 'subscription', p_subscription_id, p_expires_at)
    on conflict (user_id, source, source_ref)
      do update set expires_at = excluded.expires_at, revoked_at = null;
  else
    update public.vip_grants set revoked_at = now()
     where user_id = p_user and source = 'subscription' and source_ref = p_subscription_id and revoked_at is null;
  end if;
  return query select * from public.recompute_vip(p_user);
end $$;

-- ── 6. redeem_vip_code: same contract, now a `code` grant ─────────────────────────────────
-- result_status: granted | invalid | expired | exhausted | already_redeemed | no_profile.
-- result_expires: the member's VIP expiry after the redemption (null = lifetime).
-- The code's months stack on the member's latest code/staff grant (not on a subscription, which
-- renews on its own). A member who is VIP on the profile with no active grant (set directly by
-- staff) is first adopted as a `staff` grant so the recompute never takes access away.
create or replace function public.redeem_vip_code(p_code text, p_user uuid, p_months int default 12)
returns table (result_status text, result_expires timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  c public.vip_codes%rowtype;
  cur_vip boolean;
  cur_exp timestamptz;
  base_exp timestamptz;
  code_exp timestamptz;
  next_exp timestamptz;
begin
  select * into c from public.vip_codes where code = upper(btrim(p_code)) for update;
  if not found or not c.is_active then
    return query select 'invalid'::text, null::timestamptz; return;
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return query select 'expired'::text, null::timestamptz; return;
  end if;
  if c.use_count >= c.max_uses then
    return query select 'exhausted'::text, null::timestamptz; return;
  end if;
  if exists (select 1 from public.vip_code_redemptions r where r.code_id = c.id and r.user_id = p_user) then
    return query select 'already_redeemed'::text, null::timestamptz; return;
  end if;

  select p.is_vip, p.vip_expires_at into cur_vip, cur_exp from public.profiles p where p.id = p_user for update;
  if not found then
    return query select 'no_profile'::text, null::timestamptz; return;
  end if;

  if cur_vip and (cur_exp is null or cur_exp > now())
     and not exists (select 1 from public.vip_grants g where g.user_id = p_user and g.revoked_at is null
                     and (g.expires_at is null or g.expires_at > now())) then
    insert into public.vip_grants (user_id, source, source_ref, expires_at)
    values (p_user, 'staff', 'legacy-profile', cur_exp)
    on conflict (user_id, source, source_ref) do update set expires_at = excluded.expires_at, revoked_at = null;
  end if;

  select max(g.expires_at) into base_exp from public.vip_grants g
   where g.user_id = p_user and g.source in ('code', 'staff') and g.revoked_at is null
     and g.expires_at > now();
  code_exp := greatest(coalesce(base_exp, now()), now()) + make_interval(months => p_months);

  update public.vip_codes set use_count = use_count + 1, used_at = now() where id = c.id;
  insert into public.vip_code_redemptions (code_id, user_id) values (c.id, p_user);
  insert into public.vip_grants (user_id, source, source_ref, expires_at)
  values (p_user, 'code', c.id::text, code_exp)
  on conflict (user_id, source, source_ref) do update set expires_at = excluded.expires_at, revoked_at = null;

  select r.vip_expires into next_exp from public.recompute_vip(p_user) r;
  return query select 'granted'::text, next_exp;
end $$;

-- ── 7. Scale: processor transitions ───────────────────────────────────────────────────────
-- Called by the Stripe webhook (service role). The 20261009 guard records actor = 'processor'.
-- Returns: paid (moved now) | already_paid (same payment_ref — replay) | conflict (other state or
-- another payment — the caller refunds the duplicate) | not_found.
create or replace function public.scale_mark_paid(p_join uuid, p_payment_ref text)
returns text language plpgsql security definer set search_path = public as $$
declare j record;
begin
  if p_payment_ref is null or btrim(p_payment_ref) = '' then raise exception 'p_payment_ref is required'; end if;
  perform set_config('finesse.actor', 'processor', true);
  select id, state, payment_ref into j from public.scale_joins where id = p_join for update;
  if not found then return 'not_found'; end if;
  if j.state = 'payment_requested' then
    update public.scale_joins set state = 'paid', payment_ref = p_payment_ref where id = p_join;
    return 'paid';
  end if;
  if j.payment_ref = p_payment_ref then return 'already_paid'; end if;
  return 'conflict';
end $$;

-- Full refund of a Scale payment: paid/fulfilled → refunded. Returns rows moved (0 on replay).
create or replace function public.scale_mark_refunded(p_payment_ref text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_payment_ref is null or btrim(p_payment_ref) = '' then raise exception 'p_payment_ref is required'; end if;
  perform set_config('finesse.actor', 'processor', true);
  update public.scale_joins set state = 'refunded'
   where payment_ref = p_payment_ref and state in ('paid', 'fulfilled');
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.recompute_vip(uuid) from public;
revoke all on function public.set_subscription_grant(uuid, text, timestamptz, boolean) from public;
revoke all on function public.redeem_vip_code(text, uuid, int) from public;
revoke all on function public.scale_mark_paid(uuid, text) from public;
revoke all on function public.scale_mark_refunded(text) from public;
do $$
declare f text;
begin
  foreach f in array array['public.recompute_vip(uuid)', 'public.set_subscription_grant(uuid, text, timestamptz, boolean)',
                           'public.redeem_vip_code(text, uuid, int)', 'public.scale_mark_paid(uuid, text)',
                           'public.scale_mark_refunded(text)'] loop
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f); end if;
  end loop;
end $$;

-- ── 8. Backfill: existing VIPs keep exactly what they have, as one staff grant ────────────
-- Only members with no grants at all, so a re-run never re-captures state the grants produced.
-- Profiles are not recomputed here: the grant mirrors the profile, so the result is identical.
insert into public.vip_grants (user_id, source, source_ref, expires_at)
select p.id, 'staff', 'backfill-20261013', p.vip_expires_at
  from public.profiles p
 where p.is_vip = true
   and not exists (select 1 from public.vip_grants g where g.user_id = p.id)
on conflict (user_id, source, source_ref) do nothing;

-- ── 9. delete_member_data (20261012) + billing tables ─────────────────────────────────────
-- Same as 20261012 with billing steps first:
--   billing_customers  deleted (the Stripe customer itself must be deleted by the API before this
--                      runs — see closeStripeCustomer in src/lib/billing.ts)
--   vip_grants         deleted
--   billing_subscriptions  kept, user_id → null, raw.metadata (carries user_id) stripped
--   stripe_events      payloads naming the member are redacted (ids kept for idempotency)
create or replace function public.delete_member_data(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  -- Rows other members or the business still need: keep the row, drop the link to the member.
  anonymise constant text[] := array[
    'revenue_events.member_id', 'ai_usage_events.user_id', 'access_audit_events.user_id',
    'vault_transactions.user_id', 'vault_ledger.user_id', 'payments.user_id', 'subscriptions.user_id',
    'scale_joins.user_id', 'embassy_deals.submitted_by', 'registry_items.purchased_by',
    'wardrobe_wishlist.purchased_by', 'vip_codes.created_by', 'vip_codes.used_by',
    'integration_audits.user_id', 'intelligence_audit.reviewed_by', 'billing_subscriptions.user_id'];
  -- Member-owned rows that carry the member id with no FK at all.
  no_fk_delete constant text[] := array['intelligence_audit.user_id'];
  item text; tbl text; col text; typ text; nullable text;
  n bigint;
  anon_out jsonb := '{}'; del_out jsonb := '{}';
  cancelled bigint := 0;
  r record;
begin
  if p_user is null then raise exception 'p_user is required'; end if;
  perform set_config('finesse.actor', 'system', true);

  -- a) Live Scale pledges are cancelled first so deal counts drop and the waitlist moves up.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'scale_joins' and column_name = 'state') then
    update public.scale_joins set state = 'cancelled'
     where user_id = p_user and state in ('pledged', 'waitlisted', 'goal_met', 'payment_requested');
    get diagnostics cancelled = row_count;
  end if;

  -- a2) Billing (20261013).
  if to_regclass('public.billing_customers') is not null then
    delete from public.billing_customers where user_id = p_user;
    get diagnostics n = row_count;
    if n > 0 then del_out := del_out || jsonb_build_object('billing_customers.user_id', n); end if;
  end if;
  if to_regclass('public.vip_grants') is not null then
    delete from public.vip_grants where user_id = p_user;
    get diagnostics n = row_count;
    if n > 0 then del_out := del_out || jsonb_build_object('vip_grants.user_id', n); end if;
  end if;
  if to_regclass('public.billing_subscriptions') is not null then
    update public.billing_subscriptions set user_id = null, raw = raw - 'metadata' where user_id = p_user;
    get diagnostics n = row_count;
    if n > 0 then anon_out := anon_out || jsonb_build_object('billing_subscriptions.user_id', n); end if;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'stripe_events' and column_name = 'data') then
    update public.stripe_events set data = jsonb_build_object('redacted', true)
     where strpos(data::text, p_user::text) > 0;
    get diagnostics n = row_count;
    if n > 0 then anon_out := anon_out || jsonb_build_object('stripe_events.data', n); end if;
  end if;

  -- b) Anonymise.
  foreach item in array anonymise loop
    tbl := split_part(item, '.', 1); col := split_part(item, '.', 2);
    select c.data_type, c.is_nullable into typ, nullable from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = tbl and c.column_name = col;
    continue when typ is null;
    if typ = 'ARRAY' then           -- vip_codes.used_by is uuid[] in the master schema
      execute format('update public.%I set %I = array_remove(%I, $1) where $1 = any(%I)', tbl, col, col, col) using p_user;
    elsif nullable = 'YES' then
      execute format('update public.%I set %I = null where %I = $1', tbl, col, col) using p_user;
    else
      continue;                     -- still NOT NULL: its own FK decides (cascade)
    end if;
    get diagnostics n = row_count;
    if n > 0 then anon_out := anon_out || jsonb_build_object(item, n); end if;
  end loop;

  -- c) Member-owned rows whose FK (to auth.users or profiles) is NO ACTION / RESTRICT would
  --    block the auth delete: delete them (outings, outing_participants, exchange_offers,
  --    registry_pledges, legacy wishlist rows …). CASCADE / SET NULL FKs are left to Postgres.
  for r in
    select cl.relname as tbl, a.attname as col
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace and ns.nspname = 'public'
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
    where con.contype = 'f' and array_length(con.conkey, 1) = 1
      and con.confdeltype in ('a', 'r')
      and con.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
    order by 1, 2
  loop
    continue when (r.tbl || '.' || r.col) = any(anonymise);
    execute format('delete from public.%I where %I = $1', r.tbl, r.col) using p_user;
    get diagnostics n = row_count;
    if n > 0 then del_out := del_out || jsonb_build_object(r.tbl || '.' || r.col, n); end if;
  end loop;

  -- d) No-FK member columns.
  foreach item in array no_fk_delete loop
    tbl := split_part(item, '.', 1); col := split_part(item, '.', 2);
    continue when not exists (select 1 from information_schema.columns
                              where table_schema = 'public' and table_name = tbl and column_name = col);
    execute format('delete from public.%I where %I = $1', tbl, col) using p_user;
    get diagnostics n = row_count;
    if n > 0 then del_out := del_out || jsonb_build_object(item, n); end if;
  end loop;

  return jsonb_build_object('scale_pledges_cancelled', cancelled, 'anonymised', anon_out, 'deleted', del_out);
end $$;

revoke all on function public.delete_member_data(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on function public.delete_member_data(uuid) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on function public.delete_member_data(uuid) from authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then grant execute on function public.delete_member_data(uuid) to service_role; end if;
end $$;
