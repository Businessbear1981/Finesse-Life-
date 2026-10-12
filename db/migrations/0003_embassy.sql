-- Ported from supabase/migrations/20260609_embassy.sql by scripts/port-supabase-migrations.mjs
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
  submitted_by UUID REFERENCES app.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
alter table embassy_deals add column if not exists id UUID  DEFAULT gen_random_uuid();
alter table embassy_deals add column if not exists brand TEXT NOT NULL;
alter table embassy_deals add column if not exists item TEXT NOT NULL;
alter table embassy_deals add column if not exists source TEXT;
alter table embassy_deals add column if not exists retail_price_cents BIGINT;
alter table embassy_deals add column if not exists members_price_cents BIGINT;
alter table embassy_deals add column if not exists category TEXT;
alter table embassy_deals add column if not exists tier TEXT CHECK (tier IN ('budget','mid','contemporary','premium'));
alter table embassy_deals add column if not exists status TEXT DEFAULT 'pending' CHECK (status IN ('pending','review','live','rejected'));
alter table embassy_deals add column if not exists submitted_by UUID REFERENCES app.users(id);
alter table embassy_deals add column if not exists created_at TIMESTAMPTZ DEFAULT now();


ALTER TABLE embassy_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_only" ON embassy_deals FOR ALL USING (app.uid() IS NOT NULL);
