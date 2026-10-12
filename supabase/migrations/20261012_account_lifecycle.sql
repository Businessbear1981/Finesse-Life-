-- Account lifecycle (12-Oct-2026): collision-safe signup usernames + member-initiated
-- account deletion (App Store 5.1.1(v), Google Play account-deletion policy).
--
--   1. access_audit_events.lock accepts 'account' (deletion audit + password-failure rate limit)
--   2. handle_new_user(): a second john@… signup no longer fails on profiles.username
--   3. revenue_events stays append-only, but the FK's own ON DELETE SET NULL (member_id → null)
--      is allowed through, so deleting an auth user that has ledger rows no longer fails
--   4. financial / ledger tables keep their rows when a member is deleted: user FK becomes
--      ON DELETE SET NULL (vault_transactions, vault_ledger, payments, subscriptions, scale_joins)
--   5. delete_member_data(uuid): service-role-only, one transaction, run by POST /api/account/delete
--      before auth.admin.deleteUser(). Cancels live Scale pledges (keeps deal counts right),
--      anonymises shared / financial rows, deletes member-owned rows whose FK would otherwise
--      block the auth-user delete (NO ACTION / RESTRICT), and rows with no FK at all.
--
-- Catalog-driven and guarded with to_regclass / information_schema because which of the
-- conflicting 20260617 migrations production actually ran is unknown (BACKEND_MAP §2).
-- Depends on: 20261001 (access_audit_events, revenue_events), 20261003 (scale_joins.state).
-- Re-runnable. Tested by tests/db/account-lifecycle.mjs (npm run test:db).
-- Apply (principal approval required — AGENTS.md):
--   SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261012_account_lifecycle.sql

-- ── 1. Audit trail accepts account events ─────────────────────────────────────────────────
do $$
declare c record;
begin
  if to_regclass('public.access_audit_events') is null then return; end if;
  for c in
    select con.conname from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any(con.conkey)
    where con.conrelid = 'public.access_audit_events'::regclass and con.contype = 'c' and a.attname = 'lock'
  loop
    execute format('alter table public.access_audit_events drop constraint %I', c.conname);
  end loop;
  alter table public.access_audit_events add constraint access_audit_events_lock_check
    check (lock in ('entrance', 'vip_lift', 'account'));
end $$;

-- ── 2. Signup: unique username with a short suffix on collision ───────────────────────────
-- Keeps what every earlier version did (id + email, username from the e-mail local part,
-- full_name / avatar_url from OAuth metadata as the MVP version did; on conflict (id) do
-- nothing). The local part is lower-cased and reduced to [a-z0-9_] (as 20260609_finesse_mvp
-- did) and capped at 24 chars. Taken → base_1234 (random 4 digits, 5 tries) → base_ab12cd
-- (6 hex, 4 tries) → base_<first 12 hex of the user id>. A concurrent signup that wins the
-- same name between check and insert is caught (unique_violation) and retried. Runs from the
-- auth trigger with no JWT, so profiles_protect_entitlements (20261009) lets it through.
create or replace function public.username_candidate(p_base text, p_try int, p_id uuid)
returns text language sql volatile set search_path = public as $$
  select case
    when p_try <= 0 then p_base
    when p_try <= 5 then p_base || '_' || (1000 + floor(random() * 9000))::int::text
    when p_try <= 9 then p_base || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 6)
    else p_base || '_' || substr(replace(p_id::text, '-', ''), 1, 12)
  end
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base      text;
  candidate text;
  tries     int := 0;
