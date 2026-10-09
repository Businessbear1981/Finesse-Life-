# Finesse Life — Backend Map

> **Branch audited:** `sean/mobile-keylock` @ `fd0fd26` · **Date:** 2026-10-09 · read-only audit of all 106 `route.ts`, `src/lib/**` and `supabase/migrations/*`. Not checked against the live database (which migrations production has applied is still unknown — see STATE.md).
> **Architecture (ADR-0001):** all server logic = Next.js `/api` routes on Vercel + Supabase. `backend/` (FastAPI) is dormant.
> ✅ = fixed on branch `sean/backend-security-floor` (see §6).

Auth legend: **none** · **user** (cookie, or mobile bearer via `lib/supabase/server.ts`) · **user(c)** (cookie-only route — mobile bearer ignored) · **svc** (service role) · **VIP** (`profiles.is_vip` + `vip_expires_at`).

## 1. Endpoints

### KeyLocks & VIP
| Path | Methods | Auth | Status |
|---|---|---|---|
| /api/keylock/entrance/challenge, verify, lock | POST | none (public) | works; preview mode (any code) until `KEYLOCK_SECRET`, service key and `ENTRANCE_KEYLOCK_CODE` are set. Cookie never enforced; attempt counter can race; rate-limit subject is HMAC(IP+UA) |
| /api/keylock/enter, verify (Backstage) | POST | user + VIP | theatre; HMAC reuses `INTEGRATIONS_ENCRYPTION_KEY`; `backstage_sessions` forgeable |
| /api/vip-keylock/challenge, verify, session, lock | POST/GET | user + VIP (+ lift token) | works once 20261001 + `KEYLOCK_SECRET`; scrypt PINs; no PIN reset |
| /api/vip/redeem | POST | user | ✅ was broken (cookie-bound "service" client ran as the member → every code 404, non-atomic use_count). Now atomic `redeem_vip_code` RPC, bearer-aware |
| /api/vip/codes | GET/POST | admin | ✅ admin rule was `username==='admin'` (claimable). Now `profiles.role` admin/owner or `ADMIN_EMAIL`; CSPRNG codes |
| /api/profile | GET/PATCH | user(c) | works (field whitelist) |
| /api/member | GET | user | works; `%` wildcards allow enumeration |

### Rooms (24–31 and registry)
diary, ballroom (preview — no partner), closet, identity (projections cosmetic at DB level), camera (needs R2 + AI env), jazz-club (preview: join 501, tips 409), gym, kitchen (preview: no grocery partner), rooms/[id] — all **user**, Zod-validated, working against migrations 20261002/20261004. registry/items & outings work; registry/token is a `Math.random` stub never stored; registry/identify never sends the image to the model (invents an item).

### Vault, revenue, Scale
| Path | Status |
|---|---|
| /api/vault/balance | works |
| /api/vault/cashback, /fund | frozen (423) by `vault-guard`. ✅ RLS no longer lets members write balances directly, so the freeze can't be bypassed |
| /api/webhooks/stripe | **broken**: dedupe writes `payload` (column is `data`) so nothing is idempotent; uuid ids vs `sub_…`/`pi_…`; `products`/`prices` tables don't exist; never sets `is_vip`. Only the `revenue_events` path is sound |
| /api/procurement/redeem | ✅ was redeemable forever (no UPDATE policy) and self-mintable. Now one conditional service-role update |
| /api/scale/join, pledges, pledges/[id]/cancel | work (no charge). ✅ members could walk their own pledge to `paid` and double counts; fixed in SQL |

