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
| Railway FastAPI (`backend/`) | project `e91bd0fe-…` | **DORMANT — not deployed** (ADR-0001); all live logic is in Next.js `/api` | `asserted` (OPS.md) |

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
| Market/Exchange listings | **Mock** — `DEMO_LISTINGS` + `DEMO_PIN` in `src/app/page.tsx` and `(hotel)/market/page.tsx`, never calls the Exchange API (`verified` still present 2026-07-14) |
| Vault rebate | **Wrong** — credits 12% with no funding source; prospectus economics are ~1% cashback. Fix, not feature |
| Lab (Alpaca paper-trading connect) | **Real enough to matter** — stores account snapshot + truncated key → Finesse is NOT securities-free; legal read budgeted |

## Database

Canonical: Supabase `zcqcgqsovrjlxxiipuzg`. Migrations live in `supabase/migrations/` and run via `npm run db:migrate <file>` (direct connection) — `supabase db push` does not work here. Which migrations are applied vs merely on disk has **not** been re-verified since the June audit. `asserted`.

Commit `97fc7fc` (2026-07-13) tracked two previously-untracked ~900-line schema files: `20260617_finesse_v2.sql` and `20260617_master_finesse_schema.sql`. `verified` 2026-07-26:

- They are **near-duplicates of each other** (same tables, minor line drift) — one should be deleted or they will diverge.
- Everything is `create table if not exists` — they **do not alter tables that already exist in the live DB**, so the live schema state is still unknown until queried.
- They now define `subscriptions` and `payments` (with `processor` defaulting to `'ccbill'`), but the Stripe webhook still upserts a different row shape (`price_id`, Stripe sub-id key) — the mismatch is now *documented in-repo* rather than fixed. `stripe_events`, `products`, `prices` still have no migration.
- `embassy_deals` is **redefined** with different columns/statuses (`original_price_cents`/`group_price_cents`, `live/expired/pending`) than `20260609_embassy.sql` (`retail_price_cents`/`members_price_cents`, `pending/review/live/rejected`). Whichever ran first wins in the live DB; the agent queries match neither shape.
- `scale_deals`/`scale_joins`/`vault_transactions` match the June audit findings exactly (joins table still lacks the columns `scale/join` writes; `direction` check still excludes `'cashback'`; no `cipher` column).

## Known gaps that will bite

1. **No payment path** — membership cannot transact. This is the whole Phase-1 sprint, gated on demand confirmation.
2. **Committed secret — RESOLVED 2026-07-26:** the Supabase DB password was in `OPS.md` *and* hardcoded in `scripts/migrate.js`. Password **rotated** via the management API during the project restore, both files stripped (`migrate.js` now reads `SUPABASE_DB_PASSWORD` from env / `.env.local`). The copies in git history are dead credentials. Sean needs the new password via one-time-secret link for his local `.env.local`. `verified` 2026-07-26.
3. **Vault 12% rebate bug** (see above) — must be corrected before any real money flows.
4. Scout / Price-Hunter / scale-join schema mismatches — features silently return nothing.
5. Stale-domain drift: OPS.md and older docs still say `finesselife.app`.
6. **Duplicate master schemas** (`20260617_finesse_v2.sql` vs `20260617_master_finesse_schema.sql`) — near-identical 900-line files; consolidate before any billing DDL lands on top. `verified` 2026-07-26.
7. **Gym "member offers" are hardcoded** (WHOOP, ClassPass, Gainful, Hyperice, Form Nutrition promo codes in `gym/page.tsx`, commit `c86e38b`) — demo theater unless these are signed partner deals; same class of mock as `DEMO_LISTINGS`. `verified` 2026-07-26.

## Active work

Tracked in GitHub Issues + PRs on `Businessbear1981/Finesse-Life-`. PR #2 (agent infra) **merged 2026-07-15**; PR #1 (Railway `$PORT` fix) is still open but moot — the backend is dormant per ADR-0001 and slated for deletion, so PR #1 should be closed, not merged. `verified` 2026-07-26.

Current phase gate: Sean confirming the demand side (anchor partners + founding cohort) → then the paid-membership transact sprint. A phased shore-up roadmap (foundation cleanup → first dollar → affiliate line → Vault/marketplace) is drafted on Kevin's side, ready to kick off. Sean is actively building rooms (Kitchen, Gym, salon — June/July commits).
