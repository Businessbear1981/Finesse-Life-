import {beforeEach, describe, expect, it, vi} from 'vitest';
import type Stripe from 'stripe';

// Stripe + revenue ledger are mocked; the Supabase client is a recording fake (see fakeDb).
const stripeMock = {
  subscriptions: {retrieve: vi.fn(), list: vi.fn()},
  customers: {retrieve: vi.fn(), create: vi.fn(), del: vi.fn()},
  refunds: {create: vi.fn(), list: vi.fn()},
  invoicePayments: {list: vi.fn()},
  checkout: {sessions: {create: vi.fn()}},
  billingPortal: {sessions: {create: vi.fn()}},
};
vi.mock('@/lib/stripe', () => ({stripe: () => stripeMock}));
const recordEvent = vi.fn();
vi.mock('@/lib/revenue/events', () => ({recordEvent: (...a: unknown[]) => recordEvent(...a)}));

import {
  PAST_DUE_GRACE_DAYS, billingConfig, grantForSubscription, invoiceSubscriptionId, isLiveSubscriptionStatus,
  membershipReturnUrls, parseScaleMetadata, pickVipGrant, processStripeEvent, refundsToBook, routeStripeEvent,
  scaleReturnUrls, siteUrl, startMembershipCheckout, startScaleCheckout, stripeId, subscriptionPeriodEnd, subscriptionRow,
} from '@/lib/billing';

const UID = '3f2a9c1e-8b7d-4e6f-9a0b-1c2d3e4f5a6b';
const JOIN = '7d1e2f3a-4b5c-4d6e-8f90-a1b2c3d4e5f6';
const T = 1_790_000_000; // seconds
const DAY = 864e5;

// ── Stripe object fixtures (dahlia shapes) ───────────────────────────────────────────────
function subscription(over: Partial<Stripe.Subscription> & {periodEnd?: number} = {}): Stripe.Subscription {
  const {periodEnd = T, ...rest} = over;
  return {
    id: 'sub_1', object: 'subscription', status: 'active', customer: 'cus_1', cancel_at_period_end: false, cancel_at: null,
    metadata: {user_id: UID, kind: 'vip'},
    items: {object: 'list', has_more: false, url: '', data: [
      {id: 'si_1', object: 'subscription_item', current_period_end: periodEnd, current_period_start: periodEnd - 30 * 86400,
        price: {id: 'price_vip', object: 'price'}, quantity: 1} as unknown as Stripe.SubscriptionItem,
    ]},
    ...rest,
  } as unknown as Stripe.Subscription;
}
const event = (type: string, object: unknown, id = 'evt_1') =>
  ({id, type, object: 'event', data: {object}, created: T, livemode: false}) as unknown as Stripe.Event;
const checkoutSession = (over: Record<string, unknown>) =>
  ({id: 'cs_1', object: 'checkout.session', customer: 'cus_1', client_reference_id: UID, currency: 'usd', ...over}) as unknown as Stripe.Checkout.Session;
const invoice = (over: Record<string, unknown> = {}) => ({
  id: 'in_1', object: 'invoice', customer: 'cus_1', currency: 'usd', amount_paid: 2499, metadata: {},
  parent: {type: 'subscription_details', quote_details: null, subscription_details: {subscription: 'sub_1', metadata: {user_id: UID}}},
  ...over,
}) as unknown as Stripe.Invoice;

