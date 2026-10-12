# finesse-api — Cloudflare Worker (Hono)

One API for the PWA and the Expo app at `api.finesselife.vip`. See ADR-0002.

## Layout
| File | Role |
|---|---|
| `src/app.ts` | Routes: `/health`, `/v1/engines`, `/v1/envelope`, `/v1/commitments/:id/confirm`, `/api/*` (mobile) |
| `src/auth.ts` | WorkOS JWT verification (JWKS), maps WorkOS user → `app.users`, sets Postgres claims |
| `src/db.ts` | One transaction per call: `SET LOCAL ROLE app_user|app_service` + `app.set_claims()` (Hyperdrive-safe) |
| `src/envelope.ts` | Envelope handler: intent → play → tier_run → artifact → truth → commitments → events/outbox; idempotent |
| `src/truth.ts` | Truth wrapper: records `orch.source_reads` + `orch.truth_checks`, gates low-confidence/contradicted artifacts |
| `src/engines/` | Engine contract + registry (replaces the switch in `src/lib/intelligence/engine.ts`); `profile`, `compliance` engines |
| `src/breaker.ts` | Circuit breakers shared in `orch.breakers` |
| `src/outbox.ts` | Cron relay (outbox → Queues, `SKIP LOCKED`) and queue routing |
| `src/routes/mobile.ts` | Endpoints the Expo app calls |

## Develop
```
npm ci
npm run typecheck
TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres npm test   # disposable Postgres; DB tests skip without it
```
Node 22+ for wrangler.

## Before the first deploy (not done in this PR)
1. Neon: create role `finesse_api` (member of `app_user` and `app_service`), run `DATABASE_URL=<direct url> node ../../db/migrate.mjs`.
2. `wrangler hyperdrive create finesse-neon --connection-string=<pooled url as finesse_api>` → put the id in `wrangler.toml`.
3. `wrangler r2 bucket create finesse-media|finesse-private|finesse-exports`; `wrangler queues create finesse-events` and `finesse-events-dlq`.
4. Set `WORKOS_CLIENT_ID` in `wrangler.toml`; `wrangler secret put HOUSE_CODE_SHA256`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
5. WorkOS: enable passkeys; add a JWT template claim `step_up_at` set on passkey re-auth.
6. `wrangler deploy` and attach `api.finesselife.vip`.
