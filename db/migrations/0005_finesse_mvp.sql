-- Ported from supabase/migrations/20260609000001_finesse_mvp.sql by scripts/port-supabase-migrations.mjs
-- =============================================================================
-- Finesse MVP — Initial Schema Migration
-- Project: finesselife.app
-- Date: 2026-06-09
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- =============================================================================
-- TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles (extends app.users 1-to-1)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid        primary key references app.users(id) on delete cascade,
  username           text        unique not null,
  display_name       text,
  bio                text,
  avatar_url         text,                          -- Cloudflare R2 public URL
  gender             text        check (gender in ('feminine', 'masculine', 'nonbinary')),
  vibe               text,                          -- lifestyle vibe from intake
  city               text,
  age                int         check (age >= 18 and age <= 120),
  is_vip             boolean     not null default false,
  vip_expires_at     timestamptz,
  telegram_handle    text,
  telegram_chat_id   bigint,
  intake_complete    boolean     not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.profiles add column if not exists id                 uuid         references app.users(id) on delete cascade;
alter table public.profiles add column if not exists username           text         not null;
alter table public.profiles add column if not exists display_name       text;
alter table public.profiles add column if not exists bio                text;
alter table public.profiles add column if not exists avatar_url         text;
alter table public.profiles add column if not exists gender             text        check (gender in ('feminine', 'masculine', 'nonbinary'));
alter table public.profiles add column if not exists vibe               text;
alter table public.profiles add column if not exists city               text;
alter table public.profiles add column if not exists age                int         check (age >= 18 and age <= 120);
alter table public.profiles add column if not exists is_vip             boolean     not null default false;
alter table public.profiles add column if not exists vip_expires_at     timestamptz;
alter table public.profiles add column if not exists telegram_handle    text;
alter table public.profiles add column if not exists telegram_chat_id   bigint;
alter table public.profiles add column if not exists intake_complete    boolean     not null default false;
alter table public.profiles add column if not exists created_at         timestamptz not null default now();
alter table public.profiles add column if not exists updated_at         timestamptz not null default now();


comment on table public.profiles is 'One-to-one extension of app.users. Holds all public and VIP profile metadata.';
comment on column public.profiles.avatar_url      is 'Cloudflare R2 public URL for avatar image.';
comment on column public.profiles.vibe            is 'Lifestyle vibe selected during onboarding intake.';
comment on column public.profiles.is_vip          is 'True while subscription is active or invite code is valid.';
comment on column public.profiles.vip_expires_at  is 'UTC expiry for the current VIP grant. NULL = no active grant.';


-- ---------------------------------------------------------------------------
-- posts (public social feed)
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id           uuid        primary key default gen_random_uuid(),
  author_id    uuid        not null references public.profiles(id) on delete cascade,
  content      text,
  media_urls   text[],                              -- Cloudflare R2 public URLs
  vibe_tags    text[],
  likes_count  int         not null default 0 check (likes_count >= 0),
  created_at   timestamptz not null default now()
);
alter table public.posts add column if not exists id           uuid         default gen_random_uuid();
alter table public.posts add column if not exists author_id    uuid        not null references public.profiles(id) on delete cascade;
alter table public.posts add column if not exists content      text;
alter table public.posts add column if not exists media_urls   text[];
alter table public.posts add column if not exists vibe_tags    text[];
alter table public.posts add column if not exists likes_count  int         not null default 0 check (likes_count >= 0);
alter table public.posts add column if not exists created_at   timestamptz not null default now();


comment on table public.posts is 'Public-tier posts visible to all authenticated members.';


