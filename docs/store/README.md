# Store submission kit — Finesse Life (iOS + Android)

Everything needed to put the Expo app (`mobile/`) on the App Store and Google Play. Code-side readiness is
tracked item by item in [CHECKLIST.md](CHECKLIST.md); this file is the founder’s runbook.

| File | What it’s for |
|---|---|
| [README.md](README.md) | This runbook: accounts, env, commands, testing, versioning |
| [CHECKLIST.md](CHECKLIST.md) | Every audit item with its status (fixed in code / founder action) |
| [app-review-notes.md](app-review-notes.md) | Reviewer notes + sign-in for App Store Connect and Play “App access” |
| [listing-ios.md](listing-ios.md) | App Store name, subtitle, promo text, description, keywords, URLs, category, age rating |
| [listing-play.md](listing-play.md) | Play title, short/full description, category, contact, IARC answers, App content |
| [app-privacy-ios.md](app-privacy-ios.md) | App Privacy (nutrition label) answers |
| [data-safety-play.md](data-safety-play.md) | Play Data safety form answers |
| `check-lengths.mjs` | `node docs/store/check-lengths.mjs` — checks every listing field against its limit and banned words |
| `mobile/store/` | Screenshots, Play icon + feature graphic, the tools that make them, reviewer look photos |

The store build is the release build: `IS_STORE_BUILD` is true whenever `__DEV__` is false
(`mobile/src/lib/release.ts`). It hides VIP / Penthouse, the Vault, Backstage, After Dark, Score, live Jazz,
Lab studios, the Club, food scan and wellness. Don’t describe any of those in a listing.

---

## 1. Accounts to create (founder)

Do these first — D-U-N-S and organization verification take days to weeks.

1. **D-U-N-S number** for the legal entity (free from Dun & Bradstreet; Apple has a lookup/request form at
   developer.apple.com/enroll/duns-lookup). The legal name must match the company registration exactly.
2. **Apple Developer Program — Organization** (US$99/year) at developer.apple.com/programs/enroll, with the
   D-U-N-S number, a company website on the company’s domain (finesselife.vip) and a work email on that domain.
   An organization account shows the company as the seller; an individual account would show your name.
   Note the **Team ID** (Membership details).
3. **App Store Connect app record** — My Apps → “+” → New App: platform iOS, name **Finesse Life**, primary
   language English (U.S.), bundle ID **vip.finesselife.app** (register it first under Certificates, IDs &
   Profiles → Identifiers if it isn’t offered), SKU e.g. `finesse-life-ios`. Note the **Apple ID** of the app
   (App Information → General → Apple ID, a number) — that is `ascAppId`.
   Then: Agreements, Tax and Banking → accept the Free Apps agreement (no paid agreement is needed — the app
   sells nothing).
4. **Google Play Console — Organization account** (US$25 one-time) at play.google.com/console/signup, with the
   same D-U-N-S number and legal name. An organization account is not subject to the “12 testers for 14 days”
   closed-test rule that new personal accounts get before production access. Complete identity and website
   verification (Play verifies finesselife.vip ownership through Search Console).
5. **Create the Play app** — All apps → Create app: name **Finesse Life**, App, Free, declarations accepted.
   The package name **vip.finesselife.app** is fixed by the first upload.
6. **Play service account for EAS Submit** — Google Cloud console (project linked in Play Console → Setup →
   API access): create a service account, create a JSON key, then in Play Console → Users and permissions →
   invite the service-account email with **Release** permissions for this app. Save the key as
   `mobile/secrets/play-service-account.json` (git-ignored — never commit it).
7. **Expo account** — `npx eas-cli login`, then `cd mobile && npx eas-cli init` once to link the project
   (writes `extra.eas.projectId` into `app.json`; commit that).
8. **Support mailbox** — support@finesselife.vip must exist and be read daily (it is the published contact for
   reports, deletion and support; the Terms promise action on reports within 24 hours).

## 2. Server environment (Vercel → Production)

