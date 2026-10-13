-- R1 · Wardrobe looks join member safety (Apple App Review 1.2, Google Play UGC).
--
-- The Wardrobe "floor" shows every member's posted looks (photo + caption + brands). Until now the table had
-- no moderation at all. This extends 20261017_s1_moderation.sql to it, the same way that migration covers
-- posts, VIP posts, listings, tables and outings:
--   1. wardrobe_looks gets moderation_hidden / moderation_note / moderated_at, protected by the shared
--      ugc_protect_moderation() trigger (members can't set or flip them; staff / service role can).
--   2. Restrictive SELECT policy: hidden looks and looks by a member blocked in either direction drop out of
--      every member read; the author still sees their own.
--   3. Restrictive INSERT policy: posting a look needs the house rules accepted and no posting suspension
--      (can_post()).
--   4. content_reports accepts target_kind 'look'; moderation_target_table() maps it to wardrobe_looks.user_id,
--      so reports resolve the owner, refuse self-reports, auto-hide at 3 reporters, and block_content_owner()
--      works for looks.
--
-- Idempotent; skips the wardrobe parts when wardrobe_looks is absent. Needs 20261017_s1_moderation.sql.
-- Test: node tests/db/r1-ugc.mjs

-- ── 1–3. wardrobe_looks moderation ─────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.wardrobe_looks') is null then return; end if;

  alter table public.wardrobe_looks
    add column if not exists moderation_hidden boolean not null default false,
    add column if not exists moderation_note text,
    add column if not exists moderated_at timestamptz;

  drop trigger if exists trg_wardrobe_looks_protect_moderation on public.wardrobe_looks;
  create trigger trg_wardrobe_looks_protect_moderation before insert or update on public.wardrobe_looks
    for each row execute function public.ugc_protect_moderation();

  drop policy if exists wardrobe_looks_moderation_visible on public.wardrobe_looks;
  create policy wardrobe_looks_moderation_visible on public.wardrobe_looks as restrictive for select
    using (user_id = auth.uid()
           or (moderation_hidden = false and not public.is_blocked_between(auth.uid(), user_id)));

  drop policy if exists wardrobe_looks_terms_required on public.wardrobe_looks;
  create policy wardrobe_looks_terms_required on public.wardrobe_looks as restrictive for insert
    with check (public.can_post(auth.uid()));

  create index if not exists idx_wardrobe_looks_visible on public.wardrobe_looks (likes_count desc, created_at desc)
    where moderation_hidden = false;
end $$;

-- ── 4. Reports on looks ────────────────────────────────────────────────────────────────────
alter table public.content_reports drop constraint if exists content_reports_target_kind_check;
alter table public.content_reports add constraint content_reports_target_kind_check
  check (target_kind in ('post', 'vip_post', 'profile', 'listing', 'club_table', 'outing', 'look', 'nova_reply'));

/** Table + owner column behind a report kind (null for kinds with no member-owned row). */
create or replace function public.moderation_target_table(kind text)
returns table (tbl text, owner_col text) language sql immutable as $$
  select x.tbl, x.owner_col from (values
    ('post', 'posts', 'author_id'), ('vip_post', 'vip_posts', 'author_id'), ('profile', 'profiles', 'id'),
    ('listing', 'exchange_listings', 'seller_id'), ('club_table', 'club_tables', 'host_id'), ('outing', 'outings', 'host_id'),
    ('look', 'wardrobe_looks', 'user_id')
  ) as x(k, tbl, owner_col) where x.k = kind
$$;
