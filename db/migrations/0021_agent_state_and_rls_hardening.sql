-- Ported from supabase/migrations/20260803_agent_state_and_rls_hardening.sql by scripts/port-supabase-migrations.mjs
-- Generic state store for the standing-agent architecture concept (see
-- docs/decisions/2026-08-01_new-feature-concepts.json,
-- multi-agent-operations-architecture) — scope is either a user_id (per-member
-- agent state) or the literal string 'global' (room-level/shared state).
-- No table exists yet for this; it's new, not a fix.
create table if not exists public.agent_state (
  id         uuid primary key default gen_random_uuid(),
  scope      text not null,
  agent_key  text not null,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (scope, agent_key)
);
alter table public.agent_state add column if not exists id         uuid  default gen_random_uuid();
alter table public.agent_state add column if not exists scope      text not null;
alter table public.agent_state add column if not exists agent_key  text not null;
alter table public.agent_state add column if not exists state      jsonb not null default '{}'::jsonb;
alter table public.agent_state add column if not exists updated_at timestamptz not null default now();
alter table public.agent_state add column if not exists created_at timestamptz not null default now();


create index if not exists idx_agent_state_scope on public.agent_state (scope);

alter table public.agent_state enable row level security;
alter table public.agent_state force row level security;

-- Members can read their own per-member agent state
create policy "agent_state_own_read" on public.agent_state
  for select to app_user using (scope = app.uid()::text);

-- Members can read global/shared room state
create policy "agent_state_global_read" on public.agent_state
  for select to app_user using (scope = 'global');

-- No insert/update/delete policies for authenticated users — all writes go
-- through the service role (background agents / API routes), same pattern
-- intelligence_signals already uses.

-- Hardening on member_profiles: force RLS even for the table owner.
alter table public.member_profiles force row level security;

-- Deliberately NOT adding an authenticated insert policy to
-- intelligence_signals: it already has isig_own_read and intentionally no
-- member-facing insert policy (writes are service-role only, via emit()).
-- Adding one would let members forge their own behavioral signals.
