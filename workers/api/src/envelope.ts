import { z } from 'zod';
import type { Database } from './db';
import type { Claims } from './env';
import { EngineRegistry, LEGACY_INTENTS, type ModelProvider } from './engines';
import { breakerAllows, recordResult } from './breaker';
import { verifyArtifact, type TruthOutcome } from './truth';

export const EnvelopeSchema = z.object({
  intent: z.string().min(1).max(64).regex(/^[a-z0-9_.]+$/),
  payload: z.record(z.string(), z.unknown()).default({}),
  idempotency_key: z.string().min(8).max(128),
});
export type Envelope = z.infer<typeof EnvelopeSchema>;

export type EnvelopeResult =
  | { status: 'done' | 'awaiting_confirmation' | 'gated'; intent_id: string; artifact_id: string; result: unknown; truth: TruthOutcome; commitment_ids: string[]; replayed: boolean }
  | { status: 'failed'; intent_id: string; error: string; replayed: boolean };

export class EnvelopeError extends Error {
  constructor(public code: number, message: string) { super(message); }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(`engine timeout after ${ms}ms`)), ms); }),
  ]);
}

/**
 * Envelope handler: envelope → intent → play → tier_run → artifact → truth checks → commitments → events/outbox.
 * Idempotent per (user, idempotency_key): a replay returns the stored outcome without re-running the engine.
 */
export async function handleEnvelope(db: Database, registry: EngineRegistry, claims: Claims, env: Envelope, model?: ModelProvider): Promise<EnvelopeResult> {
  const engine = registry.forIntent(env.intent);
  if (!engine) {
    if (LEGACY_INTENTS.includes(env.intent)) throw new EnvelopeError(501, `intent ${env.intent} is not ported to an engine yet`);
    throw new EnvelopeError(400, `unknown intent ${env.intent}`);
  }
  const uid = claims.uid;

  // 1. Intent, as the member (RLS enforces ownership).
  const intent = await db.tx('app_user', claims, async (tx) => {
    const ins = await tx.query<{ id: string }>(
      `insert into orch.intents(user_id, kind, payload, idempotency_key) values ($1, $2, $3, $4)
       on conflict (user_id, idempotency_key) do nothing returning id`,
      [uid, env.intent, env.payload, env.idempotency_key]);
    if (ins.rows[0]) return { id: ins.rows[0].id, replay: false };
    const { rows } = await tx.query<{ id: string; kind: string }>(
      'select id, kind from orch.intents where user_id = $1 and idempotency_key = $2', [uid, env.idempotency_key]);
    if (rows[0]!.kind !== env.intent) throw new EnvelopeError(409, 'idempotency_key reused for a different intent');
    return { id: rows[0]!.id, replay: true };
  });

  if (intent.replay) return replay(db, claims, intent.id);

  // 2. Plan + run under the breaker, recorded by the service role.
  const run = await db.tx('app_service', claims, async (tx) => {
    const play = (await tx.query<{ id: string }>(
      `insert into orch.plays(intent_id, user_id, engine, plan, status) values ($1, $2, $3, $4, 'running') returning id`,
      [intent.id, uid, engine.id, { tier: engine.tier, provider: engine.provider }])).rows[0]!.id;
    await tx.query("update orch.intents set status = 'running', updated_at = now() where id = $1", [intent.id]);
    if (!(await breakerAllows(tx, engine.provider))) {
      await tx.query(`insert into orch.tier_runs(play_id, user_id, tier, provider, status, finished_at) values ($1, $2, $3, $4, 'breaker_open', now())`,
        [play, uid, engine.tier, engine.provider]);
      return { play, tierRun: null as string | null, error: `provider ${engine.provider} unavailable (breaker open)` };
    }
    const tierRun = (await tx.query<{ id: string }>(
      'insert into orch.tier_runs(play_id, user_id, tier, provider) values ($1, $2, $3, $4) returning id',
      [play, uid, engine.tier, engine.provider])).rows[0]!.id;
    return { play, tierRun, error: null as string | null };
  });

  let output: Awaited<ReturnType<typeof engine.handle>> | null = null;
  let error = run.error;
  const started = Date.now();
  if (!error) {
    try {
      output = await db.tx('app_user', claims, (read) => db.tx('app_service', claims, (agg) =>
        withTimeout(engine.handle({ intent: env.intent, payload: env.payload, userId: uid, read, agg, model }), engine.timeoutMs)));
    } catch (e) {
      error = (e as Error).message;
    }
  }

  // 3. Persist outcome, verify, propose commitments, emit events (outbox) — one transaction.
  return db.tx('app_service', claims, async (tx) => {
    if (run.tierRun) {
      await tx.query(`update orch.tier_runs set status = $2, latency_ms = $3, error = $4, finished_at = now() where id = $1`,
        [run.tierRun, error ? (error.includes('timeout') ? 'timeout' : 'error') : 'ok', Date.now() - started, error]);
      await recordResult(tx, engine.provider, !error);
    }
    if (error || !output) {
      await tx.query("update orch.plays set status = 'failed' where id = $1", [run.play]);
      await tx.query("update orch.intents set status = 'failed', updated_at = now() where id = $1", [intent.id]);
      await tx.query("select orch.emit('intent.failed', $1::jsonb, 'events', $2)", [{ intent: env.intent, error }, intent.id]);
      return { status: 'failed', intent_id: intent.id, error: error ?? 'no output', replayed: false };
    }
    const artifact = (await tx.query<{ id: string }>(
      'insert into orch.artifacts(play_id, user_id, kind, body) values ($1, $2, $3, $4) returning id',
      [run.play, uid, output.kind, output.result])).rows[0]!.id;
    const truth = await db.tx('app_user', claims, (read) =>
      verifyArtifact(tx, read, { artifactId: artifact, userId: uid, tierRunId: run.tierRun ?? undefined, claims: output!.claims ?? [] }));
    const commitmentIds: string[] = [];
    if (truth.passed) {
      for (const cm of output.commitments ?? []) {
        const { rows } = await tx.query<{ id: string }>(
          `insert into orch.commitments(intent_id, user_id, action, amount_cents, currency, requires_step_up)
           values ($1, $2, $3, $4, $5, $6) returning id`,
          [intent.id, uid, cm.action, cm.amount_cents ?? null, cm.currency ?? null, cm.requires_step_up ?? true]);
        commitmentIds.push(rows[0]!.id);
      }
      for (const ev of output.events ?? []) {
        if (!engine.emits.includes(ev.type)) throw new Error(`engine ${engine.id} may not emit ${ev.type}`);
        await tx.query("select orch.emit($1, $2::jsonb, 'events', $3)", [ev.type, ev.payload, intent.id]);
      }
    }
    const status = !truth.passed ? 'gated' : commitmentIds.length ? 'awaiting_confirmation' : 'done';
    await tx.query("update orch.plays set status = 'done' where id = $1", [run.play]);
    await tx.query('update orch.intents set status = $2, updated_at = now() where id = $1',
      [intent.id, status === 'gated' ? 'failed' : status]);
    await tx.query("select orch.emit('intent.completed', $1::jsonb, 'events', $2)", [{ intent: env.intent, status }, intent.id]);
    return { status, intent_id: intent.id, artifact_id: artifact, result: output.result, truth, commitment_ids: commitmentIds, replayed: false };
  });
}

