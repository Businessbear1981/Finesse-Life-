# Finesse Life — State

> **Status:** PRE-LAUNCH (demand-gated — build weight stays low until the founding-cohort / anchor-partner side is confirmed)
> **Last updated:** 2026-10-14 (`sean/rebuild-plan` — After Hours RN rebuild + profiles column privacy #3, incl. the full reader repoint; see the 2026-10-13 section) · **Last verified:** 2026-07-14 (live URLs, repo tree; deep audit facts date to 2026-06-23)
> **One-liner:** Luxury hotel-styled social/lifestyle PWA with AI concierge, curated commerce, and a member rebate card program — live at finesselife.vip, membership not yet transacting.
> **Current state:** UI + concierge are real; **no payment path exists** (no checkout, no subscriptions). The gate to the transact sprint is demand confirmation, not engineering.
> **Links:** `AGENTS.md` (charter/SOP) · `docs/decisions/` (ADRs) · `CONTEXT.md` (glossary) · `OPS.md` (runbook) · GitHub Issues (work tracking)

This is the shared, repo-level context document — what is actually built, wired, and live.
It is updated **via PR, in the same PR as the change that moved the state**. Read it at
session start; never re-explain history that's already recorded here.

Facts carry confidence tags: `verified` (checked against ground truth on the stated date) ·
`asserted` (stated, not re-checked) · `assumed` (best guess).

---

## Live topology

| Service | URL / id | Status | Last verified |
|---|---|---|---|
| Frontend + API (Next.js 16, Vercel `ardan-edge-capital/finesselife`) | **finesselife.vip** | LIVE, 200 | 2026-07-14 `verified` |
| Old domain | finesselife.app | **dead** — alias removed (commit `af49a65`); docs that cite it are stale | 2026-07-14 `verified` |
| Supabase (DB + auth) | `zcqcgqsovrjlxxiipuzg` | live, canonical | `asserted` (OPS.md) |
| Cloudflare R2 | bucket `finesse-life` | storage only | `asserted` |
| DNS | Porkbun (`finesselife.vip` + `.app`) | — | `asserted` |
| Railway FastAPI (`backend/`) | project `e91bd0fe-…` | **DORMANT — not deployed** (ADR-0001); all live logic is in Next.js `/api` | `asserted` (OPS.md) |

Deploys are **CLI-only** (`npm run deploy`) — the Vercel GitHub webhook is broken and `git push` does not deploy. `asserted` (OPS.md "THE ONE RULE").

## What is real vs. mock

From the 2026-06-23 line-by-line audit — `asserted` (predates the June/July room work: Kitchen, Gym, gender-aware lobby, salon rework; re-verify per module before building on it):

| Module | Real or mock |
|---|---|
| Hotel UX / dual-brand experience, room navigation | **Real** |
| Nova / Stylist concierge | **Real** (Anthropic Claude via AI Gateway) |
| Supabase auth + VIP-code redemption (grants 1-yr VIP) | Auth **real**. Redemption was **broken** (cookie-bound "service" client ran under member RLS → every code 404) — rebuilt on `sean/backend-security-floor` as an atomic service-role RPC (2026-10-09 audit, `asserted` from source) |
| Inbound Stripe webhook (`api/webhooks`) | **Real** endpoint, but nothing upstream creates payments |
| Checkout / PaymentIntent / subscriptions | **Missing entirely** — no `/subscribe`, no billing migrations |
| Scout & Price-Hunter | **Broken** — query columns/statuses that don't exist; return nothing |
| `scale/join` | **Broken** — inserts columns absent from `scale_joins`; silent no-op |
| Market/Exchange listings | **Mock** — `DEMO_LISTINGS` + `DEMO_PIN` in `src/app/page.tsx` and `(hotel)/market/page.tsx`, never calls the Exchange API (`verified` still present 2026-07-14) |
| Vault rebate | Rate **12%** by founder decision (ADR-0005, 2026-10-12). Writes frozen until card partner + funding source are signed |
| Lab (Alpaca paper-trading connect) | **Real enough to matter** — stores account snapshot + truncated key → Finesse is NOT securities-free; legal read budgeted |

## Database

Canonical: Supabase `zcqcgqsovrjlxxiipuzg`. Migrations live in `supabase/migrations/` and run via `npm run db:migrate <file>` (direct connection) — `supabase db push` does not work here. Which migrations are applied vs merely on disk has **not** been re-verified since the June audit; billing/subscription tables have no migrations at all. `asserted`.

## 2026-10-01 — Keylock hotel build (`sean/keylock-hotel-build`)

`asserted` until deployed: server-verified entrance KeyLock (client `DEMO_PIN` removed), Lobby private lift →
`/vip/penthouse` (separate lock, consumes `is_vip`), VIP middleware RLS bug fixed, 31-room registry + Lobby
directory, six new plates (Ballroom, Jazz Club, This Is You, Closet, Diary, Camera — preview/specified),
append-only `revenue_events`, Vault member writes **frozen** (423) pending partner sign-off, secret fallbacks
removed, committed DB password stripped from tracked files (**rotation still required**), Expo app in `mobile/`.
Needs: migration `20261001_keylocks_vip_lift_revenue_ledger.sql` + env `KEYLOCK_SECRET`, `ENTRANCE_KEYLOCK_CODE`.
ADR: `docs/decisions/0002-keylocks-private-lift-and-vault-freeze.md`.

Continued same day (`asserted`): APIs + live views for Diary, Ballroom, Closet, This Is You, Camera, Jazz Club;
Scale pledge state machine (no charge path); API 401 JSON + **webhooks no longer redirected to /login**; mobile
sign-in + real private lift. Migrations `20261002_plates_24_31.sql`, `20261003_scale_pledge_states.sql`.

Pass 5 (`asserted`): Gym + Kitchen APIs/live panels (migration `20261004_gym_kitchen.sql`), Camera photos kept
private in the Closet, 19 vitest tests (`npm test`), signed-out smoke (`npm run smoke`), GitHub Actions CI.

## Known gaps that will bite

1. **No payment path** — membership cannot transact. This is the whole Phase-1 sprint, gated on demand confirmation.
2. **Committed secret:** the Supabase DB password was in `OPS.md` and `scripts/migrate.js` — stripped from tracked files on 2026-10-01 but still in git history. **Rotate it.**
3. **Vault** — code now 1%-parameterised and member writes frozen (423) until the rate/partner decision is signed off.
4. Scout / Price-Hunter / scale-join schema mismatches — features silently return nothing.
5. Stale-domain drift: OPS.md and older docs still say `finesselife.app`.

## Active work

Tracked in GitHub Issues + PRs on `Businessbear1981/Finesse-Life-`. Current phase gate: Sean confirming the demand side (anchor partners + founding cohort) → then the paid-membership transact sprint. Engineering is otherwise quiet; Sean is actively building rooms (Kitchen, Gym, salon — June/July commits).

## 2026-10-02 — AI token usage ledger (`sean/ai-token-usage`, on top of `sean/keylock-hotel-build`)

`asserted` until deployed: every Claude call (Nova, Nova vision, Camera identify, Stylist, Bernard, Registry identify, truth checks, intelligence jobs) writes token counts + estimated cost to `ai_usage_events` (append-only, FORCE RLS, no prompt content). Admin dashboard `/settings/ai-usage`; read-only export `/api/admin/ai-usage` → `npm run usage:obsidian` writes daily notes into an Obsidian vault.
Needs: migration `20261005_ai_usage_events.sql` + env `AI_USAGE_EXPORT_TOKEN` (optional `AI_PRICING_JSON`). ADR: `docs/decisions/0003-ai-token-usage-ledger.md`.
`verified` 2026-10-02 via connectors: Supabase project `zcqcgqsovrjlxxiipuzg` is **paused (INACTIVE)**; Vercel `finesse-life` latest production deploy **ERROR** (type error in `embassy/page.tsx:540`, already fixed on `main`); a second Vercel project `finesselife` also lists `finesselife.vip`.

## 2026-10-09 — Backend security floor + maps (`sean/backend-security-floor`, on top of `sean/mobile-keylock`)

Full read-only audit of the web app, the Expo app and all 106 API routes → `docs/FRONTEND_MAP.md`, `docs/BACKEND_MAP.md` (ranked backlog in §6). `asserted` from source; nothing re-checked against the live DB.

Shipped on the branch (not merged, not deployed, **migration not applied**):

| Change | Where | Truth |
|---|---|---|
| Entitlement columns server-managed: members can't set `is_vip`, `vip_expires_at`, new `profiles.role` | `20261009_security_floor.sql` (trigger) | wired (PGlite-tested) |
| Anonymous profile reads closed (members still read members) | same | wired |
| Vault balances/credits writable only by the server (closes the freeze bypass) | same | wired |
| Scale: members pledge + cancel only; no self-advance to `paid`, no delete; one count trigger (was double-counting) | same | wired |
| RLS on `stripe_events`, `truth_checks`; procurement tokens server-minted; embassy deals not editable by members | same | wired |
| VIP redemption = atomic `redeem_vip_code` RPC (service role only) + `vip_code_redemptions` | migration + `api/vip/redeem` | wired |
| One admin rule: `profiles.role` admin/owner or `ADMIN_EMAIL` (old `username==='admin'` was claimable) | `src/lib/admin.ts`, `api/vip/codes`, `vip/codes` page | wired |
| Telegram: webhook secret required; `/link` takes a signed 15-min code, not a user id; notify self-only | `src/lib/telegram-link.ts`, `api/telegram/*` | wired (needs env + setWebhook) |
| Media webhook requires `MEDIA_WEBHOOK_SECRET`; committed Higgsfield credentials removed | `api/webhooks/media`, `api/scrapbook/video-status` | wired — **rotate the Higgsfield key** |
| Procurement token redeem is single-use (conditional update); CSPRNG for VIP codes and tokens | `api/procurement/redeem`, `lib/agents/procurement.ts` | wired |
| Scrapbook log IDOR + stylist sign-in (cherry-picked `sean/api-security-fixes`) | `api/scrapbook/log`, `api/stylist/analyze-photo` | wired |
| `npm run test:db` — PGlite policy test (32 checks), added to CI | `tests/db/security-floor.mjs` | passing |

Deploy additions (principal approval): apply `20261009_security_floor.sql` after 20261001–20261005; set `TELEGRAM_WEBHOOK_SECRET` + re-run Telegram `setWebhook` with `secret_token`; set `MEDIA_WEBHOOK_SECRET` and add it to vendor webhook URLs; grant the first admin from a direct DB session: `update public.profiles set role = 'owner' where id = '<founder id>';`. Rotate: Supabase DB password, Higgsfield key pair, demo account password.

### 2026-10-09 (second commit) — honest frontend pass

Web + mobile fixes from `docs/FRONTEND_MAP.md` (summary at the top of that file). New env vars: `DEMO_ACCOUNT_EMAIL`, `DEMO_ACCOUNT_PASSWORD`, `DEMO_ACCESS_CODES` (without them `/demo` says access is closed — the old credentials were in the client bundle; rotate the demo password). Migration `20261009_security_floor.sql` §8 restricts VIP-feed inserts to active VIPs (dropped the OR'd `vip_posts_own_write`). Cashback copy: superseded 2026-10-12 — 12% restored per ADR-0005. Verified: web `tsc`, 32 unit tests, `test:db` 35/35, `next build`, signed-out page smoke (`/terms`, `/lab`, `/departures` 200; `/vault` → `/login`); mobile `tsc` + Android export bundle. Not verified on a device.

## 2026-10-12 — Build pass 3 (`sean/build-pass-3`, stacked on `sean/backend-security-floor` / PR #12)

| Change | Where | Truth |
|---|---|---|
| Vault cashback rate **12%** (founder decision); copy restored; writes still frozen | ADR-0005, `vault-guard.ts`, vault + scale pages | decided |
| AI routes require sign-in; per-member rate limit (text 30/10 min, 300/day; image 6/10 min, 40/day; `AI_RATE_*` overrides); fail closed | `src/lib/ai-rate-limit.ts`, `20261012_ai_rate_limit.sql` | wired — **apply migration before deploying or every AI call returns 429** |
| Nova extracted to `runNova()`; internal callers (Telegram, agents, NightVision) call it directly; client `system` prompts ignored → fixed server personas; `/api/bernard` 410 | `src/lib/nova.ts`, `src/lib/agents/nova-call.ts` | wired |
| Account deletion (password re-check, audit, anonymise financial rows, delete content + R2 objects, auth user) | `POST /api/account/delete`, `src/lib/account.ts`, `20261012_account_lifecycle.sql` | wired |
| Lift PIN reset (password re-check, 3/day) | `POST /api/vip-keylock/pin-reset` | wired |
| Signup username collisions fixed in `handle_new_user` | `20261012_account_lifecycle.sql` | wired |
| IDOR fixes: alpaca / yahoo-fantasy use session user; upload prefix allowlisted + namespaced | routes | wired |
| Web: `/account` (export, PIN reset, delete), public `/account/delete-info` (Play deletion URL); rails reach all 31 rooms, icon-only under 480px; Nova callers send personas, handle 401/429 | `finesse-layout.tsx`, `src/app/account` | wired |
| Mobile: live Closet, Diary (+Calendar), Camera, Jazz Club, This Is You, Kitchen plan; delete account; id aliases | `mobile/src/components/rooms/*` | wired, not run on a device |

Deploy order addition: `20261012_ai_rate_limit.sql`, `20261012_account_lifecycle.sql` (after 20261009). Verified: web tsc, 70 unit tests, `test:db` 35/35 + 40/40, eslint on new code, `next build`; mobile tsc + Android export.

## 2026-10-12 — Stripe payments (`sean/stripe-payments`, stacked on `sean/build-pass-3`)

Processor decided: **Stripe** (founder; account application in progress). Built against test mode — see `docs/PAYMENTS.md`.

| Change | Truth |
|---|---|
| VIP membership $24.99/month via Stripe Checkout + Customer Portal; `GET /api/billing/status`, `POST /api/billing/checkout`, `POST /api/billing/portal` | wired — needs Stripe keys, price id, webhook secret |
| VIP now computed from `vip_grants` (code / subscription / staff) by `recompute_vip`; existing VIPs backfilled as staff grants; `redeem_vip_code` writes a code grant | wired (`20261013_stripe_billing.sql`, not applied) |
| Webhook rebuilt: idempotent `stripe_events`, subscription sync, past_due 3-day grace, revenue_events for paid invoices / Scale payments, refund reversals | wired |
| Scale: staff opens payment (`request-payment`), member pays via Checkout (`/api/scale/pledges/[id]/pay`), webhook marks paid / refunded | wired |
| Account deletion cancels the Stripe customer first | wired |
| Web `/subscribe`, `/account` Membership, Scale "Pay now"; mobile membership status (no in-app purchase, App Store 3.1.1) + Scale pay | wired |
| Vault funding via Stripe | **not built** — Finesse never holds member funds; Vault stays frozen until the card partner signs |

Verified: web tsc, 109 unit tests, `test:db` 35 + 40 + 67, eslint, `next build`; mobile tsc. Not run against real Stripe test keys yet.

## 2026-10-13 — After Hours rebuild + profiles column privacy (`sean/rebuild-plan`, stacked on `sean/after-hours`)

Nothing committed yet; working-tree changes only. `asserted` from source unless noted; not deployed, migrations **not applied**.

| Change | Where | Truth |
|---|---|---|
| RN audit tail: remove Continental dead code (15 files + `design.tsx`, 6 font deps), "The Book"→"The Pool", Exchange filter, small-text bump | `mobile/` | wired (grep-verified; **not run on a device**) |
| Dead-code removal (~190 lines / 9 files, grep-verified unused) | `mobile/src/lib/*` | wired |
| Two real bug fixes: `penthouse.tsx` floating promise, `Lounge.tsx` picker | `mobile/src/app/penthouse.tsx:56-72`, `mobile/src/components/rooms/Lounge.tsx:344` | wired |
| `video_ai` consent end-to-end (Higgsfield video processor) | `src/lib/{consents,ai-consent-gate}.ts`, `src/app/api/{scrapbook/generate-video,account/consents}/route.ts`, `mobile/src/lib/consents.ts`, `mobile/src/components/rooms/{AIConsent,Scrapbook}.tsx`, `20261020_s3_consents_video_ai.sql` | wired — **migration draft, not applied** (recording `video_ai` fails until applied) |
| Device glitch-hunt checklist | `docs/DEVICE_PASS.md` | written |
| **#3 profiles column-level privacy**: revoke table-wide SELECT, grant 12 public cols, `get_own_profile()` + `current_member_is_vip()` SECURITY DEFINER RPCs, **rewrite 5 VIP RLS policies** to the helper. Split for staged rollout: **s4a** (helpers + policies, non-breaking) then **s4b** (revoke/regrant, breaking — after deploy) | `20261020_s4a_profiles_rls_policies.sql` + `20261020_s4b_profiles_column_grants.sql` + `docs/decisions/0007-profiles-column-rls.md` | wired — **one-way door, draft, not applied**; `tests/db/s4-profiles-rls.mjs` **25/25 passing** (PGlite) |
| #3 **reader repoint** — every `profiles` reader the column revoke would break now goes through the helper `get_own_profile()`/`current_member_is_vip()` or the service-role client (~20 server routes/libs + 8 web pages); mobile re-scanned → public columns only, **no change** | `src/lib/{admin,billing,vip-lift,moderation-server}.ts`, `src/lib/supabase/middleware.ts`, `src/app/**`, `src/app/(hotel)/**`, `src/components/account/ai-safety-panel.tsx` | wired — **code + migration must ship together** (UNRUN against a live DB) |

Decisive finding (PGlite, `verified` 2026-10-13): Postgres **enforces column privileges on columns referenced inside an RLS policy expression**, evaluated as the invoking role. Five VIP policies (`vip_posts_vip_read`/`_insert`, `vip_post_likes_vip_read`/`_insert`, `vip_exclusives_vip_read`) sub-selected `profiles.is_vip`/`vip_expires_at`; revoking those columns would have thrown `permission denied for table profiles` and broken the VIP rooms. The migration now recreates those policies against a SECURITY DEFINER helper. Branches: `sean/rebuild-plan`. Gate: apply only with sign-off, and ship code + migration together.

Reader repoint ran 2026-10-14 (`asserted`, working tree; nothing committed). Repoint rule: own-row non-public reads → `get_own_profile()` on the caller's session client; boolean VIP gate → `current_member_is_vip()`; cross-member / admin-by-`role` / arbitrary private-column reads → `createServiceClient()`. Web-shell `video_ai` twin restored on `ai-safety-panel.tsx` (the earlier revert had left `Record<ConsentKind>` unsatisfied → the tree no longer type-checked). Verified: web `tsc --noEmit` **clean**; eslint **clean on every touched file** (2 pre-existing `react-hooks/set-state-in-effect` errors in `vault/page.tsx` + 2 unused-arg warnings remain elsewhere, untouched); `npm run test:db` **15 suites green** (incl. `s4-profiles-rls` 25/25). `npm test` = 185/188 passing: the 3 `tests/ai-rate-limit.test.ts` failures are 5s-timeout/environmental, and `tests/mobile-rooms-wire.test.ts` cannot run without `mobile/node_modules` — **none touch `profiles`**.
