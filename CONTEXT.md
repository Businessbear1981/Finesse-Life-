# Finesse — Context

## Glossary

### Finesse
The first **Consuming Application** of the Payload platform. Social-connection / lifestyle domain — broader than the brief's original "dating" framing. Spans friend-dating, romantic dating, married-couple maintenance, traveler companionship, and any other social-connection use case the platform can flex to (Sean: "can be used for anything"). Production at `finesselife.app`. Mainstream-first positioning. Successor working name to "After Dark" per the brief's own Appendix C guidance. Repo: `Businessbear1981/Finesse-Life-`. Resolved 2026-06-03.

### Payload
The platform Finesse runs on. See Payload's own `CONTEXT.md` at `C:\Users\sgill\Desktop\payload\CONTEXT.md`. Finesse imports Payload's Shell, registers its lifestyle Tabs into Payload's sidebar, and mounts each Tab's content into Payload's Workspace.

### Tab
Same meaning as in Payload's glossary. Finesse's tabs include: **Wardrobe** (gifting + curated catalog), **Vault** (prepaid debit card + rebate program — see Vault entry), **Concierge** (Finesse's instance of the Orchestrator), **Date Planner** (six registers — Morning / Afternoon / Quiet One / Long Night / Flourish / Companion), **Lobby** (entry), **Switchboard** (AI-mediated comms), **Backstage** (operator-side — gated, not in App Store v1).

### Vault
Member prepaid debit card program. Finesse **never holds member funds** — a card-as-a-service partner (Marqeta / Stripe Issuing / Unit — TBD) issues the physical card, holds the float, and handles PCI DSS + KYC compliance. Finesse sends card-load API calls only. Cards are physical, replaceable, and reloadable. Balance = accumulated rebate from member spending at 15% rate. **Rebate earns on ALL Finesse spending**: date planner, reservations, marketplace purchases, shipping, platform service fees. Pass-through third-party costs (e.g. DoorDash delivery fee) are charged to member at cost; Finesse may add a small service markup TBD. Reload cadence: daily batch job (midnight settlement) for v1; real-time via purchase webhooks is v2. Finesse is NOT a money transmitter under this model. Resolved 2026-06-08.

### Vault P2P (Gifting / Contributions)
Members can send funds to another member's Vault — e.g. a client contributes toward a user's weekend trip or salon visit. **Legal status**: if both cards are on the same card-program platform (Stripe Issuing / Marqeta), this is an internal ledger transfer — NOT money transmission — because the partner holds the float and the license. Finesse records the intent; the partner executes the transfer. This must be confirmed in contract with the card program partner before building. The sender's initial fund load (to contribute) is a standard payment transaction (CCBill or card). Resolved as architecture direction 2026-06-08 — legal confirmation pending.

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
- **App Store v1** — mainstream-only mobile app. $10.99 download + $24.99/month base subscription via Apple IAP.
- **PWA** — full feature set at `finesselife.app`. Payment via CCBill (not Stripe — brief §8.2). CCBill is used because dating/relationship apps fall into payment processors' "high-risk" category — NOT because Finesse is an adult content platform. Finesse does not host explicit content.
- **Base tier** — $24.99/month. Full platform, marketplace, date planner, Kitchen, Gym, Lobby.
- **Mid tier** — TBD price. Unlocks Penthouse, P2P gifting, Travel program, loyalty perks.
- **Finesse Luxury tier** — ultra-high-net-worth members. $100k+ shopping days. Dedicated private shopper on 24-hr call (Neiman Marcus / Bergdorf partnership). White-glove human concierge layered on top of Nova. Invitation-only or qualification threshold TBD. Price TBD. These clients spend at a scale that makes the partnership economics work for Neiman et al. Resolved as tier direction 2026-06-08 — pricing + qualification criteria pending.
- **Quality bar**: platform looks and feels like a $5k product regardless of which tier. Resolved 2026-06-08.

### Hotel Aesthetic
The visual treatment of Finesse. 1920s grand hotel — art deco brass/oxblood palette, crystal chandeliers, red carpet, mahogany columns. Applied as a **skin over the Payload shell**: the side rails (LED icon tiles), top banner, and underlying navigation are Payload structure and must not be visually degraded. The hotel layer adds atmosphere (photo backgrounds, scene components, ornamental SVG) on top. Ultra-luxury quality bar — $5k/month tier. Never cheap. The hotel aesthetic is woven into the aesthetic without replacing Payload functionality. Resolved 2026-06-08.

### Rail
The two permanent vertical navigation strips on left (public rooms) and right (private rooms). Each strip contains `RoomTile` components: icon + label + green LED indicator. Active tile glows green. These are Payload shell — **never modify their visual treatment without explicit instruction**. The lobby page's door cards and mezzanine are supplementary to the rails, not replacements. Resolved 2026-06-08.

### Mezzanine
The secondary row of small destination tags at the bottom of the Lobby page. Semantically: "upstairs" — a hotel foyer directory sign pointing to private suites (Wardrobe, Vault, Per Diem, etc.). Visually: significantly smaller than the main floor door cards, discreet, like engraved hotel wayfinding. Not the primary navigation path (the rails handle that). Resolved 2026-06-08.

### Member Voice — The Real Testimonials
Sean's words, 2026-06-08. These are the real member stories. Every UI, every copy, every Nova interaction should be tested against whether it produces one of these outcomes:

**Her:**
> "Finesse paid for my hair and my nails. My daddy bought me everything I needed for our trip this weekend. Thank you daddy — can't wait to see you and smash."

**Him:**
> "I paid for my girl's hair and nails from the rebate so I didn't have to. I was short on my utility bill — thank God I had $175 in my Finesse account. My stock portfolio is way up. LinkedIn is up to date. Real deals closed. Wait — I'm making money off my style? That's awesome."

**The creator:**
> "The buttons on and off. I'm more creative. It prompts me to make videos and songs. Generate cool images of me and the girls — or the foursome at the best ball tournament. My social media presence is getting really good. Important for men who rarely post."

**The bottom line:**
> "Finesse looks great. Feels luxury. I'm on it all the time because it's fun."

These are not aspirational marketing copy. These are the actual use cases the platform must deliver. If a member cannot plausibly say one of these sentences after 30 days, the platform failed. Resolved 2026-06-08.

### Brand Promise
Sean's words, verbatim, 2026-06-08 — this is the emotional core of Finesse. Every UI decision, every Nova interaction, every copywriting choice should be tested against this:

> "I meet good people. It completely manages all the noise in my life. I go on really fun social outings because of it. Met my best friend, my husband here. I have passive income from my brand ambassadorships. My BF always gets me the right gift. We are going out more. And sometimes it's just fun — a walk around the lake, ice cream or coffee, adopt a pet visit day. We are connecting more and it's not about fancy restaurants and clothes and gifts. It's about quality time together."

**Finesse is not a luxury spending platform. It is a life quality platform.** The art deco hotel, the AI agents, the marketplace, the date planner — these are the container. The product is connection and quality of life. The 11th purchase free matters less than the best friend made here.

### Loyalty Program
Every 10 purchases → 11th free (gifts, trips, giveaways). Additional rewards based on member tenure on site. Rewards are curated by Nova — not generic vouchers, but personalized. `member_purchases` count triggers reward at multiples of 10. Resolved 2026-06-08.

### Travel Program
Major platform vertical. Finesse obtains a bulk commercial card (AmEx Business Platinum / Chase Ink) used to book travel at scale. Pooled points + rebates redistributed to members as: free trips, hotel and car rental upgrades, VIP airport club access, vacation giveaways. Finesse buying at scale = members get access they couldn't get individually. Travel API: Amadeus or Sabre for flights/hotels/cars. Uber API for ground transport. Community points accumulation system — individual spend contributes to collective pool, collective pool gives back to individual. Implementation approach TBD (see question below). Resolved 2026-06-08.

### MVP — 100-User Launch Set
Three rooms ship first. Everything else gets introduced as the user base grows.
1. **Date Planner** — Nova, budget input, curated options, the playbook. The reason someone pays $24.99.
2. **Chat** — Connection layer. Meeting people, the Lounge, Switchboard. Without this, Date Planner has no one to take out.
3. **Socials** — AI content creation, posting, "I'm more creative." The viral loop — content gets posted, Finesse gets attribution, new users arrive.
These three generate daily engagement. Chat is daily. Socials prompts are daily. Date Planner is weekly but high-value and shareable. All three exist in the reference app (PerDiem, Concierge, Archive) — port and wire. Resolved 2026-06-08.

### Onboarding
Lands in the Lobby after completion. Nova speaks first — not a tour, a welcome. Tone: "You're free to roam, but the time you spend here helps your AI stack work for you. The more the platform knows, the more it does." Onboarding is framed as investment in your own experience, not a form to fill out. The AI agent stack personalizes based on what the user teaches it through usage. Resolved 2026-06-08.

### Relationship Model
Finesse makes no judgment on how members use the platform. Supported use cases — all first-class, none hidden, none shamed:
- Traditional dating (2nd date, 3rd date progression)
- Casual / "free tonight" (Tinder-style categories)
- No-strings hookup between members traveling ("met a member in NYC, went out, that was awesome")
- Sugar arrangement (he already knows how to spoil her — the platform makes it easier)
- Friend groups (meet at a bar, see a show together)
- Male friendships / brotherhood (Carpe Diem)
- Family (Scrapbook captures the cookout, the holidays)
Resolved 2026-06-08.

### Scrapbook — "Seasons of Our Life"
AI-compiled memory feature. Members contribute photos, moments, events — Finesse compiles them into a curated memory reel titled "Seasons of Our Life." Reviewable anytime. Not a photo album — a life memoir. Covers: dates, trips, friend group outings, family moments. The emotional anchor that creates long-term platform loyalty — members stay because their life is here. Resolved 2026-06-08.

### Value Loop
The self-reinforcing cycle that retains members: spend through Finesse → earn Vault cashback → meet real people → go on real experiences → create memories in Scrapbook → see those memories → feel that the platform changed your life → spend more through Finesse. "$400 bill last month, $75 back, met a cool woman, dating someone in Austin, hooked up with a member in NYC — that was awesome." (Sean, 2026-06-08). This loop is the retention strategy. Resolved 2026-06-08.

### Penthouse
Members-only section of the hotel. Contains social/connection features — profiles, introductions, matching. Gated: not accessible on arrival, requires membership status. Resolved 2026-06-08.

### The Scale
Group buying / wholesale arbitrage room. Mechanics:
1. Finesse lists a SKU with a unit goal (e.g. 800 wigs) and member price
2. Members **pledge** — reserve a slot, no payment taken yet
3. Finesse also takes a **waitlist** (e.g. 20 extra slots) for members who want in if a pledger doesn't pay
4. When unit goal is reached → payment requests sent to all pledgers
5. Non-payers lose their slot; waitlist members fill in sequentially
6. Once confirmed payments hit the goal → Finesse places the wholesale order
7. Nothing is ordered and nothing is charged until goal is confirmed
**No-show / missed payment policy** (progressive, like a salon cancellation policy):
- 1st miss: no charge — things happen
- 2nd miss: 25% of unit price charged
- 3rd miss: 50% charged
- 4th miss: 100% charged
- 5th+: barred from all purchase campaigns
Penalty charges are revenue to Finesse. Policy requires a **Pledge Reputation score** tracked per member — counter resets TBD. Resolved 2026-06-08.

Unit economics example: retail $250 → Finesse buys at $125 → sells at $160 + $5.99 service fee → 10% Vault rebate ($15 back) → Finesse nets ~$41/unit × 800 units = ~$33k per SKU. Sourcing: Alibaba. Fulfillment: Amazon MCF or ShipBob. Resolved 2026-06-08.

### Blockchain Usage
Two confirmed purposes only — no token, no crypto assets, no SEC exposure:
1. **Immutable ledger** — every transaction (rebate, purchase, escrow, transfer) is recorded with a cryptographic hash chain. Members can audit their Vault history and verify nothing was altered.
2. **Smart contracts** — The Scale group buy escrow: member funds held in contract until purchase threshold is hit, then auto-execute order and disperse. No manual intervention, transparent to all participants.
**Implementation TBD** (see ADR needed): real on-chain (Polygon — low gas, fast) vs blockchain-inspired architecture (Postgres with cryptographic hash chain — same transparency guarantees, zero wallet friction for members). Resolved scope 2026-06-08. Implementation pending.

### Backend Philosophy
Finesse is an **orchestration layer over existing infrastructure** — not a vertically integrated retailer or payment processor. Principle: lean on existing platforms wherever possible.
- Sourcing: Alibaba API
- Payments: Stripe (B2B/marketplace), CCBill (PWA consumer)
- Fulfillment: Amazon Multi-Channel Fulfillment (MCF) or ShipBob
- Food delivery: DoorDash Drive API
- Reservations: OpenTable / Resy API
- Social posting: Meta / TikTok / X APIs
Finesse connects buyers to sellers and takes the orchestration margin. Build the glue, not the pipes. Resolved 2026-06-08.

### The Gym
A room present in **both editions** (Finesse + Carpe Diem / App Store + PWA). Contains: calorie counter, food tracker, meal planner, recipes. Fitness and wellness are core to both male and female user interest. Resolved 2026-06-08.

### The Kitchen
Adjacent to The Gym conceptually. Contains: meal planning, recipes, and a **DoorDash integration** (API call / webhook for food delivery ordering). Resolved 2026-06-08.

### Carpe Diem Brand Promise
Sean's words, 2026-06-08 — men's emotional core, mirrors the Finesse brand promise:
> "More confident. Wardrobe sorted. Found my crew — other guys, real friendships. Traveling smarter, maybe a fun companion for the trip. Nova sets my fantasy lineup. Traded smarter through Nexus. Planned a golf trip with the guys. Got golf tips. Got my Scotty Cameron putter $100 cheaper because 100 other members bought the same one."
Carpe Diem is: **brotherhood, confidence, and quality of life without the noise.**

### Date Planner — The Real Job
Sean's words, 2026-06-08 — this is what the date planner actually does for a man:
> "I only got $400 for tonight. What if she gets dessert, then I'm screwed. Or I can get her the flowers — well, I kinda wanted to have sex later. I wish I had that outfit. I wanted to see her in it. Hey — I know I look good. Just stick to the playbook. And I can actually focus on her and being myself."

**The date planner is anxiety removal.** Not a logistics tool — a confidence tool. Nova takes the budget, handles every variable (flowers, outfit, dinner, dessert, all within number), and delivers a playbook. The man's only job is to show up and be present. Every decision has already been made. This is the first-dollar feature — a man pays $24.99 to not be anxious on a date.

**Full date planner flow**:
1. He sets budget privately (Nova only — she never sees the number)
2. Nova curates 2–3 complete date options within that budget (venue, activity, gift if applicable)
3. She receives the curated options on her Finesse — picks one, can swap one activity for another
4. He knows exactly what he's getting into. She experiences full agency. Neither has an awkward money conversation.
5. Budget is his golddigger insurance — if she's happy with what Nova curated at $150, she's not all about money. If she demands something off the list, that's information.

**"Golddigger insurance"** — unofficial product name for this mechanic. Legitimate male anxiety addressed: "I don't want to spend $1000 on a 3rd date when I'm not sure yet." The date planner solves this without him ever having to say it. Resolved 2026-06-08.

**The tasting menu mechanic**: For restaurant dates, Finesse pre-arranges with the venue — a curated set of options within budget, prepared in advance. When she arrives, she selects from 2–3 curated items (seafood or steak). She has agency. He has no surprises. The restaurant is briefed by Finesse. This is white-glove concierge executed invisibly. Brand moment: "we flex — we show up for our people."

**Information asymmetry by design**: The male date planner (recon, budget breakdown, playbook) is **never visible to female members**. Women on Finesse receive the outcome — the arranged evening, the curated gesture — not the machinery. From her perspective: "he planned every detail." What it actually is: recon. Both experiences are true. The asymmetry is the product. Female members may never know the male side exists in this form. This is intentional and must be preserved in the data model — Carpe Diem date planner features are edition-gated, not just hidden behind a toggle.

Nova's playbook for a date must cover:
- Where to go (within budget, with average costs shown)
- What to wear (Wardrobe integration)
- What gift/flowers to get (marketplace integration, delivered in time)
- Budget breakdown including dessert, tip, transport — nothing surprises him
- The outfit already ordered or already in his wardrobe

### Date Planner — Parameters
Budget-input is a required field — member sets their budget (e.g. $50 / $150 / $500 / custom). Nova curates within that number and shows average cost breakdown. Additional inputs: time of day (day / night), occasion, party size, location. Budget awareness is core — not every great outing is expensive. Resolved 2026-06-08.

### Nexus
Referenced by Sean as a platform for stock trading integrated into Finesse ("use our Nexus platform to trade stocks"). **Unclear if this is**: (a) a separate product/brand, (b) NEST's financial tools surfaced inside Finesse, or (c) a new feature name. Needs clarification. Flagged 2026-06-08.

### Jazz Club
A social entertainment room. Not part of the original After Dark spec — new addition. Exact feature set TBD. Resolved 2026-06-08 (existence confirmed, features pending).

### Backend Surface
The full integration map Sean confirmed 2026-06-08:
- **Marketplace** — buy/sell, Finesse-fulfilled shipping (ShipBob / ShipStation integration)
- **Social Management** — post across Meta / TikTok / X / Instagram via platform APIs; AI video creation (Higgsfield already keyed); client-facing **Video Viewer** to approve content before posting
- **Email** — transactional + marketing (SendGrid / Postmark)
- **Date Planner** — AI-curated outings with average cost analysis; OpenTable / Yelp / Ticketmaster / Google Places integrations; actual booking execution (not just recommendations)
- **Men's side specifics** — fantasy football (ESPN / Sleeper API), golf tee times (GolfNow API)
- **Vault / Real Money** — client holds actual funds; requires PCI DSS compliance + KYC/AML; banking-as-a-service layer (Stripe Treasury or Synapse); FDIC insurance question open
- **AI Agents** — self-learning; tracks buying tendencies + preferences; recommendation engine (pgvector embeddings in Supabase); full action execution (book, buy, post — not just suggest)
- **Fulfillment** — Finesse buys and ships items on behalf of members; needs merchant account + 3PL partnership

### Revenue Model
Dual-layer: **subscription base + high-frequency transaction fees.**
- Layer 1: $24.99/mo membership (access fee, not the profit center)
- Layer 2: Finesse takes a cut or markup on every transaction flowing through the platform — date planner bookings, marketplace purchases, DoorDash orders through Kitchen, shipping/fulfillment, AI video creation, reservation fees, P2P gifting
- At scale an engaged member generates **multiple fee events per day**, making the effective revenue per user far above the subscription line
- The 15% Vault rebate is the retention engine — it incentivizes members to route MORE spend through Finesse to accumulate card balance, creating a self-reinforcing habit loop
- Ultra-luxury presentation at accessible price: looks like a $500/mo product, priced at $24.99 base — margin comes from transaction depth, not sticker price
- Resolved 2026-06-08

### Hosting / Scale Reality
At launch: ~$500/mo (Vercel + Supabase + Railway + R2).
At 1,000 paying users ($5k/mo = $5M ARR): $5–15k/mo infra. AI video generation is the largest variable cost (Higgsfield ~$1–2/video). Banking/payments adds compliance overhead. Resolved as known constraint 2026-06-08.

## Not in scope of this glossary
Visual / brand language (Continental + Cortez aesthetic, color palette, typography) lives in the brief at `C:\Users\sgill\Downloads\after-dark-brief.md` and in the design template `C:\Users\sgill\OneDrive\Desktop\FINESSE_DESIGN_TEMPLATE.pdf`. Implementation decisions go in `docs/adr/`, not here.