async function replay(db: Database, claims: Claims, intentId: string): Promise<EnvelopeResult> {
  return db.tx('app_user', claims, async (tx) => {
    const intent = (await tx.query<{ status: string }>('select status from orch.intents where id = $1', [intentId])).rows[0]!;
    const art = (await tx.query<{ id: string; body: unknown; verified: boolean }>(
      `select a.id, a.body, a.verified from orch.artifacts a join orch.plays p on p.id = a.play_id
       where p.intent_id = $1 order by a.created_at desc limit 1`, [intentId])).rows[0];
    if (!art) return { status: 'failed', intent_id: intentId, error: `intent is ${intent.status}`, replayed: true };
    const checks = (await tx.query<{ claim: string; verdict: any; confidence: number; gated: boolean }>(
      'select claim, verdict, confidence, gated from orch.truth_checks where artifact_id = $1 order by created_at', [art.id])).rows;
    const cms = (await tx.query<{ id: string }>('select id from orch.commitments where intent_id = $1 order by created_at', [intentId])).rows;
    const status = !art.verified ? 'gated' : intent.status === 'awaiting_confirmation' ? 'awaiting_confirmation' : 'done';
    return { status, intent_id: intentId, artifact_id: art.id, result: art.body, truth: { passed: art.verified, checks }, commitment_ids: cms.map((c) => c.id), replayed: true };
  });
}
