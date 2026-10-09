# 0004 — Entitlements and roles are server-managed; members never write them

> **Status:** ACCEPTED
> **Date:** 2026-10-09
> **Decision:** `profiles.is_vip`, `profiles.vip_expires_at` and `profiles.role`, Vault balances/ledger rows and Scale pledge states beyond "cancelled" are written only by the service role (or trusted DB triggers), enforced in Postgres — not only in API routes.

## Context

The 2026-10-09 audit found that RLS let a signed-in member, using only the public anon key, set their own `is_vip`, write their own Vault balance, and walk their own Scale pledge to `paid` (or delete and re-insert it). API-layer freezes (Vault 423) and checks were bypassable because the database trusted the member. Admin access was decided by `username === 'admin'`, which any member could claim.

## Options considered

- **Database-enforced (chosen):** a BEFORE trigger on `profiles` that rejects entitlement/role changes from `anon`/`authenticated` JWTs; drop member write policies on Vault tables; members may only insert `pledged`/`waitlisted` pledges and move them to `cancelled`; VIP grants go through a `SECURITY DEFINER` function executable only by the service role.
- **Column privileges (REVOKE UPDATE (is_vip …))**: equivalent for updates but doesn't cover inserts or give a clear error; harder to audit across the conflicting 20260617 migrations.
- **API-only checks:** rejected — PostgREST is reachable directly with the anon key.

## Decision

Implemented in `supabase/migrations/20261009_security_floor.sql`, tested by `npm run test:db`. Admin = `profiles.role in ('admin','owner')` or `ADMIN_EMAIL` (`src/lib/admin.ts`). Payment webhooks, code redemption and staff tools use the service role; member-facing routes keep using the member's session.

## Consequences

- Any future feature that grants VIP (subscriptions, IAP) must do so server-side, through the same path.
- Vault write routes stay non-functional until they move to the service role with processor evidence — intended.
- The first admin must be set from a direct DB session.

## Links

- `docs/BACKEND_MAP.md` §6 · `docs/STATE.md` 2026-10-09 · ADR-0002 (Vault freeze).
