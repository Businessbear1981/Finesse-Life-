# Finesse Life — Frontend Map

> **Branch audited:** `sean/mobile-keylock` @ `fd0fd26` (contains `main` + `sean/keylock-hotel-build`) · **Date:** 2026-10-09
> **Method:** read-only, file-by-file audit of every web page and every mobile screen. Confidence: `verified` against source on that commit; nothing here was checked against the live site or database.
> **Companion:** [`BACKEND_MAP.md`](BACKEND_MAP.md) covers every `/api/*` route, the schema, auth and env vars.

> **Update 2026-10-09 (same day, `sean/backend-security-floor`, second commit):** most problems flagged below are now fixed — the tables describe the audited state. Fixed: fake-success fallbacks (Nova 503 instead of "Consider it handled", Stylist mock analysis + always-reserved, Vault "DEMO MEMBER"/VIP fallback, NightVision/Departures fake "connected", Switchboard un-reverted toggles, Exchange `local_` success), Lab no longer calls missing routes, Entourage uses real columns, unlabelled sample content labelled (Lobby, Salon, Clubhouse, Per Diem, Market, Embassy), Salon Book wired to `/api/salon/bookings`, unsettled "12% cashback" copy removed, `/demo` credentials moved to server env, new `/terms`, `/subscribe`, `/vip/link-telegram`, server-side VIP gates on `/vault` and `/backstage`, VIP feed insert restricted to VIPs (migration §8). Mobile: store config (bundle id `vip.finesselife.app`, `eas.json`, opaque icons, phone-only), hooks-order bug, side persisted, preview-mode entrance refused in release builds, lift 401 → sign-in, stale lift tokens cleared, honest copy on sample rooms, "ROOM ON" only for live rooms, Gym untick deletes, Nova errors shown as errors, Sign out.

Truth states used below: **live** = real server data/action · **preview** = action exists but no provider, disclosed · **sample** = hard-coded content · **gated** = needs a server entitlement · **broken** = calls something that doesn't exist or fails.

---

## 1. Web app (Next.js 16, `src/app`)

Middleware (`src/lib/supabase/middleware.ts`) lets the paths in `isPublicRoute` (:46-79) through without login; every other page redirects to `/login`; non-public `/api/*` returns JSON 401 when signed out. Most room pages are on the public list, so signed-out visitors see the room with empty data.

### Entrance, auth and account

| URL | File | Purpose | Data | Gate | Truth | Problems |
|---|---|---|---|---|---|---|
| `/` | app/page.tsx | Entrance KeyLock → side selector | POST /api/keylock/entrance/challenge, …/verify | public | live (preview = any 6 digits until env set) | `fl_entrance` cookie set but never enforced; selector skips `/intake` |
| `/login` | (auth)/login | Sign in | supabase auth; `profiles.intake_complete` | public | live | — |
| `/signup` | (auth)/signup | Sign up → /intake | supabase auth.signUp | public | live | `/terms` page missing |
| `/demo` | (auth)/demo | Demo sign-in | supabase auth | public | sample | **demo account e-mail + password shipped in the client bundle** (:7-11); that account is a non-expiring VIP |
| `/intake` | app/intake | 5-step onboarding | PATCH /api/profile | login | live | only reached via login/signup |
| `/profile` | (hotel)/profile | Member profile, posts, VIP card | profiles, posts; POST /api/upload, /api/posts, /api/vip/redeem | page redirects to /login | live | `/subscribe` link has no page |
| `/profile/edit` | (hotel)/profile/edit | Edit public + private profile | profiles (private_* read directly); PATCH /api/profile | client-side | live | — |
| `/settings/integrations` | settings/integrations | Vendor credentials | profiles.role, integrations | admin role | live once `role` exists (added by 20261009) | — |
| `/settings/ai-usage` | settings/ai-usage | AI spend | ai_usage_daily (svc) | admin role | live once `role` exists | — |
| `/audit` | app/audit | Integration audit | POST /api/audit | admin (API) | live once `role` exists | outside hotel shell |

### The 31 rooms (registry order) + VIP

