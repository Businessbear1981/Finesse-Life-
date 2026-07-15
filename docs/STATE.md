# Finesse Life — State

> **Status:** PRE-LAUNCH (demand-gated — build weight stays low until the founding-cohort / anchor-partner side is confirmed)
> **Last updated:** 2026-07-14 (agent-infra install) · **Last verified:** 2026-07-14 (live URLs, repo tree; deep audit facts date to 2026-06-23)
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

## Known gaps that will bite

1. **No payment path** — membership cannot transact. This is the whole Phase-1 sprint, gated on demand confirmation.
2. **Committed secret:** `OPS.md` contains the Supabase DB password in plaintext (in git history too). Rotate the password, then strip it from the file. `verified` 2026-07-14.
3. **Vault 12% rebate bug** (see above) — must be corrected before any real money flows.
4. Scout / Price-Hunter / scale-join schema mismatches — features silently return nothing.
5. Stale-domain drift: OPS.md and older docs still say `finesselife.app`.

## Active work

Tracked in GitHub Issues + PRs on `Businessbear1981/Finesse-Life-`. Current phase gate: Sean confirming the demand side (anchor partners + founding cohort) → then the paid-membership transact sprint. Engineering is otherwise quiet; Sean is actively building rooms (Kitchen, Gym, salon — June/July commits).
