-- S1 · Member safety for user-generated content (Apple App Review 1.2, Google Play UGC policy).
--
-- What this adds, all enforced in the database so the web routes, the app's direct reads and any
-- future client get the same answer:
--   1. House rules & terms: profiles.terms_accepted_at / terms_version (set by POST /api/account/accept-terms).
--      Posting to the Lounge or the VIP feed, listing on the Exchange and hosting a Game Room table
--      require it (restrictive INSERT policies) — and a member the house has suspended cannot post.
--   2. member_blocks: a member blocks another; each then stops seeing the other's posts, VIP posts,
--      listings, tables, outings and profile (both directions, via is_blocked_between()).
--   3. content_reports: members report a post, VIP post, profile, listing, table, outing or Nova reply
--      with a reason. Members insert and read only their own reports; staff work the queue with the
--      service role (GET /api/moderation/queue, POST /api/moderation/action).
--   4. moderation_hidden on posts, vip_posts, exchange_listings, club_tables and outings: set by staff
--      or automatically when 3 different members have open reports on the same item. Members can't
--      flip it; hidden rows stay visible to their author only.
--
-- Idempotent. Every table other than profiles is optional (skipped when absent), so this applies on
-- any environment the earlier migrations reached. Test: node tests/db/s1-moderation.mjs

-- ── 1. Terms acceptance + posting suspension on profiles ───────────────────────────────────
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists posting_suspended_at timestamptz;

-- Members may record their own acceptance; only the house (service role / direct DB) suspends.
-- Security INVOKER on purpose: current_user is then the caller (anon/authenticated through PostgREST,
-- service_role, or the owner of a security-definer function such as the auto-hide trigger).
create or replace function public.profiles_protect_moderation()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'INSERT' then
    new.posting_suspended_at := null;
    return new;
  end if;
  if new.posting_suspended_at is distinct from old.posting_suspended_at then
    raise exception 'posting_suspended_at is server-managed' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_profiles_protect_moderation on public.profiles;
create trigger trg_profiles_protect_moderation
  before insert or update on public.profiles
  for each row execute function public.profiles_protect_moderation();

/** True when the member accepted the house rules and is not suspended from posting. */
create or replace function public.can_post(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = p and terms_accepted_at is not null and posting_suspended_at is null)
$$;

-- ── 2. Blocks ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.member_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint member_blocks_not_self check (blocker_id <> blocked_id)
);
create index if not exists member_blocks_blocked_idx on public.member_blocks (blocked_id);

alter table public.member_blocks enable row level security;
revoke all on public.member_blocks from anon;
revoke all on public.member_blocks from authenticated;
grant select, insert, delete on public.member_blocks to authenticated;

drop policy if exists member_blocks_own_read on public.member_blocks;
create policy member_blocks_own_read on public.member_blocks
  for select to authenticated using (blocker_id = auth.uid());
drop policy if exists member_blocks_own_insert on public.member_blocks;
create policy member_blocks_own_insert on public.member_blocks
  for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists member_blocks_own_delete on public.member_blocks;
create policy member_blocks_own_delete on public.member_blocks
  for delete to authenticated using (blocker_id = auth.uid());

/** Either member blocked the other. Security definer: the blocked side can't read the block row itself. */
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select a is not null and b is not null and a <> b and exists (
    select 1 from public.member_blocks m
     where (m.blocker_id = a and m.blocked_id = b) or (m.blocker_id = b and m.blocked_id = a))
$$;

-- Profiles of blocked members disappear for both sides (the Lounge floor, authors on posts…).
drop policy if exists profiles_not_blocked on public.profiles;
create policy profiles_not_blocked on public.profiles as restrictive
  for select using (id = auth.uid() or not public.is_blocked_between(auth.uid(), id));

-- ── 3. Hideable content: moderation columns, protection, visibility, terms on insert ───────
-- Security INVOKER (see profiles_protect_moderation): staff writes and the auto-hide trigger pass.
create or replace function public.ugc_protect_moderation()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'INSERT' then
    new.moderation_hidden := false;
    new.moderation_note := null;
    new.moderated_at := null;
    return new;
  end if;
  if new.moderation_hidden is distinct from old.moderation_hidden
     or new.moderation_note is distinct from old.moderation_note
     or new.moderated_at is distinct from old.moderated_at then
    raise exception 'moderation fields are staff-managed' using errcode = '42501';
  end if;
  return new;
end $$;

do $$
declare
  t record;