-- ---------------------------------------------------------------------------
-- post_likes
-- ---------------------------------------------------------------------------
create table if not exists public.post_likes (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
alter table public.post_likes add column if not exists id         uuid         default gen_random_uuid();
alter table public.post_likes add column if not exists post_id    uuid        not null references public.posts(id) on delete cascade;
alter table public.post_likes add column if not exists user_id    uuid        not null references public.profiles(id) on delete cascade;
alter table public.post_likes add column if not exists created_at timestamptz not null default now();


comment on table public.post_likes is 'Junction table tracking which members liked which public posts.';


-- ---------------------------------------------------------------------------
-- vip_posts (private, VIP subscribers only)
-- ---------------------------------------------------------------------------
create table if not exists public.vip_posts (
  id           uuid        primary key default gen_random_uuid(),
  author_id    uuid        not null references public.profiles(id) on delete cascade,
  content      text,                                -- plaintext; RLS enforces access
  media_urls   text[],                              -- Cloudflare R2 signed URLs
  vibe_tags    text[],
  likes_count  int         not null default 0 check (likes_count >= 0),
  created_at   timestamptz not null default now()
);
alter table public.vip_posts add column if not exists id           uuid         default gen_random_uuid();
alter table public.vip_posts add column if not exists author_id    uuid        not null references public.profiles(id) on delete cascade;
alter table public.vip_posts add column if not exists content      text;
alter table public.vip_posts add column if not exists media_urls   text[];
alter table public.vip_posts add column if not exists vibe_tags    text[];
alter table public.vip_posts add column if not exists likes_count  int         not null default 0 check (likes_count >= 0);
alter table public.vip_posts add column if not exists created_at   timestamptz not null default now();


comment on table public.vip_posts is 'VIP-tier posts. RLS restricts reads to active VIP members only.';
comment on column public.vip_posts.media_urls is 'Cloudflare R2 signed URLs generated server-side; stored as-is but must be refreshed before serving.';


-- ---------------------------------------------------------------------------
-- vip_post_likes
-- ---------------------------------------------------------------------------
create table if not exists public.vip_post_likes (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.vip_posts(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
alter table public.vip_post_likes add column if not exists id         uuid         default gen_random_uuid();
alter table public.vip_post_likes add column if not exists post_id    uuid        not null references public.vip_posts(id) on delete cascade;
alter table public.vip_post_likes add column if not exists user_id    uuid        not null references public.profiles(id) on delete cascade;
alter table public.vip_post_likes add column if not exists created_at timestamptz not null default now();


comment on table public.vip_post_likes is 'Junction table tracking which VIP members liked which VIP posts.';


-- ---------------------------------------------------------------------------
-- vip_codes (invite / promo codes)
-- ---------------------------------------------------------------------------
create table if not exists public.vip_codes (
  id          uuid        primary key default gen_random_uuid(),
  code        text        unique not null,
  created_by  uuid        references public.profiles(id) on delete set null,
  used_by     uuid        references public.profiles(id) on delete set null,
  used_at     timestamptz,
  expires_at  timestamptz,
  max_uses    int         not null default 1 check (max_uses >= 1),
  use_count   int         not null default 0 check (use_count >= 0),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);
alter table public.vip_codes add column if not exists id          uuid         default gen_random_uuid();
alter table public.vip_codes add column if not exists code        text         not null;
alter table public.vip_codes add column if not exists created_by  uuid        references public.profiles(id) on delete set null;
alter table public.vip_codes add column if not exists used_by     uuid        references public.profiles(id) on delete set null;
alter table public.vip_codes add column if not exists used_at     timestamptz;
alter table public.vip_codes add column if not exists expires_at  timestamptz;
alter table public.vip_codes add column if not exists max_uses    int         not null default 1 check (max_uses >= 1);
alter table public.vip_codes add column if not exists use_count   int         not null default 0 check (use_count >= 0);
alter table public.vip_codes add column if not exists is_active   boolean     not null default true;
alter table public.vip_codes add column if not exists created_at  timestamptz not null default now();


comment on table public.vip_codes is 'Invite and promotional codes that grant VIP access. Managed by service role only.';
comment on column public.vip_codes.max_uses  is 'Maximum times this code can be redeemed.';
comment on column public.vip_codes.use_count is 'Running tally of redemptions; must stay <= max_uses.';


-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                          uuid        primary key default gen_random_uuid(),
  user_id                     uuid        not null references public.profiles(id) on delete cascade,
  status                      text        not null check (status in ('active', 'cancelled', 'expired')),
  plan                        text        not null default 'vip_monthly',
  amount_cents                int         check (amount_cents >= 0),
  provider                    text        not null check (provider in ('ccbill', 'apple_iap', 'vip_code')),
  provider_subscription_id    text,
  current_period_start        timestamptz,
  current_period_end          timestamptz,
  created_at                  timestamptz not null default now()
);
alter table public.subscriptions add column if not exists id                          uuid         default gen_random_uuid();
alter table public.subscriptions add column if not exists user_id                     uuid        not null references public.profiles(id) on delete cascade;
alter table public.subscriptions add column if not exists status                      text        not null check (status in ('active', 'cancelled', 'expired'));
alter table public.subscriptions add column if not exists plan                        text        not null default 'vip_monthly';
alter table public.subscriptions add column if not exists amount_cents                int         check (amount_cents >= 0);
alter table public.subscriptions add column if not exists provider                    text        not null check (provider in ('ccbill', 'apple_iap', 'vip_code'));
alter table public.subscriptions add column if not exists provider_subscription_id    text;
alter table public.subscriptions add column if not exists current_period_start        timestamptz;
alter table public.subscriptions add column if not exists current_period_end          timestamptz;
alter table public.subscriptions add column if not exists created_at                  timestamptz not null default now();


comment on table public.subscriptions is 'Billing records for VIP subscriptions across all payment providers.';
comment on column public.subscriptions.provider is 'Payment provider: ccbill (web), apple_iap (iOS), or vip_code (invite redemption).';
comment on column public.subscriptions.provider_subscription_id is 'External subscription ID from the payment provider for webhook reconciliation.';


-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  type       text        not null check (type in ('like', 'follow', 'vip_unlock', 'message')),
  title      text        not null,
  body       text,
  read       boolean     not null default false,
  data       jsonb,
  created_at timestamptz not null default now()
);
alter table public.notifications add column if not exists id         uuid         default gen_random_uuid();
alter table public.notifications add column if not exists user_id    uuid        not null references public.profiles(id) on delete cascade;
alter table public.notifications add column if not exists type       text        not null check (type in ('like', 'follow', 'vip_unlock', 'message'));
alter table public.notifications add column if not exists title      text        not null;
alter table public.notifications add column if not exists body       text;
alter table public.notifications add column if not exists read       boolean     not null default false;
alter table public.notifications add column if not exists data       jsonb;
alter table public.notifications add column if not exists created_at timestamptz not null default now();


comment on table public.notifications is 'In-app notification records; Telegram push is handled separately by the CNS layer.';
comment on column public.notifications.data is 'Arbitrary JSON payload for the notification (e.g. post_id, sender_id).';


-- =============================================================================
-- INDEXES
-- =============================================================================

-- posts
create index if not exists idx_posts_author_id   on public.posts (author_id);
create index if not exists idx_posts_created_at  on public.posts (created_at desc);

-- vip_posts
create index if not exists idx_vip_posts_author_id   on public.vip_posts (author_id);
create index if not exists idx_vip_posts_created_at  on public.vip_posts (created_at desc);

-- post_likes & vip_post_likes (lookup by user for feed rendering)
create index if not exists idx_post_likes_user_id      on public.post_likes (user_id);
create index if not exists idx_vip_post_likes_user_id  on public.vip_post_likes (user_id);

-- subscriptions (status lookups for auth middleware)
create index if not exists idx_subscriptions_user_id  on public.subscriptions (user_id);
create index if not exists idx_subscriptions_status   on public.subscriptions (status);

-- notifications (unread badge count)
create index if not exists idx_notifications_user_id_read  on public.notifications (user_id, read);
create index if not exists idx_notifications_created_at    on public.notifications (created_at desc);

-- vip_codes (fast redemption lookup)
create index if not exists idx_vip_codes_code       on public.vip_codes (code);
create index if not exists idx_vip_codes_is_active  on public.vip_codes (is_active) where is_active = true;


-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Auto-create profile row on new app.users insert
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    -- derive a unique username from the email local-part; collision guard via suffix
    coalesce(
      lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g')),
      'user_' || substr(new.id::text, 1, 8)
    ),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on app.users;
create trigger on_auth_user_created
  after insert on app.users
  for each row execute procedure public.handle_new_user();


-- ---------------------------------------------------------------------------
-- Keep profiles.updated_at current on any update
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Keep likes_count in sync when post_likes rows are inserted / deleted
-- ---------------------------------------------------------------------------
create or replace function public.sync_post_likes_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_likes_count on public.post_likes;
create trigger trg_post_likes_count
  after insert or delete on public.post_likes
  for each row execute procedure public.sync_post_likes_count();


-- ---------------------------------------------------------------------------
-- Keep likes_count in sync for vip_posts
-- ---------------------------------------------------------------------------
create or replace function public.sync_vip_post_likes_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.vip_posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.vip_posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_vip_post_likes_count on public.vip_post_likes;
create trigger trg_vip_post_likes_count
  after insert or delete on public.vip_post_likes
  for each row execute procedure public.sync_vip_post_likes_count();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles        enable row level security;
alter table public.posts           enable row level security;
alter table public.post_likes      enable row level security;
alter table public.vip_posts       enable row level security;
alter table public.vip_post_likes  enable row level security;
alter table public.vip_codes       enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.notifications   enable row level security;


-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Any authenticated user can read any profile (public social layer)
create policy "profiles_public_read"
  on public.profiles
  for select
  to app_user
  using (true);

-- Users can insert their own profile (backup; trigger covers normal flow)
create policy "profiles_own_insert"
  on public.profiles
  for insert
  to app_user
  with check (id = app.uid());

-- Users can update only their own profile
create policy "profiles_own_update"
  on public.profiles
  for update
  to app_user
  using (id = app.uid())
  with check (id = app.uid());

-- Users cannot delete profiles (soft-delete handled at app layer)
-- Service role retains unrestricted access by default.


-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

-- Any authenticated user can read any public post
create policy "posts_public_read"
  on public.posts
  for select
  to app_user
  using (true);

-- Authors can insert their own posts
create policy "posts_own_insert"
  on public.posts
  for insert
  to app_user
  with check (author_id = app.uid());

-- Authors can update their own posts
create policy "posts_own_update"
  on public.posts
  for update
  to app_user
  using (author_id = app.uid())
  with check (author_id = app.uid());

-- Authors can delete their own posts
create policy "posts_own_delete"
  on public.posts
  for delete
  to app_user
  using (author_id = app.uid());


-- ---------------------------------------------------------------------------
-- post_likes
-- ---------------------------------------------------------------------------

-- Any authenticated user can read likes (needed for like counts / state)
create policy "post_likes_public_read"
  on public.post_likes
  for select
  to app_user
  using (true);

-- Users can like posts
create policy "post_likes_own_insert"
  on public.post_likes
  for insert
  to app_user
  with check (user_id = app.uid());

-- Users can unlike (delete) their own likes
create policy "post_likes_own_delete"
  on public.post_likes
  for delete
  to app_user
  using (user_id = app.uid());


-- ---------------------------------------------------------------------------
-- vip_posts — read restricted to active VIP members
-- ---------------------------------------------------------------------------

-- Only VIP members with a valid (non-expired) subscription can read VIP posts
create policy "vip_posts_vip_read"
  on public.vip_posts
  for select
  to app_user
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = app.uid()
        and p.is_vip = true
        and (p.vip_expires_at is null or p.vip_expires_at > now())
    )
  );

