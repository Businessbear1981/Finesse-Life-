# 0001 — Next.js API routes are canonical; the FastAPI backend stays dormant

> **Status:** ACCEPTED
> **Date:** 2026-07-14 (records a state that has held since ~June 2026)
> **Decision:** All live server logic runs in Next.js `/api` routes on Vercel; `backend/` (FastAPI on Railway) is built but **not deployed** and nothing may depend on it.

## Context

The repo carries two server implementations: the Next.js App Router API routes under
`src/app/api/` (deployed with the frontend on Vercel) and a FastAPI service in
`backend/` intended for Railway. The Railway service was stood up (project
`e91bd0fe-8810-4216-ae98-3fc79df731df`) but is not deployed; earlier deploy attempts
were the source of the Railway `$PORT` healthcheck fix. Meanwhile every live feature —
Nova, rooms, vault, webhooks — was wired through Next.js routes.

## Options considered

- **Next.js-only, backend dormant (chosen):** one deploy surface, one env-var set,
  matches where all the working code already is. Zero incremental infra cost.
- **Activate the Railway backend:** justified only when heavy agent orchestration,
  media pipelines, or long-running jobs exceed serverless limits — none do today.
- **Delete `backend/`:** premature; the activation runbook in `OPS.md` is cheap to keep.

## Decision

`src/app/api/` is the canonical server. `backend/` stays in the tree as dormant
scaffolding with its activation steps documented in `OPS.md`. No new code may import
from or depend on `backend/` without a superseding ADR.

## Consequences

- Sessions must not "fix" or deploy `backend/` as a side quest.
- If/when heavy AI jobs arrive, activation is a deliberate decision: deploy from
  `backend/`, set `NEXT_PUBLIC_API_URL`, supersede this record.

## Links

- `OPS.md` → "Backend Python Service (Railway)" (activation runbook).
- Commit `31a7812` (last real backend work) · `f6bdfcb` ($PORT healthcheck fix).
