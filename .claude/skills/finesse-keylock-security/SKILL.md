---
name: finesse-keylock-security
description: Review or implement Finesse public KeyLock and Lobby Penthouse puzzle. Use for challenge APIs, six-digit digit-entry UX, VIP entitlement checks, or sliding-door animations.
---

# Finesse KeyLock security

1. Distinguish the public entrance lock from the Lobby Penthouse door puzzle. Use separate challenge IDs, nonces, rate limits, sessions, expirations, and audit events.
2. Keep the accepted production code out of the client bundle, localStorage, and logs. Do not disclose it in errors or analytics.
3. Require authenticated member identity, server-side challenge verification, and active `profiles.is_vip` with valid expiry before granting Penthouse access.
4. Preserve existing `/api/vip/redeem` and `/vip` guards. The elevator puzzle is a ceremony over entitlement, not a way to grant entitlement.
5. Display six accessible digit tumblers on the two sliding door panels only after Penthouse is clicked. The panels open only after a server-approved VIP session.
6. Check direct-link protection, retries, expiry, revocation, multiple simultaneous attempts, accessibility, and reduced motion.

## In this repo

- Entrance lock: `src/app/api/keylock/entrance/*`, config in `src/lib/entrance-keylock.ts`. Code lives only in `ENTRANCE_KEYLOCK_CODE` (server env). Unset → honest preview mode.
- Private lift: `src/app/api/vip-keylock/*`, `src/lib/vip-lift.ts`, UI `src/components/hotel/private-lift.tsx`, destination `/vip/penthouse`.
- Backstage KeyLock (`/api/keylock/enter|verify`) is a third, older boundary — do not merge them.
- Shared primitives: `src/lib/keylock-server.ts` (scrypt PINs, fail-closed `KEYLOCK_SECRET`, audit-based lockout).
