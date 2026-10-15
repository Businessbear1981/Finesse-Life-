-- ================================================================================================
-- 20261020_s4_profiles_column_rls.sql   ·   Backend step #3 — profiles column-level privacy
-- ================================================================================================
-- DRAFT ONLY — NOT APPLIED. This is a one-way door: it changes which columns any given role may
-- read. Apply only with principal approval, only after tests/db is extended to cover the new
-- grants/RPCs/policies and is green. Run with:
--   SUPABASE_DB_PASSWORD=... npm run db:migrate supabase/migrations/20261020_s4_profiles_column_rls.sql
--
-- THE HOLE
--   20261009_security_floor.sql:57-62 replaced the anonymous read with
--     create policy "profiles_member_read" on public.profiles for select to authenticated using (true);
--   which fixed *row* visibility but left table-wide *column* grants in place. So any signed-in
--   member can read any other member's email, telegram_chat_id, private_*, nightvision_data,
--   style_dna, is_vip, vip_expires_at, role, terms_accepted_at, posting_suspended_at — with just
--   the public anon key and their own session, e.g. `from('profiles').select('*')`.
--   The security_floor comment at :57-59 named this the next step.
--
-- THE FIX
--   1. Rewrite every RLS policy that references a non-public profiles column so it calls a
--      SECURITY DEFINER helper instead (see THE COLUMN-PRIVILEGE TRAP below).
--   2. Revoke table-wide SELECT; grant only the public columns.
--   3. Owner-only SECURITY DEFINER RPC for the member's own complete row.
--   4. SECURITY DEFINER helper so server code can read the caller's own VIP entitlement without
--      table-wide access.
--   Existing per-row policies (own read / member read) are unchanged — RLS still gates *which
--   rows*; grants now additionally gate *which columns*.
--
-- THE COLUMN-PRIVILEGE TRAP (why step 1 exists — verified on PGlite, 2026-10-13)
--   Postgres enforces column privileges on columns referenced *inside an RLS policy expression*,
--   evaluated as the role executing the query. Five VIP policies selected p.is_vip/p.vip_expires_at
--   from public.profiles in a subquery. Revoking SELECT on those columns from `authenticated`
--   therefore made those policies throw `permission denied for table profiles` — breaking the VIP
--   rooms for everyone, not just leaking. A SECURITY DEFINER helper reads the same columns as its
--   owner, so the policy no longer touches an unprotected column at all.
--   Also: a policy that has no `to` clause applies to `anon` too; if it calls a function `anon`
--   may not execute, `anon` gets `permission denied for function` instead of an empty result. The
--   two original read policies had no `to` clause (public scope). They are recreated `to
--   authenticated` — VIP content is authenticated-only, and `anon` was already denied by having no
--   row policy. This keeps `anon` off the helper entirely.
--
-- See docs/decisions/0007-profiles-column-rls.md for the full per-route repoint table.
-- ================================================================================================

-- ── 1. Owner-only SECURITY DEFINER read paths (created first — the policies below call them) ──────
-- The member's own complete row (profile editor, identity export, nightvision editor). Runs as the
-- function owner, so it reads all columns regardless of the grants in §3, but only ever for
-- auth.uid(). Other members cannot call it and get someone else's row.
create or replace function public.get_own_profile()
returns setof public.profiles
language sql security definer set search_path = public stable as $$
  select * from public.profiles where id = auth.uid();
$$;
revoke all on function public.get_own_profile() from public, anon;
grant execute on function public.get_own_profile() to authenticated;

-- The caller's own VIP entitlement (middleware gate, keylock, VIP lift, profile PATCH, VIP RLS
-- policies). Returns only the caller's own entitlement; it cannot probe another member's VIP state.
create or replace function public.current_member_is_vip()
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select p.is_vip and (p.vip_expires_at is null or p.vip_expires_at > now())
       from public.profiles p where p.id = auth.uid()),
    false);
$$;
revoke all on function public.current_member_is_vip() from public, anon;
grant execute on function public.current_member_is_vip() to authenticated;

-- ── 2. VIP policies: replace the profiles subquery with the helper ───────────────────────────────
-- Effective definitions being replaced (latest wins over the mvp/master history):
--   vip_posts_vip_read        20260617_master_finesse_schema.sql:385  (select, public scope)
--   vip_posts_vip_insert      20261009_security_floor.sql:243         (insert, authenticated)
--   vip_post_likes_vip_read   20260609000001_finesse_mvp.sql:458      (select, authenticated)
--   vip_post_likes_vip_insert 20260609000001_finesse_mvp.sql:473      (insert, authenticated)
--   vip_exclusives_vip_read   20260617_master_finesse_schema.sql:412  (select, public scope)
-- Command, role scope and the author/self condition are preserved; only the VIP test changes.

drop policy if exists "vip_posts_vip_read" on public.vip_posts;
create policy "vip_posts_vip_read" on public.vip_posts
  for select to authenticated using (public.current_member_is_vip());

drop policy if exists "vip_posts_vip_insert" on public.vip_posts;
create policy "vip_posts_vip_insert" on public.vip_posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.current_member_is_vip());

drop policy if exists "vip_post_likes_vip_read" on public.vip_post_likes;
create policy "vip_post_likes_vip_read" on public.vip_post_likes
  for select to authenticated using (public.current_member_is_vip());

drop policy if exists "vip_post_likes_vip_insert" on public.vip_post_likes;
create policy "vip_post_likes_vip_insert" on public.vip_post_likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.current_member_is_vip());

drop policy if exists "vip_exclusives_vip_read" on public.vip_exclusives;
create policy "vip_exclusives_vip_read" on public.vip_exclusives
  for select to authenticated using (public.current_member_is_vip());

-- ── 3. Public columns any authenticated member may read on any profile row ────────────────────────
-- Revoke the table-wide grant first (a table grant makes column grants meaningless).
revoke select on public.profiles from anon, authenticated;

grant select (
  id, display_name, username, avatar_url, vibe, bio, city, interests,
  created_at, public_photos, public_links, check_in
) on public.profiles to authenticated;
-- anon: intentionally not granted. No anon row policy exists, so anonymous reads stay closed.

-- Make PostgREST pick up the new functions + column grants + policy changes without a restart.
notify pgrst, 'reload schema';

-- ------------------------------------------------------------------------------------------------
-- ROLLBACK (run manually as a direct query; the migration runner executes the whole file as one
-- statement-batch, so this is commented out on purpose):
--
--   -- restore the original VIP policies (drop the helper-based ones, recreate the subquery form)
--   drop policy if exists "vip_posts_vip_read" on public.vip_posts;
--   create policy "vip_posts_vip_read" on public.vip_posts for select to authenticated using (
--     exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_vip = true
--               and (p.vip_expires_at is null or p.vip_expires_at > now())));
--   -- …repeat for vip_posts_vip_insert / vip_post_likes_vip_read / vip_post_likes_vip_insert /
--   --   vip_exclusives_vip_read (see §2 above for the exact original quals)…
--   drop function if exists public.current_member_is_vip();
--   drop function if exists public.get_own_profile();
--   grant select on public.profiles to anon, authenticated;
-- ------------------------------------------------------------------------------------------------
