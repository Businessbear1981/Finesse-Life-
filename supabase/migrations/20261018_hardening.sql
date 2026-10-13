-- Hardening pass: tamper-evident house ledger, agent charters as a database rule,
-- secret-shaped values refused, and forced RLS on member-only tables.
--
-- 1. house_ledger — append-only, hash-chained. Each row's hash covers the previous row's hash and the
--    row's own content, so editing or deleting any past row breaks the chain from that row on.
--    UPDATE/DELETE are refused by trigger for everyone (including the owner); members and anon have no
--    grants at all. ledger_verify() returns the first broken seq (NULL = intact).
-- 2. Agent rule: actor_kind = 'agent' without a charter is rejected by the table itself, and a Nova request
--    can only become 'ready' with a result produced by the agent chartered for its kind.
-- 3. social_accounts token columns accept only the sealed "v1:<iv>:<ciphertext>" format (src/lib/switchboard.ts),
--    never a raw token, JWT, key or connection string.
-- 4. FORCE ROW LEVEL SECURITY on member tables that no SECURITY DEFINER function touches, so a job or
--    migration running as a non-bypass table owner can't read across members either.
--
-- Uses built-in sha256() (Postgres 11+) — no extensions needed.

-- ── 1. The house ledger ──────────────────────────────────────────────────────────────────
create table if not exists public.house_ledger (
  seq          bigserial primary key,
  at           timestamptz not null default now(),
  actor_kind   text not null check (actor_kind in ('member', 'staff', 'agent', 'system')),
  actor_id     uuid,
  charter      text check (charter is null or char_length(charter) between 3 and 120),
  action       text not null check (char_length(action) between 1 and 80),
  subject_kind text not null check (char_length(subject_kind) between 1 and 60),
  subject_id   text,
  details      jsonb not null default '{}'::jsonb check (octet_length(details::text) <= 4000),
  prev_hash    text not null,
  row_hash     text not null,
  constraint house_ledger_agent_needs_charter check (actor_kind <> 'agent' or charter is not null)
);
alter table public.house_ledger enable row level security;
alter table public.house_ledger force row level security;
revoke all on public.house_ledger from public, anon, authenticated;
revoke all on sequence public.house_ledger_seq_seq from public, anon, authenticated;

