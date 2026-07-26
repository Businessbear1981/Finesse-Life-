# 0002 — Delete the dormant FastAPI backend; remove Railway from the infra footprint

> **Status:** ACCEPTED — supersedes ADR-0001
> **Date:** 2026-07-26
> **Decision:** `backend/` is deleted from the tree and Railway is removed from the documented infra stack. Next.js `/api` routes on Vercel remain the sole server surface.

## Context

ADR-0001 kept `backend/` (FastAPI, never deployed) as dormant scaffolding with an
activation runbook in `OPS.md`, on the grounds that keeping it was cheap. In practice
it has not been cheap: it spawned a still-open deploy-fix PR (#1) for a service that
was never activated, it doubles the apparent server surface for anyone reading the
repo, and no feature in over a month of active development has needed it. With
technical due diligence now a realistic near-term event, dead scaffolding reads as
unfinished architecture, not optionality.

## Options considered

- **Delete `backend/`, remove Railway (chosen):** one server surface, one deploy
  target, one env-var set. The code is not lost — it lives in git history (last real
  work at `31a7812`) and can be revived with a superseding ADR if heavy agent
  orchestration or long-running jobs ever exceed serverless limits.
- **Keep it dormant (ADR-0001):** the runbook-is-cheap argument no longer holds; the
  scaffolding carries ongoing explanation cost in every audit and onboarding pass.

## Decision

Delete `backend/` entirely. Remove Railway env vars, vendor config, the `OPS.md`
activation runbook, and the `vercel.json` ignore rule for `backend/`. Close PR #1
(Railway `$PORT` healthcheck fix) as moot. If heavy server-side jobs arrive later,
recover the code from history at `31a7812` or build fresh — either way behind a new
ADR, sized against what serverless can't do at that point.

## Consequences

- PR #1 closes unmerged; the fork's stale `main` (at `f6bdfcb`) gets reconciled to
  upstream.
- `RAILWAY_PROJECT_ID` / `RAILWAY_TOKEN` disappear from `.env.example` and the
  integrations vault vendor map. The Railway project itself
  (`e91bd0fe-8810-4216-ae98-3fc79df731df`) can be deleted from Sean's Railway account
  at leisure — nothing references it.
- `NEXT_PUBLIC_API_URL` (which only pointed at the dormant service) is removed.

## Links

- Supersedes: `0001-backend-dormant-nextjs-api-canonical.md`
- PR #1 (closed as moot): Railway `$PORT` healthcheck fix
- Last real backend work: commit `31a7812`