| # | URL | Purpose | Data | Gate (actual) | Truth | Problems |
|---|---|---|---|---|---|---|
| 1 | `/lobby` | Welcome, picks, Private Lift, 31-room directory | PrivateLift → /api/vip-keylock/*; registry | public | static (registry says wired) | "847 members checked in tonight" unlabelled; 4 registry APIs missing; CTA hidden under dock |
| 2 | `/lounge` | Feed + matching | /api/posts (+like), /api/intelligence/signal; profiles direct | public | live | presence/invitation APIs missing |
| 3 | `/concierge` | Nova chat + persona | /api/profile, POST /api/nova | public | live (LLM) | on failure shows "Consider it handled…" (false success) |
| 4 | `/salon` | Appointments | none | public | sample | real venue names unlabelled; Book has no handler; `/api/salon/bookings` unused |
| 5 | `/wardrobe` | Looks + wishlist | /api/wardrobe/*, /api/upload | public | live | — |
| 6 | `/vault` | Balance + funding | profiles; /api/vault/balance, /fund | public (registry: VIP) | gated by API freeze | catch block sets "DEMO MEMBER" + isVip=true (fails open) |
| 7 | `/bag` | Collection portfolio | /api/bag/items | public | live | sample items flash before fetch |
| 8 | `/lab` | AI media studios | 5 media routes | public | **broken** | all 5 targets missing (/api/elevenlabs, higgsfield ×2, meshy, suno) |
| 9 | `/archive` | Scrapbook + recaps | scrapbook_entries; /api/scrapbook/*; /api/nova | public | live | log IDOR fixed on this branch (cherry-picked `sean/api-security-fixes`) |
| 10 | `/entourage` | Crew / find | profiles direct; /api/member | public | **broken** | selects `profiles.vibe_tags` (column not on profiles) |
| 11 | `/backstage` | "Lair" = integration health board | /api/intelligence/health, /api/integrations/*/test | public (registry: VIP) | mismatch | no KeyLock although Penthouse copy claims one |
| 12 | `/clubhouse` | Game Room | none | public | sample | registry APIs missing |
| 13 | `/scale` | Group buys | scale_deals; POST /api/scale/join | public | live (no charge) | /api/scale/pledges unused |
| 14 | `/registry` | Wishlist, outings, VIP board | /api/registry/*, /api/profile, /api/nova | public | live | suggestions sample |
| 15 | `/exchange` | Resale | /api/exchange/*, /api/intelligence/market | public | live | — |
| 16 | `/departures` | Travel | none | public | sample / fake | "connect" always throws then flips to connected; plan is a no-op |
| 17 | `/switchboard` | Social accounts + broadcast | /api/switchboard/* | public | stub | "connect" is a self-set flag, no OAuth |
| 18 | `/embassy` | Brand radar | scale_deals; /api/embassy/deals; /api/nova | public | preview | LLM-invented percentages shown as data |
| 19 | `/nightvision` | Style DNA | /api/nightvision/*, /api/upload | public | partly broken | /api/auth/instagram, /api/plaid/link, /api/auth/spotify missing — page marks them "connected" anyway |
| 20 | `/perdiem` | Date/budget planner | /api/nova, /api/member | public | sample + LLM | per-diem APIs missing |
| 21 | `/carpe-diem` | Portfolio, fantasy, garage | /api/integrations/alpaca, yahoo-fantasy, /api/carpe-diem/garage | public | preview | alpaca/yahoo trust body `user_id` (IDOR) |
| 22 | `/stylist` | Looks, boxes, photo analysis | /api/stylist/*, /api/nova | public | sample + live | MOCK_ANALYSIS shown as real on failure; reserve always "reserved" |
| 23 | `/vip` | Inner-room feed | profiles, vip_posts (client insert) | login + VIP | live | `/vip/link-telegram` page missing |
| 23 | `/vip/codes` | Invite-code admin | /api/vip/codes | VIP + admin | live (admin rule fixed on this branch) | — |
| 23 | `/vip/penthouse` | Penthouse (destination, not room 32) | entitlement + lift session | VIP + lift session | live | — |
| 24 | `/ballroom` | Evening composer | /api/ballroom/* | login | live / preview | no partner adapter |
| 25 | `/jazz-club` | Programme + join | /api/jazz-club/* | login | preview | join 501 / tips 409 by design |
| 26 | `/gym` | Set log, rest timer | /api/gym/* | login | live + labelled sample | — |
| 27 | `/kitchen` | Meal week + order intent | /api/kitchen/* | login | live + labelled sample | no grocery partner |
| 28 | `/this-is-you` | Identity projections | /api/identity/* | login | live | projections not enforced at DB (profiles readable by members) |
| 29 | `/closet` | Weekly rotation | /api/closet/* | login | live | — |
| 30 | `/diary` | Agenda approvals | /api/diary/* | login | live | — |
| 31 | `/camera` | Scan + catalogue | /api/camera/* | login | live | — |
| — | `/market` | Resale (duplicate of 15) | none | public | sample | DEMO_LISTINGS; not in registry |

### Registry reconciliation

- All 31 registry routes resolve to a page. Pages outside the registry: `/market`, `/profile(/edit)`, `/vip/codes`, `/vip/penthouse` (correctly the room-23 destination), auth/settings pages.
- Rooms with **none** of their declared APIs: 1, 2, 3, 8, 9, 10, 12, 16, 20. Fully backed: 14, 15, 24–31.
- Method mismatches: registry says GET for `/api/embassy/deals`, `/api/carpe-diem/garage`, `/api/integrations/alpaca`, `/api/integrations/yahoo-fantasy` — all POST-only.
- Truth mismatches: lobby / concierge / switchboard marked "wired" but static, LLM or self-set; vault and backstage marked VIP but public in middleware.

### Navigation

- Header: profile → `/profile`, wordmark → `/lobby`, crown → `/vip`. Brand follows `localStorage.finesse_gender`.
- Fixed 72px rails both sides at every width (≈256px content on a 400px phone). Bottom dock: vault, scale, Nova, exchange, embassy.
- Rooms 24–31 (and several per-side rooms) are reachable only from the Lobby directory. The shell rails and the registry `RAILS` are two different navigation models.
- Flow: `/` KeyLock → sweep → side selector (localStorage) → `/lobby`. Intake only after signup/login. The entrance cookie is never enforced — `/lobby` and most rooms load directly.
- Private Lift lives on the Lobby (`#private-lift`) → `/api/vip-keylock/*` → `/vip/penthouse` (VIP + lift session). `/penthouse` redirects there.

### Unused web code

`hotel-shell.tsx`, `curtain-transition.tsx`, `nova-intelligence-panel.tsx`, `components/ui/*`, `src/lib/keylock.ts`, `/api/keylock/enter|verify` (Backstage), `/api/keylock/entrance/lock`, and API routes no page calls: gym/recovery, kitchen/grocery-options, jazz-club/tips + replays, closet/looks/[id]/hold, identity/data/[id], salon/bookings, scale/pledges, vault/cashback, vip-keylock/session, telegram/link, intelligence/logistics.

---

## 2. Mobile app (Expo SDK 57, `mobile/`)

Setup: Expo 57 / RN 0.86 / Reanimated 4; Supabase email+password sign-in with SecureStore; `api()` attaches `Authorization: Bearer` (+ `X-Finesse-Lift` for the lift). Env: `EXPO_PUBLIC_API_BASE_URL` (default `https://finesselife.vip`), `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### Screens

| Screen | File | Server calls | Truth |
|---|---|---|---|
| Entrance KeyLock | app/index.tsx | POST /api/keylock/entrance/challenge, /verify | live (ignores server `mode: preview`) |
| Choose side | app/side.tsx | — | in-memory only; resets to "her" every launch |
| Hotel shell + inline Lobby | app/hotel.tsx | — | sample ("ROOM ON" on every room) |
| Directory `/lobby`, plate `/room/[id]` | app/lobby.tsx, app/room/[id].tsx | — | orphan routes; `room/[id]` breaks the hooks rule (:17-26) |
| Private Lift → Penthouse floor | app/penthouse.tsx, rooms/Penthouse.tsx | POST /api/vip-keylock/challenge, /verify, /lock | gated; floor content is sample |
| Sign-in | app/sign-in.tsx | Supabase Auth | live |

### Rooms inside `hotel.tsx`

Live server calls: **Lounge** (GET /api/posts), **Concierge/Nova** and **Starmaker lyrics** (POST /api/nova), **Vault** (GET /api/vault/balance — card number and names hard-coded), **Gym** (POST /api/gym/sets — unticking doesn't delete), **Kitchen** (POST /api/kitchen/order-intent — mobile can't create the plan it needs, so 422), **Stylist** (POST /api/camera/uploads — occasion/note discarded by server).
Sample or local-only: Wardrobe, Calendar, Salon, Scrapbook, Departures, Entourage, Scale, Exchange, Embassy, Bag, Registry, Lab, Switchboard, NightVision, Game Room, Per Diem, This Is You, Carpe Diem, Market, Ballroom, Club. Several claim outcomes that never happened ("REQUEST SENT", "ACCEPTED · NOVA WILL BOOK", "CONFIRMED · IN YOUR DIARY").
Manifest rooms with no mobile interior: backstage, vip-room, jazz-club, closet, diary, camera, lobby. Id drift: `perdiem`/`per-diem`, `profile`/`this-is-you`; `market`, `club`, `starmaker`, `calendar` are not in the manifest.

All 11 endpoints the app calls exist on the server.

### Store-readiness gaps (mobile)

No `ios.bundleIdentifier` / `android.package` / build numbers / `eas.json`; icon has alpha and is reused as the adaptive foreground; no export-compliance key; `supportsTablet: true` untested; no sign-out, password reset or account deletion; "VIP access lives in your web profile" (purchase-steering risk); reviewers need a house code and a VIP test account; never type-checked or run on a device.

> Note: a second, smaller Expo build of screens 01–03 exists in the Claude Design handoff repo (`mobile/` there, Oct 2). It duplicates this app's entrance and adds store config (bundle id `vip.finesselife.app`, `eas.json`, opaque icons, a build brief) that this app lacks — merge those pieces here rather than maintaining two apps.
