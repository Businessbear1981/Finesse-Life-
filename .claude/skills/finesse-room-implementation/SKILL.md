---
name: finesse-room-implementation
description: Build or upgrade a Finesse Life room from the 31-room project manifest. Use when adding a room route, cinematic scene, API procedure, mobile screen, or Orchestrator capability.
---

# Finesse room implementation

1. Read `FINESSE_31_ROOM_PROJECT.json` and `src/lib/rooms/registry.ts`. Find the exact room ID; do not invent a 32nd room. Penthouse is the premium VIP destination.
2. Preserve existing Vercel Next.js and Supabase behavior. Create additive changes unless replacement is explicitly requested.
3. Implement typed input and output schemas in `src/lib/contracts` before fetching data.
4. Keep provider credentials and consequential actions server-side. Attach `traceId`, `track`, `roomId`, and consent context.
5. Create a unique scene, route, mobile composition, primary action, and reduced-motion version. Do not ship a generic duplicate room card.
6. Render `loading`, `empty`, `preview`, `gated`, `error`, and `confirmed` honestly.
7. Specify which revenue events are allowed and which require partner or processor settlement. Never count a room view as revenue.
8. Validate room registry uniqueness, types, access, API response parsing, and mobile accessibility before claiming completion.

## In this repo

- Plates render through `src/components/hotel/room-plate.tsx` (wayfinding, truth state, six states, disclosure). Each room supplies its own scene — never reuse another room's scene.
- Room truth comes from `GET /api/rooms/:id`, which reads the registry. Promote a room's `truthState` in the JSON only in the same PR that wires its live API.
- New member routes are protected by `src/lib/supabase/middleware.ts` by default (not in the public list).
- Run `npm run rooms:validate` and `npx tsc --noEmit` before claiming completion.
