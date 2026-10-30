-- A Scrapbook film sends the member's own words to a third-party video model (Higgsfield), which is a separate
-- disclosure beyond `ai_processing` (Apple 5.1.2(i) third-party data sharing, Google Play AI-generated content).
-- Add the `video_ai` consent kind to member_consents so the sheet and the server gate can record and withdraw it.
--
--   video_ai  the member agreed that the title and description of a memory they turn into a film is sent to our
--             video provider (Higgsfield) to render the clip.
--
-- The gate lives in src/lib/ai-consent-gate.ts (neededKinds video → ['ai_processing','video_ai']); the route that
-- needs it is src/app/api/scrapbook/generate-video/route.ts. Client twins: src/lib/consents.ts,
-- src/components/account/ai-safety-panel.tsx, mobile/src/lib/consents.ts, mobile/src/components/rooms/AIConsent.tsx.
--
-- DRAFT — NOT YET APPLIED (see docs/REBUILD_PLAN.md §3). Applying widens an existing CHECK constraint, so any row
-- already present still satisfies it. Rollback is at the foot of this file, commented out.
--
-- Idempotent: safe to run twice. The original CHECK was written inline in 20261017_s2_consents.sql, so Postgres
-- named it automatically — drop whatever check on member_consents constrains kind by its definition rather than
-- relying on the conventional name.

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.member_consents'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%ai_processing%'
  loop
    execute format('alter table public.member_consents drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.member_consents
  add constraint member_consents_kind_check
  check (kind in ('ai_processing', 'photo_ai', 'video_ai', 'age_18'));

comment on column public.member_consents.kind is
  'ai_processing | photo_ai | video_ai | age_18 — see src/lib/consents.ts CONSENT_KINDS.';

-- ─── Rollback (run by hand against the DB; the migrate script executes the whole file, so this stays commented) ───
-- Rows already holding `video_ai` must be removed before the narrower CHECK can be re-added.
--
-- delete from public.member_consents where kind = 'video_ai';
-- alter table public.member_consents drop constraint if exists member_consents_kind_check;
-- alter table public.member_consents
--   add constraint member_consents_kind_check check (kind in ('ai_processing', 'photo_ai', 'age_18'));
-- comment on column public.member_consents.kind is
--   'ai_processing | photo_ai | age_18 — video_ai withdrawn (20261020_s3_consents_video_ai).';
