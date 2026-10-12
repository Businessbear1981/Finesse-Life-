// Stripe — server-side only. Lazy init so missing env vars during build don't crash the bundler.
// Spec: docs/PAYMENTS.md. Env is read at call time (not module load) so tests and preview
// deployments see the current values.

import Stripe from 'stripe';

let _stripe: Stripe | null = null;
let _key: string | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  if (_stripe && _key === key) return _stripe;
  // The SDK pins its own API version (stripe@22 → 2026-05-27.dahlia), which is what the types
  // describe: current_period_end lives on subscription items, invoice → subscription is
  // invoice.parent.subscription_details. Webhook handlers re-fetch objects with this client, so
  // the Dashboard endpoint's API version does not change what the handlers read.
  _stripe = new Stripe(key, {maxNetworkRetries: 2, appInfo: {name: 'finesselife'}});
  _key = key;
  return _stripe;
}

/** STRIPE_SECRET_KEY is set (membership also needs STRIPE_PRICE_VIP_MONTHLY — see billingConfig). */
export function hasStripeKey(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET ?? '';
}

/** @deprecated read at module load; use stripeWebhookSecret(). */
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export type {Stripe};
