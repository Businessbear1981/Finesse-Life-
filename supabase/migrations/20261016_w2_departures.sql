-- Departures: the member's trips. A trip is a plan the member composes (with Nova's help via the
-- nova_requests hub, topic 'trip'). Nothing is booked: no flight, hotel or ride partner is connected,
-- so there is deliberately no "booked" state here — only draft, planned (Nova's plan saved) and cancelled.

create table if not exists public.trips (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.profiles(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 120),
  origin          text check (origin is null or char_length(origin) <= 120),
  destination     text not null check (char_length(destination) between 1 and 120),
  depart_at       timestamptz,
  return_at       timestamptz,
  party_size      integer not null default 1 check (party_size between 1 and 40),
  status          text not null default 'draft' check (status in ('draft', 'planned', 'cancelled')),
  brief           text check (brief is null or char_length(brief) <= 600),
  plan            text check (plan is null or char_length(plan) <= 8000),
  nova_request_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint trips_return_after_depart check (return_at is null or depart_at is null or return_at >= depart_at),
  constraint trips_planned_has_plan check (status <> 'planned' or plan is not null)
);
create index if not exists trips_member_idx on public.trips (member_id, depart_at nulls last, created_at desc);

alter table public.trips enable row level security;
revoke all on public.trips from anon;
grant select, insert, update, delete on public.trips to authenticated;

do $$ begin
  create policy trips_owner on public.trips
    for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
exception when duplicate_object then null; end $$;

create or replace function public.trips_touch()
returns trigger language plpgsql as $$
begin
  if new.member_id <> old.member_id then
    raise exception 'trip_owner_immutable' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before update on public.trips
  for each row execute function public.trips_touch();
