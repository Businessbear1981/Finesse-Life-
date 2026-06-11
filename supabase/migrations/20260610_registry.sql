CREATE TABLE IF NOT EXISTS registry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS outings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  occasion_type TEXT,
  date DATE,
  location TEXT,
  note TEXT,
  status TEXT DEFAULT 'proposed',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS outing_participants (
  outing_id UUID REFERENCES outings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'invitee',
  status TEXT DEFAULT 'pending',
  PRIMARY KEY (outing_id, user_id)
);
CREATE TABLE IF NOT EXISTS registry_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES registry_items(id) ON DELETE CASCADE,
  pledger_id UUID REFERENCES auth.users(id),
  amount_cents BIGINT NOT NULL,
  status TEXT DEFAULT 'pledged',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE registry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outing_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_pledges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_access" ON registry_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "creator_access" ON outings FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "participant_access" ON outing_participants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pledger_access" ON registry_pledges FOR ALL USING (auth.uid() = pledger_id);
