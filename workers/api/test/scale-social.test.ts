import { strikePenaltyBps } from '../src/policy';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pgDatabase, type Tx } from '../src/db';
import { createCampaign, decline, openCampaign, pledge, tick, updateShipment, withdraw, campaignView } from '../src/scale/service';
import { fakePayments, fakeShipping } from '../src/scale/adapters';
import { forecast, orderWaitlist, defaultWaitlistSize } from '../src/scale/forecast';
import { computeStandings, outingScore, percentile, band, recompute, rate } from '../src/social/standing';
import { claim, codeFor, creditDue, proPaymentCleared, proRefunded } from '../src/social/referrals';
import { ADMIN_URL, freshDb } from './helpers';

describe('scale forecast (Model v1)', () => {
  it('matches the spec example: 800 units → 160 waitlist; 95% backups at 8%', () => {
    expect(defaultWaitlistSize(800)).toBe(160);
    const f = forecast({ unitGoal: 800, committed: 400, unitsPerDay: 40, daysLeft: 10, waitlist: 160 });
    expect(f.expectedDeclines).toBe(64);
    expect(f.backupsNeeded).toBe(Math.ceil(64 + 1.645 * Math.sqrt(800 * 0.08 * 0.92)));
    expect(f.pGoal).toBeGreaterThan(0.45);
    expect(f.waitlistCover).toBeGreaterThan(0.99);
  });
  it('raises an early warning when the goal looks unlikely', () => {
    expect(forecast({ unitGoal: 800, committed: 100, unitsPerDay: 5, daysLeft: 10, waitlist: 160 }).earlyWarning).toBe(true);
  });
  it('strike ladder escalates from a free warning to full penalty', () => {
    expect([1, 2, 3, 4, 5, 9].map(strikePenaltyBps)).toEqual([0, 2500, 5000, 10000, 10000, 10000]);
  });

  it('orders the waitlist FCFS with strike/card penalties and same-hour Patron priority', () => {
    const t = (m: number) => new Date(Date.UTC(2026, 9, 1, 10, m));
    const out = orderWaitlist([
      { id: 'a', created_at: t(1), open_strikes: 0, card_failing: false, band: 'Resident' },
      { id: 'b', created_at: t(2), open_strikes: 1, card_failing: false, band: 'Ambassador' },
      { id: 'c', created_at: t(30), open_strikes: 0, card_failing: false, band: 'Patron' },
      { id: 'd', created_at: new Date(Date.UTC(2026, 9, 1, 9, 59)), open_strikes: 0, card_failing: false, band: null },
    ]);
    expect(out.map((e) => e.id)).toEqual(['d', 'c', 'a', 'b']);
  });
});

describe('standing (pure)', () => {
  it('bands and percentiles', () => {
    expect([0, 29, 30, 50, 70, 85].map(band)).toEqual(['Arrival', 'Arrival', 'Resident', 'Regular', 'Patron', 'Ambassador']);
    expect(percentile([1, 2, 3, 4, 5], 5)).toBe(100);
    expect(percentile([1, 2, 3, 4, 5], 1)).toBe(0);
  });
  it('outing feedback needs 5 raters and trims extremes', () => {
    expect(outingScore([1, 2, 3, 4].map((i) => ({ rater_id: `r${i}`, score: 5 })))).toBeNull();
    const ten = Array.from({ length: 10 }, (_, i) => ({ rater_id: `r${i}`, score: i === 0 ? 1 : 5 }));
    expect(outingScore(ten)).toBe(5); // the single 1-star outlier is trimmed
  });
  it('new members are capped in Arrival with a building label; strikes subtract up to 20', () => {
    const old = new Date(Date.now() - 100 * 86_400_000);
    const raw = (v: number) => ({ interactions: v, positive_content: v, brand_ambassadorship: v, helping_others: v, outing_feedback: v, campaign_participation: v });
    const [veteran, newbie, striker] = computeStandings([
      { user_id: 'v', joined_at: old, signal_total: 100, open_strikes: 0, raw: raw(10) },
      { user_id: 'n', joined_at: new Date(), signal_total: 100, open_strikes: 0, raw: raw(10) },
      { user_id: 's', joined_at: old, signal_total: 100, open_strikes: 9, raw: raw(10) },
    ]);
    expect(veteran!.building).toBe(false);
    expect(newbie).toMatchObject({ building: true, band: 'Arrival' });
    expect(veteran!.score - striker!.score).toBe(20);
    expect(veteran!.reasons.how).toBeTruthy();
  });
});

const run = ADMIN_URL ? describe : describe.skip;