### Social, wardrobe, integrations
posts (likes_count update blocked by RLS for non-authors), wardrobe/*, bag/*, salon/bookings (price from client), exchange/* (list returns fake `local_` success on DB error), embassy/deals (✅ any member could edit/delete all rows), switchboard (stub, no OAuth), scrapbook/log (✅ IDOR fixed by cherry-picked `sean/api-security-fixes`), scrapbook/generate-video, scrapbook/video-status (✅ committed Higgsfield key pair removed — **rotate it**), carpe-diem/garage, integrations/alpaca + yahoo-fantasy (**IDOR: `user_id` from body**), integrations/[vendor] + test + /api/audit (admin via `profiles.role` — dead until 20261009 adds the column; also write `ciphertext`/`iv` columns that don't exist), upload (client sets key prefix), webhooks/media (✅ was unauthenticated service-role write; now requires `MEDIA_WEBHOOK_SECRET`; still writes `status`/`metadata` columns that don't exist).

### AI
/api/nova, stylist/analyze-photo, agents, intelligence/market are **public with no rate limit**; Nova accepts a client `system` prompt and returns 200 "Consider it handled" on failure; /api/bernard relays any prompt. nightvision/analyze collects identity data that ends up readable by members. admin/ai-usage works with its export token.

### Telegram
✅ webhook had no `X-Telegram-Bot-Api-Secret-Token` check and `/link <uuid>` re-pointed any member's VIP channel → now fails closed without `TELEGRAM_WEBHOOK_SECRET` and links only with a signed 15-minute code. ✅ notify let any member message any user → self-only, free text staff-only. ✅ `/vault` read a non-existent `balance` column.

## 2. Schema

- **Missing:** tables `products`, `prices`; columns `vault_accounts.balance` (real: `balance_cents`; ✅ fixed in Telegram and /api/nova), `stripe_events.payload`, Stripe columns on `subscriptions`/`payments`, `media_assets.status/metadata`, `integrations.ciphertext/iv`, `integration_audits.check_name/details`. `profiles.role` ✅ added by 20261009.
- **Conflicts** (`create … if not exists`, first one wins): `20260617_finesse_v2` + `master` re-declare ~40 tables; `subscriptions` (mvp vs v2/master); `vip_codes.used_by` uuid vs uuid[] (✅ new redemption avoids it via `vip_code_redemptions`); `profiles.check_in` text vs timestamptz; `posts` policy uses `user_id` vs `author_id`; `outings` creator_id vs host_id; `registry_items` duplicate columns; `handle_new_user` builds a unique username from the e-mail local part → second `john@…` signup fails.
- A fresh replay of all migrations would not reproduce production (`profiles` is first created without is_vip/username/…).
- **RLS before 20261009:** `profiles_public_read using(true)` to anon (✅ now members only); `profiles_own_update` with no column limits (✅ trigger); vault own update/insert (✅ dropped); `scale_joins_own` FOR ALL + `scale_joins_read using(true)` (✅ dropped/replaced); no RLS on `stripe_events`, `truth_checks` (✅ enabled); `embassy_deals staff_only` (✅); procurement own insert (✅); `backstage_sessions` FOR ALL (open).
- **Apply order on this branch:** 20261001 → 20261002 → 20261003 → 20261004 → 20261005 → **20261009_security_floor** (`npm run db:migrate <file>`, principal approval).

## 3. Auth model

Cookies first; a mobile bearer token is used only when no `sb-` cookie is present; middleware accepts bearer only on `/api/*`. Public API prefixes: `keylock/entrance*`, `agents`, `nova`, `intelligence*`, `stylist*`, `nightvision*`, plus webhooks, telegram/webhook, admin/ai-usage. VIP = `is_vip && (vip_expires_at is null || > now())`; the only grant path is `/api/vip/redeem` (✅ now works and is the only writer). Rate limits exist only on the two KeyLocks (8 failures / 15 min via `access_audit_events`).

**Entrance contract:** `POST …/challenge` → `{state:"ready", mode, challengeId, expiresAt, traceId}` | 429 rate_limited | 503 unavailable · `POST …/verify {challengeId, code}` → `{state:"open", mode}` + `fl_entrance` cookie (12 h) | 401 invalid | 410 expired | 429.
**Lift contract:** `POST /api/vip-keylock/challenge {track?}` → `{state:"ready", challengeId, mode:"verify"|"enroll", expiresAt}` | 401/403/429/503 · `POST …/verify {challengeId, code, destination}` → `{state:"unlocked", href, expiresAt, liftToken?}` + `fl_vip_lift` cookie (30 min) · `GET …/session` · `POST …/lock`.

## 4. Environment variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `KEYLOCK_SECRET` (≥32), `ENTRANCE_KEYLOCK_CODE`, `INTEGRATIONS_ENCRYPTION_KEY`, `NEXT_PUBLIC_SITE_URL` (defaults to localhost in agents/nightvision → broken in prod), Stripe keys (for payments), `AI_GATEWAY_API_KEY` or `ANTHROPIC_API_KEY`, R2 vars (uploads).
**New on `sean/backend-security-floor`:** `TELEGRAM_WEBHOOK_SECRET` (≥16; re-run Telegram `setWebhook` with `secret_token`), `MEDIA_WEBHOOK_SECRET` (≥32; add `?secret=` or the `X-Finesse-Webhook-Secret` header in vendor dashboards), `HIGGSFIELD_API_KEY_ID`/`HIGGSFIELD_API_SECRET` now required by video-status too.
Optional: `ADMIN_EMAIL`, `AI_USAGE_EXPORT_TOKEN`, `INTEGRATIONS_CLI_TOKEN`, `TELEGRAM_BOT_TOKEN`, `VAULT_LEDGER_WRITES_ENABLED`, `VAULT_CASHBACK_RATE_BPS`, `LIVEKIT_URL`, `INSTACART_API_KEY`, media vendor keys.

## 5. Tests & CI

`npm test` (vitest, 32 cases: ai-usage, contracts, keylock, registry, rooms-logic, telegram-link) — pure unit/contract. `npm run test:db` (new): PGlite policy test for 20261009, 32 checks. `scripts/smoke.mjs`: signed-out HTTP smoke. CI: `npm ci` → rooms:validate → tsc → test → test:db → eslint (new paths) → next build → smoke. Not covered: real database, route handlers, webhooks, `mobile/`.

## 6. Ranked backend backlog

Done on `sean/backend-security-floor` (not deployed, migration not applied):
1. ✅ Members can no longer self-grant VIP/admin, write Vault balances, fake or delete Scale pledges; single pledge count; anonymous profile reads closed; RLS on stripe_events/truth_checks; procurement/embassy policies.
2. ✅ VIP code redemption works (atomic, service-role-only RPC); one admin rule.
3. ✅ Telegram takeover + member-to-anyone messaging; media webhook auth; committed Higgsfield credentials removed; procurement single-use; CSPRNG codes/tokens.

Next, in order:
4. **Rotate secrets:** Supabase DB password (OPS.md history), Higgsfield key pair (was in `scrapbook/video-status`), and the demo account password (shipped in `(auth)/demo` — remove the page or the account).
5. **Unbounded AI spend:** require sign-in + per-member rate limit on `/api/nova`, stylist, agents, intelligence/market; move internal callers (Telegram, agents, NightVision) to a server function instead of HTTP-calling public `/api/nova`; never return fabricated success.
6. **Profile privacy:** column-level protection for `email`, `telegram_chat_id`, `private_*`, `nightvision_data`, `age`, `style_dna` (owner-only RPC + public view), so "This Is You" projections are enforced at the DB.
7. **IDOR leftovers:** alpaca, yahoo-fantasy (body `user_id`), `/api/upload` key prefix, `backstage_sessions`.
8. **Money path (blocked on decisions):** processor (Stripe vs CCBill) and Vault rate/partner are owner decisions. Engineering prerequisites regardless of choice: rebuild the Stripe webhook against a real schema (idempotency on `data`, text ids, products/prices or drop them), grant/revoke VIP from subscription state via the same server-only path, checkout + customer portal, Scale `payment_requested` trigger. App Store builds need IAP for digital membership.
9. **Schema hygiene:** baseline migration from production (`pg_dump --schema-only`) to replace the conflicting 20260617 pair; fix `handle_new_user` username collisions; cron for challenge/session cleanup; rename `middleware.ts` → `proxy.ts` (Next 16).
10. **Account deletion endpoint** (App Store 5.1.1(v) / Play policy) and lift-PIN reset.
