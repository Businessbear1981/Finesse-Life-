# 0007 — Profiles column-level RLS (backend step #3)

- **Status:** Proposed — migration written (incl. VIP-policy rewrites) + `tests/db/s4-profiles-rls.mjs` green, **NOT applied**. Needs principal sign-off.
- **Date:** 2026-10-13
- **Migration:** `supabase/migrations/20261020_s4_profiles_column_rls.sql` (draft)
- **Test:** `tests/db/s4-profiles-rls.mjs` (25 checks, in `npm run test:db`)
- **Depends on:** `20261009_security_floor.sql` (row policy), `20260803_member_profiles.sql`
- **Supersedes nothing.** Companion to ADR-0001 (Next.js `/api` canonical).

## Context

`20261009_security_floor.sql:60-62` closed *anonymous* profile reads but replaced them with:

```sql
create policy "profiles_member_read" on public.profiles for select to authenticated using (true);
```

That fixes **row** visibility only. The table-wide **column** grant from the base migrations is still
in place, so any authenticated member can read another member's `email`, `telegram_chat_id`,
`private_*`, `nightvision_data`, `style_dna`, `is_vip`, `vip_expires_at`, `role`, `terms_accepted_at`
and `posting_suspended_at` — with only the public anon key and their own session. The security-floor
file itself flagged this as the next step (`:57-59`).

RLS gates *which rows*; it cannot gate *which columns*. Column privacy needs column grants plus a
SECURITY DEFINER path for a member's own full row.

## Decision

1. **Rewrite every RLS policy that references a non-public profiles column** so it calls a
   SECURITY DEFINER helper instead. Five VIP policies selected `p.is_vip`/`p.vip_expires_at` in a
   subquery; they are dropped and recreated against `current_member_is_vip()` (see below).
2. **Revoke table-wide SELECT** on `public.profiles` from `anon` and `authenticated`.
3. **Grant only the public columns** to `authenticated`:
   `id, display_name, username, avatar_url, vibe, bio, city, interests, created_at,
   public_photos, public_links, check_in`.
   `anon` gets nothing (no anon row policy exists).
4. **`get_own_profile()`** — SECURITY DEFINER, returns `setof public.profiles where id = auth.uid()`
   — for the profile editor, identity export and nightvision editor.
5. **`current_member_is_vip()`** — SECURITY DEFINER, returns the caller's own active-VIP boolean —
   for the middleware gate, keylock, VIP lift, profile PATCH **and the VIP RLS policies**.
6. Existing per-row policies are unchanged; reads that need non-public columns and are **server
   routes** use the true service-role client (`src/lib/supabase/service.ts`).

Not changing: `is_vip`/`vip_expires_at`/`role` writes stay server-managed (the entitlements trigger
from 20261009 is untouched). Only SELECT grants change.

### Finding that shaped this #1 — local `getServiceClient` misnomer

`src/app/api/profile/route.ts:6` defines a local `getServiceClient()` that returns the **session
client** (`createClient()` from `src/lib/supabase/server.ts`), not service-role — the name is a
misnomer and RLS applies. The real elevated client is `@/lib/supabase/service#createServiceClient`.

### Finding that shaped this #2 — column privileges apply inside RLS policies (verified, PGlite)

Decisive finding that forced decision #1. Probed with the real VIP policies in PGlite:

| Grants on `profiles` | VIP read of `vip_posts` (policy subqueries `p.is_vip`) |
|---|---|
| column-grants **incl** `is_vip`+`vip_expires_at` | works |
| public columns only | **`ERROR: permission denied for table profiles`** |
| public only, but policy calls a SECURITY DEFINER helper | works |

So Postgres **does** enforce column privileges on columns referenced *inside an RLS policy
expression*, evaluated as the role running the query. A migration that only revoked SELECT and
repointed TS readers would have **broken the VIP rooms** for every member — the ADR as first drafted
was unsafe. `current_member_is_vip()` reads the same columns as its owner, so the rewritten policy
touches no unprotected column. There is **no** `club_board`/`can_post`/`map_*` variant of this
problem: those are `SECURITY DEFINER` and were unaffected.

Secondary finding: a policy with no `to` clause applies to `anon` too, and calling a function `anon`
cannot execute yields `permission denied for function`, not an empty result. The two original VIP
*read* policies had no `to` clause (public scope); they are recreated `to authenticated` — VIP
content is authenticated-only and `anon` was already denied by having no row policy.

## Consequences

- ✅ Closes the cross-member PII leak at the database, independent of any client.
- ✅ VIP rooms keep working (helper-based policies), verified by `tests/db/s4-profiles-rls.mjs`.
- ⚠️ **One-way door** — apply only with sign-off and a green `test:db`.
- ⚠️ Any reader still doing `select('*')` or selecting an ungranted column now gets only granted
  columns (PostgREST) or a 400/403 for an explicit ungranted column. Every reader below must be
  repointed **in the same release** as the migration.
- ⚠️ Write grants are untouched, so `update`/`insert`/`upsert` of `terms_*`, `nightvision_data`,
  `style_dna`, `posting_suspended_at` keep working.

## Repoint table — server (IN SCOPE: server API + lib + migrations)

