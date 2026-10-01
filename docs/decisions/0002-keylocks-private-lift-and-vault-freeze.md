# 0002 — Two independent KeyLocks, a ceremonial private lift, and a Vault write freeze

> **Status:** ACCEPTED
> **Date:** 2026-10-01
> **Decision:** Verify the public entrance code server-side, add a separate Lobby private-lift lock that consumes (never grants) the existing VIP entitlement, and freeze member-initiated Vault writes until the card-partner economics are signed off.

## Context

The "Keylock 1920s Hotel App Build" plan (31-room manifest, VIP gate audit, elevator design, revenue
architecture, 30-Sep source reconciliation) found: the entrance PIN `123456` shipped in the client bundle
and was checked digit-by-digit; the `/vip` middleware queried `profiles` with the anon key (RLS → empty →
every VIP redirected); `/api/vault/fund` and `/api/vault/cashback` let a member mint balance with no
processor receipt; KeyLock secrets had hard-coded fallbacks.

## Options considered

- **Server-verified locks + private lift over the existing grant (chosen):** additive; `/api/vip/redeem`, `/vip`, `is_vip` untouched.
- **Replace the VIP redemption card with the puzzle:** rejected — the puzzle would become a way to grant VIP.
- **Pick 1% (code) or 12% (Vault manual) for the Vault:** rejected — an open product/legal decision; rate is parameterised and writes are frozen.

## Decision

- Entrance: `POST /api/keylock/entrance/{challenge,verify,lock}`; code in `ENTRANCE_KEYLOCK_CODE`; unset → disclosed preview mode.
- Private lift: `POST /api/vip-keylock/{challenge,verify,lock}`, `GET /api/vip-keylock/session`; member-chosen six-digit lift PIN (scrypt), enrolled on first ride; 30-min httpOnly session; `/vip/penthouse` requires VIP **and** a live lift session. Penthouse stays inside room 23.
- Vault: `VAULT_LEDGER_WRITES_ENABLED` + `VAULT_CASHBACK_RATE_BPS` gate all member writes (HTTP 423 otherwise).
- Revenue: append-only `revenue_events`; booked states need a provider receipt; Stripe success/refund recorded.

## Consequences

- Set in Vercel before deploy: `KEYLOCK_SECRET` (≥32 chars), `ENTRANCE_KEYLOCK_CODE`, and confirm `SUPABASE_SERVICE_ROLE_KEY`, `INTEGRATIONS_ENCRYPTION_KEY`.
- Apply `supabase/migrations/20261001_keylocks_vip_lift_revenue_ledger.sql` before the lift works (it returns "being serviced" until then).
- Vault top-up / cashback buttons now answer "opens once the card partner is signed off".

## Links

- `FINESSE_31_ROOM_PROJECT.json`, `docs/KEYLOCK_HOTEL_BUILD.md`
