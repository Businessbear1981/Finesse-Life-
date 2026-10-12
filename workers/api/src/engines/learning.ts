import type { Engine } from './types';
import type { Tx } from '../db';

/**
 * Learning (skeleton). Closed campaigns become training rows; candidate models run in shadow and are
 * promoted only when they predict recent campaigns better; every version is kept for rollback.
 * Cold start: below 30 closed campaigns the live model stays v1 and trends are hints, not forecasts.
 * TODO: fitted pledge curves per category/season, segment decline rates, outside trend feeds (licensed).
 */
export const COLD_START_CAMPAIGNS = 30;

export async function recordClosedCampaign(tx: Tx, campaignId: string) {
  await tx.query(
    `insert into engines.training_rows(campaign_id, category, unit_goal, final_units, declines, pledge_curve)
     select c.id, c.product->>'category', c.unit_goal,
       coalesce((select sum(quantity) from scale.pledges where campaign_id = c.id and status = 'paid'), 0),
       (select count(*) from scale.pledges where campaign_id = c.id and status in ('declined','missed')),
       coalesce((select jsonb_agg(jsonb_build_object('day', d, 'units', u) order by d) from (
         select (p.created_at::date - c.opens_at::date) d, sum(p.quantity) u from scale.pledges p where p.campaign_id = c.id group by 1) x), '[]')
     from scale.campaigns c where c.id = $1 and c.status = 'closed'
     on conflict (campaign_id) do nothing`, [campaignId]);
}

/** Mean absolute error of each model's decline-rate prediction on recorded campaigns. */
export async function evaluate(tx: Tx, engine = 'scale_forecast') {
  const rows = (await tx.query<{ unit_goal: number; declines: number }>('select unit_goal, declines from engines.training_rows')).rows;
  const models = (await tx.query<{ id: string; version: number; status: string; params: { decline_rate: number } }>(
    "select id, version, status, params from engines.model_versions where engine = $1 and status in ('live','shadow') order by version", [engine])).rows;
  const scored = models.map((m) => ({ ...m, mae: rows.length ? rows.reduce((s, r) => s + Math.abs(r.declines - r.unit_goal * m.params.decline_rate), 0) / rows.length : null }));
  for (const m of scored) await tx.query('update engines.model_versions set metric = $2 where id = $1', [m.id, { mae: m.mae, n: rows.length }]);
  return { training_rows: rows.length, cold_start: rows.length < COLD_START_CAMPAIGNS, models: scored.map(({ id, version, status, mae }) => ({ id, version, status, mae })) };
}

/** Promote a shadow model only if it beats live on recorded campaigns and we are past cold start. */
export async function promoteIfBetter(tx: Tx, engine = 'scale_forecast'): Promise<boolean> {
  const e = await evaluate(tx, engine);
  if (e.cold_start) return false;
  const live = e.models.find((m) => m.status === 'live');
  const best = e.models.filter((m) => m.status === 'shadow' && m.mae != null).sort((a, b) => a.mae! - b.mae!)[0];
  if (!live || !best || best.mae! >= live.mae!) return false;
  await tx.query("update engines.model_versions set status = 'retired' where id = $1", [live.id]);
  await tx.query("update engines.model_versions set status = 'live' where id = $1", [best.id]);
  return true;
}

export const learningEngine: Engine = {
  id: 'learning', intents: ['learning.status'], consumes: ['campaign.closed'], emits: [], tier: 3, provider: 'internal', timeoutMs: 10000,
  async handle({ agg }) {
    return { kind: 'learning.status', result: await evaluate(agg!) };
  },
};
