/**
 * Stripe billing — VIP membership subscriptions and Scale group-buy payments.
 * Spec + API contract: docs/PAYMENTS.md. Schema: supabase/migrations/20261013_stripe_billing.sql.
 *
 * Rules (ADR-0004): VIP is only ever granted through vip_grants + recompute_vip, written with the
 * service role from verified Stripe events. The member is always the signed-in session user or
 * the user mapped from the Stripe customer (billing_customers) — never an id sent by a client.
 * Finesse never holds member funds: no balances, no top-ups; a duplicate Scale payment is refunded.
 *
 * SERVER-ONLY. The top half is pure (unit-tested in tests/billing.test.ts); the bottom half talks
 * to Stripe and Supabase.
 */
import {randomUUID} from 'node:crypto';
import type Stripe from 'stripe';
import {stripe} from '@/lib/stripe';
import {recordEvent} from '@/lib/revenue/events';
import type {createServiceClient} from '@/lib/supabase/service';
import type {createClient} from '@/lib/supabase/server';

// ── Configuration ─────────────────────────────────────────────────────────────────────────

export const VIP_PLAN = 'vip_monthly' as const;
export const VIP_PRICE_DISPLAY = '$24.99 / month';
export const PAST_DUE_GRACE_DAYS = 3;
export const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'] as const;
export const VIP_ROOM_ID = 'vip-room';
export const SCALE_ROOM_ID = 'scale';
export const DEFAULT_SITE_URL = 'https://finesselife.vip';

export type BillingConfig = {
  /** Membership can be sold: STRIPE_SECRET_KEY and STRIPE_PRICE_VIP_MONTHLY are set. */
  configured: boolean;
  /** Stripe calls are possible at all (Scale checkout only needs the key). */
  stripeReady: boolean;
  priceId: string | null;
  siteUrl: string;
  hasServiceRole: boolean;
};

export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.NEXT_PUBLIC_SITE_URL ?? '').trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, '');
}

export function billingConfig(env: NodeJS.ProcessEnv = process.env): BillingConfig {
  const key = Boolean(env.STRIPE_SECRET_KEY);
  const priceId = env.STRIPE_PRICE_VIP_MONTHLY?.trim() || null;
  return {
    configured: key && priceId !== null,
    stripeReady: key,
    priceId,
    siteUrl: siteUrl(env),
    hasServiceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_URL),
  };
}

export const membershipReturnUrls = (site: string) => ({
  success: `${site}/account?billing=success`,
  cancel: `${site}/account?billing=cancelled`,
});

export const scaleReturnUrls = (site: string, joinId: string) => ({
  success: `${site}/scale?paid=${encodeURIComponent(joinId)}`,
  cancel: `${site}/scale?paid=cancelled`,
});

// ── Pure mapping logic ────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/** Stripe fields are either an id or an expanded object. */
export function stripeId(v: string | {id: string} | null | undefined): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : v.id ?? null;
}

export function isLiveSubscriptionStatus(status: string | null | undefined): boolean {
  return (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status ?? '');
}

/**
 * The paid-through date. Newer API versions (dahlia) carry current_period_end on each
 * subscription item; older payloads carried it on the subscription. Latest item wins.
 */
export function subscriptionPeriodEnd(sub: Pick<Stripe.Subscription, 'items'> & {current_period_end?: number | null}): Date | null {
  const ends = (sub.items?.data ?? [])
    .map((i) => (i as {current_period_end?: number | null}).current_period_end)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const legacy = sub.current_period_end;
  if (ends.length === 0 && typeof legacy === 'number' && legacy > 0) ends.push(legacy);
  return ends.length ? new Date(Math.max(...ends) * 1000) : null;
}

export type GrantDecision =
  | {action: 'grant'; expiresAt: Date}
  | {action: 'revoke'}
  | {action: 'skip'; reason: string};

/**
 * Stripe subscription status → the member's `subscription` VIP grant.
 *   active / trialing        → VIP until current_period_end
 *   past_due                 → VIP until current_period_end + 3 days (grace)
 *   canceled / unpaid / incomplete_expired → revoke
 *   incomplete (first payment not made) / paused → revoke (never paid / not paying)
 * A live status without a period end is skipped rather than granted open-ended.
 */