create or replace function public.ledger_row_digest(r public.house_ledger)
returns text language sql immutable as $$
  select encode(sha256(convert_to(
    concat_ws('|', r.prev_hash, r.seq::text, to_char(r.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
      r.actor_kind, coalesce(r.actor_id::text, ''), coalesce(r.charter, ''), r.action, r.subject_kind,
      coalesce(r.subject_id, ''), r.details::text),
    'UTF8')), 'hex')
$$;

create or replace function public.house_ledger_chain()
returns trigger language plpgsql as $$
declare last_hash text;
begin
  -- Serialise appends so two writers can't both chain onto the same previous row.
  perform pg_advisory_xact_lock(hashtext('house_ledger'));
  select row_hash into last_hash from public.house_ledger order by seq desc limit 1;
  new.at := now();
  new.prev_hash := coalesce(last_hash, 'genesis');
  new.row_hash := public.ledger_row_digest(new);
  return new;
end $$;

drop trigger if exists house_ledger_chain on public.house_ledger;
create trigger house_ledger_chain before insert on public.house_ledger
  for each row execute function public.house_ledger_chain();

create or replace function public.house_ledger_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'house_ledger is append-only' using errcode = '42501';
end $$;

drop trigger if exists house_ledger_no_update on public.house_ledger;
create trigger house_ledger_no_update before update or delete on public.house_ledger
  for each row execute function public.house_ledger_immutable();
drop trigger if exists house_ledger_no_truncate on public.house_ledger;
create trigger house_ledger_no_truncate before truncate on public.house_ledger
  for each statement execute function public.house_ledger_immutable();

/** First seq whose stored hash doesn't match the chain (NULL = intact). Staff/service only. */
create or replace function public.ledger_verify()
returns bigint language plpgsql stable security definer set search_path = public as $$
declare r public.house_ledger; expected_prev text := 'genesis';
begin
  for r in select * from public.house_ledger order by seq loop
    if r.prev_hash <> expected_prev or r.row_hash <> public.ledger_row_digest(r) then
      return r.seq;
    end if;
    expected_prev := r.row_hash;
  end loop;
  return null;
end $$;

/** The only way in: server code and the triggers below append through this. */
create or replace function public.ledger_append(
  p_actor_kind text, p_actor_id uuid, p_charter text, p_action text,
  p_subject_kind text, p_subject_id text, p_details jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare s bigint;
begin
  insert into public.house_ledger (actor_kind, actor_id, charter, action, subject_kind, subject_id, details, prev_hash, row_hash)
  values (p_actor_kind, p_actor_id, p_charter, p_action, p_subject_kind, p_subject_id, coalesce(p_details, '{}'::jsonb), '', '')
  returning seq into s;
  return s;
end $$;

revoke all on function public.ledger_append(text, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.ledger_verify() from public, anon, authenticated;
do $$ begin
  grant execute on function public.ledger_append(text, uuid, text, text, text, text, jsonb) to service_role;
  grant execute on function public.ledger_verify() to service_role;
exception when undefined_object then null; end $$;

-- ── 2. Agent charters ────────────────────────────────────────────────────────────────────
-- Which agent may produce a result for which request kind. Anything else is refused by the database.
create or replace function public.nova_agent_chartered(p_kind text, p_agent text)
returns boolean language sql immutable as $$
  select (p_kind, p_agent) in (
    ('find_item', 'scout'), ('price_check', 'price-hunter'), ('style_for_occasion', 'stylist'),
    ('procurement', 'procurement'), ('plan', 'planner'))
$$;

create or replace function public.nova_requests_charter_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'ready' and old.status is distinct from 'ready' then
    if new.result is null or not coalesce(public.nova_agent_chartered(new.kind, new.result ->> 'agent'), false) then
      raise exception 'agent_not_chartered: % cannot produce % results', coalesce(new.result ->> 'agent', 'unknown'), new.kind
        using errcode = '42501';
    end if;
    -- A plan is never a booking until a partner adapter exists.
    if new.kind = 'plan' and coalesce((new.result ->> 'booked')::boolean, false) then
      raise exception 'plans_cannot_claim_booking' using errcode = '22023';
    end if;
    perform public.ledger_append('agent', null, 'nova_requests.' || new.kind || ':' || (new.result ->> 'agent'),
      'agent_result', 'nova_request', new.id::text, jsonb_build_object('member_id', new.member_id, 'kind', new.kind));
  end if;
  return new;
end $$;

do $$ begin
  if to_regclass('public.nova_requests') is not null then
    drop trigger if exists nova_requests_charter_guard on public.nova_requests;
    create trigger nova_requests_charter_guard before update on public.nova_requests
      for each row execute function public.nova_requests_charter_guard();
  end if;
end $$;

-- ── Ledger hooks: VIP grants and moderation hides ────────────────────────────────────────
create or replace function public.ledger_vip_grant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ledger_append('system', null, null,
    case when tg_op = 'INSERT' then 'vip_grant' when new.revoked_at is not null and old.revoked_at is null then 'vip_revoke' else 'vip_grant_change' end,
    'vip_grant', new.id::text,
    jsonb_build_object('member_id', new.user_id, 'source', new.source, 'expires_at', new.expires_at, 'revoked_at', new.revoked_at));
  return new;
end $$;

create or replace function public.ledger_moderation_hide()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.moderation_hidden is distinct from old.moderation_hidden then
    perform public.ledger_append(case when auth.uid() is null then 'system' else 'staff' end, auth.uid(), null,
      case when new.moderation_hidden then 'content_hidden' else 'content_restored' end, tg_table_name, new.id::text, '{}'::jsonb);
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  if to_regclass('public.vip_grants') is not null then
    drop trigger if exists ledger_vip_grant on public.vip_grants;
    create trigger ledger_vip_grant after insert or update on public.vip_grants
      for each row execute function public.ledger_vip_grant();
  end if;
  foreach t in array array['posts', 'vip_posts', 'exchange_listings', 'club_tables', 'outings'] loop
    if to_regclass('public.' || t) is not null and exists (
      select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'moderation_hidden') then
      execute format('drop trigger if exists ledger_moderation_hide on public.%I', t);
      execute format('create trigger ledger_moderation_hide after update on public.%I for each row execute function public.ledger_moderation_hide()', t);
    end if;
  end loop;
end $$;

-- ── 3. Secret-shaped values refused ──────────────────────────────────────────────────────
do $$ begin
  if to_regclass('public.social_accounts') is not null then
    -- Pre-existing raw values can't be trusted; clear them (members reconnect via OAuth).
    update public.social_accounts set access_token_enc = null, connected = false
      where access_token_enc is not null and access_token_enc !~ '^v1:[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]{24,}={0,2}$';
    alter table public.social_accounts drop constraint if exists social_accounts_token_sealed;
    alter table public.social_accounts add constraint social_accounts_token_sealed
      check (access_token_enc is null or access_token_enc ~ '^v1:[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]{24,}={0,2}$');
  end if;
end $$;

-- ── 4. Forced RLS on member-only tables (none are read by SECURITY DEFINER functions) ────
do $$
declare t text;
begin
  foreach t in array array['entourage_people', 'entourage_gifts', 'trips', 'per_diem_plans', 'gym_sessions',
                           'member_consents', 'nova_requests', 'diary_items', 'social_accounts', 'social_broadcasts'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('alter table public.%I force row level security', t);
    end if;
  end loop;
end $$;
