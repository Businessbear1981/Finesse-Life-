-- Wire all hollow modules to real tables
-- Covers: salon_bookings, bag_items, wardrobe_looks/likes/wishlist, social_accounts/broadcasts, nova_persona

-- ── SALON BOOKINGS ─────────────────────────────────────────────────────────────
create table if not exists salon_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id text not null,
  service_name text not null,
  price_cents integer not null,
  duration text,
  category text,
  edition text not null default 'finesse',
  requested_date text not null,
  requested_time text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);
alter table salon_bookings enable row level security;
create policy "salon_own" on salon_bookings for all using (auth.uid() = user_id);

-- ── BAG (COLLECTION) ───────────────────────────────────────────────────────────
create table if not exists bag_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text not null,
  category text not null default 'other',
  value_est_cents integer not null default 0,
  color text,
  acquired_year text,
  photo_url text,
  note text,
  edition text not null default 'finesse',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table bag_items enable row level security;
create policy "bag_own" on bag_items for all using (auth.uid() = user_id);

-- ── WARDROBE LOOKS (closet posts) ──────────────────────────────────────────────
create table if not exists wardrobe_looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text,
  brands text[] default '{}',
  caption text,
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table wardrobe_looks enable row level security;
create policy "looks_read" on wardrobe_looks for select using (true);
create policy "looks_own"  on wardrobe_looks for all    using (auth.uid() = user_id);

create table if not exists wardrobe_look_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  look_id uuid not null references wardrobe_looks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, look_id)
);
alter table wardrobe_look_likes enable row level security;
create policy "likes_read_all" on wardrobe_look_likes for select using (true);
create policy "likes_own"      on wardrobe_look_likes for all    using (auth.uid() = user_id);

-- ── WARDROBE WISHLIST ──────────────────────────────────────────────────────────
create table if not exists wardrobe_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  item text not null,
  price_est_cents integer not null default 0,
  added_label text not null,
  created_at timestamptz not null default now()
);
alter table wardrobe_wishlist enable row level security;
create policy "wishlist_own" on wardrobe_wishlist for all using (auth.uid() = user_id);

-- ── SOCIAL ACCOUNTS (switchboard OAuth state) ──────────────────────────────────
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  access_token_enc text,
  platform_user_id text,
  platform_username text,
  connected boolean not null default false,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, platform)
);
alter table social_accounts enable row level security;
create policy "social_own" on social_accounts for all using (auth.uid() = user_id);

-- ── SOCIAL BROADCASTS (post log) ───────────────────────────────────────────────
create table if not exists social_broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platforms text[] not null,
  content text not null,
  results jsonb not null default '{}',
  status text not null default 'sent',
  created_at timestamptz not null default now()
);
alter table social_broadcasts enable row level security;
create policy "broadcasts_own" on social_broadcasts for all using (auth.uid() = user_id);

-- ── NOVA PERSONA on profiles ───────────────────────────────────────────────────
alter table profiles add column if not exists nova_persona jsonb;
