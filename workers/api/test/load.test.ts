// Load / concurrency simulation against local Postgres. Run: LOAD=1 TEST_DATABASE_URL=... npx vitest run test/load.test.ts
// Concurrency is bounded below Postgres max_connections (Hyperdrive pools in production).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pgDatabase, type Tx } from '../src/db';
import { createCampaign, openCampaign, pledge, tick } from '../src/scale/service';
import { fakePayments, fakeShipping } from '../src/scale/adapters';
import { ADMIN_URL, freshDb } from './helpers';

const run = ADMIN_URL && process.env.LOAD ? describe : describe.skip;
const CONC = Number(process.env.LOAD_CONC ?? 60);

async function pool<T>(n: number, jobs: (() => Promise<T>)[]): Promise<PromiseSettledResult<T>[]> {
  const out: PromiseSettledResult<T>[] = new Array(jobs.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < jobs.length) { const k = i++; out[k] = await jobs[k]!().then((value) => ({ status: 'fulfilled', value }) as const, (reason) => ({ status: 'rejected', reason }) as const); }
  }));
  return out;
}

run('load: Scale, outbox, RLS under concurrency', () => {
  let db: ReturnType<typeof pgDatabase>;
  const users: string[] = [];
  const svc = <T>(fn: (tx: Tx) => Promise<T>) => db.tx('app_service', null, fn);
  const report: Record<string, unknown> = {};

  beforeAll(async () => {
    db = pgDatabase(await freshDb('finesse_load_sim'));
    await svc(async (tx) => {
      const r = await tx.query<{ id: string }>("insert into app.users(workos_user_id) select 'load_' || g from generate_series(1, 400) g returning id");
      users.push(...r.rows.map((x) => x.id));
    });
  }, 120_000);
  afterAll(async () => { const fs = await import('node:fs'); fs.writeFileSync(process.env.LOAD_REPORT ?? '/tmp/load-report.json', JSON.stringify(report, null, 1)); await db?.close(); });

  it('400 members race to pledge a 100-unit campaign: never oversold, waitlist bounded, no double pledges', async () => {
    const now = new Date();
    const id = await svc((tx) => createCampaign(tx, { title: 'Race', retail_cents: 10000, unit_goal: 100, waitlist_size: 20, closes_at: new Date(+now + 864e5).toISOString(),
      tiers: [{ min_units: 0, unit_price_cents: 8000, unit_cost_cents: 5000 }] }, users[0]!));
    await svc((tx) => openCampaign(tx, id, now));
    const t0 = Date.now();
    const res = await pool(CONC, users.map((u, i) => () => svc((tx) => pledge(tx, id, u, 1, i % 25 === 0 ? 'pm_fail' : 'pm_ok', now))));
    const ms = Date.now() - t0;
    const counts = (await svc((tx) => tx.query<{ status: string; n: number }>('select status, sum(quantity)::int n from scale.pledges where campaign_id = $1 group by 1', [id]))).rows;
    const by = Object.fromEntries(counts.map((r) => [r.status, r.n]));
    report.pledge_race = { attempts: users.length, ms, per_sec: Math.round(users.length / (ms / 1000)), ok: res.filter((r) => r.status === 'fulfilled').length, by };
    expect((by.pledged ?? 0) + (by.payment_requested ?? 0)).toBe(100); // goal reached → window opened
    expect(by.waitlisted).toBe(20);
    const dupes = (await svc((tx) => tx.query('select user_id from scale.pledges where campaign_id = $1 group by 1 having count(*) > 1', [id]))).rowCount;
    expect(dupes).toBe(0);

    // two cron ticks racing after the window: every pledge charged exactly once
    const payments = fakePayments(), shipping = fakeShipping();
    const later = new Date(+now + 13 * 3_600_000);
    const t1 = Date.now();
    await Promise.allSettled([svc((tx) => tick(tx, { payments, shipping }, later)), svc((tx) => tick(tx, { payments, shipping }, later))]);
    const keys = payments.calls.map((c) => c.key);
    const charged = (await svc((tx) => tx.query<{ n: number }>("select count(*)::int n from scale.pledges where campaign_id = $1 and status = 'paid'", [id]))).rows[0]!.n;
    report.bulk_charge = { ms: Date.now() - t1, charge_calls: keys.length, unique_keys: new Set(keys).size, paid: charged };
    expect(new Set(keys).size).toBe(keys.length); // no pledge charged twice
    expect(charged).toBeGreaterThanOrEqual(90);
  }, 180_000);

  it('outbox: 20k events, 6 concurrent relays with SKIP LOCKED: each delivered once', async () => {
    await svc((tx) => tx.query("select orch.emit('load.test', jsonb_build_object('i', g), 'load') from generate_series(1, 20000) g"));
    const seen: number[] = [];
    const t0 = Date.now();
    await Promise.all(Array.from({ length: 6 }, async () => {
      for (;;) {
        const got = await svc(async (tx) => {
          const rows = (await tx.query<{ id: number }>('select id from orch.claim_outbox(500)')).rows;
          if (rows.length) await tx.query('select orch.mark_published($1::bigint[])', [rows.map((r) => r.id)]);
          return rows.map((r) => Number(r.id));
        });
        if (!got.length) break;
        seen.push(...got);
      }
    }));
    const ms = Date.now() - t0;
    report.outbox = { events: seen.length, unique: new Set(seen).size, ms, per_sec: Math.round(seen.length / (ms / 1000)) };
    expect(seen.length).toBeGreaterThanOrEqual(20000);
    expect(new Set(seen).size).toBe(seen.length);
  }, 180_000);

  it('RLS holds under 400 concurrent member transactions', async () => {
    await svc((tx) => tx.query("insert into public.member_staff(user_id, shopper_name) select id, 'S-' || id from app.users where workos_user_id like 'load_%' on conflict do nothing"));
    const t0 = Date.now();
    const res = await pool(CONC, users.map((u) => () => db.tx('app_user', { uid: u, sub: 'x' }, async (tx) => (await tx.query<{ user_id: string }>('select user_id from public.member_staff')).rows)));
    const leaks = res.filter((r) => r.status !== 'fulfilled' || r.value.length !== 1).length;
    const wrong = res.filter((r, i) => r.status === 'fulfilled' && r.value[0]?.user_id !== users[i]).length;
    report.rls = { tx: users.length, ms: Date.now() - t0, leaks, wrong };
    expect(leaks + wrong).toBe(0);
  }, 120_000);
});