export function grantForSubscription(status: string, periodEnd: Date | null): GrantDecision {
  switch (status) {
    case 'active':
    case 'trialing':
      return periodEnd ? {action: 'grant', expiresAt: periodEnd} : {action: 'skip', reason: 'no_period_end'};
    case 'past_due':
      return periodEnd
        ? {action: 'grant', expiresAt: new Date(periodEnd.getTime() + PAST_DUE_GRACE_DAYS * 864e5)}
        : {action: 'skip', reason: 'no_period_end'};
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
    case 'incomplete':
    case 'paused':
      return {action: 'revoke'};
    default:
      return {action: 'skip', reason: `unknown_status:${status}`};
  }
}

export type BillingRoute =
  | 'checkout_completed'
  | 'subscription_changed'
  | 'invoice_paid'
  | 'invoice_payment_failed'
  | 'charge_refunded'
  | 'ignore';

/** Webhook event type → handler. Anything unlisted is acknowledged and ignored. */
export function routeStripeEvent(type: string): BillingRoute {
  switch (type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return 'checkout_completed';
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return 'subscription_changed';
    case 'invoice.paid':
      return 'invoice_paid';
    case 'invoice.payment_failed':
      return 'invoice_payment_failed';
    case 'charge.refunded':
      return 'charge_refunded';
    default:
      return 'ignore';
  }
}

/** dahlia: invoice → subscription lives at invoice.parent.subscription_details.subscription. */
export function invoiceSubscriptionId(inv: Pick<Stripe.Invoice, 'parent'> & {subscription?: string | {id: string} | null}): string | null {
  return stripeId(inv.parent?.subscription_details?.subscription ?? null) ?? stripeId(inv.subscription ?? null);
}

export function invoiceMetadataUserId(inv: Pick<Stripe.Invoice, 'parent' | 'metadata'>): string | null {
  const v = inv.parent?.subscription_details?.metadata?.user_id ?? inv.metadata?.user_id;
  return isUuid(v) ? v : null;
}

export type ScaleMetadata = {joinId: string; userId: string};

/** Our own Scale checkout metadata {kind:'scale', join_id, user_id}; anything else → null. */
export function parseScaleMetadata(meta: Record<string, string> | null | undefined): ScaleMetadata | null {
  if (!meta || meta.kind !== 'scale') return null;
  if (!isUuid(meta.join_id) || !isUuid(meta.user_id)) return null;
  return {joinId: meta.join_id, userId: meta.user_id};
}

export type GrantRow = {source: 'code' | 'subscription' | 'staff'; expires_at: string | null; revoked_at: string | null};

/** Which active grant decides the member's VIP (same order as recompute_vip). */
export function pickVipGrant(grants: GrantRow[], now: Date = new Date()): GrantRow | null {
  const active = grants.filter((g) => !g.revoked_at && (g.expires_at === null || new Date(g.expires_at) > now));
  if (active.length === 0) return null;
  return active.find((g) => g.expires_at === null)
    ?? active.reduce((a, b) => (new Date(b.expires_at!) > new Date(a.expires_at!) ? b : a));
}

/** Refunds that moved money back to the member (booked once each, by refund id). */
export function refundsToBook(refunds: Pick<Stripe.Refund, 'id' | 'amount' | 'currency' | 'status'>[]) {
  return refunds.filter((r) => r.status === 'succeeded' && r.amount > 0);
}

export function revenueTrack(v: unknown): 'finesse' | 'carpe_diem' | null {
  return v === 'finesse' || v === 'carpe_diem' ? v : null;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** billing_subscriptions row from a (re-fetched) Stripe subscription. */
export function subscriptionRow(sub: Stripe.Subscription, userId: string) {
  return {
    id: sub.id,
    user_id: userId,
    status: sub.status,
    price_id: sub.items?.data?.[0]?.price?.id ?? null,
    current_period_end: iso(subscriptionPeriodEnd(sub)),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    updated_at: new Date().toISOString(),
    raw: sub as unknown as Record<string, unknown>,
  };
}

// ── Server: Stripe + Supabase ─────────────────────────────────────────────────────────────

type ServiceDb = ReturnType<typeof createServiceClient>;
type MemberDb = Awaited<ReturnType<typeof createClient>>;

export class BillingError extends Error {}

function fail(what: string, error: {message?: string} | null | undefined): never {
  throw new BillingError(`${what}: ${error?.message ?? 'unknown error'}`);
}

const isMissingResource = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as {code?: string}).code === 'resource_missing';

