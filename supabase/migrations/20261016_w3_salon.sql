-- Finesse — The Salon: member-owned booking *requests*. Idempotent.
-- Before: two "for all" owner policies (salon_bookings_own, salon_own) let a member write any status, including
-- 'confirmed' — a booking the salon never confirmed. After: members read their own rows, insert only 'pending'
-- requests, and may only move their own pending request to 'cancelled'. 'confirmed' / 'completed' are written by
-- the service role once a salon partner confirms (none is connected yet). The API now uses the member's own
-- session client, so these policies are what enforces ownership.

alter table public.salon_bookings enable row level security;

drop policy if exists "salon_bookings_own" on public.salon_bookings;
drop policy if exists "salon_own" on public.salon_bookings;
drop policy if exists salon_bookings_owner_read on public.salon_bookings;
drop policy if exists salon_bookings_owner_request on public.salon_bookings;
drop policy if exists salon_bookings_owner_cancel on public.salon_bookings;

create policy salon_bookings_owner_read on public.salon_bookings
  for select to authenticated using (auth.uid() = user_id);
create policy salon_bookings_owner_request on public.salon_bookings
  for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy salon_bookings_owner_cancel on public.salon_bookings
  for update to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status in ('pending', 'cancelled'));

-- Members never delete history and never touch the table signed out.
revoke all on public.salon_bookings from anon;
revoke delete on public.salon_bookings from authenticated;
grant select, insert, update on public.salon_bookings to authenticated;
