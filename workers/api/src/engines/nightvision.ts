import type { Engine } from './types';

/**
 * Nightvision (skeleton). Consent-gated Style DNA. Unconsented data stays absent; a revoked consent
 * removes the member from match counts (Engines Spec). Seeds Scale campaigns with a starting pace.
 * TODO: image analysis pipeline (Railway), embedding (Vectorize), taste vector refresh on signals.
 */
export const nightvisionEngine: Engine = {
  id: 'nightvision', intents: ['nightvision.consent', 'nightvision.revoke', 'nightvision.style_dna', 'nightvision.campaign_seed'],
  consumes: [], emits: ['nightvision.consent_changed'], tier: 1, provider: 'internal', timeoutMs: 5000,
  async handle({ intent, payload, userId, read, agg }) {
    if (intent === 'nightvision.consent' || intent === 'nightvision.revoke') {
      const grant = intent === 'nightvision.consent';
      await agg!.query(
        `insert into engines.nightvision_consents(user_id, revoked_at) values ($1, $2)
         on conflict (user_id) do update set granted_at = case when $2::timestamptz is null then now() else engines.nightvision_consents.granted_at end, revoked_at = $2`,
        [userId, grant ? null : new Date()]);
      return { kind: 'nightvision.consent', result: { consented: grant }, events: [{ type: 'nightvision.consent_changed', payload: { consented: grant } }] };
    }
    if (intent === 'nightvision.style_dna') {
      const consent = (await read.query("select 1 from engines.nightvision_consents where user_id = $1 and revoked_at is null", [userId])).rowCount;
      if (!consent) return { kind: 'nightvision.style_dna', result: { consented: false, style_dna: null } };
      const dna = (await read.query<{ style_dna: unknown }>('select style_dna from public.profiles where id = $1', [userId])).rows[0]?.style_dna ?? null;
      return { kind: 'nightvision.style_dna', result: { consented: true, style_dna: dna } };
    }
    // Campaign seed: count consented members whose Style DNA labels match the product tags (aggregate only; cohorts < 20 dropped).
    const tags = (payload.tags as string[] | undefined) ?? [];
    const n = (await agg!.query<{ n: number }>(
      `select count(*)::int n from public.profiles p join engines.nightvision_consents c on c.user_id = p.id and c.revoked_at is null
       where p.style_dna is not null and exists (select 1 from jsonb_array_elements_text(coalesce(p.style_dna->'style_labels','[]')) l where l = any($1::text[]))`, [tags])).rows[0]!.n;
    return { kind: 'nightvision.campaign_seed', result: { matched_members: n >= 20 ? n : 0, suppressed: n > 0 && n < 20 } };
  },
};