// ── Fake Supabase: records every call; responses decided per table / rpc ─────────────────
type Call = {table: string; ops: [string, unknown[]][]};
function fakeDb(respond: (c: Call) => {data?: unknown; error?: unknown} = () => ({data: null})) {
  const calls: Call[] = [];
  const rpcs: {name: string; args: Record<string, unknown>}[] = [];
  const rpcResult: Record<string, unknown> = {};
  const db = {
    from(table: string) {
      const call: Call = {table, ops: []};
      calls.push(call);
      const b: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle', 'single', 'upsert', 'update', 'insert']) {
        b[m] = (...args: unknown[]) => { call.ops.push([m, args]); return b; };
      }
      b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve({data: null, error: null, ...respond(call)}).then(res, rej);
      return b;
    },
    async rpc(name: string, args: Record<string, unknown>) {
      rpcs.push({name, args});
      return {data: rpcResult[name] ?? null, error: null};
    },
  };
  return {db: db as never, calls, rpcs, rpcResult};
}
const has = (c: Call, op: string, ...args: unknown[]) => c.ops.some(([m, a]) => m === op && JSON.stringify(a.slice(0, args.length)) === JSON.stringify(args));
/** billing_customers maps cus_1 → UID; everything else empty. */
const mapped = (c: Call) => (c.table === 'billing_customers' && has(c, 'eq', 'stripe_customer_id', 'cus_1') ? {data: {user_id: UID}} : {data: null});

beforeEach(() => {
  vi.clearAllMocks();
  recordEvent.mockResolvedValue({ok: true});
});

// ── Pure mapping ──────────────────────────────────────────────────────────────────────────
describe('subscription status → VIP grant', () => {
  const end = new Date(T * 1000);
  it('active and trialing grant until the period end', () => {
    expect(grantForSubscription('active', end)).toEqual({action: 'grant', expiresAt: end});
    expect(grantForSubscription('trialing', end)).toEqual({action: 'grant', expiresAt: end});
  });
  it('past_due keeps VIP for a 3-day grace after the period end', () => {
    const d = grantForSubscription('past_due', end);
    expect(d.action).toBe('grant');
    expect(d.action === 'grant' && d.expiresAt.getTime() - end.getTime()).toBe(PAST_DUE_GRACE_DAYS * DAY);
  });
  it('canceled / unpaid / incomplete_expired / incomplete / paused revoke', () => {
    for (const s of ['canceled', 'unpaid', 'incomplete_expired', 'incomplete', 'paused']) expect(grantForSubscription(s, end), s).toEqual({action: 'revoke'});
  });
  it('never grants open-ended: a live status without a period end is skipped', () => {
    expect(grantForSubscription('active', null).action).toBe('skip');
    expect(grantForSubscription('past_due', null).action).toBe('skip');
    expect(grantForSubscription('something_new', end).action).toBe('skip');
  });
  it('live statuses (409 on checkout) are active / trialing / past_due only', () => {
    expect(['active', 'trialing', 'past_due'].every(isLiveSubscriptionStatus)).toBe(true);
    expect(['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', null].some(isLiveSubscriptionStatus)).toBe(false);
  });
});

