# mobile/store — store assets

Generated files for the App Store and Google Play listings, and the tools that make them. The submission
runbook is [docs/store/README.md](../../docs/store/README.md).

| Path | What |
|---|---|
| `ios/01…08-*.png` | App Store screenshots, iPhone 6.9" — 1290×2796 |
| `play/01…08-*.png` | Play phone screenshots — 1080×1920 (Play rejects frames longer than 2:1, so not 1080×2340) |
| `play/icon-512.png` | Play hi-res icon — 512×512 RGBA, from `assets/brand/icon.png` |
| `play/feature-graphic-1024x500.png` | Play feature graphic |
| `raw/{ios,play}/` | Raw app captures (430×932 @3x = 1290×2796; 360×780 @3x = 1080×2340) before captions |
| `reviewer/looks/` | Look photos the reviewer seed uploads (`scripts/seed-demo.mjs --reviewer`) |
| `tools/capture.cjs` | Drives the Expo web **store-preview** build with Playwright and saves raw captures |
| `tools/compose.cjs` | Adds the caption band (serif headline on noir) and frames each capture; captions live here |
| `tools/graphics.cjs` | Play icon + feature graphic |
| `tools/looks.cjs` | Renders the reviewer’s sample look cards |

## Regenerate

Needs Playwright with Chromium (`npm i -g playwright && npx playwright install chromium`, or set `CHROME=` to a
Chromium binary). Fonts come from `node_modules/@expo-google-fonts` (Instrument Serif, Inter Tight).

```sh
cd mobile
# 1. Serve the STORE build (hidden rooms gated off exactly as in release):
EXPO_PUBLIC_STORE_PREVIEW=1 CI=1 BROWSER=none npx expo start --web --port 8098 --clear
# 2. In another shell:
BASE=http://localhost:8098 node store/tools/capture.cjs          # DEVICE=ios|play, SHOTS=03-lobby,… to limit
node store/tools/compose.cjs
node store/tools/graphics.cjs
```

Signed in (once the production database is live and the reviewer is seeded):

```sh
REVIEWER_EMAIL=review@demo.finesselife.vip REVIEWER_PASSWORD=… BASE=http://localhost:8098 node store/tools/capture.cjs
```

The Expo server must then be started with the production `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_API_BASE_URL`. Screenshots taken on a simulator or emulator work
too: name them like the raw files (`04-concierge.png`, …), put them in `raw/ios` or `raw/play`, run `compose.cjs`.

## Shot list and captions

| # | Screen | Headline |
|---|---|---|
| 01 | The door (house code) | Say the word. |
| 02 | Floor choice | Your floor first. |
| 03 | The Lobby | The house, after hours. |
| 04 | Concierge / Nova | Your private line. |
| 05 | The Wardrobe | Dressed before you ask. |
| 06 | Departures (boarding pass) | Wheels up, quietly. |
| 07 | The Diary | Your night, in order. |
| 08 | The Lounge | The room worth knowing. |

Rules: only screens that exist in the store build; no Vault, VIP, Penthouse, prices or “buy” copy; no build-state
labels (Preview, In preparation, Sample room, “on the web”); the caption must describe what the screen shows.

Signed-out captures, how they stay clean: the door's challenge is answered by the capture tool the way the live house
answers it (so the frame shows the release door, not the dev-only “Rehearsal” state); the Lounge frame scrolls past
the sign-in card onto the floor; and the in-app “sample” stamps on demo content (`SAMPLE PASS`, “Sample trip ·…”,
“Sample page ·…”, “Sample rack ·…”) are hidden in the frame only (`hide` in `capture.cjs`) — the app always shows
them signed out. Current captures are signed out (sample state) — re-capture signed in with
the reviewer account before launch.