/** The member's Stripe customer, created once (idempotency key per member) and stored. */
export async function getOrCreateCustomer(db: ServiceDb, userId: string, email: string | null): Promise<string> {
  const existing = await db.from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
  if (existing.error) fail('billing_customers read', existing.error);
  if (existing.data?.stripe_customer_id) return existing.data.stripe_customer_id as string;

  const customer = await stripe().customers.create(
    {...(email ? {email} : {}), metadata: {user_id: userId}},
    {idempotencyKey: `finesse-customer:${userId}`},
  );
  const ins = await db.from('billing_customers')
    .upsert({user_id: userId, stripe_customer_id: customer.id}, {onConflict: 'user_id', ignoreDuplicates: true});
  if (ins.error) fail('billing_customers insert', ins.error);
  // A concurrent request may have won the insert — the stored row is the truth.
  const stored = await db.from('billing_customers').select('stripe_customer_id').eq('user_id', userId).single();
  if (stored.error) fail('billing_customers read-back', stored.error);
  return stored.data.stripe_customer_id as string;
}

/**
 * Stripe customer → member. billing_customers first; then the fallback id (our own checkout
 * metadata / client_reference_id) or the customer's metadata.user_id, if that member exists —
 * in which case the link is stored. Returns null when the customer belongs to no member.
 */
export async function resolveUserId(db: ServiceDb, customerId: string | null, fallbackUserId: string | null): Promise<string | null> {
  if (customerId) {
    const row = await db.from('billing_customers').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
    if (row.error) fail('billing_customers lookup', row.error);
    if (row.data?.user_id) return row.data.user_id as string;
  }
  let candidate = isUuid(fallbackUserId) ? fallbackUserId : null;
  if (!candidate && customerId) {
    try {
      const c = await stripe().customers.retrieve(customerId);
      if (!('deleted' in c && c.deleted) && isUuid((c as Stripe.Customer).metadata?.user_id)) candidate = (c as Stripe.Customer).metadata.user_id;
    } catch (e) {
      if (!isMissingResource(e)) throw e;
    }
  }
  if (!candidate) return null;
  const prof = await db.from('profiles').select('id').eq('id', candidate).maybeSingle();
  if (prof.error) fail('profiles lookup', prof.error);
  if (!prof.data) return null;
  if (customerId) {
    const link = await db.from('billing_customers')
      .upsert({user_id: candidate, stripe_customer_id: customerId}, {onConflict: 'user_id', ignoreDuplicates: true});
    if (link.error && link.error.code !== '23505') fail('billing_customers link', link.error);
  }
  return candidate;
}

/**
 * Re-fetch the subscription from Stripe (order-independent: whatever event arrives, the latest
 * truth is applied), store it, and set / revoke the member's subscription grant.
 */
export async function syncSubscription(
  db: ServiceDb, subscriptionId: string, hintUserId: string | null, fallback?: Stripe.Subscription,
): Promise<{userId: string | null; status: string | null; decision: GrantDecision | null}> {
  let sub: Stripe.Subscription;
  try {
    sub = await stripe().subscriptions.retrieve(subscriptionId);
  } catch (e) {
    if (!(isMissingResource(e) && fallback)) throw e;
    sub = fallback;
  }
  const metaUser = isUuid(sub.metadata?.user_id) ? sub.metadata.user_id : null;
  const userId = await resolveUserId(db, stripeId(sub.customer), hintUserId ?? metaUser);
  if (!userId) return {userId: null, status: sub.status, decision: null};

  const up = await db.from('billing_subscriptions').upsert(subscriptionRow(sub, userId), {onConflict: 'id'});
  if (up.error) fail('billing_subscriptions upsert', up.error);

  const decision = grantForSubscription(sub.status, subscriptionPeriodEnd(sub));
  if (decision.action !== 'skip') {
    const g = await db.rpc('set_subscription_grant', {
      p_user: userId,
      p_subscription_id: sub.id,
      p_expires_at: decision.action === 'grant' ? decision.expiresAt.toISOString() : null,
      p_active: decision.action === 'grant',
    });
    if (g.error) fail('set_subscription_grant', g.error);
  } else {
    console.warn('[billing] subscription grant skipped', sub.id, decision.reason);
  }
  return {userId, status: sub.status, decision};
}

