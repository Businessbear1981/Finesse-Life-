CREATE TABLE IF NOT EXISTS scrapbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

ALTER TABLE scrapbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON scrapbook_entries
  FOR ALL USING (auth.uid() = user_id);
