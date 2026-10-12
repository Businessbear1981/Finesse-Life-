// "Refer a friend, get $75" (Workflow §6). Paid once the friend's first Pro payment clears and the
// refund hold passes. A marketing expense loaded via the card partner; Finesse holds no member funds.
import type { Tx } from '../db';
import { REFERRAL_POLICY } from '../policy';

export const PAYOUT_CENTS = REFERRAL_POLICY.payoutCents;
export const HOLD_DAYS = REFERRAL_POLICY.holdDays;
export const ANNUAL_PAYOUT_CAP = REFERRAL_POLICY.annualPayoutCap;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode(rand: () => number = Math.random): string {
  return Array.from({ length: 8 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('');
}

export class ReferralError extends Error { constructor(public code: 400 | 404 | 409, msg: string) { super(msg); } }

export async function codeFor(tx: Tx, uid: string): Promise<string> {
  const have = (await tx.query<{ code: string }>('select code from social.referral_codes where user_id = $1', [uid])).rows[0];
  if (have) return have.code;
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const r = await tx.query('insert into social.referral_codes(user_id, code) values ($1, $2) on conflict do nothing returning code', [uid, code]);
    if (r.rowCount) return code;
  }
  throw new Error('could not allocate a referral code');
}

export async function claim(tx: Tx, friend: string, code: string, signals: { device_hash?: string; card_fingerprint?: string } = {}) {
  const ref = (await tx.query<{ user_id: string }>('select user_id from social.referral_codes where code = $1', [code.trim().toUpperCase()])).rows[0];
  if (!ref) throw new ReferralError(404, 'unknown referral code');
  if (ref.user_id === friend) throw new ReferralError(400, 'self-referral is not allowed');
  if ((await tx.query('select 1 from social.referrals where friend_id = $1', [friend])).rowCount) throw new ReferralError(409, 'account already has a referrer');
  // Repeat device or card across referrals from the same referrer voids the new one.
  let status = 'signed_up', voidReason: string | null = null;
  if (signals.device_hash || signals.card_fingerprint) {
    const dup = await tx.query(
      'select 1 from social.referrals where referrer_id = $1 and ((device_hash is not null and device_hash = $2) or (card_fingerprint is not null and card_fingerprint = $3))',
      [ref.user_id, signals.device_hash ?? null, signals.card_fingerprint ?? null]);
    if (dup.rowCount) { status = 'void'; voidReason = 'repeat device or card'; }
  }
  const id = (await tx.query<{ id: string }>(
    'insert into social.referrals(referrer_id, friend_id, status, device_hash, card_fingerprint, void_reason) values ($1,$2,$3,$4,$5,$6) returning id',
    [ref.user_id, friend, status, signals.device_hash ?? null, signals.card_fingerprint ?? null, voidReason])).rows[0]!.id;
  await tx.query("select orch.emit('referral.signed_up', $1::jsonb, 'social')", [{ referral_id: id, status }]);
  return { referral_id: id, status };
}

/** Billing webhook: friend's first Pro payment cleared → start the hold. */
export async function proPaymentCleared(tx: Tx, friend: string, paidAt = new Date()) {
  await tx.query(
    `update social.referrals set status = 'held', pro_paid_at = $2, hold_until = $2::timestamptz + make_interval(days => $3), updated_at = now()
     where friend_id = $1 and status = 'signed_up'`, [friend, paidAt, HOLD_DAYS]);
}

/** Billing webhook: Pro plan refunded inside the hold → void. */
export async function proRefunded(tx: Tx, friend: string, opts: { fraud?: boolean } = {}) {
  await tx.query("update social.referrals set status = 'void', void_reason = 'friend refunded', updated_at = now() where friend_id = $1 and status in ('signed_up','held')", [friend]);
  // After payout: claw back only when policy says so, or always for confirmed fraud.
  if (!REFERRAL_POLICY.clawbackAfterPayout && !opts.fraud) return;
  const rows = (await tx.query<{ id: string; referral_id: string; amount_cents: number }>(
    `update social.referral_payouts p set status = 'clawback_pending', clawback_reason = $2
       from social.referrals r where r.id = p.referral_id and r.friend_id = $1 and r.status = 'credited' and p.status in ('pending_partner','credited')
     returning p.id, p.referral_id, p.amount_cents`, [friend, opts.fraud ? 'fraud' : 'friend refunded after payout'])).rows;
  for (const p of rows) await tx.query("select orch.emit('referral.clawback', $1::jsonb, 'social')", [{ payout_id: p.id, referral_id: p.referral_id, amount_cents: p.amount_cents }]);
}

/** Cron: credit referrals whose hold has passed, within the per-member annual cap. */
export async function creditDue(tx: Tx, now = new Date()): Promise<number> {
  const due = (await tx.query<{ id: string; referrer_id: string; payout_cents: number }>(
    "select id, referrer_id, payout_cents from social.referrals where status = 'held' and hold_until <= $1 order by hold_until for update skip locked", [now])).rows;
  let n = 0;
  for (const r of due) {
    const year = (await tx.query<{ n: number }>("select count(*)::int n from social.referral_payouts where user_id = $1 and created_at > $2::timestamptz - interval '365 days'", [r.referrer_id, now])).rows[0]!.n;
    if (year >= ANNUAL_PAYOUT_CAP) {
      await tx.query("update social.referrals set status = 'void', void_reason = 'annual payout cap', updated_at = now() where id = $1", [r.id]);
      continue;
    }
    await tx.query("update social.referrals set status = 'credited', updated_at = now() where id = $1", [r.id]);
    await tx.query('insert into social.referral_payouts(referral_id, user_id, amount_cents) values ($1,$2,$3)', [r.id, r.referrer_id, r.payout_cents]);
    await tx.query("select social.bump($1, 'referral_pro')", [r.referrer_id]);
    await tx.query("select orch.emit('referral.credited', $1::jsonb, 'social')", [{ referral_id: r.id, amount_cents: r.payout_cents }]);
    n++;
  }
  return n;
}