async function book(input: Parameters<typeof recordEvent>[0]) {
  const res = await recordEvent(input);
  if (!res.ok) throw new BillingError(`revenue_events: ${res.error ?? 'insert failed'}`);
  return res;
}

/** True if the member already has a live (active / trialing / past_due) subscription. */
export async function hasLiveSubscription(db: ServiceDb, userId: string, customerId: string | null): Promise<boolean> {
  const local = await db.from('billing_subscriptions').select('id')
    .eq('user_id', userId).in('status', [...LIVE_SUBSCRIPTION_STATUSES]).limit(1);
  if (local.error) fail('billing_subscriptions read', local.error);
  if ((local.data ?? []).length > 0) return true;
  if (!customerId) return false;
  // The webhook may not have landed yet (or was missed): ask Stripe, and heal the local copy.
  const remote = await stripe().subscriptions.list({customer: customerId, status: 'all', limit: 20});
  const live = remote.data.find((s) => isLiveSubscriptionStatus(s.status));
  if (live) {
    await syncSubscription(db, live.id, userId, live).catch((e) => console.warn('[billing] heal sync failed', (e as Error).message));
    return true;
  }
  return false;
}

export type CheckoutResult = {url: string} | {error: 'already_subscribed'};

/** POST /api/billing/checkout — a Stripe-hosted subscription checkout for the signed-in member. */
export async function startMembershipCheckout(db: ServiceDb, member: {userId: string; email: string | null}, cfg: BillingConfig): Promise<CheckoutResult> {
  if (!cfg.priceId) throw new BillingError('STRIPE_PRICE_VIP_MONTHLY not set');
  const existing = await db.from('billing_customers').select('stripe_customer_id').eq('user_id', member.userId).maybeSingle();
  if (existing.error) fail('billing_customers read', existing.error);
  if (await hasLiveSubscription(db, member.userId, (existing.data?.stripe_customer_id as string | undefined) ?? null)) {
    return {error: 'already_subscribed'};
  }
  const customer = await getOrCreateCustomer(db, member.userId, member.email);
  const urls = membershipReturnUrls(cfg.siteUrl);
  const session = await stripe().checkout.sessions.create(
    {
      mode: 'subscription',
      customer,
      client_reference_id: member.userId,
      line_items: [{price: cfg.priceId, quantity: 1}],
      allow_promotion_codes: true,
      metadata: {user_id: member.userId, kind: 'vip'},
      subscription_data: {metadata: {user_id: member.userId, kind: 'vip'}},
      success_url: urls.success,
      cancel_url: urls.cancel,
    },
    {idempotencyKey: `finesse-vip-checkout:${member.userId}:${randomUUID()}`},
  );
  if (!session.url) throw new BillingError('checkout session has no url');
  return {url: session.url};
}

export type ScaleCheckoutResult = {url: string} | {error: 'not_found'} | {error: 'not_payable'; state: string};

/**
 * POST /api/scale/pledges/[id]/pay — checkout for the caller's own pledge in payment_requested.
 * The pledge is read with the MEMBER's client (RLS: own rows only); the amount comes from the
 * deal, never from the request.
 */
