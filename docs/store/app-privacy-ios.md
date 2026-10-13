# App Privacy (nutrition label) — iOS

App Store Connect → your app → **App Privacy** → Get started / Edit. Answers for the **store build**, consistent
with the privacy manifest in `mobile/app.json` (`ios.privacyManifests.NSPrivacyCollectedDataTypes`) and the
policy at https://finesselife.vip/privacy. If any of the three changes, change all three.

Data processed by our service providers on our behalf (Supabase — database and auth; Vercel — hosting;
Cloudflare R2 — photo storage; Anthropic — the AI model behind Nova) counts as collected by us. None of it is
sold, used for advertising, or combined with other companies’ data.

## Do you or your third-party partners collect data from this app?

**Yes.**

## Tracking

**No, we do not use data for tracking.** No ad SDKs, no IDFA, no data brokers, no cross-app linking.
`NSPrivacyTracking` is `false` and there are no tracking domains. The app never shows the App Tracking
Transparency prompt (it doesn’t need to).

## Data types

For every type below: **Linked to the user: Yes** · **Used for tracking: No**.

| Category → type | Collected | Purposes | What it is in Finesse |
|---|---|---|---|
| Contact Info → **Name** | Yes | App Functionality | Display name / username on the profile |
| Contact Info → **Email Address** | Yes | App Functionality | Sign-in, account and support |
| Contact Info → Phone Number | No | — | — |
| Contact Info → Physical Address | No | — | — |
| Contact Info → Other Contact Info | No | — | — |
| Health & Fitness → Health | No | — | No medical or clinical data |
| Health & Fitness → **Fitness** | Yes | App Functionality | Gym sets and sessions the member logs; Kitchen calorie targets |
| Financial Info → Payment Info | No | — | The app takes no payments |
| Financial Info → Credit Info | No | — | — |
| Financial Info → **Other Financial Info** | Yes | App Functionality | Per Diem budgets and estimated costs the member enters |
| Location → Precise / Coarse | No | — | The app doesn’t request location (the live map is web-only) |
| Sensitive Info | No | — | — |
| Contacts | No | — | The app never reads the address book. Entourage people are typed in by the member (see Other User Content) |
| User Content → Emails or Text Messages | No | — | — |
| User Content → **Photos or Videos** | Yes | App Functionality | Look photos, Stylist / Camera photos the member chooses, profile photo |
| User Content → Audio Data | No | — | Starmaker recordings stay on the device |
| User Content → Gameplay Content | No | — | — |
| User Content → Customer Support | No | — | Support is by email outside the app. Answer **Yes** if an in-app support form is ever added |
| User Content → **Other User Content** | Yes | App Functionality | Lounge posts, Nova messages and drafts, Diary items, trips, Entourage notes, Kitchen plans, reports the member files |
| Browsing History | No | — | — |
| Search History | No | — | Nova requests are declared under Other User Content |
| Identifiers → **User ID** | Yes | App Functionality | The account id |
| Identifiers → Device ID | No | — | No IDFA / IDFV collection |
| Purchases → Purchase History | No | — | No in-app purchases |
| Usage Data → **Product Interaction** | Yes | App Functionality, **Product Personalization** | Rooms opened, things saved or asked for; AI usage records (feature, token counts) for rate limits |
| Usage Data → Advertising Data | No | — | No ads |
| Usage Data → Other Usage Data | No | — | — |
| Diagnostics → Crash Data / Performance Data / Other | No | — | No crash-reporting SDK. Answer **Yes** (App Functionality, not linked) if Sentry or similar is added |
| Surroundings / Body | No | — | — |
| Other Data | No | — | — |

## Notes for the answers

- **Third-party AI (Apple 5.1.2(i))**: the label has no separate “shared with AI” field; the disclosure lives in
  the app (consent sheet before the first Nova message and before a photo is read) and in the privacy policy.
  Both must name **Anthropic**.
- **Third-party personal data**: Entourage notes describe other people. The privacy policy discloses this: the
  information is private to the member, used only to help them, and deleted with their account.
- **Account deletion (5.1.1(v))**: in-app — This Is You → Your key → Delete account. Deletion removes the
  account and its rows (cascade) within 30 days.
- **User Privacy Choices URL** (optional field): https://finesselife.vip/account/delete-info
