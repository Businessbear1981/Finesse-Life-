import { afterAll, beforeAll, expect, it, describe } from 'vitest';
import { pgDatabase } from '../src/db';
import { shopperEngine } from '../src/engines/shopper';
import { nightvisionEngine } from '../src/engines/nightvision';
import { evaluate, promoteIfBetter, recordClosedCampaign } from '../src/engines/learning';
import { ADMIN_URL, freshDb } from './helpers';

const run = ADMIN_URL ? describe : describe.skip;
run('shopper / nightvision / learning skeletons', () => {
  let db: ReturnType<typeof pgDatabase>;
  let uid = '';
  beforeAll(async () => {
    db = pgDatabase(await freshDb('finesse_test_skel'));
    uid = await db.tx('app_service', null, async (tx) => (await tx.query<{ id: string }>("insert into app.users(workos_user_id) values ('u_skel') returning id")).rows[0]!.id);
  }, 60_000);
  afterAll(async () => { await db?.close(); });
  const claims = () => ({ uid, sub: 'u_skel' });
  const run2 = (e: typeof shopperEngine, intent: string, payload: Record<string, unknown> = {}) =>
    db.tx('app_user', claims(), (read) => db.tx('app_service', claims(), (agg) => e.handle({ intent, payload, userId: uid, read, agg })));

  it('shopper saves and shortlists', async () => {
    await run2(shopperEngine, 'shopper.save', { title: 'Kelly 28', source: 'exchange', category: 'Bags' });
    const r = await run2(shopperEngine, 'shopper.shortlist');
    expect((r.result as any).saved).toHaveLength(1);
  });

  it('nightvision only returns Style DNA with consent, and revocation removes it', async () => {
    await db.tx('app_service', null, (tx) => tx.query(`update public.profiles set style_dna = '{"style_labels":["Old Hollywood"]}' where id = $1`, [uid]));
    expect((await run2(nightvisionEngine, 'nightvision.style_dna')).result).toMatchObject({ consented: false, style_dna: null });
    await run2(nightvisionEngine, 'nightvision.consent');
    expect((await run2(nightvisionEngine, 'nightvision.style_dna')).result).toMatchObject({ consented: true });
    expect((await run2(nightvisionEngine, 'nightvision.campaign_seed', { tags: ['Old Hollywood'] })).result).toMatchObject({ matched_members: 0, suppressed: true });
    await run2(nightvisionEngine, 'nightvision.revoke');
    expect((await run2(nightvisionEngine, 'nightvision.style_dna')).result).toMatchObject({ consented: false });
  });

  it('learning stays in cold start and never promotes below 30 campaigns', async () => {
    await db.tx('app_service', null, async (tx) => {
      await tx.query(`insert into engines.model_versions(engine, version, params) values ('scale_forecast', 2, '{"decline_rate":0.05}')`);
      await recordClosedCampaign(tx, '00000000-0000-0000-0000-000000000000');
      const e = await evaluate(tx);
      expect(e).toMatchObject({ training_rows: 0, cold_start: true });
      expect(await promoteIfBetter(tx)).toBe(false);
    });
  });
});