export async function startScaleCheckout(
  memberDb: MemberDb, db: ServiceDb, member: {userId: string; email: string | null}, joinId: string, cfg: BillingConfig,
): Promise<ScaleCheckoutResult> {
  if (!isUuid(joinId)) return {error: 'not_found'};
  const {data: join, error} = await memberDb
    .from('scale_joins')
    .select('id, user_id, state, deal:scale_deals(title, brand, group_price_cents)')
    .eq('id', joinId).eq('user_id', member.userId).maybeSingle();
  if (error) fail('scale_joins read', error);
  if (!join) return {error: 'not_found'};
  if (join.state !== 'payment_requested') return {error: 'not_payable', state: String(join.state)};

  const deal = (Array.isArray(join.deal) ? join.deal[0] : join.deal) as {title?: string; brand?: string; group_price_cents?: number} | null;
  const amount = Number(deal?.group_price_cents);
  if (!Number.isInteger(amount) || amount <= 0) throw new BillingError(`scale deal for ${joinId} has no group price`);

  const customer = await getOrCreateCustomer(db, member.userId, member.email);
  const metadata = {join_id: joinId, user_id: member.userId, kind: 'scale'};
  const urls = scaleReturnUrls(cfg.siteUrl, joinId);
  const name = [deal?.brand, deal?.title].filter(Boolean).join(' — ') || 'Scale group buy';
  const session = await stripe().checkout.sessions.create(
    {
      mode: 'payment',
      customer,
      client_reference_id: member.userId,
      line_items: [{quantity: 1, price_data: {currency: 'usd', unit_amount: amount, product_data: {name: `${name} (Scale group price)`}}}],
      metadata,
      payment_intent_data: {metadata},
      success_url: urls.success,
      cancel_url: urls.cancel,
    },
    {idempotencyKey: `finesse-scale-checkout:${joinId}:${randomUUID()}`},
  );
  if (!session.url) throw new BillingError('checkout session has no url');
  return {url: session.url};
}

/** POST /api/billing/portal */
export async function startPortal(db: ServiceDb, userId: string, cfg: BillingConfig): Promise<{url: string} | {error: 'no_billing_account'}> {
  const row = await db.from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
  if (row.error) fail('billing_customers read', row.error);
  if (!row.data?.stripe_customer_id) return {error: 'no_billing_account'};
  const session = await stripe().billingPortal.sessions.create({
    customer: row.data.stripe_customer_id as string,
    return_url: `${cfg.siteUrl}/account`,
  });
  return {url: session.url};
}

export type BillingStatus = {
  configured: boolean;
  priceDisplay: string | null;
  vip: {active: boolean; source: GrantRow['source'] | null; expiresAt: string | null};
  subscription: {status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean} | null;
};

/** GET /api/billing/status — read with the member's own client (owner-read RLS). */
export async function billingStatus(memberDb: MemberDb, userId: string, cfg: BillingConfig, now: Date = new Date()): Promise<BillingStatus> {
  const [prof, grants, subs] = await Promise.all([
    memberDb.from('profiles').select('is_vip, vip_expires_at').eq('id', userId).maybeSingle(),
    memberDb.from('vip_grants').select('source, expires_at, revoked_at').eq('user_id', userId),
    memberDb.from('billing_subscriptions').select('status, current_period_end, cancel_at_period_end')
      .eq('user_id', userId).order('updated_at', {ascending: false}).limit(1),
  ]);
  const expiresAt = (prof.data?.vip_expires_at as string | null | undefined) ?? null;
  const active = prof.data?.is_vip === true && (expiresAt === null || new Date(expiresAt) > now);
  const decisive = active && !grants.error ? pickVipGrant((grants.data ?? []) as GrantRow[], now) : null;
  const s = subs.error ? null : subs.data?.[0];
  return {
    configured: cfg.configured,
    priceDisplay: cfg.configured ? VIP_PRICE_DISPLAY : null,
    vip: {active, source: decisive?.source ?? null, expiresAt: active ? expiresAt : null},
    subscription: s
      ? {status: s.status as string, currentPeriodEnd: (s.current_period_end as string | null) ?? null, cancelAtPeriodEnd: Boolean(s.cancel_at_period_end)}
      : null,
  };
}

/**
 * For account deletion (src/lib/account.ts should call this BEFORE delete_member_data): deleting
 * the Stripe customer cancels its subscriptions immediately so a deleted member is never charged
 * again. Stripe keeps the charges / invoices for accounting. Returns whether a customer existed.
 */
