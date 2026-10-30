-- ================================================================================================
-- 20261020_s4b_profiles_column_grants.sql   ·   Backend step #3 (part B of 2) — column grants
-- ================================================================================================
-- DRAFT ONLY — NOT APPLIED. THIS IS THE BREAKING PART. Apply ONLY after 20261020_s4a has created the
-- helpers and the branch that calls them is deployed. Before that, the column revoke below makes the
-- currently deployed code's `.from('profiles').select('is_vip'…)` throw `permission denied`.
--
-- Run with:
--   SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261020_s4b_profiles_column_grants.sql
--
-- THE HOLE
--   20261009_security_floor.sql:57-62 replaced the anonymous read with
--     create policy "profiles_member_read" on public.profiles for select to authenticated using (true);
--   which fixed *row* visibility but left table-wide *column* grants in place. So any signed-in
--   member can read any other member's email, telegram_chat_id, private_*, nightvision_data,
--   style_dna, is_vip, vip_expires_at, role, terms_accepted_at, posting_suspended_at — with just
--   the public anon key and their own session, e.g. `from('profiles').select('*')`.
--
-- THE FIX (this part)
--   Revoke table-wide SELECT; grant only the public columns. RLS still gates *which rows*; grants
--   now additionally gate *which columns*. Own-row full reads go through get_own_profile(), VIP
--   gates through current_member_is_vip() (both created by 20261020_s4a).
-- ================================================================================================

-- ── 3. Public columns any authenticated member may read on any profile row ────────────────────────
-- Revoke the table-wide grant first (a table grant makes column grants meaningless).
revoke select on public.profiles from anon, authenticated;

grant select (
  id, display_name, username, avatar_url, vibe, bio, city, interests,
  created_at, public_photos, public_links, check_in
) on public.profiles to authenticated;
-- anon: intentionally not granted. No anon row policy exists, so anonymous reads stay closed.

-- Make PostgREST pick up the new column grants without a restart.
notify pgrst, 'reload schema';

-- ------------------------------------------------------------------------------------------------
-- ROLLBACK (run manually as a direct query; the migration runner executes the whole file as one
-- statement-batch, so this is commented out on purpose):
--
--   grant select on public.profiles to anon, authenticated;
-- ------------------------------------------------------------------------------------------------
