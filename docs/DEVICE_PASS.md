# Device pass — glitch hunt (Expo Go)

A manual, on-device walk of the Expo app (`mobile/`). The RN code is **statically clean** (audited
`mobile/src`, 90 files): no crash paths, no `console.*`, no `TODO/FIXME`, no `@ts-ignore`, no empty
`catch {}`. What a static pass **cannot** see is the runtime "glitchy" feel — layout on a real
screen, keyboard/safe-area behaviour, animation jank, haptics, live-data states. This pass finds those.

Run it before any store submission (`docs/store/CHECKLIST.md`) and after any batch of room edits.

## How to run

1. `cd mobile` · install deps (none present in a fresh clone) · `npx expo start`.
2. Open in **Expo Go** on a real iPhone and a real Android phone. Simulator ≠ device for haptics,
   keyboard, notch/Dynamic Island and safe-area behaviour; walk both OSes where you can.
3. Backend is `https://finesselife.vip` (`mobile/src/lib/api.ts`). A **signed-in member account** and a
   **VIP account** are needed for the signed-in and VIP passes.
4. **Migration caveat:** the `video_ai` consent CHECK constraint (`20261020_s3_consents_video_ai.sql`) is
   **not applied**. Until it is, the Scrapbook "Film" action will fail server-side. Treat that one flow
   as expected-blocked and verify the *rest* of it (the consent sheet appears, copy is right, gating fires).

## Findings log

One row per defect, reproduced twice. Severity: **blocker** (crash / unusable / wrong data) ·
**glitch** (layout, jank, misalignment, wrong state) · **polish** (copy, spacing, feel).

| # | Screen | Step | Expected | Actual | Device/OS | Sev | Shot |
|---|--------|------|----------|--------|-----------|-----|------|

## Pass A — signed out (fresh install, no account)

| Check | What to look for |
|---|---|
| Cold start → `index` | Splash → gate. No flash of unauthed content, no layout jump. |
| `sign-in` | Keyboard does **not** cover fields; submit button stays reachable; error copy is human. |
| `_layout` fonts | Instrument Serif italic + Inter Tight render (not system fallback). Any room with a fallback font = font asset/family bug. |
| Deep link straight to a room | Signed-out users get a gate/redirect, not a broken screen. |
| Airplane mode | Every fetch shows an offline state (`offline()` in `api.ts`), never a blank screen or infinite spinner. |
| Dynamic Type (iOS, largest size) | Nothing clipped or overlapping; room labels wrap, not truncate, where the design allows. |

## Pass B — signed-in member

Walk every room via the lobby directory (`room/[id]`) **and** the rails:

`Concierge · Club · Kitchen · Starmaker · Calendar · Market · Lifestyle · House · Social · Lounge ·
Penthouse · Vault · Wardrobe · Closet · Diary · Camera · JazzClub · Gym · Salon · Depart · Stylist ·
Scrapbook · Entourage · side · hotel · lobby`

Per room:

| Check | What to look for |
|---|---|
| Load | Skeleton → content, no full-screen flash; pull-to-refresh where offered. |
| Empty state | A new/empty account shows a real empty state, never a spinner that never resolves. |
| Error state | Server 401/429/500 renders a message + retry, never a silent no-op. |
| Scroll | Long lists scroll smoothly; nested horizontal rails don't steal vertical scroll. |
| Keyboard | Chat/compose screens (Concierge, Lounge, Social, Diary) keep the input above the keyboard and the send button tappable. |
| Buttons | 44pt targets; press feedback; disabled buttons look disabled. |
| Haptics | `RoomKit.tap()` fires on pills/rows; no haptic storm on scroll. |
| Safe area | Top bars clear the notch/Dynamic Island; bottom CTAs clear the home indicator. |
| Live data | Times/dates are local and correct; money shows as `$X.XX` (integer cents → dollars), never floats leaking (`.0000001`). |

### Rooms changed in the last build (highest priority)

| Room | Specific check |
|---|---|
| **Lounge** | The people picker: pick each member in the sample set — the right card must highlight. (Fixed from positional-index bug → `flatMap`/`find`.) Also confirm "Match {score}" UI is gone and no fake distances appear. |
| **Penthouse** | Enter and leave several times; the effect must not throw to a red screen (unhandled rejection was caught). |
| **Scrapbook** | Film → consent sheet appears with `video_ai` copy; gating fires. Against the un-migrated DB the server call fails cleanly (see caveat). |
| **Lifestyle (NightVision)** | Signed out: only your own sample data. Signed in: live. No placeholder readings presented as real. |
| **Market / Exchange** | Send an offer with a blocked word → rejected inline (422 `content_rejected`), not silently sent. |
| **All rooms** | After the dead-code purge: every room still renders (RoomKit `Head/Row/Num/Round/Pick/Tag/Meter/Tile/*`, `ah` kit, `shared` `Segmented/Chips/Monogram/ActionBar/SectionHead/SampleNote`). A blank room = a removed symbol was still referenced. |
| **All rooms** | Small text is now 12pt (was 11) — verify legibility at arm's length, and that nothing reflowed badly. |
| **Hotel / Lobby / Club / Lifestyle** | "The Pool" reads correctly everywhere (was "The Book"). |

## Pass C — VIP

| Check | What to look for |
|---|---|
| Lobby private lift → `penthouse` | Non-VIP is blocked with a clear message; VIP enters. Expired VIP is blocked. |
| KeyLock (`side`) | Entrance/pin-reset flows return clear success/failure; no silent no-op. |
| VIP rooms | Vault/private areas render for VIP, gate for member. |

## Cross-cutting

- **Rotation / large screens:** landscape and iPad — no clipped CTAs, no stretched cards.
- **Background/foreground:** app resumes into a live session; no white flash or lost scroll position.
- **Network switch:** Wi-Fi → cellular mid-action → request retries or fails cleanly.
- **Dark scheme:** After-Dark palette only; no light-mode flashes; contrast holds (body text ≥ 4.5:1 — verify by eye on the darkest surfaces).
- **Reduce Motion (iOS) / animations off:** animated entrances degrade gracefully, nothing stuck off-screen.
- **Back gesture / hardware back (Android):** never exits a room mid-flow or double-navigates.

## After the pass

- File every blocker/glitch as an issue with the repro + shot.
- Fix, then **re-run Pass A + Pass B for the touched room** (not the whole sheet).
- Record the pass date + build in `docs/STATE.md` (write-back is definition of done).
