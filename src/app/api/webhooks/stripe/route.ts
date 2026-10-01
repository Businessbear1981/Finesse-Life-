import {NextResponse, type NextRequest} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {stripe, STRIPE_WEBHOOK_SECRET} from '@/lib/stripe';
import {recordEvent} from '@/lib/revenue/events';

// Stripe webhook. Verifies signature, idempotency-checks against stripe_events,
// upserts the relevant subscription/payment rows. Service-role Supabase client
// is used so RLS doesn't block server-only writes.
//
// Wire your endpoint URL in Stripe Dashboard → Developers → Webhooks:
//   https://<your-domain>/api/webhooks/stripe
// Required events: customer.subscription.*, invoice.payment_*, payment_intent.*,
//                  product.*, price.*.

export const runtime = 'nodejs';   // Stripe SDK + raw body needs Node, not Edge

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {auth: {persistSession: false}},
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({error: 'missing signature'}, {status: 400});

  let event;
  try {
    const raw = await req.text();
    event = stripe().webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      {error: `signature verification failed: ${err instanceof Error ? err.message : err}`},
      {status: 400},
    );
  }

  // Idempotency — every Stripe event id is unique. If we've seen this id,
  // skip processing. The stripe_events table enforces uniqueness.
  const {error: dupeErr} = await admin
    .from('stripe_events')
    .insert({id: event.id, type: event.type, payload: event as never});
  if (dupeErr && dupeErr.code === '23505') {
    return NextResponse.json({received: true, deduped: true});
  }

  // Dispatch
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      // current_period_* moved onto the subscription item in newer Stripe
      // API versions. Read from the first item, falling back to legacy fields
      // for older webhook payloads.
      const item = sub.items.data[0];
      const periodStart = (item as unknown as {current_period_start?: number})?.current_period_start
        ?? (sub as unknown as {current_period_start?: number}).current_period_start;
      const periodEnd = (item as unknown as {current_period_end?: number})?.current_period_end
        ?? (sub as unknown as {current_period_end?: number}).current_period_end;

      await admin.from('subscriptions').upsert({
        id: sub.id,
        user_id: sub.metadata?.user_id ?? null,
        status: sub.status,
        price_id: item?.price.id,
        quantity: item?.quantity ?? 1,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        metadata: sub.metadata ?? {},
      });
      break;
    }
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await admin.from('payments').upsert({
        id: pi.id,
        user_id: pi.metadata?.user_id ?? null,
        amount: pi.amount,
        currency: pi.currency,
        status: pi.status,
        metadata: pi.metadata ?? {},
      });
      // Revenue ledger: only a processor-confirmed success is booked revenue.
      if (event.type === 'payment_intent.succeeded') {
        await recordEvent({
          eventType: pi.metadata?.event_type ?? 'payment.succeeded',
          idempotencyKey: `stripe:${event.id}`,
          traceId: pi.metadata?.trace_id ?? `stripe_${event.id}`,
          roomId: pi.metadata?.room_id ?? 'unattributed',
          track: pi.metadata?.track === 'carpe_diem' || pi.metadata?.track === 'finesse' ? pi.metadata.track : null,
          memberId: pi.metadata?.user_id ?? null,
          providerId: 'stripe',
          providerReceiptId: pi.id,
          amountMinor: pi.amount_received ?? pi.amount,
          currency: pi.currency.toUpperCase(),
          state: 'confirmed',
        });
      }
      break;
    }
    case 'charge.refunded': {
      // Reversal: append a refund row that references the original booked event.
      const ch = event.data.object;
      const piId = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id;
      if (piId) {
        const {data: original} = await admin
          .from('revenue_events')
          .select('id, room_id, track, member_id, event_type')
          .eq('provider_receipt_id', piId)
          .eq('state', 'confirmed')
          .maybeSingle();
        if (original) {
          await recordEvent({
            eventType: `${original.event_type}.refunded`,
            idempotencyKey: `stripe:${event.id}`,
            traceId: `stripe_${event.id}`,
            roomId: original.room_id,
            track: original.track,
            memberId: original.member_id,
            providerId: 'stripe',
            providerReceiptId: ch.id,
            amountMinor: -Math.abs(ch.amount_refunded),
            currency: ch.currency.toUpperCase(),
            state: 'refunded',
            reversesEventId: original.id,
          });
        }
      }
      break;
    }
    case 'product.created':
    case 'product.updated': {
      const p = event.data.object;
      await admin.from('products').upsert({
        id: p.id,
        name: p.name,
        description: p.description,
        active: p.active,
        metadata: p.metadata ?? {},
      });
      break;
    }
    case 'price.created':
    case 'price.updated': {
      const pr = event.data.object;
      await admin.from('prices').upsert({
        id: pr.id,
        product_id: typeof pr.product === 'string' ? pr.product : pr.product.id,
        active: pr.active,
        currency: pr.currency,
        unit_amount: pr.unit_amount,
        type: pr.type,
        recurring_interval: pr.recurring?.interval,
        metadata: pr.metadata ?? {},
      });
      break;
    }
    default:
      // Event we don't handle yet — already logged in stripe_events.
      break;
  }

  return NextResponse.json({received: true});
}