-- VIP members can post to the VIP feed
create policy "vip_posts_vip_insert"
  on public.vip_posts
  for insert
  to app_user
  with check (
    author_id = app.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = app.uid()
        and p.is_vip = true
        and (p.vip_expires_at is null or p.vip_expires_at > now())
    )
  );

-- Authors can update their own VIP posts
create policy "vip_posts_own_update"
  on public.vip_posts
  for update
  to app_user
  using (author_id = app.uid())
  with check (author_id = app.uid());

-- Authors can delete their own VIP posts
create policy "vip_posts_own_delete"
  on public.vip_posts
  for delete
  to app_user
  using (author_id = app.uid());


-- ---------------------------------------------------------------------------
-- vip_post_likes
-- ---------------------------------------------------------------------------

-- VIP members can read VIP likes
create policy "vip_post_likes_vip_read"
  on public.vip_post_likes
  for select
  to app_user
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = app.uid()
        and p.is_vip = true
        and (p.vip_expires_at is null or p.vip_expires_at > now())
    )
  );

-- VIP members can like VIP posts
create policy "vip_post_likes_vip_insert"
  on public.vip_post_likes
  for insert
  to app_user
  with check (
    user_id = app.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = app.uid()
        and p.is_vip = true
        and (p.vip_expires_at is null or p.vip_expires_at > now())
    )
  );