| File:line | Current read | Mechanism after migration |
|---|---|---|
| `src/app/api/profile/route.ts:6-9` | local `getServiceClient()` = session client (misnomer) | import real `createServiceClient` from `@/lib/supabase/service` |
| `src/app/api/profile/route.ts:43` GET | own `id, display_name, username, avatar_url, gender, is_vip, vip_expires_at` | `.rpc('get_own_profile')`; return the fields the client consumes |
| `src/app/api/profile/route.ts:136` PATCH VIP gate | own `is_vip, vip_expires_at` | `.rpc('current_member_is_vip')` |
| `src/app/api/profile/route.ts:192` PATCH upsert `.select()` | all columns returned to client | explicit column list (no `email`/`private_*`) via service client |
| `src/app/api/member/route.ts:12` | **cross-member** `display_name, gender, vibe, city` | `createServiceClient()` (keeps `gender` readable without a table-wide grant) |
| `src/lib/supabase/middleware.ts:105` | `is_vip, vip_expires_at` (VIP gate) | `supabase.rpc('current_member_is_vip')` |
| `src/lib/vip-lift.ts:21` | `is_vip, vip_expires_at` | `.rpc('current_member_is_vip')` |
| `src/app/api/keylock/enter/route.ts:14` | `is_vip, vip_expires_at` | `.rpc('current_member_is_vip')` |
| `src/app/api/account/accept-terms/route.ts:15` | own `terms_accepted_at, terms_version` | `createServiceClient()` or `get_own_profile` |
| `src/app/api/identity/export/route.ts:11` | own `select('*')` (data export) | `.rpc('get_own_profile')` |
| `src/app/api/nightvision/profile/route.ts:26` | own `nightvision_data` | `.rpc('get_own_profile')` (POST :77 upsert unaffected) |
| `src/lib/moderation-server.ts:19` | `terms_accepted_at, posting_suspended_at` | `createServiceClient()` or `.rpc('get_own_profile')` |
| `src/lib/admin.ts:21` | `role` | `createServiceClient()` (helper already takes a client param) |
| `src/app/api/admin/ai-usage/route.ts:26` | `role` | `createServiceClient()` |
| `src/app/settings/ai-usage/page.tsx:53` | `role` (server component) | `createServiceClient()` |
| `src/lib/billing.ts:431` | `is_vip, vip_expires_at` | service client or `current_member_is_vip` |
| `src/lib/nova-requests.ts:121` | `nightvision_data, style_dna` | **already service client** — OK |
| `src/app/api/moderation/blocks/route.ts:22` | `id, display_name, username` | **already service client, public cols** — OK |
| `src/lib/billing.ts:265` | `id` | public — OK |
| `src/app/api/identity/context/route.ts:10` | `id, PROJECTABLE_FIELDS, created_at` | **OK** — `PROJECTABLE_FIELDS ⊆` allowlist (verified) |
| `src/app/api/telegram/webhook/route.ts`, `notify/route.ts`, `link/route.ts` | `telegram_chat_id`, own row | **already service client** — OK (corrects the draft table)

## Repoint table — web (IN SCOPE — approved: "everything in scope, all")

Direct client-side profiles reads through the anon+session key. After the migration these return
only granted columns; the **owner's own editor/dashboard reads will lose `private_*`/`role`/`email`
and must move to `get_own_profile` / a server route**:

| File:line | Note |
|---|---|
| `src/app/(hotel)/profile/page.tsx:149,152,153` | `select('*')` — own **and** cross-member by username → repoint target read to service client (renders `private_*`) |
| `src/app/(hotel)/profile/edit/page.tsx:290` | own editor → `get_own_profile` |
| `src/app/(hotel)/lobby/page.tsx:28` | own `select('*')` → `get_own_profile` |
| `src/app/(hotel)/lounge/page.tsx:47,64` | public cols only → **OK** (verify) |
| `src/app/(hotel)/vault/page.tsx:64` | own → `get_own_profile` |
| `src/app/(hotel)/vip/page.tsx:19` | own `is_vip/vip_expires_at` → `get_own_profile` |
| `src/app/settings/integrations/page.tsx:24` | own → service client |
| `src/app/(auth)/login/actions.ts:31` | own `intake_complete` → `get_own_profile` |
| `src/app/api/audit/route.ts:22` | `requireAdmin` `role` → service client (:127 `admin` already service — OK) |
| `src/app/api/integrations/[vendor]/route.ts:22`, `.../test/route.ts:13` | `requireAdmin` `role` → service client |

## Repoint table — mobile (IN SCOPE)

| File:line | Read | Verdict |
|---|---|---|
| `mobile/src/lib/rooms/lounge.ts:16-17` | own + cross-member public cols | all granted → **OK** |
| `mobile/src/lib/rooms/vip.ts:14` | nested author embed `display_name, username, avatar_url, vibe` | all granted → **OK** |
| any other `from('profiles')` in `mobile/` | — | audit before apply (none found) |

## Open decisions (resolved — principal approved all)

1. **`gender`** — not granted table-wide; `member/route.ts` repoints to the service client. ✅ approved.
2. **`public_photos`, `public_links`, `check_in`** — public. ✅ approved.
3. **`has_private_profile`** — **not** public. ✅ approved.
4. **`PROJECTABLE_FIELDS`** — verified `⊆` allowlist (`src/lib/identity.ts:5`). ✅ no change needed.

## Rollback

```sql
-- restore the original VIP policies first (drop helper-based, recreate the p.is_vip subquery form;
-- see the migration's §2 for the exact quals), then:
drop function if exists public.current_member_is_vip();
drop function if exists public.get_own_profile();
grant select on public.profiles to anon, authenticated;
```
