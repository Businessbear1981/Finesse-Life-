-- Ported from supabase/migrations/20260610_exchange.sql by scripts/port-supabase-migrations.mjs
CREATE TABLE IF NOT EXISTS exchange_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES app.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  size TEXT,
  condition TEXT DEFAULT 'excellent',
  asking_price_cents BIGINT NOT NULL,
  platform_fee_cents BIGINT GENERATED ALWAYS AS (FLOOR(asking_price_cents * 0.08)) STORED,
  seller_receives_cents BIGINT GENERATED ALWAYS AS (asking_price_cents - FLOOR(asking_price_cents * 0.08)) STORED,
  photo_urls TEXT[] DEFAULT '{}',
  category TEXT,
  status TEXT DEFAULT 'active',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
alter table exchange_listings add column if not exists id UUID  DEFAULT gen_random_uuid();
alter table exchange_listings add column if not exists seller_id UUID REFERENCES app.users(id) ON DELETE CASCADE;
alter table exchange_listings add column if not exists title TEXT NOT NULL;
alter table exchange_listings add column if not exists description TEXT;
alter table exchange_listings add column if not exists brand TEXT;
alter table exchange_listings add column if not exists size TEXT;
alter table exchange_listings add column if not exists condition TEXT DEFAULT 'excellent';
alter table exchange_listings add column if not exists asking_price_cents BIGINT NOT NULL;
alter table exchange_listings add column if not exists platform_fee_cents BIGINT GENERATED ALWAYS AS (FLOOR(asking_price_cents * 0.08)) STORED;
alter table exchange_listings add column if not exists seller_receives_cents BIGINT GENERATED ALWAYS AS (asking_price_cents - FLOOR(asking_price_cents * 0.08)) STORED;
alter table exchange_listings add column if not exists photo_urls TEXT[] DEFAULT '{}';
alter table exchange_listings add column if not exists category TEXT;
alter table exchange_listings add column if not exists status TEXT DEFAULT 'active';
alter table exchange_listings add column if not exists views INTEGER DEFAULT 0;
alter table exchange_listings add column if not exists created_at TIMESTAMPTZ DEFAULT now();


CREATE TABLE IF NOT EXISTS exchange_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES exchange_listings(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES app.users(id),
  offer_price_cents BIGINT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
alter table exchange_offers add column if not exists id UUID  DEFAULT gen_random_uuid();
alter table exchange_offers add column if not exists listing_id UUID REFERENCES exchange_listings(id) ON DELETE CASCADE;
alter table exchange_offers add column if not exists buyer_id UUID REFERENCES app.users(id);
alter table exchange_offers add column if not exists offer_price_cents BIGINT NOT NULL;
alter table exchange_offers add column if not exists message TEXT;
alter table exchange_offers add column if not exists status TEXT DEFAULT 'pending';
alter table exchange_offers add column if not exists created_at TIMESTAMPTZ DEFAULT now();


ALTER TABLE exchange_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active" ON exchange_listings FOR SELECT USING (status = 'active');
CREATE POLICY "seller_manage" ON exchange_listings FOR ALL USING (app.uid() = seller_id);
CREATE POLICY "buyer_offer" ON exchange_offers FOR INSERT WITH CHECK (app.uid() = buyer_id);
CREATE POLICY "buyer_or_seller_read" ON exchange_offers FOR SELECT USING (
  app.uid() = buyer_id OR
  app.uid() = (SELECT seller_id FROM exchange_listings WHERE id = listing_id)
);
