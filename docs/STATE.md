# Finesse Life — State

> **Status:** PRE-LAUNCH (demand-gated — build weight stays low until the founding-cohort / anchor-partner side is confirmed)
> **Last updated:** 2026-10-01 (Keylock hotel build branch — see `docs/KEYLOCK_HOTEL_BUILD.md`) · **Last verified:** 2026-07-14 (live URLs, repo tree; deep audit facts date to 2026-06-23)
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
| Supabase auth + VIP-code redemption (grants 1-yr VIP) | **Real** |
| Inbound Stripe webhook (`api/webhooks`) | **Real** endpoint, but nothing upstream creates payments |
| Checkout / PaymentIntent / subscriptions | **Missing entirely** — no `/subscribe`, no billing migrations |
| Scout & Price-Hunter | **Broken** — query columns/statuses that don't exist; return nothing |
| `scale/join` | **Broken** — inserts columns absent from `scale_joins`; silent no-op |
| Market/Exchange listings | **Mock** — `DEMO_LISTINGS` + `DEMO_PIN` in `src/app/page.tsx` and `(hotel)/market/page.tsx`, never calls the Exchange API (`verified` still present 2026-07-14) |
| Vault rebate | **Wrong** — credits 12% with no funding source; prospectus economics are ~1% cashback. Fix, not feature |
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
