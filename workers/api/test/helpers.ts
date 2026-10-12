import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from 'jose';
import pg from 'pg';
import type { Env } from '../src/env';
// @ts-expect-error plain JS module shared with db/
import { migrate } from '../../../db/migrate.mjs';

export const CLIENT_ID = 'client_test';

export async function makeKeys() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
  const jwks = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown>, opts: { iss?: string; exp?: string } = {}) =>
    new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(opts.iss ?? `https://api.workos.com/user_management/${CLIENT_ID}`)
      .setIssuedAt().setExpirationTime(opts.exp ?? '5m').sign(privateKey);
  return { jwks, sign };
}

export const testEnv = (over: Partial<Env> = {}): Env => ({
  WORKOS_CLIENT_ID: CLIENT_ID,
  ALLOWED_ORIGINS: 'https://finesselife.vip',
  R2_ACCOUNT_ID: 'REPLACE_ME',
  R2_MEDIA_BUCKET_NAME: 'finesse-media',
  ...over,
} as Env);

export const ADMIN_URL = process.env.TEST_DATABASE_URL;

export async function freshDb(name: string): Promise<string> {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${name}`);
  await admin.query(`create database ${name}`);
  await admin.end();
  const u = new URL(ADMIN_URL!); u.pathname = '/' + name;
  await migrate(u.toString(), { log: () => {} });
  return u.toString();
}
