# 0002 — Cloudflare edge + Neon Postgres + WorkOS; Supabase retired

> **Status:** ACCEPTED (supersedes the earlier "D1 data plane" proposal of 2026-10-08)
> **Date:** 2026-10-12
> **Decision:** One API on Cloudflare Workers in front of Neon Postgres through Hyperdrive. WorkOS is the identity provider. Supabase (database and auth) is dropped entirely.

## Context
- The web app (finesselife.vip) and the Expo app are one product and need one API.
- The product is pre-launch; the live database holds almost no data (documents ≈353, audit_log ≈17, engine_runs ≈6, bridge_state 5 — planner estimates). Moving now costs schema and auth work, not data.
- The earlier proposal moved data to Cloudflare D1. D1 is SQLite: no row-level security, no `LATERAL`, no table-valued functions, no `date_trunc`, and a 10 GB per-database cap. The schema already depends on all of these.
- The Release Gate must "confirm with passkey" and "step up if MCP", so identity must support WebAuthn and step-up. Cloudflare Access is built for staff, not members.

## Decision
| Concern | Choice |
|---|---|
| Database | **Neon Postgres**. Migrations in `db/migrations/` (ported from `supabase/migrations/`). |
| Connection | **Cloudflare Hyperdrive** pools Neon for the Worker. |
| API | **Hono on Cloudflare Workers** (`workers/api`) at `api.finesselife.vip`, used by the PWA and the Expo app. |
| Async | **Cloudflare Queues** consume the transactional outbox (`orch.outbox`). Cron Triggers replace `pg_cron`. |
| Files | **Cloudflare R2** (media, private, exports). Uploads through presigned URLs. |
| Auth | **WorkOS** (AuthKit) with passkeys and step-up. The Worker verifies the WorkOS access token (JWKS) and calls `app.set_claims()` in each request transaction. |
| Frontend | **Next.js on Vercel**, deployed from GitHub. UI only once routes move to the Worker. |
| Backend jobs | **Railway** for long-running work (ffmpeg, long agent jobs). |

## How authorization works without Supabase
- `app.uid()`, `app.claims()`, `app.stepped_up()` read transaction-local settings (`set_config(..., true)`), so they are safe behind a pooler.
- Roles `app_anon`, `app_user`, `app_service` replace `anon`, `authenticated`, `service_role`. The Worker does `SET LOCAL ROLE app_user` per request.
- `app.apply_owner_rls()` is the RLS template; `app.enable_chronicle()` attaches the hash-chained audit chronicle (`app.audit_log`, verified by `app.verify_chronicle()`).
- `app.users` replaces `auth.users` and maps WorkOS user ids to internal UUIDs.

## Consequences
- Every `auth.uid()` in the old migrations is now `app.uid()`; the port is mechanical and reproducible (`scripts/port-supabase-migrations.mjs`).
- The Next.js routes still call Supabase until they move to the Worker; they are migrated route by route, then `@supabase/*` is removed.
- Supabase credentials in git history (`OPS.md`) must be rotated before anything else, then the project decommissioned.
- Open item: the 353 `documents` rows that point at storage objects while `storage.objects` reads 0 must be reconciled before decommissioning Supabase storage.