describe('Stripe object mapping', () => {
  it('period end comes from subscription items (dahlia), latest item wins', () => {
    const sub = subscription();
    (sub.items.data as unknown[]).push({id: 'si_2', current_period_end: T + 100});
    expect(subscriptionPeriodEnd(sub)).toEqual(new Date((T + 100) * 1000));
  });
  it('falls back to the legacy subscription-level field, else null', () => {
    expect(subscriptionPeriodEnd({items: {data: []}, current_period_end: T} as never)).toEqual(new Date(T * 1000));
    expect(subscriptionPeriodEnd({items: {data: []}} as never)).toBeNull();
  });
  it('subscription row mirrors the subscription', () => {
    const row = subscriptionRow(subscription({cancel_at_period_end: true}), UID);
    expect(row).toMatchObject({id: 'sub_1', user_id: UID, status: 'active', price_id: 'price_vip',
      current_period_end: new Date(T * 1000).toISOString(), cancel_at_period_end: true});
    expect(subscriptionRow(subscription({cancel_at: T} as never), UID).cancel_at_period_end).toBe(true);
  });
  it('invoice → subscription via parent.subscription_details (and legacy field)', () => {
    expect(invoiceSubscriptionId(invoice())).toBe('sub_1');
    expect(invoiceSubscriptionId(invoice({parent: null, subscription: 'sub_legacy'}))).toBe('sub_legacy');
    expect(invoiceSubscriptionId(invoice({parent: null}))).toBeNull();
  });
  it('stripeId accepts ids and expanded objects', () => {
    expect(stripeId('cus_1')).toBe('cus_1');
    expect(stripeId({id: 'cus_2'})).toBe('cus_2');
    expect(stripeId(null)).toBeNull();
  });
  it('Scale metadata must be ours: kind scale + uuids', () => {
    expect(parseScaleMetadata({kind: 'scale', join_id: JOIN, user_id: UID})).toEqual({joinId: JOIN, userId: UID});
    expect(parseScaleMetadata({kind: 'vip', join_id: JOIN, user_id: UID})).toBeNull();
    expect(parseScaleMetadata({kind: 'scale', join_id: 'x', user_id: UID})).toBeNull();
    expect(parseScaleMetadata(null)).toBeNull();
  });
  it('only succeeded refunds with an amount are booked', () => {
    const r = refundsToBook([
      {id: 're_1', amount: 500, currency: 'usd', status: 'succeeded'},
      {id: 're_2', amount: 500, currency: 'usd', status: 'pending'},
      {id: 're_3', amount: 0, currency: 'usd', status: 'succeeded'},
      {id: 're_4', amount: 300, currency: 'usd', status: 'failed'},
    ]);
    expect(r.map((x) => x.id)).toEqual(['re_1']);
  });
  it('VIP source: lifetime first, else latest expiry; revoked / expired ignored', () => {
    const now = new Date(T * 1000);
    const later = new Date((T + 86400) * 1000).toISOString();
    const latest = new Date((T + 9 * 86400) * 1000).toISOString();
    const past = new Date((T - 1) * 1000).toISOString();
    expect(pickVipGrant([{source: 'code', expires_at: later, revoked_at: null}, {source: 'subscription', expires_at: latest, revoked_at: null}], now)?.source).toBe('subscription');
    expect(pickVipGrant([{source: 'subscription', expires_at: latest, revoked_at: null}, {source: 'staff', expires_at: null, revoked_at: null}], now)?.source).toBe('staff');
    expect(pickVipGrant([{source: 'staff', expires_at: null, revoked_at: past}, {source: 'code', expires_at: past, revoked_at: null}], now)).toBeNull();
  });
});

describe('configuration and return URLs', () => {
  it('membership needs both the key and the price; Scale only the key', () => {
    expect(billingConfig({STRIPE_SECRET_KEY: 'sk_test_x'} as never)).toMatchObject({configured: false, stripeReady: true});
    expect(billingConfig({STRIPE_PRICE_VIP_MONTHLY: 'price_x'} as never)).toMatchObject({configured: false, stripeReady: false});
    expect(billingConfig({STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_VIP_MONTHLY: 'price_x'} as never)).toMatchObject({configured: true, priceId: 'price_x'});
  });
  it('site url from NEXT_PUBLIC_SITE_URL, trailing slash trimmed, default finesselife.vip', () => {
    expect(siteUrl({NEXT_PUBLIC_SITE_URL: 'https://preview.example.com/'} as never)).toBe('https://preview.example.com');
    expect(siteUrl({} as never)).toBe('https://finesselife.vip');
  });
  it('return URLs match the contract', () => {
    expect(membershipReturnUrls('https://s')).toEqual({success: 'https://s/account?billing=success', cancel: 'https://s/account?billing=cancelled'});
    expect(scaleReturnUrls('https://s', JOIN)).toEqual({success: `https://s/scale?paid=${JOIN}`, cancel: 'https://s/scale?paid=cancelled'});
  });
});

