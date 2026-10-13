# Store-readiness checklist

Scores every item from the store-readiness audit (baseline 40.5/100). Status as of the store-readiness pass on
2026-10-13, verified against the working tree:

- **Fixed in code**: done in the repo; nothing left for the founder beyond deploying it.
- **Founder action**: needs an account, a key, a decision or a console form. The code side is done and the
  steps are in this folder.

| # | Item | Status | Evidence / what’s left |
|---|---|---|---|
| 1 | Privacy policy (BLOCKER) | **Fixed in code** · deploy | `src/app/privacy/page.tsx` (public in `src/lib/supabase/middleware.ts`): email, user id, posts, photos, AI processing by Anthropic, Entourage third-party data, paper-portfolio snapshot, diary/calendar, retention, rights. Linked in the app from the door, sign-in, account desk and delete-account (`mobile/src/components/legal/LegalLinks.tsx`). Founder: deploy, then check https://finesselife.vip/privacy loads signed out. |
| 2 | UGC: report / block / filter / terms (BLOCKER) | **Fixed in code** · founder action | Reports, blocks, auto-hide after 3 reports, terms acceptance before posting: `supabase/migrations/20261017_s1_moderation.sql` (test `tests/db/s1-moderation.mjs`), `src/app/api/moderation/*`, `src/app/api/account/accept-terms`. Text filter and media-URL validation on posts (`src/lib/moderation.ts`, `src/app/api/posts/route.ts`). Report + Block menu in the app (`mobile/src/components/rooms/moderation.tsx`, used by Lounge, Market, Lifestyle, Penthouse). Binding terms with zero-tolerance clause and 24-hour commitment (`src/app/terms/page.tsx`); contact at `/support`. Founder: apply the migration, set `ADMIN_EMAIL`, staff the queue daily (the 24-hour promise is public). |
| 3 | Nova AI disclosure / consent / report (BLOCKER) | **Fixed in code** · deploy | Consent sheet naming Anthropic before the first use of any AI feature and before photos, recorded in `member_consents` (`20261017_s2_consents.sql`, test `tests/db/s2-consents.mjs`). **Enforced on the server**: every member AI route (`/api/nova`, `/api/nova/requests` + confirm, `/api/agents`, Stylist photo, Camera identify, Registry identify, NightVision analyze, market price, intelligence query) returns 403 `consent_required` without it (`src/lib/ai-consent-gate.ts`, test `tests/ai-consent-gate.test.ts`). One app-wide sheet answers every ask and every refusal, then retries: mobile `AIConsentHost` (`mobile/src/components/rooms/AIConsent.tsx`, mounted in `_layout.tsx`; `aiApi`/`aiUpload` in `mobile/src/lib/consents.ts`), web `AIConsentHost` (`src/components/nova/ai-consent.tsx`, mounted in `src/app/providers.tsx`). “Report this reply” on every AI output (`NovaReport.tsx`, `RequestCard.tsx`, plan-with-nova, Starmaker lyrics, Carpe Diem brief, Scrapbook lines, trips/rides/Per Diem/Entourage plans; web `report-reply.tsx` incl. `nova-plan.tsx`). Founder: apply the migration. |
| 4 | VIP sold on web, unlocked in app (BLOCKER) | **Fixed in code** · founder decision | Store build hides VIP / Penthouse / VIP feed (`RELEASE.vip = false`, `HIDDEN_ROOMS` in `mobile/src/lib/release.ts`); steering copy (“VIP access lives in your web profile”, “Manage membership at finesselife.vip”) removed from `mobile/src`. Listings and review notes don’t mention VIP. Founder decision: ship VIP in the app only with Apple IAP / Play Billing (StoreKit + Play Billing + server receipt validation), or keep it web-only and never reference it in the app. |
| 5 | Reviewer access (BLOCKER) | **Fixed in code** · founder action | `scripts/seed-demo.mjs --reviewer` (dry run default; `--apply` with `REVIEWER_PASSWORD`) creates `review@demo.finesselife.vip`: not VIP, 18+ and terms pre-accepted, AI consent left for the reviewer to see, seeded Diary, Wardrobe looks + Closet week, trip, Per Diem night, Entourage, Kitchen, Gym, four ready Nova drafts, Lounge posts by demo members. Notes: `app-review-notes.md`. Founder: set `KEYLOCK_SECRET`, `ENTRANCE_KEYLOCK_CODE`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel Production; run the seed; paste the house code + password into App Store Connect and Play App access. |
| 6 | Placeholders visible (BLOCKER) | **Fixed in code** | Release flags hide what can’t complete: Vault, Backstage, VIP, Lab studios, Club, Jazz live join/tip, Lounge After Dark + Score, Gym food scan + wellness (`mobile/src/lib/release.ts`, gated in Lounge, JazzClub, Social, Gym, `room/[id].tsx`, `hotel.tsx`, `lobby.tsx`). Store-preview capture (`EXPO_PUBLIC_STORE_PREVIEW=1`) confirms the Lounge shows only Lounge + Outings. Signed-out rooms still show clearly labelled sample content (“Sample page · not your diary”) — honest, and reviewers sign in. |
| 7 | Vault = unlicensed prepaid card (BLOCKER) | **Fixed in code** · founder decision | Vault and the 12% coin hidden in the store build (`RELEASE.vault`); no Vault copy in listings, screenshots or seeded posts (seed post “The Vault 12%” rewritten). Founder: only re-enable with a licensed issuer named in the app and Play’s Financial features declaration updated. |
| 8 | Permission strings | **Fixed in code** | `mobile/app.json`: photo/camera strings name Stylist, Camera and Wardrobe; image-picker `microphonePermission` removed (the mic string lives with expo-audio for Starmaker only). |
| 9 | Dating / social-ranking sample content | **Fixed in code** | Income filters and “Social Score” naming removed from `mobile/src/components/rooms/Lounge.tsx`; After Dark / Score tabs gated off in store builds. |
| 10 | No in-app age gate | **Fixed in code** · founder action | 18+ confirmation at first sign-in (`mobile/src/app/sign-in.tsx`, `age_18` consent). Founder: set ratings per `listing-ios.md` (18+) and `listing-play.md` (IARC answers, Target audience 18+). |
| 11 | No ErrorBoundary | **Fixed in code** | `ErrorBoundary` exported from `mobile/src/app/_layout.tsx` with a way back to the Lobby. |
| 12 | expo-secure-store plugin | **Fixed in code** | `["expo-secure-store", {"faceIDPermission": false, "configureAndroidBackup": true}]` in `mobile/app.json`. |
| 13 | Store metadata, support contact | **Fixed in code** · founder action | Screenshots 8× iOS 1290×2796 and 8× Play 1080×1920, Play icon 512 and feature graphic (`mobile/store/`, reproducible with `mobile/store/tools/*.cjs`). Listings with checked limits (`listing-ios.md`, `listing-play.md`, `check-lengths.mjs`), support/marketing/privacy URLs, App Privacy and Data safety answers. `/support` page + support@finesselife.vip; delete-account screen names the address. Founder: create the mailbox; paste listings; re-capture screenshots signed in with the reviewer account once the database is live (README §8). |
| 14 | eas.json submit config; fragile registry; misc | **Partly fixed** · founder action | Fixed: `registry.ts` reads `mobile/src/lib/room-manifest.json` (synced by `scripts/sync-room-manifest.mjs`, test `tests/room-manifest-sync.test.ts`); unused `assets/images/*` removed; README background matches `#050505`; `submit.production` has the fields + `serviceAccountKeyPath`. Founder: fill `ascAppId` / `appleTeamId`, add the Play service-account key at `mobile/secrets/` (README §1, §4). Open (minor, not a rejection risk): `mobile/src/app/penthouse.tsx` `getSession().then(…)` has no `.catch` (route is hidden in store builds); URL scheme is still the generic `finesse` — change to `finesselife` before launch if deep links are added. |
| 15 | Accessibility: faint text contrast, tiny labels, Dynamic Type | **Fixed in code** | `ah.faint` → `#808086` (≥ 4.5:1 on all inks, `mobile/src/lib/ah.ts`); rail/dock labels capped with `maxFontSizeMultiplier` (`hotel.tsx`). Founder: run the Play pre-launch report and Xcode Accessibility Inspector on the release build. |
| 16 | Forgot password; deletion without sign-in | **Fixed in code** · founder action | “Forgot password?” in `sign-in.tsx` → `/reset-password`; `/account/delete-info` offers in-app, web and email deletion. Founder: add `https://finesselife.vip/reset-password` to Supabase Auth redirect URLs. |
| 17 | Privacy manifest | **Fixed in code** · verify | `ios.privacyManifests` in `app.json` (required-reason APIs + collected data types, no tracking), matching `app-privacy-ios.md`. Founder: after `eas build -p ios`, check the generated `PrivacyInfo.xcprivacy` in the build logs / archive. |
| — | Old 1920s / gold / deco copy | **Fixed in code** | Room copy now After Hours (Departures reads “chrome”, app.json description updated). Only “rose-gold” (the palette) remains in `FINESSE_31_ROOM_PROJECT.json`. |

