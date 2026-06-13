-- =============================================================================
-- Vault, Exchange, Scale — Missing Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- vault_accounts (one per user)
-- ---------------------------------------------------------------------------
create table if not exists public.vault_accounts (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null unique references public.profiles(id) on delete cascade,
  balance_cents         int         not null default 0 check (balance_cents >= 0),
  cashback_earned_cents int         not null default 0 check (cashback_earned_cents >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_vault_accounts_user_id on public.vault_accounts (user_id);

alter table public.vault_accounts enable row level security;

create policy "vault_own_read" on public.vault_accounts
  for select to authenticated using (user_id = auth.uid());

create policy "vault_own_update" on public.vault_accounts
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- service role inserts on fund/cashback events
create policy "vault_own_insert" on public.vault_accounts
  for insert to authenticated with check (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- vault_transactions
-- ---------------------------------------------------------------------------
create table if not exists public.vault_transactions (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  merchant       text        not null,
  amount_cents   int         not null,  -- negative = debit, positive = credit
  cashback_cents int         not null default 0,
  category       text        not null default 'general',
  direction      text        not null check (direction in ('debit', 'credit')),
  status         text        not null default 'settled' check (status in ('pending', 'settled', 'reversed')),
  reference_id   text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_vault_txn_user_created on public.vault_transactions (user_id, created_at desc);

alter table public.vault_transactions enable row level security;

create policy "vault_txn_own_read" on public.vault_transactions
  for select to authenticated using (user_id = auth.uid());

create policy "vault_txn_own_insert" on public.vault_transactions
  for insert to authenticated with check (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Auto-create vault_account row when a profile is created
-- ---------------------------------------------------------------------------
create or replace function public.create_vault_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.vault_accounts (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_vault_account on public.profiles;
create trigger trg_create_vault_account
  after insert on public.profiles
  for each row execute procedure public.create_vault_account();


-- ---------------------------------------------------------------------------
-- exchange_listings
-- ---------------------------------------------------------------------------
create table if not exists public.exchange_listings (
  id                   uuid        primary key default gen_random_uuid(),
  seller_id            uuid        not null references public.profiles(id) on delete cascade,
  title                text        not null,
  description          text,
  brand                text,
  size                 text,
  condition            text        not null default 'excellent' check (condition in ('new', 'excellent', 'good', 'fair')),
  asking_price_cents   int         not null check (asking_price_cents >= 100),
  category             text,
  photo_urls           text[]      not null default '{}',
  status               text        not null default 'active' check (status in ('active', 'sold', 'removed')),
  -- computed fee columns (8% platform cut)
  platform_fee_cents   int         generated always as (floor(asking_price_cents * 0.08)) stored,
  seller_receives_cents int        generated always as (asking_price_cents - floor(asking_price_cents * 0.08)) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_exchange_listings_status  on public.exchange_listings (status) where status = 'active';
create index if not exists idx_exchange_listings_seller  on public.exchange_listings (seller_id);
create index if not exists idx_exchange_listings_cat     on public.exchange_listings (category);

alter table public.exchange_listings enable row level security;

create policy "exchange_public_read" on public.exchange_listings
  for select to authenticated using (true);

create policy "exchange_own_insert" on public.exchange_listings
  for insert to authenticated with check (seller_id = auth.uid());

create policy "exchange_own_update" on public.exchange_listings
  for update to authenticated
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());


-- ---------------------------------------------------------------------------
-- exchange_offers
-- ---------------------------------------------------------------------------
create table if not exists public.exchange_offers (
  id             uuid        primary key default gen_random_uuid(),
  listing_id     uuid        not null references public.exchange_listings(id) on delete cascade,
  buyer_id       uuid        not null references public.profiles(id) on delete cascade,
  offer_cents    int         not null check (offer_cents >= 100),
  message        text,
  status         text        not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at     timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create index if not exists idx_exchange_offers_listing on public.exchange_offers (listing_id);
create index if not exists idx_exchange_offers_buyer   on public.exchange_offers (buyer_id);

alter table public.exchange_offers enable row level security;

-- Buyers see their own offers; sellers see offers on their listings
create policy "exchange_offers_buyer_read" on public.exchange_offers
  for select to authenticated using (buyer_id = auth.uid());

create policy "exchange_offers_seller_read" on public.exchange_offers
  for select to authenticated
  using (exists (select 1 from public.exchange_listings l where l.id = listing_id and l.seller_id = auth.uid()));

create policy "exchange_offers_own_insert" on public.exchange_offers
  for insert to authenticated with check (buyer_id = auth.uid());

create policy "exchange_offers_own_update" on public.exchange_offers
  for update to authenticated
  using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());


-- ---------------------------------------------------------------------------
-- scale_deals (group buying engine)
-- ---------------------------------------------------------------------------
create table if not exists public.scale_deals (
  id                uuid        primary key default gen_random_uuid(),
  title             text        not null,
  brand             text        not null,
  description       text,
  image_url         text,
  original_price_cents  int     not null check (original_price_cents > 0),
  group_price_cents     int     not null check (group_price_cents > 0),
  goal_count        int         not null default 5 check (goal_count >= 2),
  current_count     int         not null default 0 check (current_count >= 0),
  category          text        not null,
  deadline          timestamptz,
  status            text        not null default 'open' check (status in ('open', 'met', 'closed', 'cancelled')),
  created_at        timestamptz not null default now()
);

-- Seed with 6 luxury deals
insert into public.scale_deals (title, brand, description, image_url, original_price_cents, group_price_cents, goal_count, current_count, category, deadline)
values
  ('Le Carré Scarf', 'Hermès', 'Silk twill — Fall 2026 collection. Group unlocks at 5.', 'https://images.unsplash.com/photo-1583922606661-0822ed0bd916?w=400&q=80', 44500, 32000, 5, 3, 'accessories', now() + interval '3 days'),
  ('Cloud Sneaker', 'On Running', 'Cloudmonster 2 — all colourways. Group at 8.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', 16000, 11500, 8, 5, 'footwear', now() + interval '5 days'),
  ('Santal 33 — 50ml', 'Le Labo', 'Cult fragrance. Group unlocks city pricing.', 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80', 21000, 15500, 4, 2, 'beauty', now() + interval '7 days'),
  ('Cashmere Crewneck', 'Loro Piana', 'Baby cashmere, four neutrals. Group at 6.', 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=400&q=80', 189500, 138000, 6, 1, 'fashion', now() + interval '10 days'),
  ('Gentle Monster HEYDER', 'Gentle Monster', 'Sold out at retail. Group re-order at 10.', 'https://images.unsplash.com/photo-1473496169904-658ba7574b0d?w=400&q=80', 35000, 24000, 10, 7, 'accessories', now() + interval '2 days'),
  ('Pilates Reformer', 'Align Pilates', 'Studio-grade home reformer. Group at 5.', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80', 299500, 219000, 5, 3, 'wellness', now() + interval '14 days')
on conflict do nothing;


alter table public.scale_deals enable row level security;

create policy "scale_public_read" on public.scale_deals
  for select to authenticated using (true);


-- ---------------------------------------------------------------------------
-- scale_joins (who has joined a deal)
-- ---------------------------------------------------------------------------
create table if not exists public.scale_joins (
  id         uuid        primary key default gen_random_uuid(),
  deal_id    uuid        not null references public.scale_deals(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (deal_id, user_id)
);

alter table public.scale_joins enable row level security;

create policy "scale_joins_read" on public.scale_joins
  for select to authenticated using (true);

create policy "scale_joins_own_insert" on public.scale_joins
  for insert to authenticated with check (user_id = auth.uid());

-- Increment deal count on join
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

drop trigger if exists trg_scale_join_count on public.scale_joins;
create trigger trg_scale_join_count
  after insert on public.scale_joins
  for each row execute procedure public.increment_scale_count();


-- ---------------------------------------------------------------------------
-- interests on profiles (for real compatibility scoring)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists interests    text[]  default '{}',
  add column if not exists check_in     text    default null;

comment on column public.profiles.interests is 'Array of lifestyle interests e.g. {travel, fitness, dining, nightlife, fashion}';
comment on column public.profiles.check_in  is 'Current status set by user: out_tonight, date_night, working, traveling, low_key, shopping';
