# Finesse SQL Manual
**Platform:** Finesse (finesselife.vip)  
**Database:** Supabase / PostgreSQL  
**Last updated:** 2026-06-17  

All tables live in the `public` schema with Row Level Security (RLS) enabled. Tables are listed in the order they must be created (dependency order). Every table uses `uuid` primary keys and `timestamptz` timestamps.

---

## Table of Contents

1. [profiles](#1-profiles)
2. [concierge_avatars](#2-concierge_avatars)
3. [onboarding_state](#3-onboarding_state)
4. [integrations](#4-integrations)
5. [integration_audits](#5-integration_audits)
6. [integration_health](#6-integration_health)
7. [vault_accounts](#7-vault_accounts)
8. [vault_transactions](#8-vault_transactions)
9. [subscriptions](#9-subscriptions)
10. [payments](#10-payments)
11. [stripe_events](#11-stripe_events)
12. [media_assets](#12-media_assets)
13. [media_jobs](#13-media_jobs)
14. [truth_checks](#14-truth_checks)
15. [posts](#15-posts)
16. [post_likes](#16-post_likes)
17. [vip_codes](#17-vip_codes)
18. [vip_posts](#18-vip_posts)
19. [vip_exclusives](#19-vip_exclusives)
20. [backstage_sessions](#20-backstage_sessions)
21. [intelligence_signals](#21-intelligence_signals)
22. [intelligence_audit](#22-intelligence_audit)
23. [market_intelligence_cache](#23-market_intelligence_cache)
24. [exchange_listings](#24-exchange_listings)
25. [exchange_offers](#25-exchange_offers)
26. [scale_deals](#26-scale_deals)
27. [scale_joins](#27-scale_joins)
28. [embassy_deals](#28-embassy_deals)
29. [registry_items](#29-registry_items)
30. [outings](#30-outings)
31. [outing_participants](#31-outing_participants)
32. [registry_pledges](#32-registry_pledges)
33. [scrapbook_entries](#33-scrapbook_entries)
34. [carpe_diem_profiles](#34-carpe_diem_profiles)
35. [salon_bookings](#35-salon_bookings)
36. [bag_items](#36-bag_items)
37. [wardrobe_looks](#37-wardrobe_looks)
38. [wardrobe_look_likes](#38-wardrobe_look_likes)
39. [wardrobe_wishlist](#39-wardrobe_wishlist)
40. [social_accounts](#40-social_accounts)
41. [social_broadcasts](#41-social_broadcasts)

---

## 1. `profiles`

**What it is:** The master identity record for every Finesse member.  
**Created by:** Supabase trigger `on_auth_user_created` — fires automatically when a user signs up via `auth.users`.

**Key columns:**

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | Matches `auth.users.id` exactly — never set manually |
| `username` | text unique | Display handle. Seeded from email prefix on signup |
| `gender` | text | `'feminine'` / `'masculine'` / `'nonbinary'` — controls which rooms and Nova persona the user sees |
| `is_vip` | bool | Unlocks VIP room, VIP posts, VIP exclusives |
| `vip_expires_at` | timestamptz | If set, VIP access lapses at this time. null = lifetime VIP |
| `intake_complete` | bool | True once the style quiz is submitted |
| `nova_persona` | jsonb | Nova AI personality config (voice, name, gender) — also mirrored in `concierge_avatars` |
| `nightvision_data` | jsonb | Plaid/Spotify financial + music personality blend used by the Nightvision room |
| `style_dna` | jsonb | AI color/style analysis result from the Nova photo scan |
| `check_in` | timestamptz | Timestamp of last Lobby check-in (updates the lobby live counter) |

**Connected to:** Every other table in the platform via `user_id` FK. The root of the entire graph.  
**Routes:** `/api/profile`, `/api/auth/callback`, `/lobby`, `/concierge`  
**RLS:** User reads and edits their own row only. Public select policy allows profile cards to be shown to other members.

---

## 2. `concierge_avatars`

**What it is:** Nova's appearance and voice config, one record per user.  
**Why separate from profiles:** Nova's config is rich and may grow (outfit, animations, memory settings) without bloating the profile row.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid unique | FK → profiles. One-to-one |
| `name` | text | Nova's chosen name (default: "Nova") |
| `gender` | text | Avatar gender — controls which 3D model is loaded |
| `look` | text | Currently selected outfit/skin slug |
| `voice_id` | text | ElevenLabs voice ID for TTS responses |

**Connected to:** `profiles` (parent), ElevenLabs API (via `voice_id`), Higgsfield API (avatar video gen).  
**Routes:** `/concierge`, `/api/concierge`  
**RLS:** User owns their row — no cross-user reads.

---

## 3. `onboarding_state`

**What it is:** Tracks which step of the multi-screen intake wizard the user has completed.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid primary key | FK → profiles |
| `step_completed` | int | 0 = not started, 1–N = step number last saved |
| `extension_installed` | bool | Whether user installed the browser extension during onboarding |
| `completed_at` | timestamptz | Null until fully done |

**Connected to:** `profiles` (parent).  
**Routes:** `/api/onboarding`, `/onboarding`  
**RLS:** User owns their row only.

---

## 4. `integrations`

**What it is:** The master table for every third-party platform connection per user. One row per user+vendor pair.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `vendor` | text | Platform slug: `'instagram'`, `'plaid'`, `'elevenlabs'`, `'spotify'`, etc. |
| `enabled` | bool | Whether this connection is active |
| `credentials_enc` | text | AES-256-GCM encrypted API credentials (via `lib/crypto.ts`) |
| `oauth_token_enc` | text | Encrypted OAuth access token |
| `refresh_token_enc` | text | Encrypted OAuth refresh token |
| `token_expires_at` | timestamptz | When the access token needs refreshing |
| `last_test_status` | text | `'ok'` / `'fail'` / `'no_quota'` / `'disabled'` — last health check result |
| `last_test_latency_ms` | int | Round-trip latency of last health check in milliseconds |

**Unique constraint:** `(user_id, vendor)` — only one row per platform per user.  
**Connected to:** `integration_audits` (every test logs here), `integration_health` (global vendor status).  
**Routes:** `/api/integrations/[vendor]`, `/settings/integrations`, `/api/audit`  
**RLS:** User reads and writes their own rows only.

---

## 5. `integration_audits`

**What it is:** Append-only log of every integration health test. Never updated — one insert per test run.

| Column | Type | Purpose |
|---|---|---|
| `vendor` | text | Which platform was tested |
| `status` | text | `'ok'` / `'fail'` / `'no_quota'` / `'disabled'` |
| `latency_ms` | int | Test round-trip time |
| `message` | text | Error message or success note |

**Connected to:** `integrations` (source of tests).  
**Routes:** `/api/audit`  
**RLS:** User can read their own audit entries.

---

## 6. `integration_health`

**What it is:** Current global health status per vendor (not per user). One row per vendor, updated after each test sweep.

| Column | Type | Purpose |
|---|---|---|
| `vendor` | text primary key | Platform slug |
| `status` | text | Current health: `'ok'` / `'fail'` / `'unknown'` |
| `last_checked_at` | timestamptz | When last sweep ran |
| `error_message` | text | Last error if status is `'fail'` |

**Connected to:** `integration_audits` (feeds this summary), `/api/audit` dashboard.  
**RLS:** No RLS — read-only for all (service role writes).

---

## 7. `vault_accounts`

**What it is:** The prepaid balance wallet for every Finesse member. One row per user, auto-created on signup via trigger.  
**Business role:** Vault is the platform's proprietary prepaid card backed by CCBill. Members fund it, spend it on dates, and earn cashback.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid unique | FK → profiles |
| `balance_cents` | int | Current spendable balance in cents. Never goes negative (CHECK constraint) |
| `cashback_earned_cents` | int | Lifetime cashback accumulated (1.5% on qualifying spend) |

**Trigger:** `trg_create_vault_account` — inserts a zero-balance row the moment a profile is created.  
**Connected to:** `vault_transactions` (every spend/load creates a row there), `subscriptions` (CCBill charges flow through here).  
**Routes:** `/api/vault/balance`, `/api/vault/transactions`, `/vault`  
**RLS:** User reads and updates their own row only.

---

## 8. `vault_transactions`

**What it is:** Immutable ledger of every credit and debit against a vault account.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `merchant` | text | Where the charge happened ("Finesse Date Night", "Nobu", etc.) |
| `amount_cents` | int | Dollar amount in cents (always positive — direction field clarifies sign) |
| `cashback_cents` | int | Cashback earned on this transaction |
| `category` | text | Spend category: `'dining'`, `'experience'`, `'subscription'`, `'general'` |
| `direction` | text | `'debit'` (money out) or `'credit'` (money in / reload) |
| `status` | text | `'pending'` / `'settled'` / `'reversed'` |
| `reference_id` | text | External processor transaction ID for reconciliation |

**Connected to:** `vault_accounts` (balance updated by API after each transaction).  
**Routes:** `/api/vault/transactions`, `/vault`  
**RLS:** User reads their own transactions. Insert via service role only (prevents spoofing).

---

## 9. `subscriptions`

**What it is:** Active membership subscription records. Finesse charges $24.99/mo via CCBill.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `status` | text | `'active'` / `'canceled'` / `'past_due'` / `'trialing'` |
| `price_cents` | int | Amount billed (default 2499 = $24.99) |
| `current_period_start/end` | timestamptz | Billing window |
| `processor` | text | Payment processor slug — always `'ccbill'` per brief §8.2 |
| `processor_sub_id` | text | CCBill subscription ID for webhook reconciliation |

**Connected to:** `payments` (each renewal creates a payment row), `profiles.is_vip` (set true when sub is active).  
**Routes:** `/api/subscriptions`, `/api/webhooks/ccbill`  
**RLS:** User reads their own subscription.

---

## 10. `payments`

**What it is:** Individual charge/refund records. One row per transaction attempt.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `amount_cents` | int | Amount charged |
| `status` | text | `'pending'` / `'succeeded'` / `'failed'` / `'refunded'` |
| `processor` | text | `'ccbill'` |
| `processor_ref` | text | CCBill transaction ID |
| `description` | text | Human-readable reason ("Monthly membership", "Vault reload") |

**Connected to:** `subscriptions` (subscription renewals), `vault_transactions` (Vault loads).  
**Routes:** `/api/webhooks/ccbill`  
**RLS:** User reads their own payments.

---

## 11. `stripe_events`

**What it is:** Raw Stripe webhook event log. Used for idempotency — if a webhook fires twice, the second insert fails on the primary key and is ignored.  
**Note:** Stripe is used only for platform-side billing (Stripe Connect for creator payouts), not consumer checkout. Consumer payments go through CCBill.

| Column | Type | Purpose |
|---|---|---|
| `id` | text primary key | Stripe event ID (`evt_...`) — guaranteed unique |
| `type` | text | Event type: `'payment_intent.succeeded'`, etc. |
| `data` | jsonb | Full Stripe event payload |
| `processed` | bool | Set true after business logic runs |

**Connected to:** Stripe webhooks handler.  
**Routes:** `/api/webhooks/stripe`  
**RLS:** No user access — service role only.

---

## 12. `media_assets`

**What it is:** Metadata registry for every file uploaded to Cloudflare R2. The actual bytes live on R2; this table tracks the reference.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `r2_key` | text unique | The R2 object key (path in the bucket) |
| `url` | text | Public CDN URL to serve the file |
| `type` | text | `'image'` / `'video'` / `'audio'` / `'3d'` |
| `size_bytes` | bigint | File size for quota tracking |
| `mime_type` | text | MIME type for Content-Type headers |
| `job_id` | text | If this asset was AI-generated, links to `media_jobs.id` |

**Connected to:** `media_jobs` (generated assets), `scrapbook_entries`, `wardrobe_looks`, `exchange_listings` (photo uploads).  
**Routes:** `/api/media/upload`, `/api/r2`  
**RLS:** User reads and manages their own assets.

---

## 13. `media_jobs`

**What it is:** Queue for AI media generation tasks. When a user triggers a Higgsfield video gen or ElevenLabs voice clip, a row is inserted here and polled until complete.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `type` | text | `'video'` / `'voice'` / `'music'` / `'3d'` / `'image'` |
| `provider` | text | `'higgsfield'` / `'elevenlabs'` / `'suno'` / `'meshy'` |
| `prompt` | text | The generation prompt |
| `status` | text | `'queued'` / `'processing'` / `'complete'` / `'failed'` |
| `result_url` | text | CDN URL of the finished asset (set on completion) |
| `provider_job_id` | text | External job ID for polling the provider's status API |
| `error_message` | text | Set if status is `'failed'` |

**Connected to:** `media_assets` (result lands there on completion), Higgsfield/ElevenLabs/Suno/Meshy APIs.  
**Routes:** `/api/scrapbook/generate-video`, `/api/media/jobs/[id]`  
**RLS:** User reads their own jobs.

---

## 14. `truth_checks`

**What it is:** Audit log for every AI output verification run by the Truth Shield layer. Every Nova response that makes a factual claim gets a row here.

| Column | Type | Purpose |
|---|---|---|
| `session_id` | text | Conversation session identifier |
| `claim` | text | The exact factual claim that was checked |
| `verdict` | text | `'VERIFIED'` / `'CONTRADICTED'` / `'UNVERIFIED'` / `'CONFLICTED'` |
| `evidence` | text | The source and evidence quote |
| `tier_used` | int | Which verification tier produced the verdict (0–9) |
| `gated` | bool | Whether this claim was blocked from displaying before verification |

**Connected to:** `lib/truth.ts`, Nova response pipeline.  
**Routes:** `/api/truth`, `/audit`  
**RLS:** No user-facing RLS — service role writes, admin reads only.

---

## 15. `posts`

**What it is:** The main social feed in the Lounge room. Any authenticated member can post text + optional image.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles (author) |
| `content` | text | Post body. 1–500 characters enforced by CHECK |
| `image_url` | text | Optional attached image URL (from R2) |
| `likes_count` | int | Denormalized count for fast feed rendering. Updated by `post_likes` insert/delete |

**Connected to:** `post_likes` (interaction), `profiles` (join for avatar/username display).  
**Routes:** `/api/posts`, `/lounge`  
**RLS:** Public read (all authenticated members see the feed). Author-only write.

---

## 16. `post_likes`

**What it is:** Join table. Records which user liked which post. The `UNIQUE (post_id, user_id)` constraint prevents double-liking.

| Column | Type | Purpose |
|---|---|---|
| `post_id` | uuid | FK → posts |
| `user_id` | uuid | FK → profiles |

**Connected to:** `posts.likes_count` (API increments/decrements the count on insert/delete).  
**Routes:** `/api/posts/[id]/like`  
**RLS:** User manages their own likes. Public read (for "did I like this?" checks).

---

## 17. `vip_codes`

**What it is:** Invite codes that grant VIP membership. Format: `FNS-XXXXXXXX`. Admin creates codes; users redeem them via `/vip/redeem`.

| Column | Type | Purpose |
|---|---|---|
| `code` | text unique | The invite code string |
| `is_active` | bool | Admin can deactivate a code without deleting it |
| `max_uses` | int | How many times this code can be used before expiring |
| `use_count` | int | How many times it's been used so far |
| `used_by` | uuid[] | Array of profile IDs that have redeemed this code |
| `expires_at` | timestamptz | Hard expiry date (null = never expires) |
| `created_by` | uuid | FK → profiles (the admin who generated the code) |

**Connected to:** `profiles.is_vip` (set true on redemption), `/api/vip/redeem`, `/api/vip/codes`.  
**Routes:** `/api/vip/codes` (admin CRUD), `/api/vip/redeem` (member use)  
**RLS:** No user-facing select. All reads/writes via service role (admin API only).

---

## 18. `vip_posts`

**What it is:** A private gated feed visible only to active VIP members. VIPs can post text + image here.

| Column | Type | Purpose |
|---|---|---|
| `author_id` | uuid | FK → profiles |
| `content` | text | Post body. 1–1000 characters |
| `image_url` | text | Optional image |
| `likes_count` | int | Like counter |

**RLS policy:** SELECT is gated on `profiles.is_vip = true AND (vip_expires_at IS NULL OR vip_expires_at > now())`. Non-VIP members get zero rows, not a 403 — the room UI handles the empty state with an upsell.  
**Connected to:** `profiles.is_vip`, `/vip` room.  
**Routes:** `/api/vip/posts`

---

## 19. `vip_exclusives`

**What it is:** The big-ticket board in the VIP room. Curated high-value items (brand collabs, experiences, luxury goods) that VIP members can pledge toward.

| Column | Type | Purpose |
|---|---|---|
| `title` | text | Name of the exclusive offer |
| `brand` | text | Brand or partner name |
| `price_cents` | bigint | Full value of the item |
| `pledged_cents` | bigint | How much has been committed so far |
| `category` | text | `'Experience'` / `'Fashion'` / `'Travel'` / etc. |
| `sort_order` | int | Display ordering (lower = higher on board) |
| `is_active` | bool | Admin can toggle items off without deleting |

**RLS:** VIP-only read (same gate as `vip_posts`).  
**Connected to:** `profiles.is_vip`, admin dashboard.  
**Routes:** `/api/vip/exclusives`, `/vip`

---

## 20. `backstage_sessions`

**What it is:** Audit log for the Keylock PIN entry room. Records every PIN attempt and whether access was granted.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles (who attempted) |
| `pin_hash` | text | Hashed PIN that was submitted |
| `granted` | bool | Whether the PIN was correct |
| `ip_address` | text | Client IP for security audit |

**Connected to:** `/backstage` room, `/api/backstage/unlock`.  
**RLS:** No user-facing reads. Service role only (admin audit trail).

---

## 21. `intelligence_signals`

**What it is:** The behavioral event stream. Every meaningful user action across the platform emits a signal row here. The intelligence engine reads these to build preference models and power Nova's recommendations.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | text | User ID as string (matches `auth.uid()::text`) |
| `kind` | text | Event type: `'page_view'` / `'like'` / `'purchase'` / `'search'` / `'time_spent'` / etc. |
| `payload` | jsonb | Event-specific data (e.g. `{"room": "exchange", "listing_id": "..."}`) |
| `session_id` | text | Browser session identifier for grouping events |

**Connected to:** `src/lib/intelligence/bus.ts` (emits signals), `src/lib/intelligence/behavioral.ts` (reads patterns), `src/lib/intelligence/engine.ts` (orchestrator).  
**Routes:** `/api/intelligence/signal`  
**RLS:** User reads their own signals only.

---

## 22. `intelligence_audit`

**What it is:** Audit log for every decision or API call made by the intelligence engine. Separate from `intelligence_signals` — this is about what the engine *did*, not what the user *did*.

| Column | Type | Purpose |
|---|---|---|
| `module` | text | Which engine module ran (`'behavioral'` / `'market'` / `'engine'`) |
| `action` | text | What it did (`'score_user'` / `'recommend'` / `'cache_miss'`) |
| `input` | jsonb | Input parameters |
| `output` | jsonb | Result produced |
| `latency_ms` | int | Processing time |
| `error` | text | Error message if the call failed |

**Routes:** `/audit` dashboard, `/api/intelligence/*`  
**RLS:** User reads their own audit entries.

---

## 23. `market_intelligence_cache`

**What it is:** TTL-based cache for expensive market intelligence API results. Avoids repeat calls to external data providers.

| Column | Type | Purpose |
|---|---|---|
| `cache_key` | text unique | Deterministic key for the query (e.g. `"trends:nyc:dining:2026-06"`) |
| `data` | jsonb | Cached API result |
| `expires_at` | timestamptz | When this cache entry should be ignored and re-fetched |

**Connected to:** `src/lib/intelligence/market.ts`.  
**Routes:** `/api/intelligence/market`  
**RLS:** No user access — service role manages cache.

---

## 24. `exchange_listings`

**What it is:** Peer-to-peer luxury resale listings. Members list items they want to sell; other members browse and make offers.

| Column | Type | Purpose |
|---|---|---|
| `seller_id` | uuid | FK → profiles |
| `title` | text | Item name |
| `brand` | text | Brand label |
| `condition` | text | `'new'` / `'excellent'` / `'good'` / `'fair'` |
| `asking_price_cents` | int | Seller's asking price in cents |
| `category` | text | Item category for filtering |
| `photo_urls` | text[] | Array of image URLs (from R2) |
| `status` | text | `'active'` / `'sold'` / `'removed'` |
| `platform_fee_cents` | int | **Generated column** — auto-calculated as 8% of asking price |
| `seller_receives_cents` | int | **Generated column** — asking price minus platform fee |

**Connected to:** `exchange_offers` (child), `profiles` (seller identity).  
**Routes:** `/api/exchange/listings`, `/exchange`  
**RLS:** Public read on active listings. Seller manages their own.

---

## 25. `exchange_offers`

**What it is:** Buyer offers on Exchange listings. A buyer can offer less than asking price; the seller can accept, decline, or counter.

| Column | Type | Purpose |
|---|---|---|
| `listing_id` | uuid | FK → exchange_listings |
| `buyer_id` | uuid | FK → profiles |
| `offer_price_cents` | int | Buyer's offer in cents |
| `status` | text | `'pending'` / `'accepted'` / `'declined'` / `'withdrawn'` |
| `message` | text | Optional message from buyer |

**Connected to:** `exchange_listings` (parent), `profiles` (both parties).  
**Routes:** `/api/exchange/offers`, `/api/exchange/listings?offers=1` (buyer's incoming offers)  
**RLS:** Both parties (buyer and listing seller) can read the offer. Buyer manages their own.

---

## 26. `scale_deals`

**What it is:** Active group-buy deals. A brand posts a deal with a group price that only unlocks when enough members commit. Similar to Groupon but inside the app.

| Column | Type | Purpose |
|---|---|---|
| `title` | text | Deal name |
| `brand` | text | Offering brand |
| `original_price_cents` | int | Regular retail price |
| `group_price_cents` | int | The discounted group price |
| `goal_count` | int | How many members must join before the deal activates |
| `current_count` | int | How many have joined so far |
| `deadline` | timestamptz | When the deal closes (even if goal isn't met) |
| `status` | text | `'open'` / `'met'` (goal hit) / `'closed'` / `'cancelled'` |

**Trigger:** `trg_increment_scale_count` auto-increments `current_count` and flips status to `'met'` when `current_count >= goal_count`.  
**Connected to:** `scale_joins` (child — user commitments).  
**Routes:** `/api/scale/deals`, `/scale`  
**RLS:** Public read. Service role manages deals.

---

## 27. `scale_joins`

**What it is:** Tracks which users have committed to a Scale group deal. `UNIQUE (deal_id, user_id)` prevents double-joining.

| Column | Type | Purpose |
|---|---|---|
| `deal_id` | uuid | FK → scale_deals |
| `user_id` | uuid | FK → profiles |

**Connected to:** `scale_deals.current_count` (trigger increments on insert).  
**Routes:** `/api/scale/join`  
**RLS:** User manages their own joins. Public read for "did I join this?" checks.

---

## 28. `embassy_deals`

**What it is:** Curated brand deals surfaced by the Embassy intel room. Unlike Scale deals, these are hand-picked brand partnerships rather than member-driven group buys.

| Column | Type | Purpose |
|---|---|---|
| `brand` | text | Brand name |
| `title` | text | Deal headline |
| `original_price_cents` | int | Original price |
| `group_price_cents` | int | Member price |
| `savings_pct` | int | Discount percentage for display |
| `category` | text | Category for filtering |
| `source` | text | Data source (`'attom'` / `'api'` / `'curated'`) |
| `status` | text | `'live'` / `'expired'` / `'pending'` |
| `current_count` | int | Interest count (not a hard gate like Scale) |
| `goal_count` | int | Target interest count |

**Connected to:** Intelligence engine market data, admin curation tools.  
**Routes:** `/api/embassy/deals`, `/embassy`  
**RLS:** Public read for all authenticated members.

---

## 29. `registry_items`

**What it is:** Each member's personal wish registry. Items can be viewed by other members who can mark them as purchased (anonymously or not) or pledge toward them.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles (registry owner) |
| `name` | text | Item name |
| `url` | text | Link to product |
| `image_url` | text | Product image |
| `price_cents` | int | Item price |
| `category` | text | `'tech'` / `'fashion'` / `'experience'` / etc. |
| `purchased` | bool | Whether someone has purchased this item |
| `purchased_by` | uuid | FK → profiles of the purchaser (optional, can be anonymous) |
| `purchased_at` | timestamptz | When it was marked purchased |

**Connected to:** `registry_pledges` (crowdfunded contributions), `profiles` (both owner and purchaser).  
**Routes:** `/api/registry`, `/registry`  
**RLS:** Registry owner manages their items. Public read (so others can gift from it).

---

## 30. `outings`

**What it is:** Group experience events organized by a host. Dining reservations, gallery nights, travel drops — any curated group outing where members RSVP.

| Column | Type | Purpose |
|---|---|---|
| `host_id` | uuid | FK → profiles |
| `title` | text | Event name |
| `venue` | text | Location name |
| `city` | text | City for filtering |
| `date_at` | timestamptz | Event date and time |
| `max_guests` | int | Capacity cap |
| `guest_count` | int | Current RSVP count |
| `price_cents` | int | Per-person price (0 = free) |
| `category` | text | Event type: `'dining'` / `'art'` / `'wellness'` / `'travel'` |
| `partner` | text | Brand partner sponsoring the outing |
| `status` | text | `'open'` / `'full'` / `'cancelled'` / `'completed'` |

**Connected to:** `outing_participants` (child), `profiles` (host + guests).  
**Routes:** `/api/outings`, `/outings`  
**RLS:** Public read. Host manages their events.

---

## 31. `outing_participants`

**What it is:** RSVP join table. `UNIQUE (outing_id, user_id)` prevents double-RSVP.

| Column | Type | Purpose |
|---|---|---|
| `outing_id` | uuid | FK → outings |
| `user_id` | uuid | FK → profiles |

**Connected to:** `outings.guest_count` (API increments on insert).  
**Routes:** `/api/outings/[id]/rsvp`  
**RLS:** User manages their own RSVPs.

---

## 32. `registry_pledges`

**What it is:** Crowdfunded pledges toward a registry item. Multiple members can each contribute a portion of an item's price until the goal is met.

| Column | Type | Purpose |
|---|---|---|
| `item_id` | uuid | FK → registry_items |
| `pledger_id` | uuid | FK → profiles |
| `amount_cents` | int | Amount this member is pledging (must be > 0) |
| `message` | text | Optional gift note |

**Connected to:** `registry_items` (parent), `vault_accounts` (payment deducted from pledger's Vault).  
**Routes:** `/api/registry/pledge`  
**RLS:** Pledger and item owner can both read. Pledger manages their own pledge.

---

## 33. `scrapbook_entries`

**What it is:** Each member's private photo + video archive diary. Members upload moments; Nova can animate a still into a short video via Higgsfield.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `title` | text | Entry title |
| `photo_url` | text | Source image URL (from R2) |
| `video_url` | text | Generated video URL (populated on job completion) |
| `video_job_id` | text | Higgsfield job ID for status polling |
| `video_status` | text | `'none'` / `'pending'` / `'complete'` / `'failed'` |
| `tags` | text[] | Freeform tags |

**Connected to:** `media_jobs` (video generation queue), Higgsfield API, Cloudflare R2.  
**Routes:** `/api/scrapbook`, `/api/scrapbook/generate-video`, `/scrapbook`  
**RLS:** User owns their entries — private, no cross-user reads.

---

## 34. `carpe_diem_profiles`

**What it is:** Extended profile for the Carpe Diem (masculine edition) rooms. Stores garage, golf, and portfolio data that only appears in the men's experience.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid primary key | FK → profiles — one-to-one |
| `garage` | jsonb | Array of car objects (`[{make, model, year, color}]`) |
| `golf_handicap` | numeric(4,1) | Handicap index |
| `home_course` | text | Primary golf club |
| `alpaca_connected` | bool | Whether Alpaca (stock trading) is connected |
| `yahoo_connected` | bool | Whether Yahoo Finance is connected |
| `portfolio_value_cents` | bigint | Latest portfolio snapshot from connected brokerage |

**Connected to:** `profiles` (parent), Alpaca API, Yahoo Finance API.  
**Routes:** `/api/carpe-diem`, `/carpe-diem`  
**RLS:** User owns their row — no cross-user reads.

---

## 35. `salon_bookings`

**What it is:** Beauty and styling appointment bookings. Members book from a curated service menu; each booking enters a pending state until confirmed by the venue.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `service_id` | text | Catalog service slug |
| `service_name` | text | Display name |
| `price_cents` | int | Quoted price |
| `duration` | text | Estimated duration string (`'60 min'`) |
| `category` | text | `'Hair'` / `'Nails'` / `'Skincare'` / etc. |
| `edition` | text | `'finesse'` (feminine) or `'carpe_diem'` (barbershop menu) |
| `requested_date` | text | Preferred date string |
| `requested_time` | text | Preferred time string |
| `notes` | text | Special requests |
| `status` | text | `'pending'` / `'confirmed'` / `'completed'` / `'cancelled'` |

**Connected to:** `profiles`, `/salon` room.  
**Routes:** `/api/salon/bookings`  
**RLS:** User reads and manages their own bookings.

---

## 36. `bag_items`

**What it is:** Items in a member's personal collection bag. Think a digital flex closet — track what you own and its estimated value. Supports both Finesse and Carpe Diem editions (shoes/bags vs. watches/cars).

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `edition` | text | `'finesse'` or `'carpe_diem'` |
| `name` | text | Item name |
| `brand` | text | Brand |
| `category` | text | Category for display grouping |
| `photo_url` | text | Item photo (from R2) |
| `value_est_cents` | int | Estimated current resale value |
| `note` | text | Personal note |
| `added_label` | text | Display label ("Just copped", "Anniversary gift") |

**Connected to:** `exchange_listings` (member can list an item from their bag directly).  
**Routes:** `/api/bag`, `/bag`  
**RLS:** User owns their bag — no cross-user reads.

---

## 37. `wardrobe_looks`

**What it is:** Outfit posts in the Wardrobe room. The social feed for style — members share outfit photos with brand tags and get likes.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `photo_url` | text | Outfit photo URL (from R2) |
| `caption` | text | Optional caption |
| `brands` | text[] | Array of brand tags (`['Valentino', 'Bottega']`) |
| `likes_count` | int | Denormalized like count for fast feed rendering |

**Connected to:** `wardrobe_look_likes` (interaction), `wardrobe_wishlist` (members can wishlist brands seen in looks).  
**Routes:** `/api/wardrobe/looks`, `/api/wardrobe/looks/[id]/like`, `/wardrobe`  
**RLS:** Public read (all members see the feed). Author manages their own looks.

---

## 38. `wardrobe_look_likes`

**What it is:** Join table for look likes. `UNIQUE (look_id, user_id)` prevents double-liking.

| Column | Type | Purpose |
|---|---|---|
| `look_id` | uuid | FK → wardrobe_looks |
| `user_id` | uuid | FK → profiles |

**Connected to:** `wardrobe_looks.likes_count` (API updates count on insert/delete).  
**Routes:** `/api/wardrobe/looks/[id]/like`  
**RLS:** User manages their own likes.

---

## 39. `wardrobe_wishlist`

**What it is:** A member's personal style wishlist — brands and items they want to own. Separate from the registry (which is gift-focused). This is personal tracking.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `brand` | text | Brand name |
| `item` | text | Specific item description |
| `price_est_cents` | int | Rough price estimate |
| `added_label` | text | Context label ("Saw it on @username", "Fall must-have") |

**Connected to:** `wardrobe_looks` (brands in feed can be added to wishlist with one tap), Exchange listings (if a wishlisted brand appears for sale).  
**Routes:** `/api/wardrobe/wishlist`, `/wardrobe?tab=wishlist`  
**RLS:** User owns their wishlist — private, no cross-user reads.

---

## 40. `social_accounts`

**What it is:** Connected social platform OAuth tokens per user, encrypted at rest. Powers the Switchboard room's cross-platform broadcast feature.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `platform` | text | Platform slug: `'instagram'` / `'twitter'` / `'tiktok'` / `'threads'` / etc. |
| `connected` | bool | Current connection state |
| `access_token_enc` | text | AES-256-GCM encrypted OAuth access token |
| `connected_at` | timestamptz | When the user authorized the connection |

**Unique constraint:** `(user_id, platform)` — one row per platform per user.  
**Connected to:** `social_broadcasts` (uses these tokens to post), `integrations` (meta-config lives there).  
**Routes:** `/api/switchboard/accounts`, `/switchboard`  
**RLS:** User owns their rows only. Tokens never leave the server.

---

## 41. `social_broadcasts`

**What it is:** Append-only log of every cross-platform broadcast sent from Switchboard. Records which platforms were targeted, the content, and per-platform results.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `platforms` | text[] | Which platforms were in the blast (`['instagram', 'twitter']`) |
| `content` | text | The broadcast message |
| `results` | jsonb | Per-platform success/failure object: `{"instagram": "ok", "twitter": "fail: rate limited"}` |
| `status` | text | `'queued'` / `'sent'` (all succeeded) / `'partial'` (some failed) / `'failed'` (all failed) |

**Connected to:** `social_accounts` (tokens used for posting).  
**Routes:** `/api/switchboard/broadcast`  
**RLS:** User reads their own broadcast history.

---

## Automated Triggers

| Trigger | Table | What it does |
|---|---|---|
| `on_auth_user_created` | `auth.users` | Creates a `profiles` row on every new signup |
| `trg_create_vault_account` | `profiles` | Creates a zero-balance `vault_accounts` row after profile insert |
| `trg_increment_scale_count` | `scale_joins` | Increments `scale_deals.current_count` and flips status to `'met'` when goal is reached |
| `set_updated_at` (9 tables) | Various | Stamps `updated_at = now()` on every row update |

---

## RLS Summary

| Access Pattern | Tables |
|---|---|
| **Private (own rows only)** | concierge_avatars, onboarding_state, vault_accounts, vault_transactions, subscriptions, media_assets, media_jobs, scrapbook_entries, bag_items, wardrobe_wishlist, carpe_diem_profiles, salon_bookings, social_accounts, social_broadcasts |
| **Public read, own write** | posts, post_likes, exchange_listings, wardrobe_looks, wardrobe_look_likes, scale_deals, embassy_deals, registry_items, outings |
| **VIP-gated read** | vip_posts, vip_exclusives |
| **Service role only** | vip_codes, backstage_sessions, stripe_events, integration_health, market_intelligence_cache, truth_checks |
| **Parties-only** | exchange_offers (buyer + seller only) |

---

## Encryption

All OAuth tokens and API credentials stored in the database are encrypted at rest using AES-256-GCM via `src/lib/crypto.ts`. The encryption key is `ENCRYPTION_KEY` in Vercel environment variables — never stored in the database.

Encrypted columns: `integrations.credentials_enc`, `integrations.oauth_token_enc`, `integrations.refresh_token_enc`, `social_accounts.access_token_enc`.