begin
  for t in select * from (values
      ('posts', 'author_id', true),
      ('vip_posts', 'author_id', true),
      ('exchange_listings', 'seller_id', true),
      ('club_tables', 'host_id', true),
      ('outings', 'host_id', false)
    ) as x(tbl, owner_col, needs_terms)
  loop
    continue when to_regclass('public.' || t.tbl) is null;
    execute format('alter table public.%I
                      add column if not exists moderation_hidden boolean not null default false,
                      add column if not exists moderation_note text,
                      add column if not exists moderated_at timestamptz', t.tbl);
    execute format('drop trigger if exists trg_%s_protect_moderation on public.%I', t.tbl, t.tbl);
    execute format('create trigger trg_%s_protect_moderation before insert or update on public.%I
                      for each row execute function public.ugc_protect_moderation()', t.tbl, t.tbl);
    -- Hidden rows and blocked members' rows drop out of every member read; authors keep their own.
    execute format('drop policy if exists %I on public.%I', t.tbl || '_moderation_visible', t.tbl);
    execute format('create policy %I on public.%I as restrictive for select
                      using (%I = auth.uid()
                             or (moderation_hidden = false and not public.is_blocked_between(auth.uid(), %I)))',
                   t.tbl || '_moderation_visible', t.tbl, t.owner_col, t.owner_col);
    execute format('drop policy if exists %I on public.%I', t.tbl || '_terms_required', t.tbl);
    if t.needs_terms then
      execute format('create policy %I on public.%I as restrictive for insert
                        with check (public.can_post(auth.uid()))', t.tbl || '_terms_required', t.tbl);
    end if;
  end loop;
end $$;

-- ── 4. Reports ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.content_reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.profiles(id) on delete cascade,
  target_kind     text not null check (target_kind in ('post', 'vip_post', 'profile', 'listing', 'club_table', 'outing', 'nova_reply')),
  target_id       text not null check (char_length(target_id) between 1 and 200),
  target_owner_id uuid references public.profiles(id) on delete set null,
  reason          text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'violence', 'self_harm', 'illegal', 'impersonation', 'scam', 'other')),
  note            text check (note is null or char_length(note) <= 500),
  status          text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolution      text check (resolution is null or char_length(resolution) <= 500),
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create unique index if not exists content_reports_one_open
  on public.content_reports (reporter_id, target_kind, target_id) where status = 'open';
create index if not exists content_reports_queue_idx on public.content_reports (status, created_at);
create index if not exists content_reports_target_idx on public.content_reports (target_kind, target_id);

alter table public.content_reports enable row level security;
revoke all on public.content_reports from anon;
revoke all on public.content_reports from authenticated;
-- Column grants: a reporter never reads target_owner_id (a Game Room host stays anonymous) or who reviewed it.
grant insert (reporter_id, target_kind, target_id, reason, note) on public.content_reports to authenticated;
grant select (id, reporter_id, target_kind, target_id, reason, note, status, created_at) on public.content_reports to authenticated;

drop policy if exists content_reports_own_insert on public.content_reports;
create policy content_reports_own_insert on public.content_reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'open');
drop policy if exists content_reports_own_read on public.content_reports;
create policy content_reports_own_read on public.content_reports
  for select to authenticated using (reporter_id = auth.uid());

/** Table + owner column behind a report kind (null for kinds with no member-owned row). */
create or replace function public.moderation_target_table(kind text)
returns table (tbl text, owner_col text) language sql immutable as $$
  select x.tbl, x.owner_col from (values
    ('post', 'posts', 'author_id'), ('vip_post', 'vip_posts', 'author_id'), ('profile', 'profiles', 'id'),
    ('listing', 'exchange_listings', 'seller_id'), ('club_table', 'club_tables', 'host_id'), ('outing', 'outings', 'host_id')
  ) as x(k, tbl, owner_col) where x.k = kind
$$;

