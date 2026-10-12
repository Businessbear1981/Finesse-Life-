import type { Tx } from './db';

export type Verdict = 'verified' | 'contradicted' | 'unverifiable' | 'warn';
export type SourceType = 'db' | 'web' | 'model' | 'api' | 'static';

export interface Source { type: SourceType; ref: string; content?: string }
export interface VerifierResult { verdict: Verdict; confidence: number; sources: Source[] }
export type ClaimVerifier = (claim: string, tx: Tx) => Promise<VerifierResult>;

export interface Claim { text: string; verify: ClaimVerifier }

export interface TruthOutcome {
  passed: boolean;
  checks: { claim: string; verdict: Verdict; confidence: number; gated: boolean }[];
}

export const DEFAULT_MIN_CONFIDENCE = 0.7;

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

/**
 * Truth wrapper: verifies each claim attached to an artifact, records every source it read
 * (orch.source_reads) and every verdict (orch.truth_checks), and gates the artifact when a
 * claim is contradicted or below the confidence floor. A failing verifier counts as unverifiable.
 */
export async function verifyArtifact(
  tx: Tx, // service tx (members cannot write truth checks)
  read: Tx, // member-scoped tx handed to verifiers so RLS bounds what they can see
  opts: { artifactId: string; userId: string; tierRunId?: string; claims: Claim[]; minConfidence?: number },
): Promise<TruthOutcome> {
  const min = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const checks: TruthOutcome['checks'] = [];
  for (const claim of opts.claims) {
    let r: VerifierResult;
    try {
      r = await claim.verify(claim.text, read);
    } catch (e) {
      r = { verdict: 'unverifiable', confidence: 0, sources: [{ type: 'static', ref: `verifier_error:${(e as Error).message}` }] };
    }
    const sourceIds: string[] = [];
    for (const s of r.sources) {
      const { rows } = await tx.query<{ id: string }>(
        `insert into orch.source_reads(user_id, tier_run_id, source_type, ref, content_hash)
         values ($1, $2, $3, $4, $5) returning id`,
        [opts.userId, opts.tierRunId ?? null, s.type, s.ref, s.content ? Buffer.from(await sha256(s.content)) : null]);
      sourceIds.push(rows[0]!.id);
    }
    const confidence = Math.max(0, Math.min(1, r.confidence));
    const gated = r.verdict === 'contradicted' || confidence < min;
    await tx.query(
      `insert into orch.truth_checks(artifact_id, user_id, claim, verdict, confidence, source_ids, gated)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [opts.artifactId, opts.userId, claim.text, r.verdict, confidence, sourceIds, gated]);
    checks.push({ claim: claim.text, verdict: r.verdict, confidence, gated });
  }
  const passed = checks.every((c) => !c.gated);
  await tx.query('update orch.artifacts set verified = $2 where id = $1', [opts.artifactId, passed]);
  return { passed, checks };
}

/** Verifier: claim holds if the member-scoped query returns at least one row. */
export function dbExists(sql: string, params: unknown[] = [], ref = sql): ClaimVerifier {
  return async (_claim, read) => {
    const { rowCount } = await read.query(sql, params);
    return rowCount > 0
      ? { verdict: 'verified', confidence: 1, sources: [{ type: 'db', ref }] }
      : { verdict: 'contradicted', confidence: 1, sources: [{ type: 'db', ref }] };
  };
}