describe('event routing', () => {
  it('routes the handled events', () => {
    expect(routeStripeEvent('checkout.session.completed')).toBe('checkout_completed');
    expect(routeStripeEvent('checkout.session.async_payment_succeeded')).toBe('checkout_completed');
    for (const t of ['created', 'updated', 'deleted']) expect(routeStripeEvent(`customer.subscription.${t}`)).toBe('subscription_changed');
    expect(routeStripeEvent('invoice.paid')).toBe('invoice_paid');
    expect(routeStripeEvent('invoice.payment_failed')).toBe('invoice_payment_failed');
    expect(routeStripeEvent('charge.refunded')).toBe('charge_refunded');
  });
  it('ignores everything else (including the old product/price/payment_intent events)', () => {
    for (const t of ['product.created', 'price.updated', 'payment_intent.succeeded', 'customer.created', 'invoice.created']) expect(routeStripeEvent(t)).toBe('ignore');
  });
});

// ── Dispatch with mocked Stripe + fake DB ─────────────────────────────────────────────────
describe('processStripeEvent', () => {
  it('subscription events re-fetch the subscription (order-independent) and set the grant', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue(subscription({status: 'past_due'}));
    const {db, calls, rpcs} = fakeDb(mapped);
    // The event carries a stale 'active'; Stripe says past_due → grace expiry.
    const out = await processStripeEvent(db, event('customer.subscription.updated', subscription({status: 'active'})));
    expect(out.outcome).toBe('processed');
    expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith('sub_1');
    const up = calls.find((c) => c.table === 'billing_subscriptions' && c.ops[0][0] === 'upsert');
    expect((up!.ops[0][1][0] as {status: string}).status).toBe('past_due');
    expect(rpcs).toEqual([{name: 'set_subscription_grant', args: {
      p_user: UID, p_subscription_id: 'sub_1', p_active: true,
      p_expires_at: new Date(T * 1000 + PAST_DUE_GRACE_DAYS * DAY).toISOString(),
    }}]);
  });

  it('deleted subscription revokes the subscription grant', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue(subscription({status: 'canceled'}));
    const {db, rpcs} = fakeDb(mapped);
    await processStripeEvent(db, event('customer.subscription.deleted', subscription({status: 'canceled'})));
    expect(rpcs[0]).toEqual({name: 'set_subscription_grant', args: {p_user: UID, p_subscription_id: 'sub_1', p_expires_at: null, p_active: false}});
  });

  it('maps customer → member via billing_customers, never via event metadata when mapped', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue(subscription({metadata: {user_id: '11111111-1111-4111-8111-111111111111'}}));
    const {db, rpcs} = fakeDb(mapped);
    await processStripeEvent(db, event('customer.subscription.created', subscription()));
    expect(rpcs[0].args.p_user).toBe(UID);
  });

  it('unknown customer with no member link is ignored (no grant)', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue(subscription({customer: 'cus_unknown', metadata: {}}));
    stripeMock.customers.retrieve.mockResolvedValue({id: 'cus_unknown', metadata: {}});
    const {db, rpcs} = fakeDb();
    const out = await processStripeEvent(db, event('customer.subscription.created', subscription()));
    expect(out.outcome).toBe('ignored');
    expect(rpcs).toEqual([]);
  });

  it('subscription checkout links the customer from client_reference_id, then syncs', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue(subscription({customer: 'cus_new'}));
    // profiles lookup finds the member; billing_customers has no row for cus_new yet.
    const {db, calls, rpcs} = fakeDb((c) => (c.table === 'profiles' ? {data: {id: UID}} : {data: null}));
    await processStripeEvent(db, event('checkout.session.completed', checkoutSession({mode: 'subscription', customer: 'cus_new', subscription: 'sub_1'})));
    const link = calls.find((c) => c.table === 'billing_customers' && c.ops[0][0] === 'upsert');
    expect(link?.ops[0][1][0]).toEqual({user_id: UID, stripe_customer_id: 'cus_new'});
    expect(rpcs[0]).toMatchObject({name: 'set_subscription_grant', args: {p_user: UID, p_active: true}});
  });

  it('paid Scale checkout → scale_mark_paid with the PaymentIntent and one confirmed revenue row', async () => {
    const {db, rpcs, rpcResult} = fakeDb((c) => (c.table === 'scale_joins' ? {data: {user_id: UID, track: 'finesse'}} : mapped(c)));
    rpcResult.scale_mark_paid = 'paid';
    const meta = {kind: 'scale', join_id: JOIN, user_id: UID};
    await processStripeEvent(db, event('checkout.session.completed', checkoutSession({mode: 'payment', payment_status: 'paid', payment_intent: 'pi_1', amount_total: 15500, metadata: meta})));
    expect(rpcs).toEqual([{name: 'scale_mark_paid', args: {p_join: JOIN, p_payment_ref: 'pi_1'}}]);
    expect(recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'scale.payment', idempotencyKey: 'stripe:scale:pi_1', roomId: 'scale', track: 'finesse', memberId: UID,
      providerId: 'stripe', providerReceiptId: 'pi_1', amountMinor: 15500, currency: 'USD', state: 'confirmed',
    }));
  });

  it('unpaid (async) Scale checkout waits; nothing moves', async () => {
    const {db, rpcs} = fakeDb(mapped);
    const out = await processStripeEvent(db, event('checkout.session.completed', checkoutSession({mode: 'payment', payment_status: 'unpaid', payment_intent: 'pi_1', metadata: {kind: 'scale', join_id: JOIN, user_id: UID}})));
    expect(out.outcome).toBe('ignored');
    expect(rpcs).toEqual([]);
  });

  it('a payment for a pledge that is no longer payable is refunded, not booked', async () => {
    const {db, rpcResult} = fakeDb(mapped);
    rpcResult.scale_mark_paid = 'conflict';
    await processStripeEvent(db, event('checkout.session.completed', checkoutSession({mode: 'payment', payment_status: 'paid', payment_intent: 'pi_dup', amount_total: 15500, metadata: {kind: 'scale', join_id: JOIN, user_id: UID}})));
    expect(stripeMock.refunds.create).toHaveBeenCalledWith(expect.objectContaining({payment_intent: 'pi_dup'}), {idempotencyKey: 'finesse-scale-refund:pi_dup'});
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('invoice.paid books subscription revenue once per invoice (idempotency key = invoice id)', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue(subscription());
    const {db} = fakeDb(mapped);
    await processStripeEvent(db, event('invoice.paid', invoice()));
    expect(recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'vip.subscription_payment', idempotencyKey: 'stripe:invoice:in_1', roomId: 'vip-room', memberId: UID,
      providerReceiptId: 'in_1', amountMinor: 2499, currency: 'USD', state: 'confirmed',
    }));
  });

  it('$0 invoices (trials) book nothing; payment_failed books nothing but re-syncs', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue(subscription({status: 'past_due'}));
    const {db, rpcs} = fakeDb(mapped);
    await processStripeEvent(db, event('invoice.paid', invoice({amount_paid: 0})));
    await processStripeEvent(db, event('invoice.payment_failed', invoice()));
    expect(recordEvent).not.toHaveBeenCalled();
    expect(rpcs.map((r) => r.name)).toEqual(['set_subscription_grant', 'set_subscription_grant']);
  });

  it('a revenue write failure throws (webhook answers 500, Stripe retries)', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue(subscription());
    recordEvent.mockResolvedValue({ok: false, error: 'ledger unavailable'});
    const {db} = fakeDb(mapped);
    await expect(processStripeEvent(db, event('invoice.paid', invoice()))).rejects.toThrow(/revenue_events/);
  });

  it('charge.refunded: Scale pledge → refunded and one reversal per refund, referencing the original', async () => {
    const original = {id: '9b1f0c3e-0000-4000-8000-000000000001', event_type: 'scale.payment', room_id: 'scale', track: 'finesse', member_id: UID};
    const {db, rpcs, rpcResult} = fakeDb((c) => (c.table === 'revenue_events' ? {data: [original]} : {data: null}));
    rpcResult.scale_mark_refunded = 1;
    stripeMock.refunds.list.mockResolvedValue({data: [
      {id: 're_1', amount: 15500, currency: 'usd', status: 'succeeded'},
      {id: 're_2', amount: 100, currency: 'usd', status: 'failed'},
    ]});
    const ch = {id: 'ch_1', object: 'charge', payment_intent: 'pi_1', refunded: true, amount_refunded: 15500, currency: 'usd'};
    await processStripeEvent(db, event('charge.refunded', ch));
    expect(rpcs).toEqual([{name: 'scale_mark_refunded', args: {p_payment_ref: 'pi_1'}}]);
    expect(recordEvent).toHaveBeenCalledTimes(1);
    expect(recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'scale.payment.refunded', idempotencyKey: 'stripe:refund:re_1', amountMinor: -15500,
      state: 'refunded', reversesEventId: original.id, providerReceiptId: 're_1', memberId: UID,
    }));
  });

  it('partial refund: pledge stays paid; subscription refund found through the invoice payment', async () => {
    const original = {id: '9b1f0c3e-0000-4000-8000-000000000002', event_type: 'vip.subscription_payment', room_id: 'vip-room', track: null, member_id: UID};
    const {db, rpcs} = fakeDb((c) => (c.table === 'revenue_events' && has(c, 'in', 'provider_receipt_id', ['in_1']) ? {data: [original]} : {data: []}));
    stripeMock.invoicePayments.list.mockResolvedValue({data: [{invoice: 'in_1'}]});
    stripeMock.refunds.list.mockResolvedValue({data: [{id: 're_9', amount: 1000, currency: 'usd', status: 'succeeded'}]});
    await processStripeEvent(db, event('charge.refunded', {id: 'ch_2', payment_intent: 'pi_sub', refunded: false, amount_refunded: 1000, currency: 'usd'}));
    expect(rpcs).toEqual([]);
    expect(stripeMock.invoicePayments.list).toHaveBeenCalledWith({payment: {type: 'payment_intent', payment_intent: 'pi_sub'}, limit: 1});
    expect(recordEvent).toHaveBeenCalledWith(expect.objectContaining({eventType: 'vip.subscription_payment.refunded', amountMinor: -1000, reversesEventId: original.id}));
  });

  it('unknown events are ignored without touching anything', async () => {
    const {db, calls, rpcs} = fakeDb();
    expect((await processStripeEvent(db, event('customer.created', {id: 'cus_1'}))).outcome).toBe('ignored');
    expect(calls).toEqual([]);
    expect(rpcs).toEqual([]);
  });
});

