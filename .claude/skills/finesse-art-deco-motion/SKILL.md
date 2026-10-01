---
name: finesse-art-deco-motion
description: Use when designing or reviewing any Finesse Life screen, scene, transition or animation — palette, typography, track accents, reduced motion and mobile composition for the 1920s Art Deco hotel.
---

# Finesse Art Deco motion

- Palette: ink #080406, oxblood #17090D, burgundy #3A121B, brass shadow #6B5028, brass #C9A961, highlight #E8C87A, cream #F4E8D0. Track accent only on light/copy: Finesse #FF4D7D, Carpe Diem #FFA96B. Metal mechanics stay brass.
- Type: `font-display` (headings, italic), `font-label` (spaced caps), `font-body` (copy). No tiny low-contrast text — body ≥ 13px at ≥ 60% cream.
- Each room is a unique architectural scene (see `sceneBlueprint` in the manifest), not a repeated card.
- Motion: routine 180–450ms, scene reveals 700–1250ms, ease `[0.16,1,0.3,1]`. Animation never stands in for a server decision (doors open after the API says so).
- Always honour `useReducedMotion()`: state changes stay visible, decorative motion stops.
- Touch targets ≥ 44px; mobile is a recomposed portrait scene, not a shrunk desktop.
- Copy is cinematic ("The mechanism holds"), never "Invalid code / Submit / Access denied".
