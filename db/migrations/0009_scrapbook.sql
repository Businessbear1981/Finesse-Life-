-- Ported from supabase/migrations/20260610_scrapbook.sql by scripts/port-supabase-migrations.mjs
CREATE TABLE IF NOT EXISTS scrapbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL, -- 'outing_complete', 'registry_funded', 'scale_win', 'vault_milestone', 'stylist_box', 'nova_moment'
  title TEXT NOT NULL,
  description TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  video_url TEXT, -- Higgsfield-generated video URL
  video_job_id TEXT, -- Higgsfield job ID for polling
  video_status TEXT DEFAULT 'none', -- 'none', 'pending', 'ready', 'failed'
  metadata JSONB,
  season TEXT, -- e.g., 'Summer 2026', 'Fall 2026'
  created_at TIMESTAMPTZ DEFAULT now()
);
alter table scrapbook_entries add column if not exists id UUID  DEFAULT gen_random_uuid();
alter table scrapbook_entries add column if not exists user_id UUID REFERENCES app.users(id) ON DELETE CASCADE;
alter table scrapbook_entries add column if not exists entry_type TEXT NOT NULL;
alter table scrapbook_entries add column if not exists title TEXT NOT NULL;
alter table scrapbook_entries add column if not exists description TEXT;
alter table scrapbook_entries add column if not exists photo_urls TEXT[] DEFAULT '{}';
alter table scrapbook_entries add column if not exists video_url TEXT;
alter table scrapbook_entries add column if not exists video_job_id TEXT;
alter table scrapbook_entries add column if not exists video_status TEXT DEFAULT 'none';
alter table scrapbook_entries add column if not exists metadata JSONB;
alter table scrapbook_entries add column if not exists season TEXT;
alter table scrapbook_entries add column if not exists created_at TIMESTAMPTZ DEFAULT now();


ALTER TABLE scrapbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON scrapbook_entries
  FOR ALL USING (app.uid() = user_id);