/** The member who owns a reported item, read past RLS (club tables are host-only, for instance). */
create or replace function public.moderation_target_owner(kind text, target text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  m record;
  owner uuid;
begin
  if target !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  select * into m from public.moderation_target_table(kind);
  if not found or to_regclass('public.' || m.tbl) is null then return null; end if;
  execute format('select %I from public.%I where id = $1', m.owner_col, m.tbl) into owner using target::uuid;
  return owner;
end $$;

create or replace function public.content_reports_prepare()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recent int;
begin
  -- Definer function: current_user is the owner here, so read the caller's role setting instead.
  if coalesce(current_setting('role', true), '') in ('anon', 'authenticated') then
    new.status := 'open';
    new.resolution := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.created_at := now();
    select count(*) into recent from public.content_reports
     where reporter_id = new.reporter_id and created_at > now() - interval '1 day';
    if recent >= 50 then
      raise exception 'report_rate_limited' using errcode = '54000';
    end if;
  end if;
  if new.target_kind = 'nova_reply' then
    new.target_owner_id := null;              -- Nova's own words: reviewed by staff, no member owner
    return new;
  end if;
  new.target_owner_id := public.moderation_target_owner(new.target_kind, new.target_id);
  if new.target_owner_id is null then
    raise exception 'report_target_not_found' using errcode = 'P0002';
  end if;
  if new.target_owner_id = new.reporter_id then
    raise exception 'report_own_content' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists trg_content_reports_prepare on public.content_reports;
create trigger trg_content_reports_prepare before insert on public.content_reports
  for each row execute function public.content_reports_prepare();

-- Three different members with open reports on one item → it is hidden pending staff review.
create or replace function public.content_reports_autohide()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m record;
  reporters int;
begin
  if new.status <> 'open' or new.target_kind in ('profile', 'nova_reply') then return null; end if;
  select * into m from public.moderation_target_table(new.target_kind);
  if not found or to_regclass('public.' || m.tbl) is null then return null; end if;
  select count(distinct r.reporter_id) into reporters from public.content_reports r
   where r.target_kind = new.target_kind and r.target_id = new.target_id and r.status = 'open'
     and r.reporter_id is distinct from r.target_owner_id;
  if reporters >= 3 then
    execute format('update public.%I set moderation_hidden = true, moderated_at = now(),
                      moderation_note = ''auto: reported by 3+ members, pending review''
                    where id = $1 and moderation_hidden = false', m.tbl)
      using new.target_id::uuid;
  end if;
  return null;
end $$;
drop trigger if exists trg_content_reports_autohide on public.content_reports;
create trigger trg_content_reports_autohide after insert on public.content_reports
  for each row execute function public.content_reports_autohide();

/**
 * Block whoever owns a reported item without revealing who that is (the Game Room board never shows
 * host ids). Returns true when a block now exists; false when there is no member owner to block.
 */
create or replace function public.block_content_owner(kind text, target text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  owner uuid;
begin
  if me is null then raise exception 'signed_out' using errcode = '42501'; end if;
  owner := public.moderation_target_owner(kind, target);
  if owner is null or owner = me then return false; end if;
  insert into public.member_blocks (blocker_id, blocked_id) values (me, owner) on conflict do nothing;
  return true;
end $$;

-- ── 5. The Game Room board leaves out hidden tables and blocked hosts (same columns as before) ──
do $$
begin
  if to_regclass('public.club_tables') is null or to_regclass('public.club_seats') is null then return; end if;
  execute $f$
    create or replace function public.club_board()
    returns table (
      id uuid, game text, title text, note text, starts_at timestamptz, seats integer,
      seats_taken integer, seated boolean, is_host boolean, host_name text
    )
    language sql stable security definer set search_path = public as $b$
      select t.id, t.game, t.title, t.note, t.starts_at, t.seats,
             (select count(*)::integer from public.club_seats s where s.table_id = t.id),
             exists (select 1 from public.club_seats s where s.table_id = t.id and s.member_id = auth.uid()),
             t.host_id = auth.uid(),
             coalesce(nullif(btrim(p.display_name), ''), 'A member')
        from public.club_tables t
        left join public.profiles p on p.id = t.host_id
       where auth.uid() is not null
         and t.status = 'open'
         and t.starts_at > now() - interval '6 hours'
         and (t.host_id = auth.uid()
              or (not t.moderation_hidden and not public.is_blocked_between(auth.uid(), t.host_id)))
       order by t.starts_at
       limit 100
    $b$
  $f$;
  revoke execute on function public.club_board() from public, anon;
  grant execute on function public.club_board() to authenticated;
end $$;

-- ── Function privileges ────────────────────────────────────────────────────────────────────
-- Policy helpers must be callable by every role a policy is evaluated for.
revoke execute on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to anon, authenticated, service_role;
revoke execute on function public.can_post(uuid) from public;
grant execute on function public.can_post(uuid) to anon, authenticated, service_role;
revoke execute on function public.block_content_owner(text, text) from public, anon;
grant execute on function public.block_content_owner(text, text) to authenticated, service_role;
revoke execute on function public.moderation_target_owner(text, text) from public, anon, authenticated;
grant execute on function public.moderation_target_owner(text, text) to service_role;
revoke execute on function public.content_reports_prepare() from public, anon, authenticated;
revoke execute on function public.content_reports_autohide() from public, anon, authenticated;
