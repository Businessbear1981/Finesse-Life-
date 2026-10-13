# App Store listing — iOS

Paste each block into App Store Connect → your app → **App Information** / **(version) → App Store**.
Character counts are checked by `node docs/store/check-lengths.mjs` (limits in brackets).

Copy rule: describe only what the **store build** has. No Vault, no card, no cashback, no VIP or Penthouse, no
membership price, no “buy on the web”, no dating, no claim that Nova books or pays for anything.

## Name [30]

```name
Finesse Life
```

## Subtitle [30]

```subtitle
A private house, after hours
```

## Promotional text [170]

Can be changed any time without a new build.

```promo
Your private line for the night. Nova, your AI concierge, drafts the table, the route and the look in a minute. You approve every step. Nothing happens without your yes.
```

## Description [4000]

```description
Finesse Life is a private house in your pocket. Say the word at the door, choose your floor, and the rooms are yours: style, travel, the table, the people worth knowing. Built for members who like things handled quietly.

YOUR PRIVATE LINE
Nova is your AI concierge. Text it the way you would at 1am: a table for four tonight, the best way to Tulum, a black satin slip under $600. Nova drafts options and keeps them in your requests. Nothing is booked, bought or sent until you confirm it. Nova is an AI (Claude, by Anthropic); the app tells you so and asks your consent before your first message.

THE WARDROBE AND THE CLOSET
Keep your looks on one rail, plan the week’s outfits, and note the piece that’s missing. Ask the Stylist to pull looks for an occasion.

DEPARTURES
Turn a trip into one clean boarding pass and itinerary: where, when, who is coming and the plan for each day.

PER DIEM
Set a budget for the night and get the evening laid out as stops with estimates. Tick them off as you go.

THE DIARY
Every plan in one place, in order, with the few that are waiting on your yes.

THE ENTOURAGE
Remember the people who matter: birthdays, what they love, the gift you meant to get.

THE KITCHEN AND THE GYM
A week of meals with a grocery list, and every set you lift, logged in seconds.

THE LOUNGE
A quiet members’ feed with no algorithm. Members agree to the house rules before posting. Report any post or member, block anyone, and the house acts on reports within 24 hours.

DISCREET BY DESIGN
No ads. No tracking. Your rooms are private to you. Delete your account and its data at any time from the app.

Finesse Life is for adults 18 and over. Membership is by invitation; new members can request one at finesselife.vip.

Privacy: finesselife.vip/privacy
Terms: finesselife.vip/terms
Support: support@finesselife.vip
```

## Keywords [100]

Comma-separated, no spaces after commas (spaces count). Don’t repeat words already in the name or subtitle.

```keywords
concierge,lifestyle,members,club,style,wardrobe,travel,itinerary,planner,diary,assistant,nightlife
```

## URLs

| Field | Value |
|---|---|
| Support URL (required) | https://finesselife.vip/support |
| Marketing URL (optional) | https://finesselife.vip |
| Privacy Policy URL (required) | https://finesselife.vip/privacy |
| User Privacy Choices URL (optional) | https://finesselife.vip/account/delete-info |

All four pages must load **signed out** (they are in the public-route list in `src/lib/supabase/middleware.ts`).
Check each in a private window after deploy.

## Category

- Primary: **Lifestyle**
- Secondary: **Travel** (optional; leave empty if unsure)

## Copyright

```copyright
© 2026 Finesse Life
```

Use the legal entity name once the company is registered (e.g. `© 2026 Finesse Life LLC`). It must match the
seller name on the Apple Developer organization account.

## Age rating → 18+

App Store Connect → App Information → **Age Ratings** → Edit. Answer truthfully for the **store build**:

| Question | Answer | Why |
|---|---|---|
| Parental controls | No | — |
| Age assurance | Yes — in-app 18+ confirmation at first sign-in | `age_18` consent recorded server-side |
| Unrestricted web access | No | Links open in the system browser; no in-app browser to arbitrary sites |
| User-generated content | **Yes** | Lounge posts, photos, profiles |
| Messaging and chat | No | No member-to-member messaging in the store build (Lounge is a feed) |
| Advertising | No | No ads |
| Cartoon or fantasy violence | None | — |
| Realistic violence | None | — |
| Prolonged graphic or sadistic violence | None | — |
| Profanity or crude humor | Infrequent/Mild | Members can post text; filtered and moderated |
| Mature or suggestive themes | Infrequent/Mild | Nightlife setting |
| Horror/fear themes | None | — |
| Medical or treatment information | None | Wellness programmes are hidden in the store build |
| Health or wellness topics | **Yes** | Gym logging, Kitchen calorie targets |
| Alcohol, tobacco, or drug use or references | **Frequent/Intense** | Bars, nightcaps, whiskey and wine throughout |
| Simulated gambling | None | — |
| Contests | None | — |
| Sexual content or nudity | None | Dating features are not in the store build |
| Graphic sexual content and nudity | None | — |
| Guns or other weapons | None | — |
| Loot boxes | No | — |

Then set the rating to **18+**. If the computed rating comes out lower, use the age-rating override in the same
dialog to raise it to 18+ (the house admits adults only and asks for 18+ confirmation in the app). The answers
above must still be truthful — never inflate a content answer to get a rating.

Also: App Information → **Content Rights** → “No, it does not contain, show, or access third-party content” is
**wrong** here (members post content) — answer **Yes**, and confirm you have the rights or licenses (the Terms
grant the house a licence to display member posts).
