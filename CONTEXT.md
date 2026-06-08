# Finesse — Context

## Glossary

### Finesse
The first **Consuming Application** of the Payload platform. Social-connection / lifestyle domain — broader than the brief's original "dating" framing. Spans friend-dating, romantic dating, married-couple maintenance, traveler companionship, and any other social-connection use case the platform can flex to (Sean: "can be used for anything"). Production at `finesselife.app`. Mainstream-first positioning. Successor working name to "After Dark" per the brief's own Appendix C guidance. Repo: `Businessbear1981/Finesse-Life-`. Resolved 2026-06-03.

### Payload
The platform Finesse runs on. See Payload's own `CONTEXT.md` at `C:\Users\sgill\Desktop\payload\CONTEXT.md`. Finesse imports Payload's Shell, registers its lifestyle Tabs into Payload's sidebar, and mounts each Tab's content into Payload's Workspace.

### Tab
Same meaning as in Payload's glossary. Finesse's tabs include: **Wardrobe** (gifting + curated catalog), **Vault** (15% reserve credit + card program), **Concierge** (Finesse's instance of the Orchestrator), **Date Planner** (six registers — Morning / Afternoon / Quiet One / Long Night / Flourish / Companion), **Lobby** (entry), **Switchboard** (AI-mediated comms), **Backstage** (operator-side — gated, not in App Store v1).

### Concierge
Finesse's concrete instance of the Orchestrator (CNS). Named, hospitality-coded ("Mr. Ashford" / "Quill" / "Ensemble" — TBD per brief Appendix C). Routes user intent to Tabs, runs journeys, manages the seven influence parameters.

### Journey
A Finesse-specific composite: a multi-step plan that orchestrates several Tabs (Date Planner pick + Wardrobe delivery + Vault charge + Concierge confirmation) into a single one-tap user experience. Not a Payload concept — purely Finesse domain.

### OSINT
**Finesse does NOT use the OSINT Engine in v1.** Sean (2026-06-03): "we might not even use osint, seems to me we can use osint structure to modify EagleEye." The OSINT capability stays in Payload (NEST/EagleEye is its primary consumer), but Finesse does not import it. Finesse's signal-gathering needs are met by:
- **Brand deals** — direct affiliate API integrations + manual partnership BD.
- **Styles** — passive StyleProfile growth from in-app behavior (Wardrobe keeps/returns, dates rated well, journeys repeated). No external scraping.
- **User data** — explicit user-entered profile fields + in-app behavior signals only.
- **Background checks** — Persona / Onfido for ID verification + P411 / Date-Check for operator-segment screening (direct vendor integrations, not OSINT).
Resolved 2026-06-03.

### App Store v1 vs PWA
- **App Store v1** — mainstream-only mobile app (Third Date + Married Couple + Lonely Traveler personas). Sugar Arrangement + Operator segments stripped out for Apple review compliance. $10.99 download + $24.99/month subscription via Apple IAP.
- **PWA** — full feature set at `finesselife.app`. Includes all five personas including operator/sugar segments. Payment via CCBill (not Stripe — brief §8.2).
- Resolved 2026-06-03 as Sean's stated direction.

## Not in scope of this glossary
Visual / brand language (Continental + Cortez aesthetic, color palette, typography) lives in the brief at `C:\Users\sgill\Downloads\after-dark-brief.md` and in the design template `C:\Users\sgill\OneDrive\Desktop\FINESSE_DESIGN_TEMPLATE.pdf`. Implementation decisions go in `docs/adr/`, not here.
