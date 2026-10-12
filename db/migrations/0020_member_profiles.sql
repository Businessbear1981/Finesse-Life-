-- Ported from supabase/migrations/20260803_member_profiles.sql by scripts/port-supabase-migrations.mjs
-- Durable behavioral-profile cache. buildBehavioralProfile() in
-- src/lib/intelligence/behavioral.ts previously recomputed from up to 250 raw
-- intelligence_signals rows on every single call — no persistence at all.
-- This table stores the last computed profile so it can be read cheaply and
-- gives future background/self-learning processes something durable to
-- update, instead of everything being recomputed at request time.
create table if not exists public.member_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references app.users(id) on delete cascade,
  profile    jsonb not null default '{}'::jsonb,
  version    integer not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.member_profiles add column if not exists id         uuid  default gen_random_uuid();
alter table public.member_profiles add column if not exists user_id    uuid not null  references app.users(id) on delete cascade;
alter table public.member_profiles add column if not exists profile    jsonb not null default '{}'::jsonb;
alter table public.member_profiles add column if not exists version    integer not null default 1;
alter table public.member_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.member_profiles add column if not exists created_at timestamptz not null default now();


create index if not exists idx_member_profiles_user on public.member_profiles (user_id);
create index if not exists idx_member_profiles_updated on public.member_profiles (updated_at desc);

alter table public.member_profiles enable row level security;

create policy "member_profiles_own_read" on public.member_profiles
  for select to app_user using (app.uid() = user_id);

create policy "member_profiles_own_write" on public.member_profiles
  for insert to app_user with check (app.uid() = user_id);

create policy "member_profiles_own_update" on public.member_profiles
  for update to app_user using (app.uid() = user_id) with check (app.uid() = user_id);
