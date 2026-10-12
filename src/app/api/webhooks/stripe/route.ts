import {NextResponse, type NextRequest} from 'next/server';
import type Stripe from 'stripe';
import {stripe, stripeWebhookSecret} from '@/lib/stripe';
import {billingConfig, processStripeEvent, routeStripeEvent} from '@/lib/billing';
import {createServiceClient} from '@/lib/supabase/service';

// POST /api/webhooks/stripe — docs/PAYMENTS.md.
//   1. Verify the signature against the RAW body (400 if missing / invalid).
//   2. Idempotency: insert the event id into stripe_events (on conflict do nothing). An id that
//      was already processed answers 200 {duplicate:true}; one that failed mid-way is retried.
//   3. Dispatch (src/lib/billing.ts). Handlers re-fetch subscriptions from Stripe and use
//      idempotency keys / state checks, so replays and out-of-order delivery are safe.
//   4. Mark processed_at. A handler failure answers 500 so Stripe retries the event.
// Dashboard events: checkout.session.completed, checkout.session.async_payment_succeeded,
// customer.subscription.created|updated|deleted, invoice.paid, invoice.payment_failed,
// charge.refunded. Anything else → 200 {ignored:true}.

export const runtime = 'nodejs';

const reply = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {status, headers: {'Cache-Control': 'no-store'}});

export async function POST(req: NextRequest) {
  const secret = stripeWebhookSecret();
  const cfg = billingConfig();
  if (!secret || !cfg.stripeReady || !cfg.hasServiceRole) return reply({error: 'billing_not_configured'}, 503);

  const sig = req.headers.get('stripe-signature');
  if (!sig) return reply({error: 'missing_signature'}, 400);

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return reply({error: 'invalid_signature'}, 400);
  }

  const db = createServiceClient();
  const ins = await db.from('stripe_events')
    .upsert({id: event.id, type: event.type, data: event as unknown as Record<string, unknown>}, {onConflict: 'id', ignoreDuplicates: true})
    .select('id');
  if (ins.error) {
    console.error('[stripe-webhook] stripe_events insert failed', ins.error.message, event.id);
    return reply({error: 'storage_unavailable'}, 500);
  }
  if ((ins.data ?? []).length === 0) {
    const seen = await db.from('stripe_events').select('processed_at').eq('id', event.id).maybeSingle();
    if (seen.error) return reply({error: 'storage_unavailable'}, 500);
    if (seen.data?.processed_at) return reply({received: true, duplicate: true});
    // Seen before but never finished: process again (handlers are idempotent).
  }

  if (routeStripeEvent(event.type) === 'ignore') {
    await db.from('stripe_events').update({processed_at: new Date().toISOString()}).eq('id', event.id);
    return reply({received: true, ignored: true});
  }

  let outcome;
  try {
    outcome = await processStripeEvent(db, event);
  } catch (e) {
    console.error('[stripe-webhook] processing failed', event.type, event.id, (e as Error).message);
    return reply({error: 'processing_failed'}, 500);
  }

  const done = await db.from('stripe_events').update({processed_at: new Date().toISOString()}).eq('id', event.id);
  if (done.error) console.warn('[stripe-webhook] processed_at not recorded', event.id, done.error.message);
  if (outcome.outcome === 'ignored') console.info('[stripe-webhook] ignored', event.type, event.id, outcome.detail);
  return reply({received: true, ...(outcome.outcome === 'ignored' ? {ignored: true} : {})});
}
