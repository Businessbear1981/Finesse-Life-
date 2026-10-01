---
name: finesse-revenue-events
description: Use whenever code records money, commissions, payments, refunds, cashback, Vault balance, Scale pledges, affiliate clicks or VIP subscriptions in Finesse Life. Prevents views, pledges and recommendations from being counted as revenue.
---

# Finesse revenue events

1. Write commercial and engagement events only through `recordEvent` / `recordEngagement` in `src/lib/revenue/events.ts` (table `revenue_events`, append-only, DB-enforced).
2. States `impression | intent | outbound_click | quote | hold | authorized` carry **no amount**. Only `confirmed | settled | reversed | refunded` may, and only with `providerId` + `providerReceiptId` from a verified webhook.
3. Refunds and reversals are new rows referencing `reversesEventId`; never update or delete.
4. Every event has an `idempotencyKey` derived from the provider event id (e.g. `stripe:<evt_id>`).
5. Scale: model `pledged → goal_met → payment_requested → paid → fulfilled → refunded`; a pledge is not revenue and never triggers a charge until goal + processor are live.
6. Vault: writes are frozen (`src/lib/vault-guard.ts`) until the rate, funding source and card partner are signed off. Never pick a rate silently; never let a member-supplied amount mint balance.
7. VIP lift entries (`vip.penthouse_entered`, `vip.keylock_verified`) are access events, never a subscription or purchase.
