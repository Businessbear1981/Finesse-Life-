import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Claims, Env } from './env';
import type { Database } from './db';
import { pgDatabase } from './db';
import { requireAuth, workosVerifier, type Verifier } from './auth';
import { defaultRegistry, type EngineRegistry, type ModelProvider } from './engines';
import { gatewayModel, nullModel } from './model';
import { EnvelopeError, EnvelopeSchema, handleEnvelope } from './envelope';
import { mobile } from './routes/mobile';

export interface Deps { db: Database; verifier: Verifier; registry: EngineRegistry; model?: ModelProvider }
export type AppEnv = { Bindings: Env; Variables: { deps: Deps; claims: Claims } };
export type DepsFactory = (env: Env) => Deps;

export const defaultDeps: DepsFactory = (env) => ({
  db: pgDatabase(env.HYPERDRIVE.connectionString),
  verifier: workosVerifier(env.WORKOS_CLIENT_ID),
  registry: defaultRegistry(),
  model: env.AI_GATEWAY_API_KEY ? gatewayModel(env.AI_GATEWAY_API_KEY) : nullModel,
});

export function createApp(makeDeps: DepsFactory = defaultDeps) {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    const origins = (c.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    return cors({ origin: origins, allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'], maxAge: 600 })(c, next);
  });
  app.use('*', async (c, next) => { c.set('deps', makeDeps(c.env)); await next(); });

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/v1/engines', (c) => c.json({ engines: c.var.deps.registry.list() }));

  app.post('/v1/envelope', requireAuth, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = EnvelopeSchema.safeParse({ ...(body ?? {}), idempotency_key: body?.idempotency_key ?? c.req.header('idempotency-key') });
    if (!parsed.success) return c.json({ error: 'invalid_envelope', issues: parsed.error.issues }, 400);
    try {
      const r = await handleEnvelope(c.var.deps.db, c.var.deps.registry, c.var.claims, parsed.data, c.var.deps.model);
      return c.json(r, r.status === 'failed' ? 502 : r.status === 'gated' ? 422 : 200);
    } catch (e) {
      if (e instanceof EnvelopeError) return c.json({ error: e.message }, e.code as 400);
      throw e;
    }
  });

  /** Confirm a proposed commitment. Money/irreversible actions need a fresh passkey step-up (enforced by RLS too). */
  app.post('/v1/commitments/:id/confirm', requireAuth, async (c) => {
    const id = c.req.param('id');
    const r = await c.var.deps.db.tx('app_user', c.var.claims, async (tx) => {
      const cm = (await tx.query<{ requires_step_up: boolean; status: string }>(
        'select requires_step_up, status from orch.commitments where id = $1', [id])).rows[0];
      if (!cm) return { code: 404 as const, body: { error: 'not_found' } };
      if (cm.status !== 'proposed') return { code: 409 as const, body: { error: `commitment is ${cm.status}` } };
      const fresh = (await tx.query<{ ok: boolean }>('select app.stepped_up() ok')).rows[0]!.ok;
      if (cm.requires_step_up && !fresh) return { code: 403 as const, body: { error: 'step_up_required' } };
      await tx.query("update orch.commitments set status = 'confirmed', confirmed_at = now() where id = $1 and expires_at > now()", [id]);
      await tx.query("select orch.emit('commitment.confirmed', jsonb_build_object('commitment_id', $1::text))", [id]);
      return { code: 200 as const, body: { ok: true } };
    });
    return c.json(r.body, r.code);
  });

  app.route('/api', mobile);

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'internal_error' }, 500);
  });
  return app;
}
