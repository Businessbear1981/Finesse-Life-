-- registry/items/route.ts has always inserted/selected brand, occasion,
-- source, pledged_cents, and a status column that never existed on
-- registry_items (real columns: name, description, url, image_url,
-- price_cents, category, purchased, purchased_by, purchased_at). Every
-- insert has been failing silently and returning a fake success response —
-- nothing added to the Registry has ever actually persisted. These are real,
-- actively-used frontend fields (brand badge, occasion tag, source badge,
-- pledge-funding progress bar), not invented ones, so we add the columns
-- rather than drop the fields.
alter table public.registry_items
  add column if not exists brand text,
  add column if not exists occasion text,
  add column if not exists source text not null default 'upload',
  add column if not exists pledged_cents int not null default 0;
