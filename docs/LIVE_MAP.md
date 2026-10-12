# Live map: "The city, tonight"

The map lives at `/lounge/map` and is entered from the Lounge. It is a 3D hologram city. Streets and buildings are drawn as laser light, with wireframe extrusions and additive blending. The map orbits slowly until a member touches it.

**Dot colours:**

| Colour | Meaning |
| --- | --- |
| Neon pink | Women |
| Neon blue | Men |
| White | Other members |
| Neon yellow beams | Events |

## Pieces

| Piece | Where |
| --- | --- |
| Renderer (deck.gl 9.4) | `src/components/live-map/hologram-map.tsx` |
| Screen (legend, share toggle, event card, members-only gate) | `src/components/live-map/live-map-view.tsx` |
| Austin preview model + simulated crowd | `src/components/live-map/demo-city.ts` → `/design/map` (dev only) |
| Validation, palette, bbox | `src/lib/live-map.ts` |
| API | `GET /api/map/snapshot?bbox=`, `POST/DELETE /api/map/presence`, `POST /api/map/events` (staff) |
| Database | `supabase/migrations/20261014_live_map.sql` |
| Tests | `tests/live-map.test.ts`, `tests/db/live-map.mjs` (33 checks) |

## Map data

Streets, buildings, water and place names are OpenStreetMap vector tiles from **OpenFreeMap**, which is free and needs no API key. The default TileJSON is `https://tiles.openfreemap.org/planet`. To use another provider, such as a paid one with an SLA, set `NEXT_PUBLIC_MAP_TILEJSON_URL` to its OpenMapTiles-schema TileJSON.

If the app gets a Content-Security-Policy, it must allow `connect-src` to the tile host.

`NEXT_PUBLIC_MAP_DEFAULT_CENTER="lat,lng"` sets where the map opens. The default is downtown Austin.

## Privacy floor

Members are 18–27 and this is a location feature, so these rules are enforced in the database, not the UI:

- **Opt-in.** Ghost mode is the default. Nothing is stored until the member turns sharing on.
- **Coarse.** The server snaps every fix to a ~200 m cell. The raw coordinates are never stored.
- **Anonymous.** The snapshot returns only position and colour: no id, name or photo. Dots in a cell are spread by a hash that changes with the cell, so a dot can't be followed by its offset.
- **Fresh.** Presence older than 15 minutes is never returned and is purged.
- **Members only.** Presence can't be read or written directly. The RPCs require a signed-in member, and events are member-readable and staff-written.
- **Deletion cascades.** Deleting an account deletes its presence.

**Open decision:** in a sparse area, a lone dot still narrows someone to about a block. A k-anonymity rule ("hide cells with fewer than N people") would close that, at the cost of fewer dots on quiet nights.

## Deploy

1. Apply `20261014_live_map.sql` (after the earlier migrations).
2. Staff add events with `POST /api/map/events` `{title, venue?, lat, lng, startsAt, endsAt}`.
3. Mobile: the Expo app does not have the map yet. The planned route is a WebView of `/lounge/map` with the member's bearer session, or a native deck.gl/Mapbox port.
