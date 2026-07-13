-- ============================================================
-- FINESSE — MASTER SCHEMA
-- Complete table definitions in dependency order
-- Safe to run on a fresh database or incrementally (IF NOT EXISTS)
-- Policies use DROP IF EXISTS + CREATE for idempotency
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  username         text        unique,
  display_name     text,
  bio              text,
  avatar_url       text,
  gender           text        check (gender in ('feminine', 'masculine', 'nonbinary')),
  vibe             text,
  city             text,
  interests        text[],
  age              int         check (age >= 18 and age <= 120),
  is_vip           boolean     not null default false,
  vip_expires_at   timestamptz,
  telegram_handle  text,
  telegram_chat_id bigint,
  intake_complete  boolean     not null default false,
  onboarding_done  boolean     not null default false,
  check_in         timestamptz,
  nova_persona     jsonb,
  nightvision_data jsonb,
  style_dna        jsonb,
  email            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_own_read"    on public.profiles;
drop policy if exists "profiles_own_update"  on public.profiles;
drop policy if exists "profiles_own_insert"  on public.profiles;
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_own_read"    on public.profiles for select  using (auth.uid() = id);
create policy "profiles_own_update"  on public.profiles for update  using (auth.uid() = id);
create policy "profiles_own_insert"  on public.profiles for insert  with check (auth.uid() = id);
create policy "profiles_public_read" on public.profiles for select  using (true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. CONCIERGE_AVATARS
-- ============================================================
create table if not exists public.concierge_avatars (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade unique,
  name       text not null default 'Nova',
  gender     text check (gender in ('feminine', 'masculine', 'neutral')),
  look       text,
  voice_id   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.concierge_avatars enable row level security;
drop policy if exists "concierge_own" on public.concierge_avatars;
create policy "concierge_own" on public.concierge_avatars
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 3. ONBOARDING_STATE
-- ============================================================
create table if not exists public.onboarding_state (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  step_completed      int not null default 0,
  extension_installed boolean not null default false,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.onboarding_state enable row level security;
drop policy if exists "onboarding_own" on public.onboarding_state;
create policy "onboarding_own" on public.onboarding_state
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 4. INTEGRATIONS
-- ============================================================
create table if not exists public.integrations (
  id                   uuid        primary key default uuid_generate_v4(),
  user_id              uuid        references public.profiles(id) on delete cascade,
  vendor               text        not null,
  display_name         text,
  category             text,
  enabled              boolean     not null default false,
  credentials_enc      text,
  oauth_token_enc      text,
  refresh_token_enc    text,
  token_expires_at     timestamptz,
  last_tested_at       timestamptz,
  last_test_status     text        check (last_test_status in ('ok','fail','no_quota','disabled')),
  last_test_message    text,
  last_test_latency_ms int,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, vendor)
);
create index if not exists idx_integrations_user_vendor on public.integrations (user_id, vendor);
alter table public.integrations enable row level security;
drop policy if exists "integrations_own" on public.integrations;
create policy "integrations_own" on public.integrations
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 5. INTEGRATION_AUDITS
-- ============================================================
create table if not exists public.integration_audits (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        references public.profiles(id) on delete set null,
  vendor     text        not null,
  status     text        not null check (status in ('ok','fail','no_quota','disabled')),
  latency_ms int,
  message    text,
  created_at timestamptz not null default now()
);
create index if not exists idx_integration_audits_vendor on public.integration_audits (vendor, created_at desc);
alter table public.integration_audits enable row level security;
drop policy if exists "integration_audits_own_read" on public.integration_audits;
create policy "integration_audits_own_read" on public.integration_audits
  for select using (auth.uid() = user_id);

-- ============================================================
-- 6. INTEGRATION_HEALTH
-- ============================================================
create table if not exists public.integration_health (
  vendor          text        primary key,
  status          text        not null default 'unknown',
  last_checked_at timestamptz,
  error_message   text,
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 7. VAULT_ACCOUNTS
-- ============================================================
create table if not exists public.vault_accounts (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null unique references public.profiles(id) on delete cascade,
  balance_cents         int         not null default 0 check (balance_cents >= 0),
  cashback_earned_cents int         not null default 0 check (cashback_earned_cents >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_vault_accounts_user on public.vault_accounts (user_id);
alter table public.vault_accounts enable row level security;
drop policy if exists "vault_own_read"   on public.vault_accounts;
drop policy if exists "vault_own_update" on public.vault_accounts;
drop policy if exists "vault_own_insert" on public.vault_accounts;
create policy "vault_own_read"   on public.vault_accounts for select using (auth.uid() = user_id);
create policy "vault_own_update" on public.vault_accounts for update using (auth.uid() = user_id);
create policy "vault_own_insert" on public.vault_accounts for insert with check (auth.uid() = user_id);

create or replace function public.create_vault_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.vault_accounts (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists trg_create_vault_account on public.profiles;
create trigger trg_create_vault_account after insert on public.profiles
  for each row execute procedure public.create_vault_account();

-- ============================================================
-- 8. VAULT_TRANSACTIONS
-- ============================================================
create table if not exists public.vault_transactions (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  merchant       text        not null,
  amount_cents   int         not null,
  cashback_cents int         not null default 0,
  category       text        not null default 'general',
  direction      text        not null check (direction in ('debit', 'credit')),
  status         text        not null default 'settled' check (status in ('pending', 'settled', 'reversed')),
  reference_id   text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_vault_txn_user on public.vault_transactions (user_id, created_at desc);
alter table public.vault_transactions enable row level security;
drop policy if exists "vault_txn_own_read"   on public.vault_transactions;
drop policy if exists "vault_txn_own_insert" on public.vault_transactions;
create policy "vault_txn_own_read"   on public.vault_transactions for select using (auth.uid() = user_id);
create policy "vault_txn_own_insert" on public.vault_transactions for insert with check (auth.uid() = user_id);

-- ============================================================
-- 9. SUBSCRIPTIONS
-- ============================================================
create table if not exists public.subscriptions (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references public.profiles(id) on delete cascade,
  status               text        not null default 'active' check (status in ('active','canceled','past_due','trialing')),
  price_cents          int         not null default 2499,
  currency             text        not null default 'usd',
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at            timestamptz,
  canceled_at          timestamptz,
  processor            text        not null default 'ccbill',
  processor_sub_id     text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_subscriptions_user on public.subscriptions (user_id);
alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions_own_read" on public.subscriptions;
create policy "subscriptions_own_read" on public.subscriptions for select using (auth.uid() = user_id);

-- ============================================================
-- 10. PAYMENTS
-- ============================================================
create table if not exists public.payments (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references public.profiles(id) on delete set null,
  amount_cents  int         not null,
  currency      text        not null default 'usd',
  status        text        not null check (status in ('pending','succeeded','failed','refunded')),
  processor     text        not null default 'ccbill',
  processor_ref text,
  description   text,
  created_at    timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "payments_own_read" on public.payments;
create policy "payments_own_read" on public.payments for select using (auth.uid() = user_id);

-- ============================================================
-- 11. STRIPE_EVENTS
-- ============================================================
create table if not exists public.stripe_events (
  id         text        primary key,
  type       text        not null,
  data       jsonb       not null default '{}',
  processed  boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 12. MEDIA_ASSETS
-- ============================================================
create table if not exists public.media_assets (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  r2_key     text        not null unique,
  url        text        not null,
  type       text        not null check (type in ('image','video','audio','3d')),
  size_bytes bigint,
  mime_type  text,
  job_id     text,
  created_at timestamptz not null default now()
);
create index if not exists idx_media_assets_user on public.media_assets (user_id, created_at desc);
alter table public.media_assets enable row level security;
drop policy if exists "media_assets_own" on public.media_assets;
create policy "media_assets_own" on public.media_assets
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 13. MEDIA_JOBS
-- ============================================================
create table if not exists public.media_jobs (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  type            text        not null check (type in ('video','voice','music','3d','image')),
  provider        text        not null,
  prompt          text,
  style           text,
  status          text        not null default 'queued' check (status in ('queued','processing','complete','failed')),
  result_url      text,
  provider_job_id text,
  error_message   text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists idx_media_jobs_user on public.media_jobs (user_id, created_at desc);
alter table public.media_jobs enable row level security;
drop policy if exists "media_jobs_own" on public.media_jobs;
create policy "media_jobs_own" on public.media_jobs
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 14. TRUTH_CHECKS
-- ============================================================
create table if not exists public.truth_checks (
  id         uuid        primary key default gen_random_uuid(),
  session_id text,
  claim      text        not null,
  verdict    text        check (verdict in ('VERIFIED','CONTRADICTED','UNVERIFIED','CONFLICTED')),
  evidence   text,
  tier_used  int,
  gated      boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 15. POSTS
-- ============================================================
create table if not exists public.posts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null check (char_length(content) between 1 and 500),
  image_url   text,
  likes_count int         not null default 0 check (likes_count >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_posts_created on public.posts (created_at desc);
alter table public.posts enable row level security;
drop policy if exists "posts_read_all"  on public.posts;
drop policy if exists "posts_own_write" on public.posts;
create policy "posts_read_all"  on public.posts for select using (true);
create policy "posts_own_write" on public.posts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 16. POST_LIKES
-- ============================================================
create table if not exists public.post_likes (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
alter table public.post_likes enable row level security;
drop policy if exists "post_likes_own"  on public.post_likes;
drop policy if exists "post_likes_read" on public.post_likes;
create policy "post_likes_own"  on public.post_likes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "post_likes_read" on public.post_likes for select using (true);

-- ============================================================
-- 17. VIP_CODES
-- ============================================================
create table if not exists public.vip_codes (
  id         uuid        primary key default gen_random_uuid(),
  code       text        not null unique,
  is_active  boolean     not null default true,
  max_uses   int         not null default 1,
  use_count  int         not null default 0,
  used_by    uuid[]      not null default '{}',
  used_at    timestamptz,
  expires_at timestamptz,
  created_by uuid        references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.vip_codes enable row level security;

-- ============================================================
-- 18. VIP_POSTS
-- ============================================================
create table if not exists public.vip_posts (
  id          uuid        primary key default gen_random_uuid(),
  author_id   uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null check (char_length(content) between 1 and 1000),
  image_url   text,
  likes_count int         not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_vip_posts_created on public.vip_posts (created_at desc);
alter table public.vip_posts enable row level security;
drop policy if exists "vip_posts_vip_read"  on public.vip_posts;
drop policy if exists "vip_posts_own_write" on public.vip_posts;
create policy "vip_posts_vip_read" on public.vip_posts
  for select using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.is_vip = true
      and (p.vip_expires_at is null or p.vip_expires_at > now()))
  );
create policy "vip_posts_own_write" on public.vip_posts
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- ============================================================
-- 19. VIP_EXCLUSIVES
-- ============================================================
create table if not exists public.vip_exclusives (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  brand         text        not null,
  price_cents   bigint      not null default 0,
  pledged_cents bigint      not null default 0,
  category      text        not null default 'Experience',
  description   text,
  partner_logo  text,
  sort_order    int         not null default 0,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);
alter table public.vip_exclusives enable row level security;
drop policy if exists "vip_exclusives_vip_read" on public.vip_exclusives;
create policy "vip_exclusives_vip_read" on public.vip_exclusives
  for select using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.is_vip = true
      and (p.vip_expires_at is null or p.vip_expires_at > now()))
  );

-- ============================================================
-- 20. BACKSTAGE_SESSIONS
-- ============================================================
create table if not exists public.backstage_sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references public.profiles(id) on delete set null,
  pin_hash   text,
  granted    boolean     not null default false,
  ip_address text,
  created_at timestamptz not null default now()
);
alter table public.backstage_sessions enable row level security;

-- ============================================================
-- 21. INTELLIGENCE_SIGNALS
-- ============================================================
create table if not exists public.intelligence_signals (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null,
  kind       text        not null,
  payload    jsonb       not null default '{}',
  session_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_signals_user_kind on public.intelligence_signals (user_id, kind, created_at desc);
alter table public.intelligence_signals enable row level security;
drop policy if exists "signals_own_read" on public.intelligence_signals;
create policy "signals_own_read" on public.intelligence_signals
  for select using (auth.uid()::text = user_id);

-- ============================================================
-- 22. INTELLIGENCE_AUDIT
-- ============================================================
create table if not exists public.intelligence_audit (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text,
  module     text        not null,
  action     text        not null,
  input      jsonb,
  output     jsonb,
  latency_ms int,
  error      text,
  created_at timestamptz not null default now()
);
create index if not exists idx_intelligence_audit_user on public.intelligence_audit (user_id, created_at desc);
alter table public.intelligence_audit enable row level security;
drop policy if exists "intelligence_audit_own_read" on public.intelligence_audit;
create policy "intelligence_audit_own_read" on public.intelligence_audit
  for select using (auth.uid()::text = user_id);

-- ============================================================
-- 23. MARKET_INTELLIGENCE_CACHE
-- ============================================================
create table if not exists public.market_intelligence_cache (
  id         uuid        primary key default gen_random_uuid(),
  cache_key  text        not null unique,
  data       jsonb       not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_market_cache_key     on public.market_intelligence_cache (cache_key);
create index if not exists idx_market_cache_expires on public.market_intelligence_cache (expires_at);

-- ============================================================
-- 24. EXCHANGE_LISTINGS
-- ============================================================
create table if not exists public.exchange_listings (
  id                    uuid        primary key default gen_random_uuid(),
  seller_id             uuid        not null references public.profiles(id) on delete cascade,
  title                 text        not null,
  description           text,
  brand                 text,
  size                  text,
  condition             text        not null default 'excellent' check (condition in ('new','excellent','good','fair')),
  asking_price_cents    int         not null check (asking_price_cents >= 100),
  category              text,
  photo_urls            text[]      not null default '{}',
  status                text        not null default 'active' check (status in ('active','sold','removed')),
  platform_fee_cents    int         generated always as (floor(asking_price_cents * 0.08)) stored,
  seller_receives_cents int         generated always as (asking_price_cents - floor(asking_price_cents * 0.08)) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_exchange_listings_active on public.exchange_listings (status) where status = 'active';
create index if not exists idx_exchange_listings_seller on public.exchange_listings (seller_id);
alter table public.exchange_listings enable row level security;
drop policy if exists "exchange_listings_read_all"  on public.exchange_listings;
drop policy if exists "exchange_listings_own_write" on public.exchange_listings;
create policy "exchange_listings_read_all"  on public.exchange_listings for select using (true);
create policy "exchange_listings_own_write" on public.exchange_listings
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

-- ============================================================
-- 25. EXCHANGE_OFFERS
-- ============================================================
create table if not exists public.exchange_offers (
  id                uuid        primary key default gen_random_uuid(),
  listing_id        uuid        not null references public.exchange_listings(id) on delete cascade,
  buyer_id          uuid        not null references public.profiles(id) on delete cascade,
  offer_price_cents int         not null check (offer_price_cents >= 100),
  status            text        not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  message           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_exchange_offers_listing on public.exchange_offers (listing_id);
create index if not exists idx_exchange_offers_buyer   on public.exchange_offers (buyer_id);
alter table public.exchange_offers enable row level security;
drop policy if exists "exchange_offers_parties"   on public.exchange_offers;
drop policy if exists "exchange_offers_own_write" on public.exchange_offers;
create policy "exchange_offers_parties" on public.exchange_offers
  for select using (
    auth.uid() = buyer_id or
    exists (select 1 from public.exchange_listings l where l.id = listing_id and l.seller_id = auth.uid())
  );
create policy "exchange_offers_own_write" on public.exchange_offers
  using (auth.uid() = buyer_id) with check (auth.uid() = buyer_id);

-- ============================================================
-- 26. SCALE_DEALS
-- ============================================================
create table if not exists public.scale_deals (
  id                   uuid        primary key default gen_random_uuid(),
  title                text        not null,
  brand                text        not null,
  description          text,
  image_url            text,
  original_price_cents int         not null,
  group_price_cents    int         not null,
  goal_count           int         not null default 5,
  current_count        int         not null default 0,
  category             text,
  deadline             timestamptz,
  status               text        not null default 'open' check (status in ('open','met','closed','cancelled')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_scale_deals_status on public.scale_deals (status);
alter table public.scale_deals enable row level security;
drop policy if exists "scale_deals_public_read" on public.scale_deals;
create policy "scale_deals_public_read" on public.scale_deals for select using (true);

-- ============================================================
-- 27. SCALE_JOINS
-- ============================================================
create table if not exists public.scale_joins (
  id        uuid        primary key default gen_random_uuid(),
  deal_id   uuid        not null references public.scale_deals(id) on delete cascade,
  user_id   uuid        not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (deal_id, user_id)
);
create index if not exists idx_scale_joins_deal on public.scale_joins (deal_id);
alter table public.scale_joins enable row level security;
drop policy if exists "scale_joins_own"  on public.scale_joins;
drop policy if exists "scale_joins_read" on public.scale_joins;
create policy "scale_joins_own"  on public.scale_joins
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scale_joins_read" on public.scale_joins for select using (true);

create or replace function public.increment_scale_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.scale_deals
  set current_count = current_count + 1,
      status = case when current_count + 1 >= goal_count then 'met' else status end
  where id = new.deal_id;
  return new;
end;
$$;
drop trigger if exists trg_increment_scale_count on public.scale_joins;
create trigger trg_increment_scale_count after insert on public.scale_joins
  for each row execute procedure public.increment_scale_count();

-- ============================================================
-- 28. EMBASSY_DEALS
-- ============================================================
create table if not exists public.embassy_deals (
  id                   uuid        primary key default gen_random_uuid(),
  brand                text        not null,
  title                text        not null,
  description          text,
  original_price_cents int,
  group_price_cents    int,
  savings_pct          int,
  category             text,
  source               text,
  status               text        not null default 'live' check (status in ('live','expired','pending')),
  current_count        int         not null default 0,
  goal_count           int         not null default 10,
  created_at           timestamptz not null default now()
);
alter table public.embassy_deals enable row level security;
drop policy if exists "embassy_deals_read" on public.embassy_deals;
create policy "embassy_deals_read" on public.embassy_deals for select using (true);

-- ============================================================
-- 29. REGISTRY_ITEMS
-- ============================================================
create table if not exists public.registry_items (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  name         text        not null,
  description  text,
  url          text,
  image_url    text,
  price_cents  int,
  category     text,
  purchased    boolean     not null default false,
  purchased_by uuid        references public.profiles(id) on delete set null,
  purchased_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_registry_items_user on public.registry_items (user_id);
alter table public.registry_items enable row level security;
drop policy if exists "registry_own_write"   on public.registry_items;
drop policy if exists "registry_public_read" on public.registry_items;
create policy "registry_own_write"   on public.registry_items
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "registry_public_read" on public.registry_items for select using (true);

-- ============================================================
-- 30. OUTINGS
-- ============================================================
create table if not exists public.outings (
  id          uuid        primary key default gen_random_uuid(),
  host_id     uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  description text,
  venue       text,
  city        text,
  date_at     timestamptz,
  max_guests  int         not null default 10,
  guest_count int         not null default 0,
  price_cents int         not null default 0,
  category    text,
  partner     text,
  image_url   text,
  status      text        not null default 'open' check (status in ('open','full','cancelled','completed')),
  created_at  timestamptz not null default now()
);
alter table public.outings enable row level security;
drop policy if exists "outings_read_all"  on public.outings;
drop policy if exists "outings_own_write" on public.outings;
create policy "outings_read_all"  on public.outings for select using (true);
create policy "outings_own_write" on public.outings
  using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- ============================================================
-- 31. OUTING_PARTICIPANTS
-- ============================================================
create table if not exists public.outing_participants (
  id         uuid        primary key default gen_random_uuid(),
  outing_id  uuid        not null references public.outings(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (outing_id, user_id)
);
alter table public.outing_participants enable row level security;
drop policy if exists "outing_participants_own" on public.outing_participants;
create policy "outing_participants_own" on public.outing_participants
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 32. REGISTRY_PLEDGES
-- ============================================================
create table if not exists public.registry_pledges (
  id           uuid        primary key default gen_random_uuid(),
  item_id      uuid        not null references public.registry_items(id) on delete cascade,
  pledger_id   uuid        not null references public.profiles(id) on delete cascade,
  amount_cents int         not null check (amount_cents > 0),
  message      text,
  created_at   timestamptz not null default now()
);
alter table public.registry_pledges enable row level security;
drop policy if exists "registry_pledges_own"            on public.registry_pledges;
drop policy if exists "registry_pledges_item_owner_read" on public.registry_pledges;
create policy "registry_pledges_own" on public.registry_pledges
  using (auth.uid() = pledger_id) with check (auth.uid() = pledger_id);
create policy "registry_pledges_item_owner_read" on public.registry_pledges
  for select using (
    exists (select 1 from public.registry_items r where r.id = item_id and r.user_id = auth.uid())
    or auth.uid() = pledger_id
  );

-- ============================================================
-- 33. SCRAPBOOK_ENTRIES
-- ============================================================
create table if not exists public.scrapbook_entries (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  title        text        not null,
  description  text,
  photo_url    text,
  video_url    text,
  video_job_id text,
  video_status text        default 'none' check (video_status in ('none','pending','complete','failed')),
  tags         text[],
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_scrapbook_user on public.scrapbook_entries (user_id, created_at desc);
alter table public.scrapbook_entries enable row level security;
drop policy if exists "scrapbook_own" on public.scrapbook_entries;
create policy "scrapbook_own" on public.scrapbook_entries
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 34. CARPE_DIEM_PROFILES
-- ============================================================
create table if not exists public.carpe_diem_profiles (
  user_id               uuid        primary key references public.profiles(id) on delete cascade,
  garage                jsonb       not null default '[]',
  golf_handicap         numeric(4,1),
  home_course           text,
  alpaca_connected      boolean     not null default false,
  yahoo_connected       boolean     not null default false,
  portfolio_value_cents bigint      not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.carpe_diem_profiles enable row level security;
drop policy if exists "carpe_diem_own" on public.carpe_diem_profiles;
create policy "carpe_diem_own" on public.carpe_diem_profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 35. SALON_BOOKINGS
-- ============================================================
create table if not exists public.salon_bookings (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  service_id     text        not null,
  service_name   text        not null,
  price_cents    int         not null,
  duration       text,
  category       text,
  edition        text        not null default 'finesse',
  requested_date text        not null,
  requested_time text        not null,
  notes          text,
  status         text        not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  created_at     timestamptz not null default now()
);
create index if not exists idx_salon_bookings_user on public.salon_bookings (user_id, created_at desc);
alter table public.salon_bookings enable row level security;
drop policy if exists "salon_bookings_own" on public.salon_bookings;
create policy "salon_bookings_own" on public.salon_bookings
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 36. BAG_ITEMS
-- ============================================================
create table if not exists public.bag_items (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  edition         text        not null default 'finesse' check (edition in ('finesse','carpe_diem')),
  name            text        not null,
  brand           text,
  category        text,
  photo_url       text,
  value_est_cents int,
  note            text,
  added_label     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_bag_items_user on public.bag_items (user_id, edition);
alter table public.bag_items enable row level security;
drop policy if exists "bag_items_own" on public.bag_items;
create policy "bag_items_own" on public.bag_items
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 37. WARDROBE_LOOKS
-- ============================================================
create table if not exists public.wardrobe_looks (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  photo_url   text        not null,
  caption     text,
  brands      text[]      not null default '{}',
  likes_count int         not null default 0 check (likes_count >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists idx_wardrobe_looks_feed on public.wardrobe_looks (created_at desc);
create index if not exists idx_wardrobe_looks_user on public.wardrobe_looks (user_id);
alter table public.wardrobe_looks enable row level security;
drop policy if exists "wardrobe_looks_read_all"  on public.wardrobe_looks;
drop policy if exists "wardrobe_looks_own_write" on public.wardrobe_looks;
create policy "wardrobe_looks_read_all"  on public.wardrobe_looks for select using (true);
create policy "wardrobe_looks_own_write" on public.wardrobe_looks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 38. WARDROBE_LOOK_LIKES
-- ============================================================
create table if not exists public.wardrobe_look_likes (
  id         uuid        primary key default gen_random_uuid(),
  look_id    uuid        not null references public.wardrobe_looks(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (look_id, user_id)
);
alter table public.wardrobe_look_likes enable row level security;
drop policy if exists "wardrobe_look_likes_own"  on public.wardrobe_look_likes;
drop policy if exists "wardrobe_look_likes_read" on public.wardrobe_look_likes;
create policy "wardrobe_look_likes_own"  on public.wardrobe_look_likes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wardrobe_look_likes_read" on public.wardrobe_look_likes for select using (true);

-- ============================================================
-- 39. WARDROBE_WISHLIST
-- ============================================================
create table if not exists public.wardrobe_wishlist (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  brand           text        not null,
  item            text        not null,
  price_est_cents int,
  added_label     text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_wardrobe_wishlist_user on public.wardrobe_wishlist (user_id, created_at desc);
alter table public.wardrobe_wishlist enable row level security;
drop policy if exists "wardrobe_wishlist_own" on public.wardrobe_wishlist;
create policy "wardrobe_wishlist_own" on public.wardrobe_wishlist
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 40. SOCIAL_ACCOUNTS
-- ============================================================
create table if not exists public.social_accounts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  platform         text        not null,
  connected        boolean     not null default false,
  access_token_enc text,
  connected_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, platform)
);
alter table public.social_accounts enable row level security;
drop policy if exists "social_accounts_own" on public.social_accounts;
create policy "social_accounts_own" on public.social_accounts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 41. SOCIAL_BROADCASTS
-- ============================================================
create table if not exists public.social_broadcasts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  platforms  text[]      not null default '{}',
  content    text        not null,
  results    jsonb       not null default '{}',
  status     text        not null default 'queued' check (status in ('queued','sent','partial','failed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_social_broadcasts_user on public.social_broadcasts (user_id, created_at desc);
alter table public.social_broadcasts enable row level security;
drop policy if exists "social_broadcasts_own" on public.social_broadcasts;
create policy "social_broadcasts_own" on public.social_broadcasts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin create trigger trg_profiles_updated_at          before update on public.profiles          for each row execute procedure public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_concierge_updated_at         before update on public.concierge_avatars for each row execute procedure public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_onboarding_updated_at        before update on public.onboarding_state  for each row execute procedure public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_integrations_updated_at      before update on public.integrations      for each row execute procedure public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_vault_accounts_updated_at    before update on public.vault_accounts    for each row execute procedure public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_exchange_listings_updated_at before update on public.exchange_listings for each row execute procedure public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_registry_items_updated_at    before update on public.registry_items    for each row execute procedure public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_bag_items_updated_at         before update on public.bag_items         for each row execute procedure public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_social_accounts_updated_at   before update on public.social_accounts   for each row execute procedure public.set_updated_at(); exception when duplicate_object then null; end $$;
