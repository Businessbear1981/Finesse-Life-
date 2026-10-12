-- Clubhouse / Game Room: tables members host (poker, spades, dominoes, rummy, the book) and the seats
-- other members take. Points only — no money moves through the app, and no betting partner is connected.
--
-- Reads go through club_board() (security definer), which returns each open table with its seat count,
-- whether the caller is seated / hosting, and the host's display name — never the list of who is seated.
-- The seat cap is enforced in the database (row lock on the table, then count), so two members racing
-- for the last chair cannot both get it.

create table if not exists public.club_tables (
  id         uuid primary key default gen_random_uuid(),
  host_id    uuid not null references public.profiles(id) on delete cascade,
  game       text not null check (game in ('poker', 'spades', 'dominoes', 'rummy', 'book')),
  title      text not null check (char_length(title) between 1 and 80),
  note       text check (note is null or char_length(note) <= 200),
  starts_at  timestamptz not null,
  seats      integer not null,
  status     text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint club_tables_seats_for_game check (
    seats >= 2 and seats <= case game when 'poker' then 10 when 'spades' then 4 when 'dominoes' then 4
                                      when 'rummy' then 6 else 40 end
  )
);
create index if not exists club_tables_open_idx on public.club_tables (starts_at) where status = 'open';
create index if not exists club_tables_host_idx on public.club_tables (host_id);

create table if not exists public.club_seats (
  table_id  uuid not null references public.club_tables(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (table_id, member_id)
);
create index if not exists club_seats_member_idx on public.club_seats (member_id);

alter table public.club_tables enable row level security;
alter table public.club_seats enable row level security;
revoke all on public.club_tables from anon;
revoke all on public.club_seats from anon;
revoke all on public.club_tables from authenticated;
revoke all on public.club_seats from authenticated;
grant select, insert, update, delete on public.club_tables to authenticated;
grant select, insert, delete on public.club_seats to authenticated;

-- Hosts manage their own tables. Everyone else reads the board through club_board().
do $$ begin
  create policy club_tables_host_read on public.club_tables
    for select to authenticated using (host_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy club_tables_host_insert on public.club_tables
    for insert to authenticated with check (host_id = auth.uid() and status = 'open');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy club_tables_host_update on public.club_tables
    for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy club_tables_host_delete on public.club_tables
    for delete to authenticated using (host_id = auth.uid());
exception when duplicate_object then null; end $$;

-- A member takes or gives up only their own seat.
do $$ begin
  create policy club_seats_own_read on public.club_seats
    for select to authenticated using (member_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy club_seats_own_take on public.club_seats
    for insert to authenticated with check (member_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy club_seats_own_leave on public.club_seats
    for delete to authenticated using (member_id = auth.uid());
exception when duplicate_object then null; end $$;

-- New tables: start in the next 90 days, and a member hosts at most 5 open upcoming tables.
create or replace function public.club_tables_insert_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.starts_at < now() - interval '5 minutes' or new.starts_at > now() + interval '90 days' then
    raise exception 'club_bad_start' using errcode = '22023';
  end if;
  if (select count(*) from public.club_tables t
       where t.host_id = new.host_id and t.status = 'open' and t.starts_at > now() - interval '6 hours') >= 5 then
    raise exception 'club_host_limit' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists club_tables_insert_guard on public.club_tables;
create trigger club_tables_insert_guard before insert on public.club_tables
  for each row execute function public.club_tables_insert_guard();

-- The host is seated at their own table.
create or replace function public.club_tables_seat_host()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.club_seats (table_id, member_id) values (new.id, new.host_id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists club_tables_seat_host on public.club_tables;
create trigger club_tables_seat_host after insert on public.club_tables
  for each row execute function public.club_tables_seat_host();

-- Edits: the host never changes, and seats can't drop below the members already seated.
create or replace function public.club_tables_update_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.host_id <> old.host_id or new.game <> old.game then
    raise exception 'club_table_immutable' using errcode = '42501';
  end if;
  if new.seats < (select count(*) from public.club_seats s where s.table_id = new.id) then
    raise exception 'club_seats_below_taken' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists club_tables_update_guard on public.club_tables;
create trigger club_tables_update_guard before update on public.club_tables
  for each row execute function public.club_tables_update_guard();

-- Seat cap: lock the table row, then count. Closed or long-past tables take no one.
create or replace function public.club_seats_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t record;
  taken integer;
begin
  select seats, status, starts_at into t from public.club_tables where id = new.table_id for update;
  if not found then
    raise exception 'club_table_not_found' using errcode = 'P0002';
  end if;
  if t.status <> 'open' or t.starts_at < now() - interval '6 hours' then
    raise exception 'club_table_closed' using errcode = '23514';
  end if;
  select count(*) into taken from public.club_seats where table_id = new.table_id;
  if taken >= t.seats then
    raise exception 'club_table_full' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists club_seats_guard on public.club_seats;
create trigger club_seats_guard before insert on public.club_seats
  for each row execute function public.club_seats_guard();

-- The board every member sees: open tables from 6 hours ago onwards, counts only.
create or replace function public.club_board()
returns table (
  id uuid, game text, title text, note text, starts_at timestamptz, seats integer,
  seats_taken integer, seated boolean, is_host boolean, host_name text
)
language sql stable security definer set search_path = public as $$
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
   order by t.starts_at
   limit 100
$$;

revoke execute on function public.club_board() from public, anon;
revoke execute on function public.club_tables_insert_guard() from public, anon, authenticated;
revoke execute on function public.club_tables_seat_host() from public, anon, authenticated;
revoke execute on function public.club_tables_update_guard() from public, anon, authenticated;
revoke execute on function public.club_seats_guard() from public, anon, authenticated;
grant execute on function public.club_board() to authenticated;
