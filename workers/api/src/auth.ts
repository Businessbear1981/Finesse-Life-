import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { MiddlewareHandler } from 'hono';
import type { Claims } from './env';
import type { AppEnv } from './app';

export interface WorkosTokenClaims {
  sub: string;
  sid?: string;
  org_id?: string;
  role?: string;
  step_up_at?: number;
}

export interface Verifier {
  verify(token: string): Promise<WorkosTokenClaims>;
}

const jwksCache = new Map<string, JWTVerifyGetKey>();

/** Verifies WorkOS AuthKit access tokens against the client's JWKS. */
export function workosVerifier(clientId: string, keys?: JWTVerifyGetKey): Verifier {
  let jwks = keys ?? jwksCache.get(clientId);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${clientId}`));
    jwksCache.set(clientId, jwks);
  }
  const getKey = jwks;
  return {
    async verify(token) {
      const { payload } = await jwtVerify(token, getKey, {
        issuer: [`https://api.workos.com/user_management/${clientId}`, 'https://api.workos.com'],
        algorithms: ['RS256'],
        clockTolerance: 30,
      });
      if (typeof payload.sub !== 'string') throw new Error('token has no subject');
      return {
        sub: payload.sub,
        sid: payload.sid as string | undefined,
        org_id: payload.org_id as string | undefined,
        role: payload.role as string | undefined,
        // Optional custom claim added by a WorkOS JWT template after a passkey step-up.
        step_up_at: typeof payload.step_up_at === 'number' ? payload.step_up_at : undefined,
      };
    },
  };
}

function bearer(header: string | undefined): string | null {
  const m = header?.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

/**
 * Verifies the WorkOS JWT, maps the WorkOS user to app.users (creating it on first sight),
 * and stores Postgres claims on the context. Every DB call then runs with these claims so RLS applies.
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = bearer(c.req.header('authorization'));
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  let t: WorkosTokenClaims;
  try {
    t = await c.var.deps.verifier.verify(token);
  } catch {
    return c.json({ error: 'invalid_token' }, 401);
  }
  const uid = await c.var.deps.db.tx('app_service', null, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `insert into app.users(workos_user_id) values ($1)
       on conflict (workos_user_id) do update set updated_at = app.users.updated_at
       returning id`,
      [t.sub],
    );
    return rows[0]!.id;
  });
  const claims: Claims = { uid, sub: t.sub, sid: t.sid, org_id: t.org_id, role: t.role, step_up_at: t.step_up_at };
  c.set('claims', claims);
  await next();
};
