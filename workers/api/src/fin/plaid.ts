// Plaid adapter. Live client is fetch-only (no SDK) against https://{sandbox|production}.plaid.com.
// API refs: /link/token/create, /item/public_token/exchange, /item/get, /accounts/balance/get, /item/remove,
// /webhook_verification_key/get (https://plaid.com/docs/api/).
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from 'jose';
import { PLAID_POLICY } from '../policy';
import { sha256Hex } from './crypto';

export interface PlaidAccount {
  account_id: string; name: string; mask: string | null; type: string; subtype: string | null;
  balances: { current: number | null; available: number | null; iso_currency_code: string | null };
}
export interface PlaidClient {
  id: 'plaid' | 'fake';
  createLinkToken(o: { clientUserId: string; webhook?: string; redirectUri?: string }): Promise<{ link_token: string; expiration: string }>;
  exchangePublicToken(publicToken: string): Promise<{ access_token: string; item_id: string }>;
  getItem(accessToken: string): Promise<{ item_id: string; institution_id: string | null; institution_name: string | null }>;
  getAccounts(accessToken: string): Promise<PlaidAccount[]>;
  removeItem(accessToken: string): Promise<void>;
  webhookVerificationKey(kid: string): Promise<JWK & { expired_at?: number | null }>;
}

export class PlaidError extends Error {
  constructor(public code: string, public status = 502) { super(code); }
}

export function livePlaid(o: { clientId: string; secret: string; env: 'sandbox' | 'production'; fetchImpl?: typeof fetch }): PlaidClient {
  const base = `https://${o.env}.plaid.com`;
  const f = o.fetchImpl ?? fetch;
  const call = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
    const r = await f(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Plaid-Version': '2020-09-14' },
      body: JSON.stringify({ client_id: o.clientId, secret: o.secret, ...body }),
    });
    const j = (await r.json().catch(() => ({}))) as T & { error_code?: string };
    if (!r.ok) throw new PlaidError(j.error_code ?? `http_${r.status}`, r.status >= 500 ? 502 : 400);
    return j;
  };
  return {
    id: 'plaid',
    async createLinkToken({ clientUserId, webhook, redirectUri }) {
      return call('/link/token/create', {
        client_name: 'Finesse', language: 'en', country_codes: PLAID_POLICY.countryCodes,
        user: { client_user_id: clientUserId }, products: PLAID_POLICY.linkProducts,
        transactions: { days_requested: PLAID_POLICY.transactionsDaysRequested },
        ...(webhook ? { webhook } : {}), ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      });
    },
    exchangePublicToken: (public_token) => call('/item/public_token/exchange', { public_token }),
    async getItem(access_token) {
      const j = await call<{ item: { item_id: string; institution_id?: string | null; institution_name?: string | null } }>('/item/get', { access_token });
      return { item_id: j.item.item_id, institution_id: j.item.institution_id ?? null, institution_name: j.item.institution_name ?? null };
    },
    async getAccounts(access_token) {
      return (await call<{ accounts: PlaidAccount[] }>('/accounts/balance/get', { access_token })).accounts;
    },
    async removeItem(access_token) { await call('/item/remove', { access_token }); },
    async webhookVerificationKey(key_id) { return (await call<{ key: JWK & { expired_at?: number | null } }>('/webhook_verification_key/get', { key_id })).key; },
  };
}

/** Deterministic in-memory Plaid for tests and PLAID_ENV=fake. Public tokens look like "public-fake-<institution>". */
export function fakePlaid(opts: { webhookKey?: JWK } = {}): PlaidClient & { removed: string[]; accounts: Map<string, PlaidAccount[]> } {
  const items = new Map<string, { item_id: string; inst: string }>();
  const accounts = new Map<string, PlaidAccount[]>();
  const removed: string[] = [];
  let n = 0;
  const get = (t: string) => { const i = items.get(t); if (!i || removed.includes(t)) throw new PlaidError('ITEM_NOT_FOUND', 400); return i; };
  return {
    id: 'fake', removed, accounts,
    async createLinkToken({ clientUserId }) { return { link_token: `link-sandbox-fake-${clientUserId.slice(0, 8)}-${++n}`, expiration: new Date(Date.now() + 4 * 3600e3).toISOString() }; },
    async exchangePublicToken(pt) {
      if (!pt.startsWith('public-fake-')) throw new PlaidError('INVALID_PUBLIC_TOKEN', 400);
      const inst = pt.slice('public-fake-'.length) || 'ins_1';
      const access_token = `access-fake-${++n}-${crypto.randomUUID()}`;
      const item_id = `item-fake-${n}-${crypto.randomUUID().slice(0, 8)}`;
      items.set(access_token, { item_id, inst });
      accounts.set(access_token, [
        { account_id: `${item_id}-chk`, name: 'Plaid Checking', mask: '0000', type: 'depository', subtype: 'checking', balances: { current: 110.5, available: 100, iso_currency_code: 'USD' } },
        { account_id: `${item_id}-cc`, name: 'Plaid Credit Card', mask: '3333', type: 'credit', subtype: 'credit card', balances: { current: 410, available: null, iso_currency_code: 'USD' } },
      ]);
      return { access_token, item_id };
    },
    async getItem(t) { const i = get(t); return { item_id: i.item_id, institution_id: i.inst, institution_name: `Institution ${i.inst}` }; },
    async getAccounts(t) { get(t); return accounts.get(t) ?? []; },
    async removeItem(t) { get(t); removed.push(t); },
    async webhookVerificationKey(kid) { if (!opts.webhookKey || opts.webhookKey.kid !== kid) throw new PlaidError('INVALID_KEY', 400); return opts.webhookKey; },
  };
}

/**
 * Plaid webhook verification (https://plaid.com/docs/api/webhooks/webhook-verification/):
 * ES256 JWT in Plaid-Verification, key fetched by kid, iat within 5 minutes, request_body_sha256 matches the raw body.
 */
export async function verifyPlaidWebhook(plaid: PlaidClient, header: string | null | undefined, rawBody: string, now = Date.now()): Promise<boolean> {
  if (!header) return false;
  try {
    const { alg, kid } = decodeProtectedHeader(header);
    if (alg !== 'ES256' || !kid) return false;
    const jwk = await plaid.webhookVerificationKey(kid);
    if (jwk.expired_at && jwk.expired_at * 1000 < now) return false;
    const { payload } = await jwtVerify(header, await importJWK(jwk, 'ES256'), { algorithms: ['ES256'], maxTokenAge: `${PLAID_POLICY.webhookMaxAgeSeconds}s`, currentDate: new Date(now) });
    const claimed = String((payload as { request_body_sha256?: string }).request_body_sha256 ?? '');
    const actual = await sha256Hex(rawBody);
    if (claimed.length !== actual.length) return false;
    let diff = 0; for (let i = 0; i < actual.length; i++) diff |= claimed.charCodeAt(i) ^ actual.charCodeAt(i);
    return diff === 0;
  } catch { return false; }
}

const cents = (v: number | null | undefined) => (v == null ? null : Math.round(v * 100));
export const minimizeAccount = (a: PlaidAccount) => ({
  plaid_account_id: a.account_id, name: a.name.slice(0, 120), mask: a.mask ? a.mask.slice(-4) : null, type: a.type, subtype: a.subtype,
  current_cents: cents(a.balances.current), available_cents: cents(a.balances.available), iso_currency: a.balances.iso_currency_code,
});
