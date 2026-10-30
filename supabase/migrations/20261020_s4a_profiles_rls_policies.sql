-- ================================================================================================
-- 20261020_s4a_profiles_rls_policies.sql   ·   Backend step #3 (part A of 2) — helpers + VIP policies
-- ================================================================================================
-- DRAFT ONLY — NOT APPLIED. This part is BACKWARD-COMPATIBLE: it creates two SECURITY DEFINER
-- helpers and rewrites the five VIP policies to call one of them. It does NOT touch the table-wide
-- SELECT grant, so the currently deployed code keeps reading is_vip/vip_expires_at normally.
--
-- Safe rollout (see docs/decisions/0007-profiles-column-rls.md):
--   1. apply THIS file (s4a)                 — non-breaking
--   2. apply 20261020_s3_consents_video_ai.sql
--   3. build + deploy the branch that calls the helpers
--   4. apply 20261020_s4b_profiles_column_grants.sql (the revoke/regrant) — breaking for old code
--
-- THE HOLE (closed by part B) and THE COLUMN-PRIVILEGE TRAP (why these policies are rewritten here):
--   Postgres enforces column privileges on columns referenced *inside an RLS policy expression*,
--   evaluated as the role executing the query. The five VIP policies sub-selected
--   p.is_vip/p.vip_expires_at from public.profiles. Revoking SELECT on those columns from
--   `authenticated` (part B) would make them throw `permission denied for table profiles` — breaking
--   the VIP rooms for everyone. A SECURITY DEFINER helper reads those columns as its owner, so the
--   rewritten policies touch no unprotected column. Verified on PGlite (2026-10-13).
--   Also: a policy with no `to` clause applies to `anon` too; calling a function `anon` may not
--   execute yields `permission denied for function`, not an empty result. The two original VIP read
--   policies had no `to` clause (public scope); they are recreated `to authenticated` — VIP content is
--   authenticated-only and `anon` was already denied by having no row policy.
-- ================================================================================================

-- ── 1. Owner-only SECURITY DEFINER read paths (created first — the policies below call them) ──────
-- The member's own complete row (profile editor, identity export, nightvision editor). Runs as the
-- function owner, so it reads all columns regardless of the part-B grants, but only ever for
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

-- Make PostgREST pick up the new functions + policy changes without a restart.
notify pgrst, 'reload schema';

-- ------------------------------------------------------------------------------------------------
-- ROLLBACK (run manually as a direct query; the migration runner executes the whole file as one
-- statement-batch, so this is commented out on purpose):
--
--   drop policy if exists "vip_posts_vip_read" on public.vip_posts;
--   create policy "vip_posts_vip_read" on public.vip_posts for select to authenticated using (
--     exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_vip = true
--               and (p.vip_expires_at is null or p.vip_expires_at > now())));
--   -- …repeat for vip_posts_vip_insert / vip_post_likes_vip_read / vip_post_likes_vip_insert /
--   --   vip_exclusives_vip_read (see §2 above for the exact original quals)…
--   drop function if exists public.current_member_is_vip();
--   drop function if exists public.get_own_profile();
-- ------------------------------------------------------------------------------------------------
