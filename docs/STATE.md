# Finesse Life — State

> **Status:** PRE-LAUNCH (demand-gated — build weight stays low until the founding-cohort / anchor-partner side is confirmed)
> **Last updated:** 2026-07-26 (delta re-audit) · **Last verified:** 2026-07-26 (live URL 200, repo tree, audit-critical schema/code checks re-run against current `main`)
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
| Supabase (DB + auth) | `zcqcgqsovrjlxxiipuzg` | **was PAUSED (INACTIVE)** — found 2026-07-26, restored same day; while paused, every DB-backed feature (auth, VIP, rooms data) was dead even though the frontend served 200 | 2026-07-26 `verified` |
| Cloudflare R2 | bucket `finesse-life` | storage only | `asserted` |
| DNS | Porkbun (`finesselife.vip` + `.app`) | — | `asserted` |
| ~~Railway FastAPI~~ | — | **DELETED 2026-07-26** (ADR-0002) — never deployed; all server logic is Next.js `/api` | `verified` 2026-07-26 |

Deploys are **CLI-only** (`npm run deploy`) — the Vercel GitHub webhook is broken and `git push` does not deploy. `asserted` (OPS.md "THE ONE RULE").

## What is real vs. mock

From the 2026-06-23 line-by-line audit. A 2026-07-26 delta re-audit of the July commits (`97fc7fc`, `97bf34d`, `c86e38b`) confirmed **every audit-critical finding below still stands** on current `main`: `DEMO_PIN` (`src/app/page.tsx:8`), `DEMO_LISTINGS` (`market/page.tsx:21`), the 12% cashback (`vault/cashback/route.ts:26`, also `scale/join/route.ts:28`), the webhook/`subscriptions` shape mismatch, and the broken agent queries. `verified` 2026-07-26. Room UX rows (Kitchen, Gym, lobby, salon) reflect Sean's July rework:

| Module | Real or mock |
|---|---|
| Hotel UX / dual-brand experience, room navigation | **Real** |
| Nova / Stylist concierge | **Real** (Anthropic Claude via AI Gateway) |
| Supabase auth + VIP-code redemption (grants 1-yr VIP) | **Real** |
| Inbound Stripe webhook (`api/webhooks`) | **Real** endpoint, but nothing upstream creates payments |
| Checkout / PaymentIntent / subscriptions | **Missing entirely** — no `/subscribe`, no billing migrations |
| Scout & Price-Hunter | **Broken** — query columns/statuses that don't exist; return nothing |
| `scale/join` | **Broken** — inserts columns absent from `scale_joins`; silent no-op |
| Market/Exchange listings | **Mock, now gated** — `DEMO_LISTINGS` + the `123456` entrance PIN only render when `NEXT_PUBLIC_DEMO_MODE` ≠ `false` (`src/lib/demo.ts`, default ON so current deploys are unchanged). Still never calls the Exchange API. `verified` 2026-07-26 |
| Vault rebate | **Wrong** — credits 12% with no funding source; prospectus economics are ~1% cashback. Fix, not feature |
| Lab (Alpaca paper-trading connect) | **Real enough to matter** — stores account snapshot + truncated key → Finesse is NOT securities-free; legal read budgeted |

## Database

Canonical: Supabase `zcqcgqsovrjlxxiipuzg`. Migrations live in `supabase/migrations/` and run via `npm run db:migrate <file>` (direct connection) — `supabase db push` does not work here.

**Applied-vs-on-disk `verified` 2026-07-26** (queried the restored live DB directly):

