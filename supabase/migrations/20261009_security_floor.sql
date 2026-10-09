-- Security floor before any money moves (9-Oct-2026 backend audit).
--
-- Closes paths where a signed-in member could, with only the public anon key and their own
-- session, write state that must be server-decided:
--   1. profiles: set their own is_vip / vip_expires_at (free VIP) or claim an admin role
--   2. vault_accounts / vault_transactions: write their own balance and credits
--   3. scale_joins: walk their own pledge to 'paid', delete + re-insert to inflate counts;
--      every pledge was also counted twice (two AFTER INSERT triggers)
--   4. profiles were readable by anonymous visitors (email, telegram_chat_id, private_* …)
--   5. stripe_events / truth_checks had no RLS; procurement tokens could be self-minted;
--      embassy_deals could be edited or deleted by any member
-- and replaces the broken VIP-code redemption with one atomic, service-role-only function.
--
-- Depends on: 20261003_scale_pledge_states.sql (scale_joins.state).
-- Apply (principal approval required — AGENTS.md):
--   SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261009_security_floor.sql
-- After applying, grant the first admin from a direct DB connection (not PostgREST):
--   update public.profiles set role = 'owner' where id = '<founder user id>';

-- ── 1. profiles: entitlement + role columns are server-managed ────────────────────────────
alter table public.profiles
  add column if not exists is_vip boolean not null default false,
  add column if not exists vip_expires_at timestamptz,
  add column if not exists role text not null default 'member';

do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('member', 'admin', 'owner'));
exception when duplicate_object then null; end $$;

-- Requests made with a member/anon JWT through PostgREST cannot touch these columns.
-- service_role requests, auth triggers (handle_new_user) and direct DB sessions are unaffected.
create or replace function public.profiles_protect_entitlements()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_vip := false;
    new.vip_expires_at := null;
    new.role := 'member';
    return new;
  end if;
  if new.is_vip is distinct from old.is_vip
     or new.vip_expires_at is distinct from old.vip_expires_at
     or new.role is distinct from old.role then
    raise exception 'is_vip, vip_expires_at and role are server-managed' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_protect_entitlements on public.profiles;
create trigger trg_profiles_protect_entitlements
  before insert or update on public.profiles
  for each row execute function public.profiles_protect_entitlements();

-- Members can see each other; anonymous visitors cannot read profiles at all.
-- (Column-level privacy for private_*, email, nightvision_data is the next step: it needs an
-- owner-only RPC so the profile editor keeps working.)
drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "profiles_member_read" on public.profiles;
create policy "profiles_member_read" on public.profiles for select to authenticated using (true);

-- ── 2. Vault: balances and ledger rows are written by the server only ──────────────────────
-- Members keep read access to their own rows. Account rows are created by the
-- trg_create_vault_account trigger (security definer); credits need processor evidence.
drop policy if exists "vault_own_update" on public.vault_accounts;
drop policy if exists "vault_own_insert" on public.vault_accounts;
drop policy if exists "vault_txn_own_insert" on public.vault_transactions;

-- ── 3. Scale: members pledge and cancel; everything else is system/processor ───────────────
drop policy if exists "scale_joins_own" on public.scale_joins;     -- FOR ALL, incl. delete
drop policy if exists "scale_joins_read" on public.scale_joins;    -- using (true): who pledged what
drop policy if exists "scale_joins_own_read" on public.scale_joins;
create policy "scale_joins_own_read" on public.scale_joins for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "scale_joins_own_insert" on public.scale_joins;
create policy "scale_joins_own_insert" on public.scale_joins for insert to authenticated
  with check (user_id = auth.uid() and state in ('pledged', 'waitlisted') and payment_ref is null);
-- scale_joins_own_cancel (20261003) remains the only member UPDATE path.

-- Guard: same legal transitions as 20261003, plus members may only ever move to 'cancelled'.
-- Internal triggers mark themselves with finesse.actor = 'system' before promoting rows.
create or replace function public.scale_join_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if tg_op = 'INSERT' then
    if new.state not in ('pledged', 'waitlisted') then raise exception 'new pledge must start pledged/waitlisted'; end if;
    return new;
  end if;
  if coalesce(auth.role(), '') in ('anon', 'authenticated')
     and coalesce(current_setting('finesse.actor', true), '') <> 'system' then
    if new.state <> 'cancelled'
       or new.payment_ref is distinct from old.payment_ref
       or new.deal_id is distinct from old.deal_id
       or new.user_id is distinct from old.user_id then
      raise exception 'members may only cancel their own pledge' using errcode = '42501';
    end if;
  end if;
  if new.state = old.state then return new; end if;
  ok := (old.state, new.state) in (
    ('pledged','goal_met'), ('pledged','cancelled'),
    ('waitlisted','pledged'), ('waitlisted','cancelled'), ('waitlisted','goal_met'),
    ('goal_met','payment_requested'), ('goal_met','cancelled'),
    ('payment_requested','paid'), ('payment_requested','cancelled'),
    ('paid','fulfilled'), ('paid','refunded'), ('fulfilled','refunded'));
  if not ok then raise exception 'illegal scale transition % -> %', old.state, new.state; end if;
  new.state_changed_at := now();
  insert into public.scale_join_events(join_id, from_state, to_state, actor)
    values (new.id, old.state, new.state,
            coalesce(nullif(current_setting('finesse.actor', true), ''),
                     case when auth.role() = 'authenticated' then 'member' else 'system' end));
  return new;
