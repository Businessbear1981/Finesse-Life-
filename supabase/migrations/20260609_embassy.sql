CREATE TABLE IF NOT EXISTS embassy_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  item TEXT NOT NULL,
  source TEXT,
  retail_price_cents BIGINT,
  members_price_cents BIGINT,
  category TEXT,
  tier TEXT CHECK (tier IN ('budget','mid','contemporary','premium')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','review','live','rejected')),
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE embassy_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_only" ON embassy_deals FOR ALL USING (auth.uid() IS NOT NULL);
