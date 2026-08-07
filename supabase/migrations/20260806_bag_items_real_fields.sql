-- The bag/items route inserts color and acquired_year, which the frontend
-- (src/app/(hotel)/bag/page.tsx) genuinely reads and displays, but neither
-- column exists on bag_items (master schema) — every POST was failing.
alter table bag_items add column if not exists color text;
alter table bag_items add column if not exists acquired_year text;
