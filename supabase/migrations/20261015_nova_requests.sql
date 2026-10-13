-- Nova requests: the orchestrator hub.
--
-- Nova (or a room) drafts a request → the member confirms → the server dispatches it to the right
-- agent (scout, stylist, price-hunter, procurement) or to a Nova planner persona → the result is stored
-- here and a Diary item points at it. Members can read their own requests and create drafts; every
-- status/result change goes through the server (service role) after an ownership check, so a member
-- can never forge an agent result or a status.
--
-- Honesty: a "plan" (table, ride, trip, evening) is Nova's drafted plan. Nothing is booked with a
-- partner here; result.booked is always false until a partner adapter exists.

create table if not exists public.nova_requests (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('find_item', 'price_check', 'style_for_occasion', 'procurement', 'plan')),
  title       text not null check (char_length(title) between 1 and 140),
  details     jsonb not null default '{}'::jsonb check (octet_length(details::text) <= 8000),
  room        text check (room is null or char_length(room) <= 40),
  status      text not null default 'drafted'
              check (status in ('drafted', 'running', 'ready', 'failed', 'done', 'cancelled')),
  result      jsonb,
  error       text check (error is null or char_length(error) <= 300),
  diary_item_id uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint nova_requests_result_only_when_ready check (result is null or status in ('ready', 'done', 'cancelled'))
);
create index if not exists nova_requests_member_idx on public.nova_requests (member_id, created_at desc);

alter table public.nova_requests enable row level security;
revoke all on public.nova_requests from anon;
revoke update, delete on public.nova_requests from authenticated;

do $$ begin
  create policy nova_requests_own_read on public.nova_requests
    for select to authenticated using (member_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Members may only create fresh drafts for themselves (no result, no error, no diary link).
do $$ begin
  create policy nova_requests_own_draft on public.nova_requests
    for insert to authenticated
    with check (member_id = auth.uid() and status = 'drafted' and result is null and error is null and diary_item_id is null);
exception when duplicate_object then null; end $$;

create or replace function public.nova_requests_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists nova_requests_touch on public.nova_requests;
create trigger nova_requests_touch before update on public.nova_requests
  for each row execute function public.nova_requests_touch();

-- Allowed transitions (enforced for everyone, including the server).
create or replace function public.nova_requests_transition_guard()
returns trigger language plpgsql as $$
begin
  if new.member_id <> old.member_id or new.kind <> old.kind then
    raise exception 'nova_request_immutable' using errcode = '42501';
  end if;
  if new.status <> old.status and not (
       (old.status = 'drafted' and new.status in ('running', 'cancelled'))
    or (old.status = 'running' and new.status in ('ready', 'failed'))
    or (old.status = 'failed'  and new.status in ('running', 'cancelled'))
    or (old.status = 'ready'   and new.status in ('done', 'cancelled'))
  ) then
    raise exception 'nova_request_bad_transition % -> %', old.status, new.status using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists nova_requests_transition_guard on public.nova_requests;
create trigger nova_requests_transition_guard before update on public.nova_requests
  for each row execute function public.nova_requests_transition_guard();

grant select, insert on public.nova_requests to authenticated;
