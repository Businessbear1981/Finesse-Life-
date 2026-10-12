-- Ported from supabase/migrations/20260610_registry.sql by scripts/port-supabase-migrations.mjs
CREATE TABLE IF NOT EXISTS registry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app.users(id) ON DELETE CASCADE,
  outing_id UUID,
  title TEXT NOT NULL,
  brand TEXT,
  price_cents BIGINT DEFAULT 0,
  pledged_cents BIGINT DEFAULT 0,
  photo_url TEXT,
  source TEXT DEFAULT 'upload',
  occasion TEXT,
  category TEXT,
  partner TEXT,
  status TEXT DEFAULT 'active',
  visibility TEXT DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT now()
);
alter table registry_items add column if not exists id UUID  DEFAULT gen_random_uuid();
alter table registry_items add column if not exists user_id UUID REFERENCES app.users(id) ON DELETE CASCADE;
alter table registry_items add column if not exists outing_id UUID;
alter table registry_items add column if not exists title TEXT NOT NULL;
alter table registry_items add column if not exists brand TEXT;
alter table registry_items add column if not exists price_cents BIGINT DEFAULT 0;
alter table registry_items add column if not exists pledged_cents BIGINT DEFAULT 0;
alter table registry_items add column if not exists photo_url TEXT;
alter table registry_items add column if not exists source TEXT DEFAULT 'upload';
alter table registry_items add column if not exists occasion TEXT;
alter table registry_items add column if not exists category TEXT;
alter table registry_items add column if not exists partner TEXT;
alter table registry_items add column if not exists status TEXT DEFAULT 'active';
alter table registry_items add column if not exists visibility TEXT DEFAULT 'private';
alter table registry_items add column if not exists created_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS outings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES app.users(id),
  title TEXT NOT NULL,
  occasion_type TEXT,
  date DATE,
  location TEXT,
  note TEXT,
  status TEXT DEFAULT 'proposed',
  created_at TIMESTAMPTZ DEFAULT now()
);
alter table outings add column if not exists id UUID  DEFAULT gen_random_uuid();
alter table outings add column if not exists creator_id UUID REFERENCES app.users(id);
alter table outings add column if not exists title TEXT NOT NULL;
alter table outings add column if not exists occasion_type TEXT;
alter table outings add column if not exists date DATE;
alter table outings add column if not exists location TEXT;
alter table outings add column if not exists note TEXT;
alter table outings add column if not exists status TEXT DEFAULT 'proposed';
alter table outings add column if not exists created_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS outing_participants (
  outing_id UUID REFERENCES outings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app.users(id),
  role TEXT DEFAULT 'invitee',
  status TEXT DEFAULT 'pending',
  PRIMARY KEY (outing_id, user_id)
);
alter table outing_participants add column if not exists outing_id UUID REFERENCES outings(id) ON DELETE CASCADE;
alter table outing_participants add column if not exists user_id UUID REFERENCES app.users(id);
alter table outing_participants add column if not exists role TEXT DEFAULT 'invitee';
alter table outing_participants add column if not exists status TEXT DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS registry_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES registry_items(id) ON DELETE CASCADE,
  pledger_id UUID REFERENCES app.users(id),
  amount_cents BIGINT NOT NULL,
  status TEXT DEFAULT 'pledged',
  created_at TIMESTAMPTZ DEFAULT now()
);
alter table registry_pledges add column if not exists id UUID  DEFAULT gen_random_uuid();
alter table registry_pledges add column if not exists item_id UUID REFERENCES registry_items(id) ON DELETE CASCADE;
alter table registry_pledges add column if not exists pledger_id UUID REFERENCES app.users(id);
alter table registry_pledges add column if not exists amount_cents BIGINT NOT NULL;
alter table registry_pledges add column if not exists status TEXT DEFAULT 'pledged';
alter table registry_pledges add column if not exists created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE registry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outing_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_pledges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_access" ON registry_items FOR ALL USING (app.uid() = user_id);
CREATE POLICY "creator_access" ON outings FOR ALL USING (app.uid() = creator_id);
CREATE POLICY "participant_access" ON outing_participants FOR ALL USING (app.uid() = user_id);
CREATE POLICY "pledger_access" ON registry_pledges FOR ALL USING (app.uid() = pledger_id);
