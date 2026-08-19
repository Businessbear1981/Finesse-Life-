-- scrapbook/log route inserts entry_type and season, which the Archive page
-- genuinely reads and displays (type-colored badges, season grouping), but
-- neither column exists on scrapbook_entries (master schema) — every log
-- insert was failing.
alter table scrapbook_entries add column if not exists entry_type text;
alter table scrapbook_entries add column if not exists season text;

-- video-status/generate-video routes and the Archive frontend all use
-- 'ready' as the finished-video state; the master schema's check constraint
-- only allows 'complete'. 'complete' is never written anywhere in the app —
-- align the DB to the real app vocabulary rather than renaming across 3 files.
alter table scrapbook_entries drop constraint if exists scrapbook_entries_video_status_check;
alter table scrapbook_entries add constraint scrapbook_entries_video_status_check
  check (video_status in ('none', 'pending', 'ready', 'failed'));
