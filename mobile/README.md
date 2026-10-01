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
- Sign-in (`sign-in.tsx`) uses Supabase with the session in SecureStore (Keychain/Keystore).
- `penthouse.tsx` calls the real `POST /api/vip-keylock/challenge|verify|lock` with the
  member's bearer token. The server returns the lift token in the body only to bearer
  clients; the app keeps it in SecureStore and sends it as `X-Finesse-Lift`.
- Env (`mobile/.env`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  `EXPO_PUBLIC_API_BASE_URL` (defaults to https://finesselife.vip).
- After pulling, run `npx expo install expo-secure-store @supabase/supabase-js react-native-url-polyfill`
  so Expo pins versions that match SDK 57.
