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
| Six missing plates: Ballroom, Jazz Club, This Is You, Closet, Diary, Camera | `src/app/(hotel)/{ballroom,jazz-club,this-is-you,closet,diary,camera}` | superseded by Pass 3 below |
| Shared plate frame: loading/empty/preview/gated/error/confirmed, disclosure, escalation | `src/components/hotel/room-plate.tsx`, `GET /api/rooms/:id` | wired |
| Append-only revenue ledger + Stripe confirmed/refund rows | migration, `src/lib/revenue/events.ts`, Stripe webhook | wired |
| Vault: freeze member-minted writes, parameterised rate, no secret fallback | `src/lib/vault-guard.ts`, vault routes | gated |
| Backstage KeyLock fails closed | `src/app/api/keylock/enter` | fixed |
| Committed DB password removed from `scripts/migrate.js` / `OPS.md` | — | **rotate the password** |
| Expo mobile app (Lobby, 31 rooms, Penthouse) | `mobile/` | Penthouse wired in Pass 4 |
| Claude skills: keylock-security, room-implementation, revenue-events, art-deco-motion | `.claude/skills/finesse-*` | — |

## Pass 3–4 (2026-10-01, continued)

| Plan item | Where | Truth |
|---|---|---|
| Diary API: day page, add, approve, hold, move/done/cancel | `src/app/api/diary/*` | wired |
| Ballroom API: context, compose (proposal), hold (request only), confirm (only after partner hold) | `src/app/api/ballroom/*` | preview — no partner adapter yet |
| Closet API: rotation from owned looks, approve week, pin look, missing piece | `src/app/api/closet/*` | wired |
| This Is You API: server-computed public view, projections, visibility, export, delete | `src/app/api/identity/*`, `src/lib/identity.ts` | wired |
| Camera API: consented private upload (R2 key + presigned view), vision identify with no fallback guess, member catalogue, route (Closet/Exchange/Bag), delete photo | `src/app/api/camera/*` | wired (needs AI + R2 env) |
| Jazz Club API: programme, join (refuses until audio provider), tips (refuses until payouts), replays | `src/app/api/jazz-club/*` | preview |
| Live member views on all six plates, honest preview fallback | `src/app/(hotel)/{diary,ballroom,closet,this-is-you,camera,jazz-club}` | — |
| Scale pledge state machine + transition guard + history; join never charges; waitlist after goal; Stripe drives paid/refunded | migration `20261003_*`, `src/app/api/scale/*` | wired (no charge path) |
| API routes answer JSON 401 (not HTML redirect); **Stripe/Telegram webhooks were being redirected to /login — fixed** | `src/lib/supabase/middleware.ts` | fixed |
| Mobile: Supabase sign-in (SecureStore), real private lift via bearer token | `mobile/src/app/{sign-in,penthouse}.tsx`, `src/lib/supabase/server.ts` | wired (untested on device) |

Extra migrations: `20261002_plates_24_31.sql`, `20261003_scale_pledge_states.sql`.

## Deploy checklist (principal approval required — AGENTS.md)

1. Rotate the Supabase DB password (it is in git history).
2. Vercel env: `KEYLOCK_SECRET` (`openssl rand -hex 32`), `ENTRANCE_KEYLOCK_CODE` (six digits; `123456` reproduces today's behaviour), confirm `SUPABASE_SERVICE_ROLE_KEY`, `INTEGRATIONS_ENCRYPTION_KEY`.
3. Apply, in order: `20261001_keylocks_vip_lift_revenue_ledger.sql`, `20261002_plates_24_31.sql`, `20261003_scale_pledge_states.sql` (`SUPABASE_DB_PASSWORD=… npm run db:migrate <file>`)
4. Merge PR → `npm run deploy`.
5. Smoke: `/` opens with the code, wrong code shakes; Lobby → Call the lift as a VIP (first ride enrols a PIN) → `/vip/penthouse`; non-VIP sees "remains closed"; `/vip` loads for VIPs.

## Still open (decisions, not code)

- Vault rate & partner (1% code vs 12% manual vs −1% Scale cost). Writes stay frozen until signed.
- Payment processor for membership/Scale (Stripe vs CCBill) — nothing transacts yet.
- Hidden-score / eligibility policy: This Is You is wired with projections, but no hidden score exists; any future score needs a consent, appeal and legal decision first.
- Partner adapters: Ballroom holds (OpenTable/Resy/hotel), Jazz Club audio (LiveKit) and tips, Scale payment request — states exist, providers don't. Gym and Kitchen keep their existing pages.
- Mobile: run `npx expo install` for the new deps and test sign-in + lift on a device (not type-checked here — Expo install exceeded the sandbox time limit).
- Manus React/Vite preview (`App.tsx`, `index.css`) is a separate managed project and was not merged here.
