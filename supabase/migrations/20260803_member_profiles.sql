-- Durable behavioral-profile cache. buildBehavioralProfile() in
-- src/lib/intelligence/behavioral.ts previously recomputed from up to 250 raw
-- intelligence_signals rows on every single call — no persistence at all.
-- This table stores the last computed profile so it can be read cheaply and
-- gives future background/self-learning processes something durable to
-- update, instead of everything being recomputed at request time.
create table if not exists public.member_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  profile    jsonb not null default '{}'::jsonb,
  version    integer not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_member_profiles_user on public.member_profiles (user_id);
create index if not exists idx_member_profiles_updated on public.member_profiles (updated_at desc);

alter table public.member_profiles enable row level security;

create policy "member_profiles_own_read" on public.member_profiles
  for select to authenticated using (auth.uid() = user_id);

create policy "member_profiles_own_write" on public.member_profiles
  for insert to authenticated with check (auth.uid() = user_id);

create policy "member_profiles_own_update" on public.member_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
