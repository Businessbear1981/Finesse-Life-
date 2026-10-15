# 0006 — Auth middleware is web-only; the native app authenticates with a SecureStore session + bearer token

> **Status:** ACCEPTED
> **Date:** 2026-10-13
> **Decision:** The member session is established the same way on both surfaces, but stored in different places. Web trusts the Supabase SSR cookie refreshed by Next.js middleware; the native (Expo) app stores the session in the OS keychain via `expo-secure-store` and sends the member's access token as a `Authorization: Bearer` header. The Next.js edge middleware stays **web-only** and is the single server-side auth gate for **both** surfaces.

## Context

Finesse has two frontends — web (Next.js 16, `src/`) and native (Expo React Native, `mobile/`) — and both talk to the same Next.js `/api` (ADR-0001). They must resolve to the **same** Supabase member and the **same** RLS identity, or entitlements, VIP gates and RLS policies diverge between surfaces.

There is no "middleware" on the native side to mirror `src/middleware.ts`: React Native has no server edge, and putting auth logic in the client would make it a client-side oracle. The native app's equivalent of "session middleware" is: keep the token in secure storage, attach it to every request, and let the **server** decide.

## Options considered

- **Native bearer token + web-only edge middleware, shared server truth (chosen):** one server-side gate (`updateSession`) authorizes both surfaces against the same Supabase identity and RLS; the native app holds no authority, only a token.
- **A separate mobile auth service / second middleware stack:** duplicates the gate, doubles the surface where authz can drift, and contradicts ADR-0001 (one deploy surface).
- **Client-side session checks in the mobile app:** an oracle — rejected outright. The entrances already enforce "no client PIN, no per-digit oracle" (`src/app/page.tsx`, `/api/keylock/entrance/*`); auth must hold the same line.

## Decision

- **Web** authenticates via the Supabase SSR cookie. `src/middleware.ts` runs `updateSession` on every non-static path; it refreshes cookies, gates public vs signed-in routes, returns a JSON `401` (never an HTML redirect) to signed-out `/api/*` callers, and lets webhooks through by their own signature.
- **Native** authenticates with a session held in `expo-secure-store` — the iOS Keychain / Android Keystore, never `AsyncStorage` or plain files (`mobile/src/lib/secure-storage.ts`, `mobile/src/lib/supabase.ts`). The client sends the access token as `Authorization: Bearer <token>` on `/api/*`.
- **The server accepts the bearer and acts *as* the member**, so RLS applies exactly as on web: `src/lib/supabase/middleware.ts:29-33` (edge) and `src/lib/supabase/server.ts:6-26` (`bearerToken()` → `createClient()` builds a per-request Supabase client bound to the member's token; `isBearerRequest()` at :50-55). Cookies win when both are present (`server.ts:15`).
- **In the monorepo this pairing is preserved as-is:** the edge middleware lives with the web app; the native app keeps the SecureStore session; the token/cookie contract is the shared boundary between them and belongs in `packages/contracts`.

## Consequences

- Any future surface (a second native client, a partner integration) authenticates by presenting a member bearer token and inherits the same gate — no per-surface auth code.
- Auth changes are one place: `updateSession` and `lib/supabase/server.ts`. A change to the token contract is a **boundary change** and must be versioned in `packages/contracts`.
- The middleware does a Supabase `profiles` query on `/vip/*` navigation for the VIP gate. It is correct (RLS-scoped to the member's JWT) but is a per-request round trip — an optimization candidate (token claim or short-TTL cache), to be measured before changed, not assumed.
- This record does **not** cover observability. The declared-but-disabled Middleware.io APM (`package.json`, `next.config.ts:4`, no-op `src/instrumentation.ts`) is out of scope here and is tracked in the rebuild plan.

## Links

- ADR-0001 (Next.js `/api` canonical; `backend/` dormant).
- `src/middleware.ts`, `src/lib/supabase/middleware.ts` (`updateSession`), `src/lib/supabase/server.ts`.
- `mobile/src/lib/supabase.ts`, `mobile/src/lib/secure-storage.ts`.
- `docs/BACKEND_MAP.md` (auth legend: none / user / user(c) / svc / VIP; mobile bearer via `lib/supabase/server.ts`).