run('scale + social against Postgres', () => {
  let db: ReturnType<typeof pgDatabase>;
  const users: string[] = [];
  const svc = <T>(fn: (tx: Tx) => Promise<T>) => db.tx('app_service', null, fn);

  beforeAll(async () => {
    db = pgDatabase(await freshDb('finesse_test_scale'));
    await svc(async (tx) => {
      for (let i = 0; i < 8; i++) users.push((await tx.query<{ id: string }>('insert into app.users(workos_user_id) values ($1) returning id', [`user_${i}`])).rows[0]!.id);
    });
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it('runs a campaign end to end: goal → window → decline/strike/backfill → bulk charge → 3PL → close + rebate', async () => {
    const now = new Date();
    const id = await svc((tx) => createCampaign(tx, {
      title: 'Carbon Steel Pan', retail_cents: 20000, unit_goal: 4, waitlist_size: 2, closes_at: new Date(+now + 7 * 86_400_000).toISOString(), rebate_bps: 500,
      tiers: [{ min_units: 0, unit_price_cents: 15000, unit_cost_cents: 9000 }, { min_units: 4, unit_price_cents: 12000, unit_cost_cents: 9000 }],
    }, users[0]!));
    await svc((tx) => openCampaign(tx, id, now));
    // u1..u3 pledge 1 each, u4 pledges 1 with a failing card -> goal reached (4)
    for (const [i, pm] of [[1, 'pm_ok'], [2, 'pm_ok'], [3, 'pm_ok'], [4, 'pm_fail_card']] as const) {
      expect((await svc((tx) => pledge(tx, id, users[i]!, 1, pm, now))).status).toBe('pledged');
    }
    let v = await svc((tx) => campaignView(tx, id));
    expect(v).toMatchObject({ status: 'decision_window', committed_units: 4, unit_price_cents: 12000, saved_pct: 40 });
    // backups
    expect((await svc((tx) => pledge(tx, id, users[5]!, 1, 'pm_ok', now))).status).toBe('waitlisted');
    expect((await svc((tx) => pledge(tx, id, users[6]!, 1, 'pm_ok', now))).status).toBe('waitlisted');
    await expect(svc((tx) => pledge(tx, id, users[7]!, 1, 'pm_ok', now))).rejects.toThrow(/full/);
    // after goal, withdrawing a pledge is not allowed — decline is
    await expect(svc((tx) => withdraw(tx, id, users[1]!))).rejects.toThrow(/decline/);
    const d = await svc((tx) => decline(tx, id, users[1]!, now));
    expect(d.promoted).toHaveLength(1);

    const payments = fakePayments(), shipping = fakeShipping();
    // window not over yet: nothing happens
    expect((await svc((tx) => tick(tx, { payments, shipping }, now))).charged).toBe(0);
    const later = new Date(+now + 13 * 3_600_000);
    const out = await svc((tx) => tick(tx, { payments, shipping }, later));
    // u2,u3,u5 paid; u4 card failed -> strike + u6 promoted and charged in bulk
    expect(out.charged).toBe(4);
    expect(shipping.orders).toHaveLength(4);
    const strikes = (await svc((tx) => tx.query<{ reason: string }>('select reason from scale.strikes order by created_at'))).rows.map((r) => r.reason);
    expect(strikes).toEqual(['declined_in_window', 'charge_failed']);
    // first strike for each member: warning only (0 bps), expires on the rolling 12-month window
    const sk = (await svc((tx) => tx.query<{ penalty_bps: number; days: number }>("select penalty_bps, round(extract(epoch from expires_at - created_at) / 86400)::int days from scale.strikes"))).rows;
    expect(sk.every((r) => r.penalty_bps === 0 && r.days === 365)).toBe(true);
    const paid = (await svc((tx) => tx.query<{ amount_cents: string }>("select amount_cents from scale.pledges where status = 'paid'"))).rows;
    expect(paid.every((p) => Number(p.amount_cents) === 12000)).toBe(true);
    // idempotent: re-running the tick charges nobody twice
    await svc((tx) => tick(tx, { payments, shipping }, later));
    expect(new Set(payments.calls.map((c) => c.key)).size).toBe(payments.calls.filter((c, i, a) => a.findIndex((x) => x.key === c.key) === i).length);
    // deliveries close the campaign and record rebates (5%)
    for (const p of (await svc((tx) => tx.query<{ id: string }>("select id from scale.pledges where status = 'paid'"))).rows) await svc((tx) => updateShipment(tx, p.id, 'delivered'));
    expect((await svc((tx) => tick(tx, { payments, shipping }, later))).closed).toBe(1);
    const rebates = (await svc((tx) => tx.query<{ amount_cents: string }>('select amount_cents from scale.rebates'))).rows;
    expect(rebates.map((r) => Number(r.amount_cents))).toEqual([600, 600, 600, 600]);
    expect((await svc((tx) => tx.query('select app.verify_chronicle() b'))).rows[0]!.b).toBeNull();
  });

  it('a campaign that misses its deadline fails without charging anyone', async () => {
    const now = new Date();
    const id = await svc((tx) => createCampaign(tx, { title: 'Watch', retail_cents: 100000, unit_goal: 50, closes_at: new Date(+now + 3_600_000).toISOString(), tiers: [{ min_units: 0, unit_price_cents: 80000 }] }, users[0]!));
    await svc((tx) => openCampaign(tx, id, now));
    await svc((tx) => pledge(tx, id, users[2]!, 1, 'pm_ok', now));
    const payments = fakePayments();
    expect((await svc((tx) => tick(tx, { payments, shipping: fakeShipping() }, new Date(+now + 2 * 3_600_000)))).failed).toBe(1);
    expect(payments.calls).toHaveLength(0);
  });

  it('margin guard rejects a losing tier', async () => {
    await expect(svc((tx) => createCampaign(tx, { title: 'x', retail_cents: 100, unit_goal: 1, closes_at: new Date(Date.now() + 1e7).toISOString(), tiers: [{ min_units: 0, unit_price_cents: 50, unit_cost_cents: 60 }] }, users[0]!))).rejects.toThrow(/margin/);
  });

  it('referral: code → claim → Pro payment → 30-day hold → $75 credit; refunds and self-referral void', async () => {
    const code = await svc((tx) => codeFor(tx, users[1]!));
    expect(await svc((tx) => codeFor(tx, users[1]!))).toBe(code);
    await expect(svc((tx) => claim(tx, users[1]!, code))).rejects.toThrow(/self/);
    await svc((tx) => claim(tx, users[2]!, code, { device_hash: 'dev1' }));
    await expect(svc((tx) => claim(tx, users[2]!, code))).rejects.toThrow(/already/);
    expect((await svc((tx) => claim(tx, users[3]!, code, { device_hash: 'dev1' }))).status).toBe('void');
    await svc((tx) => claim(tx, users[4]!, code));
    const paidAt = new Date();
    await svc((tx) => proPaymentCleared(tx, users[2]!, paidAt));
    await svc((tx) => proPaymentCleared(tx, users[4]!, paidAt));
    await svc((tx) => proRefunded(tx, users[4]!));
    expect(await svc((tx) => creditDue(tx, new Date(+paidAt + 29 * 86_400_000)))).toBe(0);
    expect(await svc((tx) => creditDue(tx, new Date(+paidAt + 31 * 86_400_000)))).toBe(1);
    const payouts = (await svc((tx) => tx.query<{ amount_cents: number; user_id: string }>('select amount_cents, user_id from social.referral_payouts'))).rows;
    expect(payouts).toEqual([{ amount_cents: 7500, user_id: users[1] }]);
    // friend can see their referral row; others cannot
    const seen = await db.tx('app_user', { uid: users[2]!, sub: 'x' }, async (tx) => (await tx.query('select status from social.referrals')).rows);
    expect(seen).toEqual([{ status: 'signed_up' }].map(() => ({ status: 'credited' })));
    // post-payout refund: default policy keeps the credit; confirmed fraud claws it back
    await svc((tx) => proRefunded(tx, users[2]!));
    expect((await svc((tx) => tx.query('select status from social.referral_payouts'))).rows).toEqual([{ status: 'pending_partner' }]);
    await svc((tx) => proRefunded(tx, users[2]!, { fraud: true }));
    expect((await svc((tx) => tx.query('select status, clawback_reason from social.referral_payouts'))).rows).toEqual([{ status: 'clawback_pending', clawback_reason: 'fraud' }]);
  });

  it('standing recompute writes bands with reasons and respects rating rules', async () => {
    for (let i = 1; i <= 6; i++) if (i !== 3) await svc((tx) => rate(tx, users[i]!, users[3]!, 5));
    await expect(svc((tx) => rate(tx, users[1]!, users[3]!, 4))).rejects.toThrow(/90 days/);
    await svc((tx) => tx.query("select social.bump($1, 'like_received', 40)", [users[3]]));
    const n = await svc((tx) => recompute(tx));
    expect(n).toBeGreaterThanOrEqual(8);
    const s = await db.tx('app_user', { uid: users[3]!, sub: 'x' }, async (tx) => (await tx.query<any>('select band, building, reasons from social.standing')).rows);
    expect(s).toHaveLength(1);
    expect(s[0].reasons.strongest).toHaveLength(2);
  });
});