export async function closeStripeCustomer(db: ServiceDb, userId: string): Promise<boolean> {
  const row = await db.from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
  if (row.error) fail('billing_customers read', row.error);
  const id = row.data?.stripe_customer_id as string | undefined;
  if (!id) return false;
  try {
    await stripe().customers.del(id);
  } catch (e) {
    if (!isMissingResource(e)) throw e;
  }
  return true;
}

// ── Webhook processing ────────────────────────────────────────────────────────────────────

export type ProcessOutcome = {outcome: 'processed' | 'ignored'; detail?: string};

async function handleScalePaid(db: ServiceDb, event: Stripe.Event, session: Stripe.Checkout.Session, meta: ScaleMetadata): Promise<ProcessOutcome> {
  if (session.payment_status !== 'paid') return {outcome: 'ignored', detail: `scale payment_status ${session.payment_status}`};
  const piId = stripeId(session.payment_intent);
  if (!piId) throw new BillingError(`paid scale session ${session.id} has no payment_intent`);

  const res = await db.rpc('scale_mark_paid', {p_join: meta.joinId, p_payment_ref: piId});
  if (res.error) fail('scale_mark_paid', res.error);
  const result = res.data as string;

  if (result === 'conflict' || result === 'not_found') {
    // Paid twice, or paid for a pledge that is no longer payable: give the money back.
    await stripe().refunds.create(
      {payment_intent: piId, reason: 'duplicate', metadata: {join_id: meta.joinId, kind: 'scale_unpayable'}},
      {idempotencyKey: `finesse-scale-refund:${piId}`},
    );
    console.warn('[billing] scale payment refunded', result, meta.joinId, piId);
    return {outcome: 'processed', detail: `scale ${result}: refunded`};
  }

  const j = await db.from('scale_joins').select('user_id, track').eq('id', meta.joinId).maybeSingle();
  if (j.error) fail('scale_joins read', j.error);
  const memberId = isUuid(j.data?.user_id) ? (j.data!.user_id as string) : null;
  await book({
    eventType: 'scale.payment',
    idempotencyKey: `stripe:scale:${piId}`,
    traceId: `stripe_${event.id}`,
    roomId: SCALE_ROOM_ID,
    track: revenueTrack(j.data?.track),
    memberId,
    providerId: 'stripe',
    providerReceiptId: piId,
    amountMinor: session.amount_total ?? 0,
    currency: (session.currency ?? 'usd').toUpperCase(),
    state: 'confirmed',
  });
  return {outcome: 'processed', detail: `scale ${result}`};
}

async function handleCheckoutCompleted(db: ServiceDb, event: Stripe.Event, session: Stripe.Checkout.Session): Promise<ProcessOutcome> {
  const fallbackUser = isUuid(session.client_reference_id) ? session.client_reference_id : (isUuid(session.metadata?.user_id) ? session.metadata!.user_id : null);
  if (session.mode === 'subscription') {
    const userId = await resolveUserId(db, stripeId(session.customer), fallbackUser);
    const subId = stripeId(session.subscription);
    if (!subId) return {outcome: 'ignored', detail: 'subscription session without subscription'};
    const r = await syncSubscription(db, subId, userId);
    return {outcome: r.userId ? 'processed' : 'ignored', detail: `subscription ${r.status}`};
  }
  const scale = parseScaleMetadata(session.metadata);
  if (session.mode === 'payment' && scale) {
    await resolveUserId(db, stripeId(session.customer), scale.userId);
    return handleScalePaid(db, event, session, scale);
  }
  return {outcome: 'ignored', detail: `checkout mode ${session.mode}`};
}

async function handleInvoice(db: ServiceDb, event: Stripe.Event, inv: Stripe.Invoice, paid: boolean): Promise<ProcessOutcome> {
  const subId = invoiceSubscriptionId(inv);
  let userId: string | null = null;
  if (subId) userId = (await syncSubscription(db, subId, invoiceMetadataUserId(inv))).userId;
  else userId = await resolveUserId(db, stripeId(inv.customer), invoiceMetadataUserId(inv));

  if (paid && inv.amount_paid > 0) {
    await book({
      eventType: subId ? 'vip.subscription_payment' : 'stripe.invoice_payment',
      idempotencyKey: `stripe:invoice:${inv.id}`,
      traceId: `stripe_${event.id}`,
      roomId: subId ? VIP_ROOM_ID : 'unattributed',
      track: null,
      memberId: userId,
      providerId: 'stripe',
      providerReceiptId: inv.id,
      amountMinor: inv.amount_paid,
      currency: inv.currency.toUpperCase(),
      state: 'confirmed',
    });
  }
  return {outcome: subId || userId ? 'processed' : 'ignored', detail: paid ? `invoice paid ${inv.amount_paid}` : 'invoice payment failed'};
}

