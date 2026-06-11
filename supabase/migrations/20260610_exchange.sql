CREATE TABLE IF NOT EXISTS exchange_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS exchange_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES exchange_listings(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id),
  offer_price_cents BIGINT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exchange_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active" ON exchange_listings FOR SELECT USING (status = 'active');
CREATE POLICY "seller_manage" ON exchange_listings FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "buyer_offer" ON exchange_offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "buyer_or_seller_read" ON exchange_offers FOR SELECT USING (
  auth.uid() = buyer_id OR
  auth.uid() = (SELECT seller_id FROM exchange_listings WHERE id = listing_id)
);
