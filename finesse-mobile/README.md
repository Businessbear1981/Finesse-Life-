# Finesse — Expo (React Native) starter

Screens from `Finesse Mobile.dc.html` + the KeyLock from `Finesse Hotel.dc.html`, written as Expo Router files. Drop them into a fresh Expo app.

## 1. Install
```
cd finesse-mobile
npm install          # pinned to Expo SDK 54 / React Native 0.81.5; Node >= 20.19.4
npm run typecheck
```
Check-in tables live in Postgres (`db/migrations/0026_mobile_checkin.sql`), not D1.

## 4. Environment
Create `.env` in the app root:
```
EXPO_PUBLIC_API_URL=https://api.finesselife.vip   # the Cloudflare Worker (workers/api)
EXPO_PUBLIC_DEV_HOUSE_CODE=123456   # dev only; delete for production
```

## 5. Run
```
npx expo start
```
Scan the QR code with Expo Go.

## Flow
`app/index.tsx` KeyLock → `app/side.tsx` → `app/check-in.tsx` (register, connect accounts, interview, style read, staff) → `app/(hotel)/lobby.tsx` inside the hotel shell (left rail, right rail, bottom dock, Nova on/off centre).

## Server endpoints the app calls (Cloudflare Worker, `workers/api`)
The app talks only to the API. Postgres and R2 are reached from the server side.
Exists: `PATCH /api/profile`, `POST /api/vip/redeem`.
To build (the app has dev fallbacks so it runs without them):
- `POST /api/keylock/house` `{code}` → `{ok}` — verify the 6-digit house code server-side. Never ship the code in the app.
- `GET /api/connect/:provider` — OAuth start for instagram, tiktok, pinterest, facebook, x, google. On callback, store tokens server-side in `social_connections` and register the webhooks.
- `GET /api/style-read` → `{headline, palette[], tags[], posts}` built from connected accounts.
- `PUT /api/check-in` `{answers, nova, shopper}` → upserts `interview_answers` and `member_staff` in Postgres for the authenticated user.
- `POST /api/uploads/sign` `{contentType}` → `{uploadUrl, key}` — presigned R2 PUT URL; store `key` as `closet_items.image_key`.
- The Closet persists through the existing `POST /v1/data` (RLS-bound `closet_items`: select / insert, `source` stored lowercase) and `GET /v1/me`; photos go via `/api/uploads/sign` first. See `listClosetItems` / `addClosetItem` in `src/lib/api.ts`.

Auth: WorkOS (passkeys + step-up). The app sends `Authorization: Bearer <token>` (`src/lib/auth.ts` keeps it in SecureStore). The Worker verifies the WorkOS JWT and sets Postgres session claims so row-level security applies.

## File map
| File | Screen |
|---|---|
| app/index.tsx | 01 KeyLock (medallion + 6 tumblers, swipe + haptics) |
| app/side.tsx | 02 Choose your side |
| app/check-in.tsx | 03–07 Check-in |
| app/(hotel)/_layout.tsx | Hotel shell |
| app/(hotel)/lobby.tsx | 08 Lobby (centre) |
| app/(hotel)/closet.tsx | 09 The Closet (turning rack + sources) |
| app/(hotel)/room/[id].tsx | Any other room |
| app/(hotel)/profile.tsx | 10 This Is You |
| app/(hotel)/vip.tsx | 11 VIP |
| src/components/Medallion.tsx, Tumbler.tsx | KeyLock parts |
| src/components/TierRail.tsx | Closet turning rail (top / bottom / dress) |
| src/components/CheckInSteps.tsx, CheckInStaff.tsx | Check-in pages |
| src/components/Pedestal.tsx, src/data/pedestals.ts | Orchid (left) and lion (right) pedestals on the KeyLock |

## Not done yet
- Sign-in with WorkOS AuthKit (call `setToken` after login). Until then the saves no-op and the app runs on local state.
- Real images: room scenes, portraits, closet photos (drop-in `Image` sources).
- Server routes listed above.