## Score

Code-fixable work: **all 17 items addressed in code** (item 14 has two minor, non-blocking leftovers noted above).

Founder actions before submitting (in order — details in [README.md](README.md)):

1. D-U-N-S → Apple Developer (Organization) → App Store Connect app record; Play Console (Organization) → Play
   app → service account.
2. Vercel Production env (`KEYLOCK_SECRET`, `ENTRANCE_KEYLOCK_CODE`, service key, AI and R2 keys, `ADMIN_EMAIL`).
3. Apply migrations (incl. `20261017_s1_moderation.sql`, `20261017_s2_consents.sql`); Supabase reset-password
   redirect.
4. `node scripts/seed-demo.mjs --reviewer --apply` with `REVIEWER_PASSWORD`.
5. support@finesselife.vip mailbox, read daily; moderation queue staffed (24-hour promise).
6. Fill `eas.json` IDs + service-account key; EAS env vars; version 1.0.0.
7. Build, TestFlight / internal test, walk the reviewer path.
8. Re-capture screenshots signed in; paste listings, privacy answers, ratings and review notes; submit.
9. Decide VIP (IAP or web-only) and Vault (licensed issuer) before ever enabling them in a store build.
10. **Legal review** of `/privacy` and `/terms` by counsel (company legal name and address, governing law,
    dispute terms, region-specific rights), and **create the support@finesselife.vip mailbox** before `/support`
    is used as the store support URL. The “Draft for legal review” / “Founder action” banners on those pages are
    hidden in production (`showDraftNotes` in `src/components/legal/legal-page.tsx`); set `LEGAL_DRAFT_BANNER=1`
    on a preview deployment to see them while reviewing.
