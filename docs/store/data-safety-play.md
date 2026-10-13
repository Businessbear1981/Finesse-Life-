# Data safety form — Google Play

Play Console → **Policy → App content → Data safety** → Start. Answers for the **store build**, consistent with
`app-privacy-ios.md` and https://finesselife.vip/privacy. Change all three together.

## Data collection and security

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS/TLS only) |
| Which of the following methods of account creation does your app support? | **Username and password** (accounts are created by invitation on the web; members sign in in the app). Also tick “OAuth” only if social sign-in is enabled later |
| Do you provide a way for users to request that their data is deleted? | **Yes** |
| Delete account URL | **https://finesselife.vip/account/delete-info** |
| Can users request that some data is deleted without deleting the account? | **Yes** — members remove their own looks, Diary items, trips, people and plans in the app; anything else (including a Lounge post) on request to support@finesselife.vip |

## Sharing

Play counts as “shared” only transfers to a third party that are **not** a service provider acting on our
behalf. Supabase, Vercel, Cloudflare R2 and Anthropic process data for us under contract, so: **no data is
shared**. (Lounge posts shown to other members are a user-initiated action and are not “sharing” under the
form’s definition.)

## Data types collected

For each: **Collected: Yes · Shared: No · Processed ephemerally: No · Required or optional** as noted ·
Purposes as listed. Nothing is used for advertising, marketing or fraud prevention beyond what is listed.

| Play category → type | Required? | Purposes | What it is |
|---|---|---|---|
| Personal info → **Name** | Required | App functionality, Account management | Display name / username |
| Personal info → **Email address** | Required | App functionality, Account management, Developer communications | Sign-in and support replies |
| Personal info → **User IDs** | Required | App functionality, Account management | Account id |
| Personal info → Address / Phone / Race / Political / Sexual orientation / Other info | Not collected | — | — |
| Financial info → **Other financial info** | Optional | App functionality | Per Diem budgets and estimates the member types |
| Financial info → Purchase history / Credit score / Payment info | Not collected | — | No purchases in the app |
| Health and fitness → **Fitness info** | Optional | App functionality | Gym sets, Kitchen calorie targets |
| Health and fitness → Health info | Not collected | — | — |
| Messages → Emails / SMS | Not collected | — | — |
| Messages → **Other in-app messages** | Optional | App functionality | What the member writes to Nova (AI concierge) |
| Photos and videos → **Photos** | Optional | App functionality | Looks, Stylist / Camera photos, profile photo — only those the member picks |
| Photos and videos → Videos | Not collected | — | — |
| Audio files → Voice or sound recordings / Music / Other audio | Not collected | — | Starmaker recordings stay on the device |
| Files and docs | Not collected | — | Starmaker’s file picker opens audio files the member picks on the device; nothing is uploaded |
| Calendar → Calendar events | Not collected | — | The Diary is the app’s own data (declared under App activity); the device calendar isn’t read |
| Contacts | Not collected | — | Entourage people are typed in by the member (declared under App activity) |
| App activity → **App interactions** | Required | App functionality, Personalization, Analytics | Rooms opened, things saved or asked for; AI usage records |
| App activity → In-app search history | Not collected | — | — |
| App activity → Installed apps | Not collected | — | — |
| App activity → **Other user-generated content** | Optional | App functionality | Lounge posts, Diary items, trips, Entourage notes, Kitchen plans, reports |
| App activity → Other actions | Not collected | — | — |
| Web browsing → Web browsing history | Not collected | — | — |
| App info and performance → Crash logs / Diagnostics / Other | Not collected | — | No crash SDK. Update if one is added |
| Device or other IDs | Not collected | — | No advertising ID; the app doesn’t request `AD_ID` |
| Location → Approximate / Precise | Not collected | — | The app doesn’t request location (live map is web-only) |

## Security practices shown on the listing

- Data is encrypted in transit: **Yes**
- You can request that data be deleted: **Yes**
- Committed to Play Families Policy: **No** (adults only; not designed for children)
- Independent security review: **No** (don’t claim it unless a MASA / ADA review is completed)

## Related declarations

- **Account deletion** (Policy → App content): in-app path *This Is You → Your key → Delete account*, web URL
  https://finesselife.vip/account/delete-info (works without the app — email option included).
- **Advertising ID**: declare that the app does **not** use an advertising ID. If a dependency adds
  `com.google.android.gms.permission.AD_ID` to the merged manifest, block it in `app.json`
  (`android.blockedPermissions`) before submitting.
