# App Review notes

Paste the **Notes for the reviewer** block into App Store Connect → (version) → **App Review Information → Notes**,
and the sign-in fields into **Sign-in required**. For Google Play, paste the **Play App access** block into
Policy → App content → **App access** → “All or some functionality is restricted” → Add instructions.

Fill the two `‹…›` values before pasting. Neither is stored in this repository:

- `‹HOUSE CODE›` — the server’s `ENTRANCE_KEYLOCK_CODE` (Vercel → Project → Settings → Environment Variables,
  Production). Six digits.
- `‹REVIEWER PASSWORD›` — the `REVIEWER_PASSWORD` you used when running
  `node scripts/seed-demo.mjs --reviewer --apply`.

Before every submission: re-run the seed (it refreshes dates so the Diary, Per Diem and trip are in the future),
then open the app with these credentials yourself on a TestFlight / internal-testing build.

## Sign-in required (App Store Connect fields)

| Field | Value |
|---|---|
| Sign-in required | Yes |
| User name | review@demo.finesselife.vip |
| Password | ‹REVIEWER PASSWORD› |
| Contact first / last name | (founder) |
| Contact phone | (a phone you answer during review) |
| Contact email | support@finesselife.vip |

## Notes for the reviewer

```text
WHAT FINESSE LIFE IS
Finesse Life is a members-only lifestyle app for adults (18+). Members plan their evenings, trips, wardrobe,
meals and training, keep their plans in a Diary, and talk to Nova, an AI concierge that drafts options for them.
Nova never books, buys or pays for anything: Nova drafts, the member decides and acts. The one payment in the
app is for physical goods in a Scale group buy (see PAYMENTS).

HOW TO ENTER (2 steps)
1) The door. The first screen is the house door. Type the house code: ‹HOUSE CODE›
   (the keypad on screen, or "Type the code instead"). Then choose either floor — it only changes what is
   featured first.
2) Sign in. In the Lobby tap "Sign in" and use:
   Email: review@demo.finesselife.vip
   Password: ‹REVIEWER PASSWORD›
   On first sign-in the app asks you to confirm you are 18 or older.

WHAT TO TRY (all seeded on the review account)
- Nova (bell at the bottom of the Lobby, or the Concierge room): send any message. Before your first use of any
  AI feature (a message, a "plan it with Nova" button, a photo read) the app explains that Nova is an AI (Claude,
  made by Anthropic) and asks for consent; the server refuses AI requests from members who haven't agreed. "Your requests" shows four
  finished drafts (a dress search, a price check, a Friday evening plan, a Tulum trip plan). Every Nova reply has
  "Report this reply".
- Diary: this week's plans, including items waiting on the member's approval.
- Wardrobe / Closet: four saved looks and this week's outfit plan.
- Departures: a planned Tulum trip with its itinerary.
- Per Diem: Friday's evening with a $450 budget, laid out as stops.
- Entourage: two people with birthdays and gift notes. Kitchen: this week's meals and grocery list. Gym: logged sets.
- The Lounge: the members' feed (demo members). Each post and profile has Report and Block.
- Account deletion: Lobby → This Is You (avatar, top left) → Your key → Delete account
  (type DELETE + password). Please don't delete the review account during review, or tell us and we will
  re-create it.

USER-GENERATED CONTENT (Guideline 1.2)
- Members must accept the house rules & terms (zero tolerance for objectionable content and abusive members)
  before they can post. The review account has already accepted them.
- Posts are checked by a text filter before they are saved, and media links are validated server-side.
- Report on every post, profile, listing and Nova reply; Block on every member (blocked members' content is
  hidden both ways). Content reported by three different members is hidden automatically until staff review it.
- The team reviews reports and acts on objectionable content within 24 hours (removing content and, where
  appropriate, the member). Published at finesselife.vip/terms and finesselife.vip/support.

AI (Guideline 5.1.2)
Nova runs on Claude by Anthropic (a third-party AI provider), routed through our servers. The app names the
provider and asks for explicit consent before your first use of any AI feature, and separately before a photo
is sent for AI reading. The consent is enforced on our servers: every AI endpoint refuses a member who hasn't
agreed (and opens the consent sheet in the app). Members can report any AI reply. Disclosed in the privacy
policy: finesselife.vip/privacy

WHAT IS NOT IN THIS BUILD, AND WHY
To make sure everything you can open works end to end, this build hides features that depend on partners or
approvals we don't have yet: a paid membership tier, a stored-value/card feature, live audio rooms with tipping,
dating features, and some rooms still being built. None of them are reachable, and the app has no links or
copy pointing to them.

PAYMENTS (Guideline 3.1.3(e) — goods and services used outside the app)
The app sells no digital goods, content, subscriptions or in-app features, and has no in-app purchases.
The one payment is for PHYSICAL goods: Scale (in the Market room) is a group buy for physical products. A pledge
never charges. Only if the group reaches its goal does the pledge move to "payment requested", and the member
can then pay for those physical goods through Stripe Checkout, opened in the browser. The app never marks a
pledge paid itself: it shows "Paid" only after Stripe confirms the payment to our server. Physical goods are
outside In-App Purchase under 3.1.3(e).
Retail links in Nova's drafts open the retailer's own website for physical goods; we take no payment there.

PRIVACY, SUPPORT, DELETION
Privacy policy: https://finesselife.vip/privacy
Support: https://finesselife.vip/support — support@finesselife.vip
Account deletion (in app, web or email): https://finesselife.vip/account/delete-info
```

## Play App access

```text
Finesse Life is members-only. To review:
1) On the door screen, enter the house code ‹HOUSE CODE› on the keypad and choose either floor.
2) In the Lobby, tap Sign in: review@demo.finesselife.vip / ‹REVIEWER PASSWORD›. Confirm you are 18+.
The account is seeded with Diary plans, Wardrobe looks, a trip, a Per Diem night, Entourage, Kitchen, Gym and
finished Nova drafts. Nova (AI, by Anthropic) asks for consent before your first use of any AI feature.
No digital goods are sold. The only payment is for physical goods in a Scale group buy (Market room), paid
through Stripe Checkout in the browser after the group reaches its goal. Account deletion: This Is You → Your
key → Delete account.
```

Play asks for the instructions to work **without** contacting you: keep the code and password current, and
re-run the seed before each review.

## If review is rejected

- **2.1 (incomplete / can’t sign in)** — check that `ENTRANCE_KEYLOCK_CODE`, `KEYLOCK_SECRET` and
  `SUPABASE_SERVICE_ROLE_KEY` are set in Production, that the door accepts the code on a release build, and
  that the reviewer password still works (re-run the seed: it resets the password to `REVIEWER_PASSWORD`).
- **4.2 (minimum functionality)** — the review account must have content: re-run the seed.
- **3.1.1 / 3.1.3** — confirm the store build shows no VIP / Penthouse / membership copy (`RELEASE.vip` is
  false in store builds; see `mobile/src/lib/release.ts`). If Scale's browser checkout is questioned, reply that
  it pays only for physical goods delivered outside the app (3.1.3(e)); no digital content is unlocked.
- **1.2** — confirm Report / Block are visible on Lounge posts on the release build.
