# Finesse Life — Expo mobile (iOS / Android)

Self-contained Expo Router app. It is **not** part of the Vercel build (the web app
lives at the repo root; `mobile/` is excluded from the root tsconfig, ESLint and Vercel).

```bash
cd mobile
npm install
npx expo start        # i / a / w
npm run check         # tsc --noEmit
```

- Rooms come from the same `../FINESSE_31_ROOM_PROJECT.json` the web registry compiles.
- `penthouse.tsx` is a **truthful preview** of the private lift. It does not call
  `/api/vip-keylock/*` yet: mobile auth (Supabase session on device) has to land first.
  Until then digits never unlock anything.
- Next: Supabase auth via `@supabase/supabase-js` + SecureStore, then call
  `POST /api/vip-keylock/challenge|verify` with the member's bearer token.
