# After Hours — the Finesse look

The founder picked this direction in October 2026, replacing "Continental".

The style is noir and chrome, with editorial serif italics, rose-gold warmth and nightlife light. It should read as luxury to 18–27 year olds (drops, guest lists, the night out) and to older members (restraint, the calm of a black card). Exclusivity is shown through scarcity and discretion: "by invitation", key holders, guest-list caps and members-first drops. Never through discounts.

## Rules

- **Type**
  - Instrument Serif italic for display.
  - Inter Tight for UI.
  - Anton only for rare condensed accents.
  - Fonts load once on `<html>` (`src/lib/fonts-after-hours.ts`).
- **Colour**
  - Ink `#050505` with grain.
  - Chrome gradients for headlines.
  - Rose gold (`#E8B4A0` → `#B76E79`) for heat and the active state.
  - Green `#7EE2B8` only for "live / credit".
  - The live map's neon pink, blue and yellow are kept to the map.
- **Card finishes** are the brand metals: Nano Black, Platinum and Rose Gold (`src/lib/card-finishes.ts`).
- **What to avoid:** brass, Art Deco ornament, sepia, emoji, discount language.
- **Honesty:** every room shows real data or an honest empty state. Sample content is labelled.

## Kit

`src/components/after-hours/` (`index.tsx` and `after-hours.css`):

| Piece | What it is |
| --- | --- |
| `AHRoom` | Page shell |
| `AHTopBar` | Top bar. Its wordmark is hidden inside the hotel frame, which already shows one. |
| `AHEyebrow` | Small label above a heading |
| `AHDisplay` | Chrome serif-italic headline |
| `AHSection` | Section with a heading |
| `AHPill` | Button in solid, rose or ghost style |
| `AHChip` | Small tag, with an optional live dot |
| `AHCard` | Card, optionally glass |
| `AHSmoke` | Hero card in rose or neon-city light |
| `AHRing` | Story-ring avatar |
| `AHIndex` | Numbered serif list |
| `AHMemberCard` | The Finesse card in the member's finish |
| `AHDock` | Fixed bottom action. It sits above the hotel dock via `--hotel-dock`. |
| `AHSkeleton` | Loading placeholder |
| `AHClock` | Live clock |
| `useLocalPref` | SSR-safe localStorage preference |

**The hotel frame.** `src/components/finesse-layout.tsx` and `.css` provide the glass top bar, the side rails and the Nova dock. They expose `--hotel-top`, `--hotel-dock` and `--hf-rail` as CSS variables.

## Rooms done

| Room | Files |
| --- | --- |
| Entrance KeyLock | `src/app/page.tsx` and `entrance-view.tsx` |
| Sign-in and sign-up | `src/app/(auth)/*` |
| Lobby | `src/app/(hotel)/lobby/*` |
| Lounge and live map | `src/app/(hotel)/lounge/*` |
| Vault | `src/app/(hotel)/vault/*` |
| Concierge / Nova | `src/app/(hotel)/concierge/*` |
| VIP Room, private lift and Penthouse | `src/app/(hotel)/vip/*` and `src/components/hotel/private-lift.*` |

## Previews

These dev routes use sample data and need no database:

- `/design/after-hours?room=lobby|lounge|vault&state=…`
- `/design/after-hours/concierge`
- `/design/after-hours/vip`
- `/design/after-hours/penthouse`
- `/design/after-hours/entrance`
- `/design/directions`
- `/design/map`

## Still to do

- The other hotel rooms. They already sit inside the new frame, but their content is still in older styles.
- The Expo app (`mobile/`), which is still Continental.