type RevenueRow = {id: string; event_type: string; room_id: string; track: string | null; member_id: string | null};

async function findOriginalRevenue(db: ServiceDb, receiptIds: string[]): Promise<RevenueRow | null> {
  if (receiptIds.length === 0) return null;
  const r = await db.from('revenue_events').select('id, event_type, room_id, track, member_id')
    .eq('provider_id', 'stripe').eq('state', 'confirmed').in('provider_receipt_id', receiptIds)
    .order('occurred_at', {ascending: true}).limit(1);
  if (r.error) fail('revenue_events lookup', r.error);
  return ((r.data ?? [])[0] as RevenueRow | undefined) ?? null;
}

async function handleChargeRefunded(db: ServiceDb, event: Stripe.Event, ch: Stripe.Charge): Promise<ProcessOutcome> {
  const piId = stripeId(ch.payment_intent);
  let scaleMoved = 0;
  if (ch.refunded && piId) {
    const r = await db.rpc('scale_mark_refunded', {p_payment_ref: piId});
    if (r.error) fail('scale_mark_refunded', r.error);
    scaleMoved = Number(r.data ?? 0);
  }

  // Scale revenue is booked against the PaymentIntent; subscription revenue against the invoice.
  let original = await findOriginalRevenue(db, [piId, ch.id].filter((x): x is string => Boolean(x)));
  if (!original && piId) {
    const payments = await stripe().invoicePayments.list({payment: {type: 'payment_intent', payment_intent: piId}, limit: 1});
    const invoiceId = stripeId(payments.data[0]?.invoice as string | {id: string} | undefined);
    if (invoiceId) original = await findOriginalRevenue(db, [invoiceId]);
  }
  if (!original) return {outcome: 'processed', detail: `refund without booked revenue (scale moved ${scaleMoved})`};

  const refunds = await stripe().refunds.list({charge: ch.id, limit: 100});
  for (const rf of refundsToBook(refunds.data)) {
    await book({
      eventType: `${original.event_type}.refunded`.slice(0, 80),
      idempotencyKey: `stripe:refund:${rf.id}`,
      traceId: `stripe_${event.id}`,
      roomId: original.room_id,
      track: revenueTrack(original.track),
      memberId: original.member_id,
      providerId: 'stripe',
      providerReceiptId: rf.id,
      amountMinor: -Math.abs(rf.amount),
      currency: rf.currency.toUpperCase(),
      state: 'refunded',
      reversesEventId: original.id,
    });
  }
  return {outcome: 'processed', detail: `refund booked (scale moved ${scaleMoved})`};
}

/** Dispatch one verified Stripe event. Throws on transient failure (the webhook answers 500 → Stripe retries). */
export async function processStripeEvent(db: ServiceDb, event: Stripe.Event): Promise<ProcessOutcome> {
  const obj = event.data.object as unknown;
  switch (routeStripeEvent(event.type)) {
    case 'checkout_completed':
      return handleCheckoutCompleted(db, event, obj as Stripe.Checkout.Session);
    case 'subscription_changed': {
      const sub = obj as Stripe.Subscription;
      const r = await syncSubscription(db, sub.id, null, sub);
      return {outcome: r.userId ? 'processed' : 'ignored', detail: `subscription ${r.status}`};
    }
    case 'invoice_paid':
      return handleInvoice(db, event, obj as Stripe.Invoice, true);
    case 'invoice_payment_failed':
      return handleInvoice(db, event, obj as Stripe.Invoice, false);
    case 'charge_refunded':
      return handleChargeRefunded(db, event, obj as Stripe.Charge);
    default:
      return {outcome: 'ignored', detail: event.type};
  }
}