// ── Checkout ──────────────────────────────────────────────────────────────────────────────
describe('checkout', () => {
  const cfg = {configured: true, stripeReady: true, priceId: 'price_vip', siteUrl: 'https://s', hasServiceRole: true};

  it('membership: reuses the stored customer, session carries user + promotion codes + idempotency key', async () => {
    const {db} = fakeDb((c) => (c.table === 'billing_customers' ? {data: {stripe_customer_id: 'cus_1'}} : {data: []}));
    stripeMock.subscriptions.list.mockResolvedValue({data: [{id: 'sub_old', status: 'canceled'}]});
    stripeMock.checkout.sessions.create.mockResolvedValue({url: 'https://checkout.stripe.com/x'});
    const res = await startMembershipCheckout(db, {userId: UID, email: 'm@x.com'}, cfg);
    expect(res).toEqual({url: 'https://checkout.stripe.com/x'});
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
    const [params, opts] = stripeMock.checkout.sessions.create.mock.calls[0];
    expect(params).toMatchObject({mode: 'subscription', customer: 'cus_1', client_reference_id: UID, allow_promotion_codes: true,
      line_items: [{price: 'price_vip', quantity: 1}], metadata: {user_id: UID}, subscription_data: {metadata: {user_id: UID}},
      success_url: 'https://s/account?billing=success', cancel_url: 'https://s/account?billing=cancelled'});
    expect(opts.idempotencyKey).toMatch(new RegExp(`^finesse-vip-checkout:${UID}:`));
  });

  it('membership: 409 when a live subscription exists (local copy)', async () => {
    const {db} = fakeDb((c) => (c.table === 'billing_subscriptions' ? {data: [{id: 'sub_1'}]} : {data: null}));
    expect(await startMembershipCheckout(db, {userId: UID, email: null}, cfg)).toEqual({error: 'already_subscribed'});
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('membership: 409 when Stripe has a live subscription the webhook has not delivered yet', async () => {
    const {db} = fakeDb((c) => (c.table === 'billing_customers' ? {data: {stripe_customer_id: 'cus_1', user_id: UID}} : {data: []}));
    stripeMock.subscriptions.list.mockResolvedValue({data: [subscription({status: 'trialing'})]});
    stripeMock.subscriptions.retrieve.mockResolvedValue(subscription({status: 'trialing'}));
    expect(await startMembershipCheckout(db, {userId: UID, email: null}, cfg)).toEqual({error: 'already_subscribed'});
  });

  it('membership: creates the customer once (idempotency key per member) with metadata.user_id', async () => {
    let stored: string | null = null;
    const {db} = fakeDb((c) => {
      if (c.table === 'billing_customers' && c.ops[0][0] === 'upsert') { stored = 'cus_new'; return {data: null}; }
      if (c.table === 'billing_customers') return {data: stored ? {stripe_customer_id: stored} : null};
      return {data: []};
    });
    stripeMock.customers.create.mockResolvedValue({id: 'cus_new'});
    stripeMock.checkout.sessions.create.mockResolvedValue({url: 'https://checkout.stripe.com/y'});
    await startMembershipCheckout(db, {userId: UID, email: 'm@x.com'}, cfg);
    expect(stripeMock.customers.create).toHaveBeenCalledWith({email: 'm@x.com', metadata: {user_id: UID}}, {idempotencyKey: `finesse-customer:${UID}`});
    expect(stripeMock.checkout.sessions.create.mock.calls[0][0].customer).toBe('cus_new');
  });

  it('Scale: only the caller’s own payment_requested pledge; amount from the deal', async () => {
    const member = (state: string) => fakeDb((c) => (c.table === 'scale_joins'
      ? {data: {id: JOIN, user_id: UID, state, deal: {title: 'Santal 33', brand: 'Le Labo', group_price_cents: 15500}}} : {data: null}));
    const svc = fakeDb(() => ({data: {stripe_customer_id: 'cus_1'}}));
    expect(await startScaleCheckout(member('goal_met').db, svc.db, {userId: UID, email: null}, JOIN, cfg)).toEqual({error: 'not_payable', state: 'goal_met'});
    expect(await startScaleCheckout(fakeDb().db, svc.db, {userId: UID, email: null}, JOIN, cfg)).toEqual({error: 'not_found'});
    expect(await startScaleCheckout(member('payment_requested').db, svc.db, {userId: UID, email: null}, 'not-a-uuid', cfg)).toEqual({error: 'not_found'});

    stripeMock.checkout.sessions.create.mockResolvedValue({url: 'https://checkout.stripe.com/z'});
    const m = member('payment_requested');
    expect(await startScaleCheckout(m.db, svc.db, {userId: UID, email: null}, JOIN, cfg)).toEqual({url: 'https://checkout.stripe.com/z'});
    expect(has(m.calls[0], 'eq', 'user_id', UID)).toBe(true);
    const [params] = stripeMock.checkout.sessions.create.mock.calls[0];
    const meta = {join_id: JOIN, user_id: UID, kind: 'scale'};
    expect(params).toMatchObject({mode: 'payment', customer: 'cus_1', metadata: meta, payment_intent_data: {metadata: meta},
      line_items: [{quantity: 1, price_data: {currency: 'usd', unit_amount: 15500}}],
      success_url: `https://s/scale?paid=${JOIN}`, cancel_url: 'https://s/scale?paid=cancelled'});
  });
});