- The live `public` schema has **26 tables** — the June 09–11 migration wave only (`finesse_mvp`, `embassy`, `exchange`, `registry`, `scrapbook`, `carpe_diem`, `intelligence_engine`, `vault_exchange_scale`, `backstage_sessions`).
- **Never applied:** the `20260607` base schema (`integrations` vault, `media_assets`/`media_jobs`, `concierge_avatars`, `onboarding_state`, `truth_checks`), `20260615_vip_exclusives`, and **both ~900-line master schemas**. Consequence: the `/settings/integrations` vault, media pipeline, and VIP exclusives have **no live tables** — those features run on env-var fallback or fail.
- **Schema consolidation done 2026-07-26:** `20260617_master_finesse_schema.sql` was a byte-identical duplicate of `20260617_finesse_v2.sql` (whitespace only) — deleted. `20260617_wire_all_modules.sql` was a divergent never-applied draft of 7 tables the master also defines — deleted. **`20260617_finesse_v2.sql` is the single canonical master.**
- `embassy_deals` is a **three-way conflict**: live DB has the `20260609_embassy.sql` shape (`item`, `retail_price_cents`/`members_price_cents`, `tier`); the canonical master defines a group-buy shape (`title`, `group_price_cents`, `goal_count`); Scout/Price-Hunter query a **third** shape (`retail_price`, `image_url`, `purchase_url`, `status='active'`) that exists nowhere. Needs a deliberate ALTER + agent fix, scheduled with Phase 1 DDL.
- The live `subscriptions` table is the June `finesse_mvp` shape, and its `provider` CHECK allows only `'ccbill' | 'apple_iap' | 'vip_code'` — **`'stripe'` is not a legal value in the live DB**. Any Stripe billing write will be rejected until a constraint migration lands (must precede FIN-001 webhook work). The Stripe webhook code meanwhile upserts yet another row shape (`price_id`, Stripe sub-id key). `stripe_events`, `products`, `prices` have no live tables.
- `scale_joins` live is 4 columns (`id`, `deal_id`, `user_id`, `joined_at`) — confirms `scale/join` writes columns that don't exist (silent no-op). Two June audit sub-claims are **stale**: live `vault_transactions` *does* have a `cipher` column and its `direction` CHECK *does* allow `'cashback'`. The 12%-rebate funding bug is unaffected (it's in code, not schema).

## Known gaps that will bite

1. **No payment path** — membership cannot transact. This is the whole Phase-1 sprint, gated on demand confirmation.
2. **Committed secret — RESOLVED 2026-07-26:** the Supabase DB password was in `OPS.md` *and* hardcoded in `scripts/migrate.js`. Password **rotated** via the management API during the project restore, both files stripped (`migrate.js` now reads `SUPABASE_DB_PASSWORD` from env / `.env.local`). The copies in git history are dead credentials. Sean needs the new password via one-time-secret link for his local `.env.local`. `verified` 2026-07-26.
3. **Vault 12% rebate bug** (see above) — must be corrected before any real money flows.
4. Scout / Price-Hunter / scale-join schema mismatches — features silently return nothing.
5. Stale-domain drift: OPS.md and older docs still say `finesselife.app`.
6. **Live DB ≠ on-disk schema** — the canonical master (`20260617_finesse_v2.sql`) has never been applied; 15 of its 41 tables don't exist live (integrations vault, media, payments/stripe_events among them), `embassy_deals` is a three-way conflict, and `subscriptions.provider` forbids `'stripe'`. Reconciling DDL must land before (or with) Phase-1 billing. Duplicate-schema consolidation itself **done 2026-07-26**.
7. **Gym "member offers" are hardcoded** (WHOOP, ClassPass, Gainful, Hyperice, Form Nutrition promo codes in `gym/page.tsx`, commit `c86e38b`) — demo theater unless these are signed partner deals. Deliberately NOT gated behind `NEXT_PUBLIC_DEMO_MODE` yet — blocked on Sean confirming real-or-placeholder. `verified` 2026-07-26.

## Active work

Tracked in GitHub Issues + PRs on `Businessbear1981/Finesse-Life-`. PR #2 (agent infra) **merged 2026-07-15**; PR #1 (Railway `$PORT` fix) closed as moot — the backend was deleted per ADR-0002. `verified` 2026-07-26.

Current phase gate: Sean confirming the demand side (anchor partners + founding cohort) → then the paid-membership transact sprint. A phased shore-up roadmap (foundation cleanup → first dollar → affiliate line → Vault/marketplace) is drafted on Kevin's side, ready to kick off. Sean is actively building rooms (Kitchen, Gym, salon — June/July commits).
