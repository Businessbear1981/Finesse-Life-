# Finesse — Payments (Stripe)

> **Status:** BUILDING on `sean/stripe-payments` (2026-10-12). Processor: **Stripe** (founder decision — Stripe account application in progress). Everything is built against Stripe **test mode**; going live is configuration only.
> **Rules:** AGENTS.md — Finesse never holds member funds (no Vault top-ups through Stripe; Vault stays frozen until the card partner signs, ADR-0002/0005). Entitlements are server-managed (ADR-0004): only the service role / webhook grants VIP.

## What Stripe is used for

| Flow | Stripe object | Grants |
|---|---|---|
| **VIP membership** — $24.99 / month (price already shown in the app) | Checkout Session `mode: subscription` + Customer Portal | VIP while the subscription is `active`/`trialing` (+ `past_due` grace 3 days) |
| **Scale group buy** — pay only after the group's goal is met | Checkout Session `mode: payment` for one `scale_joins` row in `payment_requested` | Pledge → `paid` (processor actor) with `payment_ref` = PaymentIntent id |
| Vault funding | **not used** | frozen |

Mobile (App Store 3.1.1): digital membership is **not** sold inside the iOS/Android app in this build. The app shows membership status and, on web only, the subscribe button. Scale group buys are physical goods, so Stripe checkout from the app is allowed (opens the hosted Checkout URL in the browser).

## Environment

| Var | Use |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` now, `sk_live_…` at launch |
| `STRIPE_WEBHOOK_SECRET` | signing secret for `/api/webhooks/stripe` |
| `STRIPE_PRICE_VIP_MONTHLY` | Price id of the $24.99/month VIP price |
| `NEXT_PUBLIC_SITE_URL` | success/cancel URLs (`https://finesselife.vip`) |

If `STRIPE_SECRET_KEY` or `STRIPE_PRICE_VIP_MONTHLY` is missing, billing routes answer **503 `{error:'billing_not_configured'}`** and the UI says membership isn't on sale yet. Nothing fakes a purchase.

## Data model (migration `20261013_stripe_billing.sql`)

- `billing_customers(user_id pk → profiles, stripe_customer_id unique, created_at)` — service-role write, owner read.
- `billing_subscriptions(id text pk = Stripe sub id, user_id, status, price_id, current_period_end, cancel_at_period_end, updated_at, raw jsonb)` — service-role write, owner read.
- `vip_grants(id, user_id, source 'code'|'subscription'|'staff', source_ref text, expires_at timestamptz null = lifetime, created_at, revoked_at)` — the **only** inputs to VIP. `recompute_vip(user)` (security definer, service role) sets `profiles.is_vip/vip_expires_at` from active grants (lifetime wins, else max expiry). `redeem_vip_code` (20261009) is redefined to write a `code` grant and call `recompute_vip`. Existing VIP members are backfilled as one `staff` grant from their current profile values so nobody loses access.
- `stripe_events(id pk, type, data jsonb, received_at, processed_at)` — fixes the old `payload` column bug; idempotency by `id`.
- Scale: `scale_joins.payment_ref` already exists; the webhook sets state `paid` with `finesse.actor = 'processor'`.

## API contract

All routes: signed-in member via cookie or mobile bearer (`createClient` in `src/lib/supabase/server.ts`); JSON.

| Route | Request | Responses |
|---|---|---|
| `GET /api/billing/status` | — | 200 `{configured, priceDisplay: '$24.99 / month' \| null, vip: {active, source: 'code'\|'subscription'\|'staff'\|null, expiresAt \| null}, subscription: {status, currentPeriodEnd, cancelAtPeriodEnd} \| null}` · 401 |
| `POST /api/billing/checkout` | `{plan: 'vip_monthly'}` | 200 `{url}` (Stripe-hosted) · 401 · 409 `{error:'already_subscribed'}` · 503 `{error:'billing_not_configured'}` |
| `POST /api/billing/portal` | — | 200 `{url}` · 401 · 404 `{error:'no_billing_account'}` · 503 |
| `POST /api/scale/pledges/[id]/pay` | — | 200 `{url}` · 401 · 404 · 409 `{error:'not_payable', state}` (only `payment_requested` is payable) · 503 |
| `POST /api/scale/deals/[id]/request-payment` | — (staff: `profiles.role` admin/owner) | 200 `{requested, groupPriceCents}` — moves every `goal_met` pledge to `payment_requested` once the partner confirms the group price · 403 · 404 · 409 `{error:'goal_not_met'}` |
| `POST /api/webhooks/stripe` | Stripe | signature-verified; 200 on processed or duplicate |

Also: Stripe errors → 502 `{error:'billing_unavailable'}`; bad body → 400. Account deletion closes the member's Stripe customer first (cancelling the subscription); if that fails, nothing is deleted.

Success/cancel return URLs: membership → `/account?billing=success|cancelled`; Scale → `/scale?paid=<joinId>|cancelled`.

## Webhook events handled

`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`. The webhook answers 503 when billing isn't configured and 500 when a handler fails, so Stripe retries; duplicates return 200. A Scale payment that arrives for a pledge that is no longer payable is refunded automatically. Subscriptions update `billing_subscriptions` and the member's `subscription` VIP grant, then `recompute_vip`. Paid invoices and Scale payments append `revenue_events` (confirmed); refunds append reversals and move Scale pledges to `refunded`.

## Go-live checklist

1. Stripe approves the account → create Product "Finesse VIP" + recurring Price $24.99/month (USD) → set `STRIPE_PRICE_VIP_MONTHLY`.
2. Add webhook endpoint `https://finesselife.vip/api/webhooks/stripe` with the events above → set `STRIPE_WEBHOOK_SECRET`.
3. Enable the Customer Portal (cancel + update payment method).
4. Apply `20261013_stripe_billing.sql` (after 20261009, 20261012_*).
5. Test with `sk_test_` keys and Stripe test cards end-to-end, then switch keys.
