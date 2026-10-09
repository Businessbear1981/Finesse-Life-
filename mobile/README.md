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
- The house side (Finesse / Carpe Diem) is remembered on the device; change it or sign out from
  **This Is You** (top-left of the hotel).

## Store builds (EAS)

- Bundle id / package: `vip.finesselife.app` (cannot change after the first store upload).
  iOS is phone-only (`supportsTablet: false`) and declares no non-exempt encryption.
- Icons: `assets/brand/icon.png` (1024², opaque RGB) for iOS; Android uses the adaptive
  `android-icon-foreground.png` / `android-icon-monochrome.png` (artwork inside the 66% safe zone)
  on `#0A0406`.
- `eas.json` profiles: `development` (dev client, internal), `preview` (internal APK / ad hoc),
  `production` (store; build numbers are managed remotely by EAS with `autoIncrement`).
- **EAS must upload from the repo root.** `src/lib/registry.ts` imports `../FINESSE_31_ROOM_PROJECT.json`
  from outside `mobile/`, so the build archive has to contain the whole git repository. Run
  `npx eas-cli@latest build --profile <profile> --platform <ios|android>` from `mobile/` inside the git
  checkout (EAS archives the git root and builds in `mobile/`). Do not set `EAS_NO_VCS`, copy `mobile/`
  out on its own, or add an `.easignore` that drops `FINESSE_31_ROOM_PROJECT.json` — the bundle fails
  without it. Metro already watches the repo root (`metro.config.js`).
- Reviewers need a house code and a signed-in VIP test account in App Store Connect / Play Console notes.
  A release build refuses an entrance that the server opens in `mode: "preview"` (unconfigured server).