begin
  base := lower(split_part(coalesce(new.email, ''), '@', 1));
  base := left(regexp_replace(base, '[^a-z0-9_]', '_', 'g'), 24);
  if base !~ '[a-z0-9]' then base := 'member'; end if;
  candidate := base;

  loop
    while tries < 10 and exists (select 1 from public.profiles where username = candidate) loop
      tries := tries + 1;
      candidate := public.username_candidate(base, tries, new.id);
    end loop;
    begin
      insert into public.profiles (id, email, username, display_name, avatar_url)
      values (new.id, new.email, candidate,
              new.raw_user_meta_data ->> 'full_name',
              new.raw_user_meta_data ->> 'avatar_url')
      on conflict (id) do nothing;
      return new;
    exception when unique_violation then
      -- Lost a race for this name (or a non-username unique clash): try the next candidate,
      -- and give up loudly once even the id-derived name has failed.
      if tries >= 10 then raise; end if;
      tries := tries + 1;
      candidate := public.username_candidate(base, tries, new.id);
    end;
  end loop;
end $$;

revoke all on function public.username_candidate(text, int, uuid) from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 3. revenue_events: still append-only; only the anonymising FK action may pass ─────────
-- member_id references auth.users ON DELETE SET NULL (20261001). That SET NULL is an UPDATE,
-- which the append-only trigger rejected, so deleting any member with a ledger row failed.
-- Allowed: exactly member_id <non-null> → null with every other column unchanged.
create or replace function public.revenue_events_append_only() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     and old.member_id is not null and new.member_id is null
     and (to_jsonb(new) - 'member_id') = (to_jsonb(old) - 'member_id') then
    return new;
  end if;
  raise exception 'revenue_events is append-only; write a reversal row instead';
end $$;

-- ── 4. Financial rows outlive the member, anonymised ──────────────────────────────────────
-- These FKs were ON DELETE CASCADE (and NOT NULL), so deleting a member erased ledger
-- history. They become nullable + ON DELETE SET NULL. Member read policies (user_id =
-- auth.uid()) are unaffected; a null row is readable by no member.
do $$
declare
  t record;
  c record;
begin
  for t in
    select * from (values
      ('vault_transactions', 'user_id'),
      ('vault_ledger',       'user_id'),
      ('payments',           'user_id'),
      ('subscriptions',      'user_id'),
      ('scale_joins',        'user_id')   -- keeps scale_join_events (FK join_id → scale_joins)
    ) v(tbl, col)
  loop
    continue when not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.tbl and column_name = t.col);
    execute format('alter table public.%I alter column %I drop not null', t.tbl, t.col);
    for c in
      select con.conname, con.confrelid::regclass::text as ref, con.confdeltype
      from pg_constraint con
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
      where con.contype = 'f'
        and con.conrelid = format('public.%I', t.tbl)::regclass
        and array_length(con.conkey, 1) = 1
        and a.attname = t.col
        and con.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
    loop
      continue when c.confdeltype = 'n';
      execute format('alter table public.%I drop constraint %I', t.tbl, c.conname);
      execute format('alter table public.%I add constraint %I foreign key (%I) references %s(id) on delete set null',
                     t.tbl, c.conname, t.col, c.ref);
    end loop;
  end loop;
end $$;

-- ── 5. delete_member_data: everything the database must do before auth.admin.deleteUser ──
-- Returns a jsonb summary {scale_pledges_cancelled, anonymised:{tbl.col:n}, deleted:{tbl.col:n}}.
-- Idempotent: a retry after a failed auth delete finds nothing left to do.
create or replace function public.delete_member_data(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  -- Rows other members or the business still need: keep the row, drop the link to the member.
  anonymise constant text[] := array[
    'revenue_events.member_id', 'ai_usage_events.user_id', 'access_audit_events.user_id',
    'vault_transactions.user_id', 'vault_ledger.user_id', 'payments.user_id', 'subscriptions.user_id',
    'scale_joins.user_id', 'embassy_deals.submitted_by', 'registry_items.purchased_by',
    'wardrobe_wishlist.purchased_by', 'vip_codes.created_by', 'vip_codes.used_by',
    'integration_audits.user_id', 'intelligence_audit.reviewed_by'];
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

revoke all on function public.delete_member_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_member_data(uuid) to service_role;
