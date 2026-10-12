-- Finesse — The Gym (26): the member's own week — classes, training and recovery they plan for themselves.
-- Replaces the sample "my classes / my trainer / recovery" cards for signed-in members. A planned session is the
-- member's note, not a booking: no studio, trainer or spa is contacted from here. Idempotent.

create table if not exists public.gym_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  day         date not null,
  at_time     text check (at_time is null or at_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  kind        text not null default 'training' check (kind in ('class', 'training', 'recovery', 'other')),
  title       text not null check (char_length(title) between 1 and 120),
  venue       text check (venue is null or char_length(venue) <= 120),
  notes       text check (notes is null or char_length(notes) <= 500),
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_gym_sessions_user_day on public.gym_sessions (user_id, day);

alter table public.gym_sessions enable row level security;
drop policy if exists gym_sessions_owner on public.gym_sessions;
create policy gym_sessions_owner on public.gym_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.gym_sessions from anon;
grant select, insert, update, delete on public.gym_sessions to authenticated;