-- Users can unlike their own VIP likes
create policy "vip_post_likes_own_delete"
  on public.vip_post_likes
  for delete
  to app_user
  using (user_id = app.uid());


-- ---------------------------------------------------------------------------
-- vip_codes — service role only (no policies for authenticated role)
-- ---------------------------------------------------------------------------
-- RLS is enabled; no policies are granted to the `authenticated` or `anon` roles.
-- All access goes through service role (server-side API routes only).


-- ---------------------------------------------------------------------------
-- subscriptions — own read only
-- ---------------------------------------------------------------------------

create policy "subscriptions_own_read"
  on public.subscriptions
  for select
  to app_user
  using (user_id = app.uid());

-- Writes are service-role only (webhook handlers, no client-side writes).


-- ---------------------------------------------------------------------------
-- notifications — own read and update (mark as read)
-- ---------------------------------------------------------------------------

create policy "notifications_own_read"
  on public.notifications
  for select
  to app_user
  using (user_id = app.uid());

create policy "notifications_own_update"
  on public.notifications
  for update
  to app_user
  using (user_id = app.uid())
  with check (user_id = app.uid());

-- Inserts are service-role only (server sends notifications, never the client).


-- =============================================================================
-- DUAL PROFILE SYSTEM — Private / VIP profile columns
-- =============================================================================

alter table public.profiles
  add column if not exists private_display_name  text,
  add column if not exists private_avatar_url    text,
  add column if not exists private_bio           text,
  add column if not exists private_vibe          text,
  add column if not exists private_photos        text[],
  add column if not exists has_private_profile   boolean not null default false,
  add column if not exists public_photos         text[],
  add column if not exists public_links          jsonb;

comment on column public.profiles.private_display_name is 'Alter ego or real name shown only to VIP members.';
comment on column public.profiles.private_avatar_url   is 'Private avatar (R2 URL); shown only to VIP members.';
comment on column public.profiles.private_bio          is 'Intimate bio up to 400 chars; shown only to VIP members.';
comment on column public.profiles.private_vibe         is 'Private energy/vibe; shown only to VIP members.';
comment on column public.profiles.private_photos       is 'Up to 6 private photo URLs (R2); VIP-only.';
comment on column public.profiles.has_private_profile  is 'Whether the user has configured and enabled a VIP private profile.';
comment on column public.profiles.public_photos        is 'Up to 6 public photo URLs (R2); visible to all members.';
comment on column public.profiles.public_links         is 'Optional social handles e.g. {"instagram":"handle","twitter":"handle"}.';


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
