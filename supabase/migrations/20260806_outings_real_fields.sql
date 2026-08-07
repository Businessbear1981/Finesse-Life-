-- The registry/outings route uses occasion_type and note fields that the
-- frontend (NewOutingSheet, OutingItemCard) genuinely depends on, but the
-- outings table (master schema) has neither. host_id/date_at already exist
-- and are mapped in the route instead of renamed here.
alter table outings add column if not exists occasion_type text;
alter table outings add column if not exists note text;
