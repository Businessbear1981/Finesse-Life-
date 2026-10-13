# Google Play listing — Android

Play Console → your app → **Grow users → Store presence → Main store listing**, and **Policy → App content**.
Character counts are checked by `node docs/store/check-lengths.mjs` (limits in brackets).

Same copy rule as iOS: only what the store build has. No Vault/card/cashback, no VIP/Penthouse, no price, no
“buy on the web”, no dating, no claim that Nova books or pays.

## App name [30]

```title
Finesse Life
```

## Short description [80]

```short
Your private line after hours. An AI concierge, your rooms, the members’ lounge.
```

## Full description [4000]

```full
Finesse Life is a private house in your pocket. Say the word at the door, choose your floor, and the rooms are yours: style, travel, the table, the people worth knowing. Built for members who like things handled quietly.

★ Your private line
Nova is your AI concierge. Text it the way you would at 1am: a table for four tonight, the best way to Tulum, a black satin slip under $600. Nova drafts options and keeps them in your requests. Nothing is booked, bought or sent until you confirm it. Nova is an AI (Claude, by Anthropic); the app tells you so and asks your consent before your first message. Every reply can be reported.

★ The Wardrobe and the Closet
Keep your looks on one rail, plan the week’s outfits, and note the piece that’s missing. Ask the Stylist to pull looks for an occasion.

★ Departures
Turn a trip into one clean boarding pass and itinerary: where, when, who is coming and the plan for each day.

★ Per Diem
Set a budget for the night and get the evening laid out as stops with estimates. Tick them off as you go.

★ The Diary
Every plan in one place, in order, with the few that are waiting on your yes.

★ The Entourage
Remember the people who matter: birthdays, what they love, the gift you meant to get.

★ The Kitchen and the Gym
A week of meals with a grocery list, and every set you lift, logged in seconds.

★ The Lounge
A quiet members’ feed with no algorithm. Members agree to the house rules before posting. Report any post or member, block anyone, and the house acts on reports within 24 hours.

★ Discreet by design
No ads. No tracking. Your rooms are private to you. Delete your account and its data at any time, in the app or at finesselife.vip/account/delete-info.

Finesse Life is for adults 18 and over. Membership is by invitation; new members can request one at finesselife.vip.

Privacy: finesselife.vip/privacy · Support: support@finesselife.vip
```

## Graphics

| Asset | File | Spec |
|---|---|---|
| App icon | `mobile/store/play/icon-512.png` | 512×512, 32-bit PNG |
| Feature graphic | `mobile/store/play/feature-graphic-1024x500.png` | 1024×500, PNG, no alpha |
| Phone screenshots | `mobile/store/play/01…08-*.png` | 1080×1920 (9:16), 8 shots |

Play rejects phone screenshots whose long side is more than twice the short side, so 1080×2340 frames are not
used. The set is 1080×1920. Tablet screenshots aren’t needed (the app is phone-only).

## Categorisation

- App or game: **App**
- Category: **Lifestyle**
- Tags (pick up to 5 in Console): Lifestyle, Personal assistant, Travel planner, Fashion, Social

## Contact details

| Field | Value |
|---|---|
| Email (required, public) | support@finesselife.vip |
| Website | https://finesselife.vip |
| Phone | leave empty unless a staffed line exists |
| Privacy policy | https://finesselife.vip/privacy |

## App content (Policy → App content)

| Section | Answer |
|---|---|
| Privacy policy | https://finesselife.vip/privacy |
| Ads | **No, my app does not contain ads** |
| App access | **All or some functionality is restricted** → add instructions (see `app-review-notes.md`, “Play App access”) |
| Content rating | IARC questionnaire below |
| Target audience | **18 and over** only. “Appeals to children”: **No** |
| News app | No |
| COVID-19 contact tracing/status | No |
| Data safety | See `data-safety-play.md` |
| Government app | No |
| Financial features | **My app doesn’t provide any financial features** (the Vault is not in the store build; Per Diem is a personal budget note, not a financial service) |
| Health | Fitness/nutrition tracking only → declare **Activity & fitness** and **Nutrition & weight management** if the Health apps declaration asks; no medical functionality |
| Account deletion | In-app: Lobby → This Is You → Your key → Delete account. Web URL: https://finesselife.vip/account/delete-info |
| Generative AI | Yes — Nova (text, and photos the member chooses). In-app reporting of AI replies: “Report this reply” on each Nova answer |

## Content rating (IARC questionnaire)

Category: **All other app types** (not a game; not purely social or communication).
Answer truthfully for the store build:

| Question | Answer |
|---|---|
| Violence (any) | No |
| Fear / horror | No |
| Sexuality / nudity / sexual references | No |
| Language: crude humour or profanity in app-provided content | No |
| Controlled substances: references to alcohol | **Yes** — references (bars, cocktails, wine, whiskey); no depiction of use encouraged to minors |
| Controlled substances: tobacco / drugs | No |
| Gambling (real or simulated) | No |
| Users can interact or exchange content | **Yes** (Lounge posts, photos) |
| Shares user’s current physical location with other users | No (the live map is web-only and not in the app) |
| Allows purchase of digital goods | No |
| Unrestricted internet access / web browser | No |
| Miscellaneous: promotes or depicts age-restricted products | **Yes** — alcohol references in nightlife planning |

Expected result: **Mature 17+ (ESRB) / PEGI 16–18 / USK 16–18**, with “Users Interact”. The IARC outcome is
computed from truthful answers — never inflate an answer. Whatever the rating, the **Target audience: 18+**
setting is what keeps the listing to adults, together with the in-app 18+ confirmation.
