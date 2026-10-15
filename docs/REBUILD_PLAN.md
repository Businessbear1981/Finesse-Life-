# Finesse Life — Rebuild Plan

> **Status:** DRAFT — a working decision log, not a spec. Open items are marked ⧗ and need the owner's sign-off before any code is written.
> **Branch:** `sean/rebuild-plan`, off `origin/sean/after-hours` @ `d326169` (2026-10-13).
> **Owner:** Sean Gilmore. Design decisions are the human's; this doc records them, it does not make them. No spec-to-code (AGENTS/§13).
> **Rule going in:** rebuilds that throw away working, correctness-bearing code are a last resort. The burden is on the rewrite to justify itself, not on the existing code to survive.

---

## 0. Objective

Rebuild the Expo React Native app and settle the platform's shape around it. **The driver is not yet confirmed** (⧗ §4.1). "Rebuild" is doing a lot of work in that sentence, and the answer changes everything downstream:

- If the problem is **fragmentation / un-merged branches** → this is a *consolidation*, and we reuse the existing app.
- If the problem is that **the app cannot deploy honestly** → this is an *integration + truth pass*, and we mostly reuse.
- If the architecture is genuinely wrong → a *greenfield rewrite* is on the table, and only then.

## 1. Ground truth (verified against source on `d326169`)

| Fact | Evidence |
|---|---|
| Two frontends: web (Next.js 16, `src/`) + native (Expo RN, `mobile/`) | both tracked on `origin/sean/after-hours` |
| Both call the Next.js `/api` — no FastAPI in the path | `mobile/src/lib/api.ts` → `https://finesselife.vip` |
| Native session = OS keychain via `expo-secure-store`, sent as bearer | `mobile/src/lib/{supabase,secure-storage}.ts`; `src/lib/supabase/server.ts` |
| Edge middleware is the single server-side auth gate for both surfaces | `src/middleware.ts` → `updateSession` (see ADR-0006) |
| FastAPI `backend/` is dormant and unused | ADR-0001 |
| Cloudflare footprint = **R2 only** (no Workers / Stream / Images / `wrangler.toml`) | `.env.example`, `OPS.md`, no config in tree |
| Middleware.io APM is declared but **does nothing** | `package.json`, `next.config.ts:4`, no-op `src/instrumentation.ts` |
| `main` is stale (web-only, 2026-08-06); ~19 divergent un-merged `origin/*` branches | branch audit |

## 2. Confirmed decisions

| # | Decision | Record |
|---|---|---|
| 1 | Auth middleware is **web-only**; native authenticates with a SecureStore session + bearer token; this pairing is preserved across the monorepo | **ADR-0006** |
| 2 | Cloudflare is the media/storage home. R2 today; evaluate Stream (video) / Images (transform) incrementally | this doc |
| 3 | Members never write Vault rows; entitlements are server-managed | ADR-0004 |
| 4 | Vault cashback rate is 12% | ADR-0005 |

## 3. Target shape (proposed — not yet approved)

The project's own manifests already prescribe it: **pnpm + Turborepo monorepo** (`FINESSE_31_ROOM_PROJECT.json`, `mobile/src/lib/room-manifest.json`).

```
apps/
  web/      Next.js 16 (today's src/)  — owns the /api and the edge middleware (ADR-0006)
  mobile/   Expo RN                    — SecureStore session, bearer to apps/web /api
packages/
  contracts/         Zod schemas + the token/cookie contract (the ADR-0006 boundary)
  room-registry/     the 31-room manifest + validator, shared by both surfaces
  design-tokens/     one token set (web + native)
  provider-adapters/ the integration adapters behind the Backstage UI
  revenue-events/    append-only revenue ledger (ADR-0004 boundary)
```

One Supabase DB. The web app keeps the `/api`; the monorepo changes *where* the code lives and *what is shared*, not the runtime topology.

## 4. Open decisions (need sign-off before code)

### ⧗ 4.1 Greenfield rewrite vs consolidation — **driver unclear**
**Recommendation: consolidation.** The existing app is not a stub; it encodes the KeyLock model (server-verified code, no client oracle), honest failure states, and store-build room gating that a rewrite would have to rediscover. The real defect is that the work is **scattered across ~19 un-merged branches** and carries **two design systems** (`continental/*` and `ah/*`). Fix that, don't re-birth the app.
**What would flip me to greenfield:** evidence the data model or navigation is structurally wrong, not merely messy.

### ⧗ 4.2 Fate of `backend/` (FastAPI)
**Recommendation: delete it and supersede ADR-0001 with a new record.** It is unused; `vercel.json` already skips deploys when only `backend/` changes. Salvage `backend/compress.py`'s ffmpeg profiles as a note under `tooling/` before deletion — it is the one non-duplicated asset.
**One-way door:** deletion is recoverable from history, so low risk; the ADR is the real artifact.

### ⧗ 4.3 Cloudflare scope
**Recommendation: R2 now; add Stream (video) and Images (transform) incrementally behind the existing `src/lib/r2.ts`.** Defer Workers/D1 — they would supersede ADR-0001 and are a one-way migration with no current forcing function. Costs for Stream/Images are **unverified** and must be checked before commitment.

### ⧗ 4.4 Observability
**Recommendation: drop Middleware.io; wire Sentry-compatible error tracking + structured logs + a per-request `traceId`** (the target the project already names). Today `src/instrumentation.ts` is an empty `register()` and the APM dep is dead weight — propose as ADR-0007 if accepted.

### ⧗ 4.5 Branch integration
**Recommendation: name `sean/after-hours` the integration tip, PR it to `main`, then cherry-pick only what is wanted from `sean/stripe-payments`, `wave0-foundation`, and `sean/continental-design`.** Do this *before* any monorepo move, so the move is a clean lift, not a merge on top of a merge.

## 5. Non-goals

- No new runtime topology (no Workers, no second auth service) — see ⧗ 4.3.
- No changes to money/entitlement logic (ADR-0004, ADR-0005) as part of the rebuild.
- No rewrite of working KeyLock / room-registry logic; if moved, it is moved, not redesigned.

## 6. Guardrails

- Branch `sean/<slug>`, never `main`, PR at session end.
- Every moved/rewritten module states its **falsifier** and keeps its tests green before and after.
- `docs/STATE.md` and `AGENTS.md` updated in the same PR that changes state (write-back = done).
- No spec-to-code: the interfaces in §3 need sign-off before implementation.
