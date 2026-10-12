import type { Tx } from '../db';
import type { PaymentGateway, ShippingProvider } from './adapters';
import { SCALE_POLICY, strikePenaltyBps } from '../policy';
import { BAR_AT_STRIKES, defaultWaitlistSize, forecast, orderWaitlist, type WaitlistEntry } from './forecast';

export class ScaleError extends Error { constructor(public code: 400 | 403 | 404 | 409, msg: string) { super(msg); } }

export interface CampaignInput {
  title: string; edition?: 'her' | 'him' | 'both'; product?: Record<string, unknown>; retail_cents: number; unit_goal: number;
  waitlist_size?: number; max_per_member?: number; closes_at: string; decline_window_hours?: number; rebate_bps?: number;
  tiers: { min_units: number; unit_price_cents: number; unit_cost_cents?: number }[];
  wholesale?: Record<string, unknown>; fulfilment?: Record<string, unknown>;
}

const emit = (tx: Tx, type: string, payload: Record<string, unknown>) => tx.query("select orch.emit($1, $2::jsonb, 'scale')", [type, payload]);

export async function createCampaign(tx: Tx, c: CampaignInput, by: string): Promise<string> {
  if (!c.tiers.length || !c.tiers.some((t) => t.min_units === 0)) throw new ScaleError(400, 'tiers must include a base tier with min_units 0');
  const margins = c.tiers.filter((t) => t.unit_cost_cents != null && t.unit_cost_cents >= t.unit_price_cents);
  if (margins.length) throw new ScaleError(400, `margin guard: tier ${margins[0]!.min_units} loses money`);
  const id = (await tx.query<{ id: string }>(
    `insert into scale.campaigns(title, edition, product, retail_cents, unit_goal, waitlist_size, max_per_member, closes_at, decline_window_hours, rebate_bps, wholesale, fulfilment, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
    [c.title, c.edition ?? 'both', c.product ?? {}, c.retail_cents, c.unit_goal, c.waitlist_size ?? defaultWaitlistSize(c.unit_goal),
     c.max_per_member ?? 5, c.closes_at, c.decline_window_hours ?? SCALE_POLICY.declineWindowHours, c.rebate_bps ?? 0, c.wholesale ?? {}, c.fulfilment ?? {}, by])).rows[0]!.id;
  for (const t of c.tiers) await tx.query('insert into scale.tiers(campaign_id, min_units, unit_price_cents, unit_cost_cents) values ($1,$2,$3,$4)', [id, t.min_units, t.unit_price_cents, t.unit_cost_cents ?? null]);
  return id;
}

export async function openCampaign(tx: Tx, id: string, now = new Date()) {
  const r = await tx.query("update scale.campaigns set status = 'open', opens_at = $2, updated_at = now() where id = $1 and status = 'draft' and closes_at > $2", [id, now]);
  if (!r.rowCount) throw new ScaleError(409, 'campaign is not an openable draft');
  await emit(tx, 'campaign.opened', { campaign_id: id });
}

async function lockCampaign(tx: Tx, id: string) {
  const c = (await tx.query<any>('select * from scale.campaigns where id = $1 for update', [id])).rows[0];
  if (!c) throw new ScaleError(404, 'campaign not found');
  return c as { id: string; status: string; unit_goal: number; waitlist_size: number; max_per_member: number; decline_window_hours: number; window_ends_at: Date | null; closes_at: Date; retail_cents: number; rebate_bps: number; product: any };
}

const committed = async (tx: Tx, id: string) => (await tx.query<{ n: number }>('select scale.committed_units($1) n', [id])).rows[0]!.n;
const waitlisted = async (tx: Tx, id: string) => (await tx.query<{ n: number }>("select coalesce(sum(quantity),0)::int n from scale.pledges where campaign_id = $1 and status = 'waitlisted'", [id])).rows[0]!.n;
const openStrikes = async (tx: Tx, uid: string) => (await tx.query<{ n: number }>('select count(*)::int n from scale.strikes where user_id = $1 and voided_at is null and (expires_at is null or expires_at > now())', [uid])).rows[0]!.n;

async function enterWindow(tx: Tx, c: { id: string; decline_window_hours: number }, now: Date) {
  const ends = new Date(+now + c.decline_window_hours * 3_600_000);
  await tx.query("update scale.campaigns set status = 'decision_window', window_ends_at = $2, updated_at = now() where id = $1", [c.id, ends]);
  await tx.query("update scale.pledges set status = 'payment_requested', updated_at = now() where campaign_id = $1 and status = 'pledged'", [c.id]);
  await emit(tx, 'campaign.goal_reached', { campaign_id: c.id, window_ends_at: ends.toISOString() });
}

export async function pledge(tx: Tx, id: string, uid: string, quantity: number, paymentMethodRef: string, now = new Date()) {
  const c = await lockCampaign(tx, id);
  if (!['open', 'decision_window'].includes(c.status)) throw new ScaleError(409, `campaign is ${c.status}`);
  if (quantity < 1 || quantity > c.max_per_member) throw new ScaleError(400, `quantity must be 1..${c.max_per_member}`);
  if ((await openStrikes(tx, uid)) >= BAR_AT_STRIKES) throw new ScaleError(403, 'barred from Scale after repeated strikes');
  const existing = (await tx.query('select 1 from scale.pledges where campaign_id = $1 and user_id = $2', [id, uid])).rowCount;
  if (existing) throw new ScaleError(409, 'already pledged to this campaign');
  const units = await committed(tx, id);
  let status: 'pledged' | 'waitlisted' = c.status === 'open' && units + quantity <= c.unit_goal ? 'pledged' : 'waitlisted';
  if (status === 'waitlisted' && (await waitlisted(tx, id)) + quantity > c.waitlist_size) throw new ScaleError(409, 'campaign and waitlist are full');
  const p = (await tx.query<{ id: string }>(
    'insert into scale.pledges(campaign_id, user_id, quantity, status, payment_method_ref) values ($1,$2,$3,$4,$5) returning id',
    [id, uid, quantity, status, paymentMethodRef])).rows[0]!.id;
  await emit(tx, 'pledge.created', { campaign_id: id, pledge_id: p, quantity, status });
  if (status === 'pledged' && units + quantity >= c.unit_goal) await enterWindow(tx, c, now);
  return { pledge_id: p, status };
}

export async function withdraw(tx: Tx, id: string, uid: string) {
  const c = await lockCampaign(tx, id);
  const r = await tx.query(
    `update scale.pledges set status = 'withdrawn', updated_at = now() where campaign_id = $1 and user_id = $2
     and (status = 'waitlisted' or (status = 'pledged' and $3 = 'open')) returning id`, [id, uid, c.status]);
  if (!r.rowCount) throw new ScaleError(409, 'nothing to withdraw (after the goal, use decline)');
}

async function waitlistOrder(tx: Tx, id: string): Promise<{ id: string; quantity: number; user_id: string }[]> {
  const { rows } = await tx.query<WaitlistEntry & { quantity: number; user_id: string }>(
    `select p.id, p.quantity, p.user_id, p.created_at,
       (select count(*)::int from scale.strikes s where s.user_id = p.user_id and s.voided_at is null and (s.expires_at is null or s.expires_at > now())) open_strikes,
       exists(select 1 from scale.pledges f where f.user_id = p.user_id and f.status = 'missed') card_failing,
       (select band from social.standing s where s.user_id = p.user_id) band
     from scale.pledges p where p.campaign_id = $1 and p.status = 'waitlisted'`, [id]);
  return orderWaitlist(rows) as any;
}

/** Fill `freed` units from the waitlist, in order; a backup whose quantity does not fit is skipped. */
async function promoteBackups(tx: Tx, id: string, freed: number, now: Date): Promise<string[]> {
  const promoted: string[] = [];
  for (const b of await waitlistOrder(tx, id)) {
    if (freed <= 0) break;
    if (b.quantity > freed) continue;
    await tx.query("update scale.pledges set status = 'payment_requested', promoted_at = $2, updated_at = now() where id = $1", [b.id, now]);
    await emit(tx, 'backup.promoted', { campaign_id: id, pledge_id: b.id });
    freed -= b.quantity; promoted.push(b.id);
  }
  return promoted;
}

async function strike(tx: Tx, uid: string, campaignId: string, pledgeId: string, reason: 'declined_in_window' | 'charge_failed') {
  const n = (await openStrikes(tx, uid)) + 1;
  const bps = strikePenaltyBps(n);
  const pledgeCents = (await tx.query<{ c: number }>('select (p.quantity * c.retail_cents)::int c from scale.pledges p join scale.campaigns c on c.id = p.campaign_id where p.id = $1', [pledgeId])).rows[0]?.c ?? 0;
  const penalty = Math.round(pledgeCents * bps / 10000);
  await tx.query(
    `insert into scale.strikes(user_id, campaign_id, pledge_id, reason, expires_at, penalty_bps, penalty_cents, policy_version)
     values ($1,$2,$3,$4, now() + make_interval(days => $5), $6, $7, $8)`,
    [uid, campaignId, pledgeId, reason, SCALE_POLICY.strikeExpiryDays, bps, penalty, SCALE_POLICY.version]);
  await emit(tx, 'strike.issued', { campaign_id: campaignId, pledge_id: pledgeId, reason, user_id: uid, strike_number: n, penalty_bps: bps, penalty_cents: penalty, charge: SCALE_POLICY.chargePenalties && penalty > 0 });
}

export async function decline(tx: Tx, id: string, uid: string, now = new Date()) {
  const c = await lockCampaign(tx, id);
  if (c.status !== 'decision_window' || !c.window_ends_at || +c.window_ends_at <= +now) throw new ScaleError(409, 'no open decline window');
  const p = (await tx.query<{ id: string; quantity: number }>(
    "update scale.pledges set status = 'declined', declined_at = $3, updated_at = now() where campaign_id = $1 and user_id = $2 and status = 'payment_requested' returning id, quantity",
    [id, uid, now])).rows[0];
  if (!p) throw new ScaleError(409, 'no pledge awaiting payment');
  await strike(tx, uid, id, p.id, 'declined_in_window');
  const promoted = await promoteBackups(tx, id, p.quantity, now);
  return { declined: p.id, promoted };
}

export interface TickDeps { payments: PaymentGateway; shipping: ShippingProvider }

async function chargeRequested(tx: Tx, c: { id: string; title: string }, deps: TickDeps, unitPrice: number) {
  const { rows } = await tx.query<{ id: string; user_id: string; quantity: number; payment_method_ref: string }>(
    "select id, user_id, quantity, payment_method_ref from scale.pledges where campaign_id = $1 and status = 'payment_requested' order by created_at", [c.id]);
  let failedUnits = 0;
  for (const p of rows) {
    const amount = unitPrice * p.quantity;
    const r = await deps.payments.charge({ paymentMethodRef: p.payment_method_ref, amountCents: amount, currency: 'usd', idempotencyKey: `scale:${p.id}`, description: c.title });
    if (r.ok) {
      await tx.query("update scale.pledges set status = 'paid', unit_price_cents = $2, amount_cents = $3, charge_ref = $4, paid_at = now(), updated_at = now() where id = $1", [p.id, unitPrice, amount, r.chargeRef]);
      await emit(tx, 'charge.succeeded', { campaign_id: c.id, pledge_id: p.id, amount_cents: amount });
    } else {
      await tx.query("update scale.pledges set status = 'missed', updated_at = now() where id = $1", [p.id]);
      await emit(tx, 'charge.failed', { campaign_id: c.id, pledge_id: p.id, error: r.error });
      await strike(tx, p.user_id, c.id, p.id, 'charge_failed');
      failedUnits += p.quantity;
    }
  }
  return failedUnits;
}

/** Cron step: fail expired campaigns, close decline windows (bulk charge + backfill), hand off to 3PL, close + rebate. */
export async function tick(tx: Tx, deps: TickDeps, now = new Date()) {
  const out = { failed: 0, charged: 0, shipped: 0, closed: 0 };
  // Deadline passed before goal: fail, nobody is charged.
  out.failed = (await tx.query("update scale.campaigns set status = 'failed', updated_at = now() where status = 'open' and closes_at <= $1 returning id", [now])).rowCount;

  // Window over: charge everyone still in, backfill failures from the waitlist and charge them in bulk.
  const due = (await tx.query<{ id: string; title: string; product: any }>("select id, title, product from scale.campaigns where status = 'decision_window' and window_ends_at <= $1 for update skip locked", [now])).rows;
  for (const c of due) {
    await tx.query("update scale.campaigns set status = 'charging', updated_at = now() where id = $1", [c.id]);
    const units = await committed(tx, c.id);
    const price = (await tx.query<{ p: string }>('select scale.unit_price($1, $2) p', [c.id, units])).rows[0]!.p;
    let freed = await chargeRequested(tx, c, deps, Number(price));
    for (let round = 0; freed > 0 && round < 5; round++) {
      const promoted = await promoteBackups(tx, c.id, freed, now);
      if (!promoted.length) break;
      freed = await chargeRequested(tx, c, deps, Number(price));
    }
    await tx.query("update scale.pledges set status = 'withdrawn', updated_at = now() where campaign_id = $1 and status = 'waitlisted'", [c.id]);
    // 3PL handoff.
    const paid = (await tx.query<{ id: string; user_id: string; quantity: number }>("select id, user_id, quantity from scale.pledges where campaign_id = $1 and status = 'paid'", [c.id])).rows;
    for (const p of paid) {
      const r = await deps.shipping.createOrder({ reference: p.id, userId: p.user_id, sku: String(c.product?.sku ?? c.id), quantity: p.quantity, addressRef: null });
      await tx.query('insert into scale.shipments(pledge_id, user_id, provider, provider_ref, status) values ($1,$2,$3,$4,$5) on conflict (pledge_id) do nothing',
        [p.id, p.user_id, deps.shipping.id, r.ok ? r.providerRef : null, r.ok ? 'accepted' : 'exception']);
      out.shipped++;
    }
    await tx.query("update scale.campaigns set status = 'fulfilling', updated_at = now() where id = $1", [c.id]);
    await emit(tx, 'campaign.fulfilling', { campaign_id: c.id, paid: paid.length });
    out.charged += paid.length;
  }

  // All delivered: close and record the Vault rebate owed (credited by the card partner, not held by Finesse).
  const done = (await tx.query<{ id: string; rebate_bps: number }>(
    `select c.id, c.rebate_bps from scale.campaigns c where c.status = 'fulfilling'
     and not exists (select 1 from scale.shipments s join scale.pledges p on p.id = s.pledge_id where p.campaign_id = c.id and s.status <> 'delivered')`)).rows;
  for (const c of done) {
    await tx.query(`insert into scale.rebates(campaign_id, user_id, amount_cents)
      select campaign_id, user_id, (amount_cents * $2 / 10000) from scale.pledges where campaign_id = $1 and status = 'paid' and $2 > 0
      on conflict do nothing`, [c.id, c.rebate_bps]);
    await tx.query("update scale.campaigns set status = 'closed', updated_at = now() where id = $1", [c.id]);
    await emit(tx, 'campaign.closed', { campaign_id: c.id });
    out.closed++;
  }
  return out;
}

export async function updateShipment(tx: Tx, pledgeId: string, status: string, carrier?: string, tracking?: string) {
  const r = await tx.query('update scale.shipments set status = $2, carrier = coalesce($3, carrier), tracking = coalesce($4, tracking), updated_at = now() where pledge_id = $1', [pledgeId, status, carrier ?? null, tracking ?? null]);
  if (!r.rowCount) throw new ScaleError(404, 'shipment not found');
}

export async function campaignView(tx: Tx, id: string, now = new Date()) {
  const c = (await tx.query<any>('select * from scale.campaigns where id = $1', [id])).rows[0];
  if (!c) throw new ScaleError(404, 'campaign not found');
  const tiers = (await tx.query<{ min_units: number; unit_price_cents: string }>('select min_units, unit_price_cents from scale.tiers where campaign_id = $1 order by min_units', [id])).rows
    .map((t) => ({ min_units: t.min_units, unit_price_cents: Number(t.unit_price_cents) }));
  const units = await committed(tx, id);
  const wl = await waitlisted(tx, id);
  const current = [...tiers].reverse().find((t) => t.min_units <= units) ?? tiers[0]!;
  const next = tiers.find((t) => t.min_units > units);
  const recent = (await tx.query<{ n: number }>("select coalesce(sum(quantity),0)::int n from scale.pledges where campaign_id = $1 and status not in ('withdrawn','waitlisted') and created_at > $2::timestamptz - interval '3 days'", [id, now])).rows[0]!.n;
  const daysLeft = Math.max(0, (+new Date(c.closes_at) - +now) / 86_400_000);
  return {
    id, title: c.title, edition: c.edition, status: c.status, unit_goal: c.unit_goal, waitlist_size: c.waitlist_size, waitlisted_units: wl,
    committed_units: units, retail_cents: Number(c.retail_cents), tiers,
    unit_price_cents: current.unit_price_cents, saved_pct: Math.round((1 - current.unit_price_cents / Number(c.retail_cents)) * 1000) / 10,
    next_tier: next ? { units_to_unlock: next.min_units - units, unit_price_cents: next.unit_price_cents } : null,
    tier_prompt: next ? next.min_units - units <= Math.ceil(c.unit_goal * 0.1) : false,
    window_ends_at: c.window_ends_at, closes_at: c.closes_at,
    forecast: forecast({ unitGoal: c.unit_goal, committed: units, unitsPerDay: recent / 3, daysLeft, waitlist: c.waitlist_size }),
  };
}
