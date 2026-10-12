-- Ported from supabase/migrations/20260607000001_finesse_schema.sql by scripts/port-supabase-migrations.mjs
-- ============================================================
-- FINESSE — Core Schema
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references app.users(id) on delete cascade,
  email           text,
  display_name    text,
  gender          text check (gender in ('masculine', 'feminine')),
  avatar_url      text,
  onboarding_done boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.profiles add column if not exists id              uuid  references app.users(id) on delete cascade;
alter table public.profiles add column if not exists email           text;
alter table public.profiles add column if not exists display_name    text;
alter table public.profiles add column if not exists gender          text check (gender in ('masculine', 'feminine'));
alter table public.profiles add column if not exists avatar_url      text;
alter table public.profiles add column if not exists onboarding_done boolean not null default false;
alter table public.profiles add column if not exists created_at      timestamptz not null default now();
alter table public.profiles add column if not exists updated_at      timestamptz not null default now();


alter table public.profiles enable row level security;
create policy "Users see own profile"    on public.profiles for select using (app.uid() = id);
create policy "Users update own profile" on public.profiles for update using (app.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (app.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on app.users;
create trigger on_auth_user_created
  after insert on app.users
  for each row execute procedure public.handle_new_user();

-- ── Concierge Avatars ────────────────────────────────────────
create table if not exists public.concierge_avatars (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'Concierge',
  gender      text check (gender in ('feminine', 'masculine', 'neutral')),
  look        text,
  voice_id    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);
alter table public.concierge_avatars add column if not exists id          uuid  default uuid_generate_v4();
alter table public.concierge_avatars add column if not exists user_id     uuid not null references public.profiles(id) on delete cascade;
alter table public.concierge_avatars add column if not exists name        text not null default 'Concierge';
alter table public.concierge_avatars add column if not exists gender      text check (gender in ('feminine', 'masculine', 'neutral'));
alter table public.concierge_avatars add column if not exists look        text;
alter table public.concierge_avatars add column if not exists voice_id    text;
alter table public.concierge_avatars add column if not exists created_at  timestamptz not null default now();
alter table public.concierge_avatars add column if not exists updated_at  timestamptz not null default now();


alter table public.concierge_avatars enable row level security;
create policy "Users manage own avatar" on public.concierge_avatars
  using (app.uid() = user_id) with check (app.uid() = user_id);

-- ── Onboarding State ─────────────────────────────────────────
create table if not exists public.onboarding_state (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  step_completed      int not null default 0,  -- 0-7
  extension_installed boolean not null default false,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.onboarding_state add column if not exists user_id             uuid  references public.profiles(id) on delete cascade;
alter table public.onboarding_state add column if not exists step_completed      int not null default 0;
alter table public.onboarding_state add column if not exists extension_installed boolean not null default false;
alter table public.onboarding_state add column if not exists completed_at        timestamptz;
alter table public.onboarding_state add column if not exists created_at          timestamptz not null default now();
alter table public.onboarding_state add column if not exists updated_at          timestamptz not null default now();


alter table public.onboarding_state enable row level security;
create policy "Users manage own onboarding" on public.onboarding_state
  using (app.uid() = user_id) with check (app.uid() = user_id);

-- ── Platform Integrations Catalog ────────────────────────────
-- (mirrors Payload integrations pattern — vendor list + schema)
create table if not exists public.integrations (
  vendor        text primary key,
  display_name  text not null,
  category      text not null,  -- 'social','ai','financial','media','travel','comms','music','payments'
  icon          text,
  description   text,
  auth_type     text not null default 'api_key',  -- 'oauth' | 'api_key'
  fields_schema jsonb not null default '[]',
  created_at    timestamptz not null default now()
);
alter table public.integrations add column if not exists vendor        text ;
alter table public.integrations add column if not exists display_name  text not null;
alter table public.integrations add column if not exists category      text not null;
alter table public.integrations add column if not exists icon          text;
alter table public.integrations add column if not exists description   text;
alter table public.integrations add column if not exists auth_type     text not null default 'api_key';
alter table public.integrations add column if not exists fields_schema jsonb not null default '[]';
alter table public.integrations add column if not exists created_at    timestamptz not null default now();


-- Seed the integration catalog
insert into public.integrations (vendor, display_name, category, icon, description, auth_type) values
  -- AI
  ('claude',       'Claude',       'ai',       '◈', 'Anthropic Claude — concierge brain',      'api_key'),
  ('grok',         'Grok',         'ai',       '✦', 'xAI Grok — real-time intelligence',       'api_key'),
  ('chatgpt',      'ChatGPT',      'ai',       '◆', 'OpenAI GPT — second opinion engine',      'api_key'),
  -- Media Generation
  ('higgsfield',   'Higgsfield',   'media',    '▶', 'AI video generation',                     'api_key'),
  ('elevenlabs',   'ElevenLabs',   'media',    '🔊','AI voice synthesis',                      'api_key'),
  ('suno',         'Suno',         'media',    '♫', 'AI music generation',                     'api_key'),
  ('meshy',        'Meshy',        'media',    '△', '3D model generation',                     'api_key'),
  -- Social
  ('instagram',    'Instagram',    'social',   '◎', 'Instagram distribution',                  'oauth'),
  ('tiktok',       'TikTok',       'social',   '♪', 'TikTok distribution',                     'oauth'),
  ('snapchat',     'Snapchat',     'social',   '👻','Snapchat distribution',                   'oauth'),
  ('youtube',      'YouTube',      'social',   '▷', 'YouTube distribution',                    'oauth'),
  ('pinterest',    'Pinterest',    'social',   '📌','Pinterest distribution',                  'oauth'),
  -- Financial
  ('plaid',        'Plaid',        'financial','◇', 'Bank account connection',                 'oauth'),
  ('alpaca',       'Alpaca',       'financial','▲', 'Trading & brokerage',                     'api_key'),
  ('stripe',       'Stripe',       'payments', '💳','Payment processing',                      'api_key'),
  -- Music
  ('spotify',      'Spotify',      'music',    '♬', 'Music integration',                       'oauth'),
  -- Travel
  ('amadeus',      'Amadeus',      'travel',   '✈', 'Flights, hotels & activities',            'api_key'),
  -- Comms
  ('twilio',       'Twilio',       'comms',    '📱','SMS & voice',                             'api_key'),
  ('sendgrid',     'SendGrid',     'comms',    '✉', 'Transactional email',                     'api_key'),
  -- Maps
  ('mapbox',       'Mapbox',       'maps',     '🗺','Map rendering',                           'api_key'),
  ('google_maps',  'Google Maps',  'maps',     '📍','Places & geocoding',                      'api_key')
on conflict (vendor) do nothing;

-- ── User Integrations (per-user connection state) ────────────
create table if not exists public.user_integrations (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  vendor            text not null references public.integrations(vendor),
  enabled           boolean not null default false,
  oauth_token       text,   -- encrypted at app layer
  refresh_token     text,   -- encrypted at app layer
  token_expires_at  timestamptz,
  credentials       jsonb,  -- encrypted API keys at app layer
  last_tested_at    timestamptz,
  last_test_status  text check (last_test_status in ('ok','fail','no_quota','disabled')),
  last_test_message text,
  last_test_latency_ms int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, vendor)
);
alter table public.user_integrations add column if not exists id                uuid  default uuid_generate_v4();
alter table public.user_integrations add column if not exists user_id           uuid not null references public.profiles(id) on delete cascade;
alter table public.user_integrations add column if not exists vendor            text not null references public.integrations(vendor);
alter table public.user_integrations add column if not exists enabled           boolean not null default false;
alter table public.user_integrations add column if not exists oauth_token       text;
alter table public.user_integrations add column if not exists refresh_token     text;
alter table public.user_integrations add column if not exists token_expires_at  timestamptz;
alter table public.user_integrations add column if not exists credentials       jsonb;
alter table public.user_integrations add column if not exists last_tested_at    timestamptz;
alter table public.user_integrations add column if not exists last_test_status  text check (last_test_status in ('ok','fail','no_quota','disabled'));
alter table public.user_integrations add column if not exists last_test_message text;
alter table public.user_integrations add column if not exists last_test_latency_ms int;
alter table public.user_integrations add column if not exists created_at        timestamptz not null default now();
alter table public.user_integrations add column if not exists updated_at        timestamptz not null default now();


alter table public.user_integrations enable row level security;
create policy "Users manage own integrations" on public.user_integrations
  using (app.uid() = user_id) with check (app.uid() = user_id);

-- ── Vault Ledger ─────────────────────────────────────────────
create table if not exists public.vault_ledger (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  amount       numeric(12,2) not null,  -- positive=credit, negative=debit
  type         text not null check (type in ('cashback','topup','purchase','payout','adjustment')),
  description  text,
  reference_id text,  -- Stripe payment intent or external ref
  created_at   timestamptz not null default now()
);
alter table public.vault_ledger add column if not exists id           uuid  default uuid_generate_v4();
alter table public.vault_ledger add column if not exists user_id      uuid not null references public.profiles(id) on delete cascade;
alter table public.vault_ledger add column if not exists amount       numeric(12,2) not null;
alter table public.vault_ledger add column if not exists type         text not null check (type in ('cashback','topup','purchase','payout','adjustment'));
alter table public.vault_ledger add column if not exists description  text;
alter table public.vault_ledger add column if not exists reference_id text;
alter table public.vault_ledger add column if not exists created_at   timestamptz not null default now();


alter table public.vault_ledger enable row level security;
create policy "Users see own ledger" on public.vault_ledger for select using (app.uid() = user_id);

-- ── Registry (Wishlist) ───────────────────────────────────────
create table if not exists public.registry_items (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  description   text,
  url           text,
  image_url     text,
  price         numeric(12,2),
  category      text,
  purchased     boolean not null default false,
  purchased_by  uuid references public.profiles(id),
  purchased_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.registry_items add column if not exists id            uuid  default uuid_generate_v4();
alter table public.registry_items add column if not exists user_id       uuid not null references public.profiles(id) on delete cascade;
alter table public.registry_items add column if not exists name          text not null;
alter table public.registry_items add column if not exists description   text;
alter table public.registry_items add column if not exists url           text;
alter table public.registry_items add column if not exists image_url     text;
alter table public.registry_items add column if not exists price         numeric(12,2);
alter table public.registry_items add column if not exists category      text;
alter table public.registry_items add column if not exists purchased     boolean not null default false;
alter table public.registry_items add column if not exists purchased_by  uuid references public.profiles(id);
alter table public.registry_items add column if not exists purchased_at  timestamptz;
alter table public.registry_items add column if not exists created_at    timestamptz not null default now();
alter table public.registry_items add column if not exists updated_at    timestamptz not null default now();


alter table public.registry_items enable row level security;
create policy "Owners manage their registry"    on public.registry_items
  using (app.uid() = user_id) with check (app.uid() = user_id);
create policy "Others can view registries"      on public.registry_items
  for select using (true);
create policy "Others can mark purchased"       on public.registry_items
  for update using (app.uid() != user_id)
  with check (purchased = true and purchased_by = app.uid());

-- ── Scale Drops (Group Buying) ────────────────────────────────
create table if not exists public.scale_drops (
  id               uuid primary key default uuid_generate_v4(),
  title            text not null,
  description      text,
  image_url        text,
  target_price     numeric(12,2),
  retail_price     numeric(12,2),
  savings_pct      int generated always as
                     (case when retail_price > 0
                      then round(((retail_price - target_price) / retail_price) * 100)
                      else 0 end) stored,
  min_pledges      int not null default 10,
  current_pledges  int not null default 0,
  category         text,
  status           text not null default 'live' check (status in ('live','funded','shipping','closed')),
  ends_at          timestamptz,
  created_at       timestamptz not null default now()
);
alter table public.scale_drops add column if not exists id               uuid  default uuid_generate_v4();
alter table public.scale_drops add column if not exists title            text not null;
alter table public.scale_drops add column if not exists description      text;
alter table public.scale_drops add column if not exists image_url        text;
alter table public.scale_drops add column if not exists target_price     numeric(12,2);
alter table public.scale_drops add column if not exists retail_price     numeric(12,2);
alter table public.scale_drops add column if not exists savings_pct      int generated always as
                     (case when retail_price > 0
                      then round(((retail_price - target_price) / retail_price) * 100)
                      else 0 end) stored;
alter table public.scale_drops add column if not exists min_pledges      int not null default 10;
alter table public.scale_drops add column if not exists current_pledges  int not null default 0;
alter table public.scale_drops add column if not exists category         text;
alter table public.scale_drops add column if not exists status           text not null default 'live' check (status in ('live','funded','shipping','closed'));
alter table public.scale_drops add column if not exists ends_at          timestamptz;
alter table public.scale_drops add column if not exists created_at       timestamptz not null default now();


alter table public.scale_drops enable row level security;
create policy "Anyone can view drops" on public.scale_drops for select using (true);

create table if not exists public.scale_pledges (
  id         uuid primary key default uuid_generate_v4(),
  drop_id    uuid not null references public.scale_drops(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (drop_id, user_id)
);
alter table public.scale_pledges add column if not exists id         uuid  default uuid_generate_v4();
alter table public.scale_pledges add column if not exists drop_id    uuid not null references public.scale_drops(id) on delete cascade;
alter table public.scale_pledges add column if not exists user_id    uuid not null references public.profiles(id) on delete cascade;
alter table public.scale_pledges add column if not exists created_at timestamptz not null default now();


alter table public.scale_pledges enable row level security;
create policy "Users manage own pledges" on public.scale_pledges
  using (app.uid() = user_id) with check (app.uid() = user_id);
create policy "Anyone can view pledge counts" on public.scale_pledges for select using (true);

-- ── Media Jobs (Lab generation queue) ────────────────────────
create table if not exists public.media_jobs (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  type             text not null check (type in ('video','voice','music','3d','image')),
  provider         text not null,  -- 'higgsfield','elevenlabs','suno','meshy'
  prompt           text,
  style            text,
  status           text not null default 'queued' check (status in ('queued','processing','complete','failed')),
  result_url       text,
  provider_job_id  text,
  error_message    text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
alter table public.media_jobs add column if not exists id               uuid  default uuid_generate_v4();
alter table public.media_jobs add column if not exists user_id          uuid not null references public.profiles(id) on delete cascade;
alter table public.media_jobs add column if not exists type             text not null check (type in ('video','voice','music','3d','image'));
alter table public.media_jobs add column if not exists provider         text not null;
alter table public.media_jobs add column if not exists prompt           text;
alter table public.media_jobs add column if not exists style            text;
alter table public.media_jobs add column if not exists status           text not null default 'queued' check (status in ('queued','processing','complete','failed'));
alter table public.media_jobs add column if not exists result_url       text;
alter table public.media_jobs add column if not exists provider_job_id  text;
alter table public.media_jobs add column if not exists error_message    text;
alter table public.media_jobs add column if not exists created_at       timestamptz not null default now();
alter table public.media_jobs add column if not exists completed_at     timestamptz;


alter table public.media_jobs enable row level security;
create policy "Users manage own media jobs" on public.media_jobs
  using (app.uid() = user_id) with check (app.uid() = user_id);

-- ── Updated-at triggers ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_profiles_updated_at         before update on public.profiles         for each row execute procedure public.set_updated_at();
create trigger set_concierge_updated_at        before update on public.concierge_avatars for each row execute procedure public.set_updated_at();
create trigger set_onboarding_updated_at       before update on public.onboarding_state  for each row execute procedure public.set_updated_at();
create trigger set_user_integrations_updated_at before update on public.user_integrations for each row execute procedure public.set_updated_at();
create trigger set_registry_updated_at         before update on public.registry_items    for each row execute procedure public.set_updated_at();
