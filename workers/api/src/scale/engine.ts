import type { Engine } from '../engines/types';
import { campaignView } from './service';

/** Scale engine (hot tier): will the campaign reach its goal, how many backups, price/% saved now. */
export const scaleEngine: Engine = {
  id: 'scale', intents: ['scale.forecast'], consumes: ['pledge.created', 'backup.promoted', 'strike.issued'], emits: [],
  tier: 0, provider: 'internal', timeoutMs: 3000,
  async handle({ payload, read, agg }) {
    const id = String(payload.campaign_id ?? '');
    if (!(await read.query('select 1 from scale.campaigns where id = $1', [id])).rowCount) throw new Error('campaign not found');
    return { kind: 'scale.forecast', result: await campaignView(agg!, id) as any };
  },
};