The app talks to the web server at `https://finesselife.vip`. Reviewers can’t get in unless these are set.

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth and data |
| `SUPABASE_SERVICE_ROLE_KEY` | Server routes (keylock, deletion, moderation) |
| `KEYLOCK_SECRET` (≥ 32 chars, `openssl rand -hex 32`) | The door (signed challenges) |
| `ENTRANCE_KEYLOCK_CODE` (six digits) | The house code — goes in the review notes, never in the repo |
| `INTEGRATIONS_ENCRYPTION_KEY` | Connected services |
| `NEXT_PUBLIC_SITE_URL` = `https://finesselife.vip` | Links in emails / agents |
| `AI_GATEWAY_API_KEY` (or `ANTHROPIC_API_KEY`) | Nova |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_URL`, `CLOUDFLARE_ACCOUNT_ID` | Photo uploads |
| `ADMIN_EMAIL` | Moderation queue access |

Stripe keys are only needed for the web; the app sells nothing.

Supabase → Authentication → URL configuration: add `https://finesselife.vip/reset-password` to the redirect
allow-list (used by “Forgot password?” in the app).

## 3. Database

1. Apply every migration in `supabase/migrations/` in order (`node scripts/migrate.js`, or the Supabase SQL
   editor). The store-readiness ones are `20261017_s1_moderation.sql` (terms acceptance, reports, blocks,
   auto-hide) and `20261017_s2_consents.sql` (AI / photo / 18+ consents).
2. Seed the reviewer (dry run first — it prints the plan and which env vars are present, never their values):

   ```sh
   node scripts/seed-demo.mjs --reviewer
   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… REVIEWER_PASSWORD='a-long-unique-password' \
     node scripts/seed-demo.mjs --reviewer --apply
   ```

   This creates `review@demo.finesselife.vip` (not VIP; 18+ and terms pre-accepted; AI consent left for the
   reviewer to see), 24 demo members as Lounge authors, and the reviewer’s own Diary, looks, Closet week, trip,
   Per Diem night, Entourage, Kitchen plan, Gym sets and four finished Nova drafts. Re-run before every
   submission (dates move forward; the password is reset to `REVIEWER_PASSWORD`).
   Remove later with `node scripts/seed-demo.mjs --reviewer --purge` (reviewer) / `--purge` (demo members).
3. Store `REVIEWER_PASSWORD` in your password manager; it goes into App Store Connect and Play Console only.

## 4. App build configuration

- **EAS environment variables** (expo.dev → project → Environment variables, environment `production`):
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL=https://finesselife.vip`.
  Do **not** set `EXPO_PUBLIC_STORE_PREVIEW` for production — release builds are already store builds.
- **`mobile/eas.json` → `submit.production`**: replace `REPLACE_WITH_ASC_APP_ID` with the app’s Apple ID
  (step 1.3) and `REPLACE_WITH_TEAM_ID` with the Team ID (step 1.2). Android reads
  `./secrets/play-service-account.json` (step 1.6).
- Credentials: let EAS manage them (first `eas build` asks to create the iOS distribution certificate and
  provisioning profile, and the Android upload keystore). Back up the keystore from expo.dev — losing it means
  Play App Signing key-reset paperwork.

## 5. Versioning

- **Marketing version**: `expo.version` in `mobile/app.json` (`0.1.0` today). Set it to **`1.0.0`** for the first
  public release; bump it (1.0.1, 1.1.0, …) for every store release. Both stores show it.
- **Build numbers**: `eas.json` has `"appVersionSource": "remote"` and `production.autoIncrement: true`, so EAS
  keeps and increments iOS `buildNumber` and Android `versionCode` on every production build. Never set them
  in `app.json`. To start from a specific number: `npx eas-cli build:version:set`.
- One build per submission; a rejected build can be replaced by a new build under the same version.

## 6. Build and submit — exact commands

Run from `mobile/` after `npm ci`, `npx tsc --noEmit` and a final look at a store-preview build.

```sh
cd mobile

# iOS
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --latest            # uploads to App Store Connect → TestFlight

# Android
npx eas-cli build -p android --profile production
npx eas-cli submit -p android --latest        # uploads an AAB to the Play "internal" track as a draft
```

(`eas build -p ios --profile production` / `eas submit -p ios` are the same commands with a global `eas-cli`.)

