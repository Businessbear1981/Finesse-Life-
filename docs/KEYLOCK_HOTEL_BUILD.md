# Keylock 1920s Hotel App Build — implementation map

Source plan: "Plan the Keylock 1920s Hotel App Build" bundle (31-room manifest, Build Authority, VIP gate
audit, Private-Lift elevator design, revenue/API architecture, 30-Sep-2026 source reconciliation, Expo handoff starter).

## What shipped on `sean/keylock-hotel-build`

| Plan item | Where | Truth |
|---|---|---|
| Canonical 31-room manifest + validator | `FINESSE_31_ROOM_PROJECT.json`, `tooling/validate-project.mjs` (`npm run rooms:validate`) | wired |
| Typed registry + rails in attachment order | `src/lib/rooms/registry.ts` | wired |
| Zod contracts (track, KeyLocks, revenue envelope) | `src/lib/contracts/index.ts` | wired |
| Public KeyLock: server challenge/verify, no client PIN, no per-digit oracle | `src/app/page.tsx`, `src/app/api/keylock/entrance/*` | wired (preview until `ENTRANCE_KEYLOCK_CODE` set) |
| Brass diagonal sweep after the sixth digit, gender-side selector preserved | `src/app/page.tsx` | wired |
| Lobby Private Lift: canopy, fluted columns, floor indicator, six tumblers across two doors, keypad/keyboard/paste, reduced motion, track glow | `src/components/hotel/private-lift.tsx` | wired (needs migration + `KEYLOCK_SECRET`) |
| VIP lift API (separate challenge/session/audit/rate-limit) | `src/app/api/vip-keylock/{challenge,verify,session,lock}` | wired |
| `/vip/penthouse` (inside room 23), `/penthouse` → redirect | `src/app/(hotel)/vip/penthouse/*`, middleware | wired |
| VIP middleware RLS bug (anon bearer → every VIP bounced) | `src/lib/supabase/middleware.ts` | fixed |
| 31-room directory in the Lobby | `src/components/hotel/room-directory.tsx` | wired |
| Six missing plates: Ballroom, Jazz Club, This Is You, Closet, Diary, Camera | `src/app/(hotel)/{ballroom,jazz-club,this-is-you,closet,diary,camera}` | specified/preview (honest) |
| Shared plate frame: loading/empty/preview/gated/error/confirmed, disclosure, escalation | `src/components/hotel/room-plate.tsx`, `GET /api/rooms/:id` | wired |
| Append-only revenue ledger + Stripe confirmed/refund rows | migration, `src/lib/revenue/events.ts`, Stripe webhook | wired |
| Vault: freeze member-minted writes, parameterised rate, no secret fallback | `src/lib/vault-guard.ts`, vault routes | gated |
| Backstage KeyLock fails closed | `src/app/api/keylock/enter` | fixed |
| Committed DB password removed from `scripts/migrate.js` / `OPS.md` | — | **rotate the password** |
| Expo mobile app (Lobby, 31 rooms, Penthouse preview) | `mobile/` | preview |
| Claude skills: keylock-security, room-implementation, revenue-events, art-deco-motion | `.claude/skills/finesse-*` | — |

## Deploy checklist (principal approval required — AGENTS.md)

1. Rotate the Supabase DB password (it is in git history).
2. Vercel env: `KEYLOCK_SECRET` (`openssl rand -hex 32`), `ENTRANCE_KEYLOCK_CODE` (six digits; `123456` reproduces today's behaviour), confirm `SUPABASE_SERVICE_ROLE_KEY`, `INTEGRATIONS_ENCRYPTION_KEY`.
3. `SUPABASE_DB_PASSWORD=… npm run db:migrate supabase/migrations/20261001_keylocks_vip_lift_revenue_ledger.sql`
4. Merge PR → `npm run deploy`.
5. Smoke: `/` opens with the code, wrong code shakes; Lobby → Call the lift as a VIP (first ride enrols a PIN) → `/vip/penthouse`; non-VIP sees "remains closed"; `/vip` loads for VIPs.

## Still open (decisions, not code)

- Vault rate & partner (1% code vs 12% manual vs −1% Scale cost). Writes stay frozen until signed.
- Payment processor for membership/Scale (Stripe vs CCBill) — nothing transacts yet.
- Profile lens / hidden score policy before "This Is You" is wired.
- Plates 24–31 APIs (`/api/ballroom/*`, `/api/diary/*` …) are specified, not built; Gym and Kitchen keep their existing pages.
- Mobile auth (Supabase on device) before the mobile lift can call the real API.
- Manus React/Vite preview (`App.tsx`, `index.css`) is a separate managed project and was not merged here.
