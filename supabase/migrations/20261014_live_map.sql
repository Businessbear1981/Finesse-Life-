-- Live map (the hologram city): opt-in member presence + member events.
--
-- Privacy floor (members are 18–27 and this is a location feature, so it is strict by design):
--   * Opt-in. Nothing is stored until the member turns sharing on (map_ping); map_ghost deletes it.
--   * Coarse. The server never stores the raw fix — only a cell snapped to a ~200 m grid.
--   * Anonymous. map_snapshot returns position + colour kind only: no id, name or avatar.
--     Dots inside one cell are spread by a hash that changes with the cell, so a dot can't be
--     followed across the city by its offset.
--   * Fresh. Presence older than 15 minutes is never returned and is purged on every ping.
--   * Members only. Both tables deny anon/authenticated direct access to presence; reads go
--     through SECURITY DEFINER RPCs that require a signed-in member.
--   * Account deletion cascades (FK on profiles).

create table if not exists public.map_presence (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  cell_lat  double precision not null,
  cell_lng  double precision not null,
  kind      text not null check (kind in ('f', 'm', 'x')),
  seen_at   timestamptz not null default now()
);
alter table public.map_presence enable row level security;
revoke all on public.map_presence from anon, authenticated;
create index if not exists map_presence_seen_idx on public.map_presence (seen_at);
create index if not exists map_presence_cell_idx on public.map_presence (cell_lat, cell_lng);

create table if not exists public.map_events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 80),
  venue      text check (venue is null or char_length(venue) <= 80),
  lat        double precision not null check (lat between -85 and 85),
  lng        double precision not null check (lng between -180 and 180),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint map_events_window check (ends_at > starts_at)
);
alter table public.map_events enable row level security;
revoke insert, update, delete on public.map_events from anon, authenticated;
create index if not exists map_events_time_idx on public.map_events (ends_at);

-- Members read events that haven't ended; writes are service-role (staff API) only.
do $$ begin
  create policy map_events_member_read on public.map_events
    for select to authenticated using (ends_at > now());
exception when duplicate_object then null; end $$;

-- Grid size in degrees (~220 m of latitude).
create or replace function public.map_cell(p double precision)
returns double precision language sql immutable as $$ select round(p / 0.002) * 0.002 $$;

-- Share (or refresh) the caller's presence. Colour comes from the member's own profile.
create or replace function public.map_ping(p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  g text;
begin
  if uid is null then raise exception 'signed_out' using errcode = '28000'; end if;
  if p_lat is null or p_lng is null or p_lat not between -85 and 85 or p_lng not between -180 and 180
     or p_lat = 'NaN'::float8 or p_lng = 'NaN'::float8 then
    raise exception 'bad_location' using errcode = '22023';
  end if;
  -- to_jsonb keeps this working whichever profiles migration defined (or omitted) gender.
  select to_jsonb(p) ->> 'gender' into g from public.profiles p where p.id = uid;
  if not found then raise exception 'no_profile' using errcode = '28000'; end if;

  delete from public.map_presence where seen_at < now() - interval '15 minutes';
  insert into public.map_presence (member_id, cell_lat, cell_lng, kind, seen_at)
  values (uid, public.map_cell(p_lat), public.map_cell(p_lng),
          case g when 'feminine' then 'f' when 'masculine' then 'm' else 'x' end, now())
  on conflict (member_id) do update
    set cell_lat = excluded.cell_lat, cell_lng = excluded.cell_lng, kind = excluded.kind, seen_at = now();
end $$;

-- Stop sharing: removes the caller's presence immediately.
create or replace function public.map_ghost()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'signed_out' using errcode = '28000'; end if;
  delete from public.map_presence where member_id = auth.uid();
end $$;

-- Is the caller currently sharing? (drives the toggle)
create or replace function public.map_sharing()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.map_presence
                 where member_id = auth.uid() and seen_at >= now() - interval '15 minutes')
$$;

-- Anonymous dots in a bounding box (max ~1.5° per side, max 3000 dots). Excludes the caller,
-- whose own dot the client draws from the device fix.
create or replace function public.map_snapshot(
  p_min_lat double precision, p_min_lng double precision,
  p_max_lat double precision, p_max_lng double precision)
returns table (lat double precision, lng double precision, kind text)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'signed_out' using errcode = '28000'; end if;
  if p_min_lat is null or p_min_lng is null or p_max_lat is null or p_max_lng is null
     or p_max_lat <= p_min_lat or p_max_lng <= p_min_lng
     or p_max_lat - p_min_lat > 1.5 or p_max_lng - p_min_lng > 1.5 then
    raise exception 'bad_bbox' using errcode = '22023';
  end if;
  return query
    select
      mp.cell_lat + ((('x' || substr(md5(mp.member_id::text || mp.cell_lat || mp.cell_lng), 1, 4))::bit(16)::int) / 65535.0 - 0.5) * 0.0018,
      mp.cell_lng + ((('x' || substr(md5(mp.member_id::text || mp.cell_lng || mp.cell_lat), 5, 4))::bit(16)::int) / 65535.0 - 0.5) * 0.0018,
      mp.kind
    from public.map_presence mp
    where mp.seen_at >= now() - interval '15 minutes'
      and mp.member_id <> auth.uid()
      and mp.cell_lat between p_min_lat and p_max_lat
      and mp.cell_lng between p_min_lng and p_max_lng
    order by mp.seen_at desc
    limit 3000;
end $$;

revoke all on function public.map_ping(double precision, double precision) from public, anon;
revoke all on function public.map_ghost() from public, anon;
revoke all on function public.map_sharing() from public, anon;
revoke all on function public.map_snapshot(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.map_ping(double precision, double precision) to authenticated;
grant execute on function public.map_ghost() to authenticated;
grant execute on function public.map_sharing() to authenticated;
grant execute on function public.map_snapshot(double precision, double precision, double precision, double precision) to authenticated;
grant select on public.map_events to authenticated;