The very first Android upload must go through Play Console by hand (Play only accepts API uploads once an app
has one release): download the `.aab` from the EAS build page and upload it in Testing → Internal testing →
Create new release. After that, `eas submit -p android` works.

## 7. Testing before review

**iOS — TestFlight**
1. After `eas submit -p ios`, the build appears in App Store Connect → TestFlight after processing (~10–30 min).
   Answer the export-compliance question if asked (`ITSAppUsesNonExemptEncryption` is false — standard HTTPS only).
2. Internal testing: add yourself and the team (App Store Connect users) → install via the TestFlight app.
3. Walk through the reviewer path exactly as written in `app-review-notes.md`: house code → floor → Sign in with
   the reviewer account → 18+ → Nova consent → a Nova message → Report on a reply → Lounge Report/Block →
   Diary, Wardrobe, Departures, Per Diem → This Is You → Your key (don’t delete).
4. Optional external testing needs a short Beta App Review; not required before submitting.

**Android — Play internal testing**
1. Testing → Internal testing → Testers: create an email list (up to 100), copy the opt-in link, install from Play.
2. Same walkthrough as iOS. Check the pre-launch report (Release → Testing → Pre-launch report) for crashes and
   accessibility warnings.
3. Promote: Internal → Production (or Closed → Production) when ready. Organization accounts can go straight to
   production; set a staged rollout (e.g. 20%).

## 8. Store assets

| Asset | Path | Size |
|---|---|---|
| iOS screenshots (6.9") | `mobile/store/ios/01…08-*.png` | 1290×2796 ×8 |
| Play phone screenshots | `mobile/store/play/01…08-*.png` | 1080×1920 ×8 |
| Play icon | `mobile/store/play/icon-512.png` | 512×512 RGBA |
| Play feature graphic | `mobile/store/play/feature-graphic-1024x500.png` | 1024×500 |
| iOS app icon | from `mobile/assets/brand/icon.png` via the build | 1024×1024 |

iOS: upload the 6.9" set only — App Store Connect scales it for smaller iPhones. The app is iPhone-only
(`supportsTablet: false`), so no iPad screenshots are needed.

**Regenerate** (needs Playwright + Chromium; see `mobile/store/README.md`):

```sh
cd mobile
EXPO_PUBLIC_STORE_PREVIEW=1 CI=1 BROWSER=none npx expo start --web --port 8098 --clear   # other shell
BASE=http://localhost:8098 node store/tools/capture.cjs    # raw captures → store/raw/{ios,play}
node store/tools/compose.cjs                               # caption band + frame → store/ios, store/play
node store/tools/graphics.cjs                              # Play icon + feature graphic
```

**Re-capture before launch, signed in.** Today’s set is captured signed out, so rooms show their sample state and
“Sign in” cards. Once the production database is live and the reviewer is seeded, re-capture signed in as the
reviewer account (`REVIEWER_EMAIL=review@demo.finesselife.vip REVIEWER_PASSWORD=… node store/tools/capture.cjs`,
with the Expo server started with the production `EXPO_PUBLIC_SUPABASE_*` values), or take them on a simulator /
emulator signed in to a TestFlight / internal build and drop them into `mobile/store/raw/{ios,play}` before
`compose.cjs` — so every screen shows real content — reviewers compare screenshots to the app (Guideline 2.3.3).

## 9. Submission order (checklist)

1. Accounts (§1) → server env (§2) → migrations + reviewer seed (§3) → EAS env + eas.json (§4).
2. Version 1.0.0 → production builds → TestFlight + Play internal → walkthrough passes on both.
3. App Store Connect: listing (`listing-ios.md`), screenshots, App Privacy (`app-privacy-ios.md`), age rating,
   review notes + sign-in (`app-review-notes.md`), select the build → **Submit for Review**.
4. Play Console: store listing (`listing-play.md`), graphics, App content (privacy, ads, app access, content
   rating, target audience 18+, data safety, account deletion, financial features, health) → production
   release from the internal build → **Send for review**.
5. During review: watch support@finesselife.vip and the phone in the review contact; keep the reviewer account
   and house code unchanged until approval.