end $$;

create or replace function public.increment_scale_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare d record;
begin
  if new.state <> 'pledged' then return new; end if;
  perform set_config('finesse.actor', 'system', true);
  update public.scale_deals
     set current_count = current_count + 1,
         status = case when current_count + 1 >= goal_count then 'met' else status end
   where id = new.deal_id
   returning * into d;
  if d.status = 'met' then
    update public.scale_joins set state = 'goal_met' where deal_id = new.deal_id and state = 'pledged';
  end if;
  return new;
end $$;

create or replace function public.scale_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
declare nxt uuid; was_counted boolean;
begin
  if new.state = 'cancelled' and old.state <> 'cancelled' then
    was_counted := old.state in ('pledged', 'goal_met');
    if was_counted then
      perform set_config('finesse.actor', 'system', true);
      update public.scale_deals set current_count = greatest(current_count - 1, 0) where id = new.deal_id;
      select id into nxt from public.scale_joins
       where deal_id = new.deal_id and state = 'waitlisted' order by joined_at limit 1;
      if nxt is not null then
        update public.scale_joins
           set state = case when old.state = 'goal_met' then 'goal_met' else 'pledged' end
         where id = nxt;
        update public.scale_deals set current_count = current_count + 1 where id = new.deal_id;
      end if;
    end if;
  end if;
  return new;
end $$;

-- Exactly one counting trigger (20260611 and 20260617_master each added one).
drop trigger if exists trg_increment_scale_count on public.scale_joins;
drop trigger if exists trg_scale_join_count on public.scale_joins;
create trigger trg_scale_join_count after insert on public.scale_joins
  for each row execute function public.increment_scale_count();

-- ── 4. Tables that had no RLS (service role bypasses RLS, so server writers are unaffected) ─
alter table if exists public.stripe_events enable row level security;
alter table if exists public.truth_checks enable row level security;

-- ── 5. Procurement tokens are minted by the server (agents use the service role) ───────────
drop policy if exists "procurement_tokens_own_insert" on public.procurement_tokens;

-- ── 6. Embassy deals: members may submit, not edit or delete others' rows ──────────────────
drop policy if exists "staff_only" on public.embassy_deals;
drop policy if exists "embassy_deals_read" on public.embassy_deals;
create policy "embassy_deals_read" on public.embassy_deals for select to authenticated using (true);
drop policy if exists "embassy_deals_member_insert" on public.embassy_deals;
create policy "embassy_deals_member_insert" on public.embassy_deals for insert to authenticated with check (true);

-- ── 7. VIP codes: one atomic, service-role-only redemption ─────────────────────────────────
create table if not exists public.vip_code_redemptions (
  id          uuid        primary key default gen_random_uuid(),
  code_id     uuid        not null references public.vip_codes(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (code_id, user_id)
);
alter table public.vip_code_redemptions enable row level security;
drop policy if exists "vip_code_redemptions_own_read" on public.vip_code_redemptions;
create policy "vip_code_redemptions_own_read" on public.vip_code_redemptions for select to authenticated
  using (user_id = auth.uid());

-- Locks the code row, checks it, records the redemption and extends VIP in one transaction.
-- A lifetime VIP (is_vip with no expiry) stays lifetime. Returns result_status:
-- granted | invalid | expired | exhausted | already_redeemed | no_profile
create or replace function public.redeem_vip_code(p_code text, p_user uuid, p_months int default 12)
returns table (result_status text, result_expires timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  c public.vip_codes%rowtype;
  cur_vip boolean;
  cur_exp timestamptz;
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

  if cur_vip and cur_exp is null then
    next_exp := null;                                   -- lifetime stays lifetime
  else
    next_exp := greatest(coalesce(case when cur_vip then cur_exp end, now()), now())
                + make_interval(months => p_months);
  end if;

  update public.vip_codes set use_count = use_count + 1, used_at = now() where id = c.id;
  insert into public.vip_code_redemptions (code_id, user_id) values (c.id, p_user);
  update public.profiles set is_vip = true, vip_expires_at = next_exp where id = p_user;

  return query select 'granted'::text, next_exp;
end $$;

revoke all on function public.redeem_vip_code(text, uuid, int) from public, anon, authenticated;
grant execute on function public.redeem_vip_code(text, uuid, int) to service_role;

-- ── 8. VIP feed: only active VIPs may post ─────────────────────────────────────────────────
-- 20260617_finesse_v2 / master added "vip_posts_own_write" (FOR ALL, author = self). Policies
-- are OR'd, so it let any signed-in member post into the VIP feed. Replace it with explicit
-- per-command policies; inserts require an active VIP grant.
drop policy if exists "vip_posts_own_write" on public.vip_posts;
drop policy if exists "vip_posts_vip_insert" on public.vip_posts;
create policy "vip_posts_vip_insert" on public.vip_posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.is_vip = true
                  and (p.vip_expires_at is null or p.vip_expires_at > now()))
  );
drop policy if exists "vip_posts_own_update" on public.vip_posts;
create policy "vip_posts_own_update" on public.vip_posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "vip_posts_own_delete" on public.vip_posts;
create policy "vip_posts_own_delete" on public.vip_posts for delete to authenticated
  using (author_id = auth.uid());
