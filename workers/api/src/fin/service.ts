// Plaid lifecycle: consent → link token → server-side exchange → encrypted token → account sync → disconnect.
import type { Tx } from '../db';
import { PLAID_POLICY } from '../policy';
import { open, seal, sha256Hex, type TokenKeys } from './crypto';
import { minimizeAccount, PlaidError, type PlaidClient } from './plaid';

export class FinError extends Error { constructor(public code: number, msg: string) { super(msg); } }

const aad = (userId: string, plaidItemId: string) => `${userId}:${plaidItemId}`;

export async function recordConsent(tx: Tx, userId: string, scopes: string[], purpose: string, userAgent?: string): Promise<string> {
  const bad = scopes.filter((s) => !PLAID_POLICY.allowedScopes.includes(s));
  if (bad.length || !scopes.length) throw new FinError(400, `scope not allowed: ${bad.join(',') || '(none)'}`);
  return (await tx.query<{ id: string }>(
    `insert into fin.consents(user_id, provider, scopes, purpose, policy_version, user_agent) values ($1,'plaid',$2,$3,$4,$5) returning id`,
    [userId, [...new Set(scopes)], purpose, PLAID_POLICY.version, userAgent?.slice(0, 300) ?? null])).rows[0]!.id;
}

async function activeConsent(tx: Tx, userId: string, consentId: string) {
  const c = (await tx.query<{ id: string }>('select id from fin.consents where id = $1 and user_id = $2 and revoked_at is null', [consentId, userId])).rows[0];
  if (!c) throw new FinError(403, 'consent_required');
}

export async function createLinkToken(tx: Tx, plaid: PlaidClient, userId: string, consentId: string, o: { webhook?: string; redirectUri?: string }) {
  await activeConsent(tx, userId, consentId);
  const n = Number((await tx.query<{ n: string }>("select count(*) n from fin.plaid_items where user_id = $1 and status <> 'revoked'", [userId])).rows[0]!.n);
  if (n >= PLAID_POLICY.maxItemsPerMember) throw new FinError(409, 'item_limit_reached');
  return plaid.createLinkToken({ clientUserId: userId, ...o });
}

export async function exchange(tx: Tx, plaid: PlaidClient, keys: TokenKeys, userId: string, consentId: string, publicToken: string) {
  await activeConsent(tx, userId, consentId);
  const { access_token, item_id } = await plaid.exchangePublicToken(publicToken);
  const item = await plaid.getItem(access_token).catch(() => ({ institution_id: null, institution_name: null }));
  const row = (await tx.query<{ id: string }>(
    `insert into fin.plaid_items(user_id, consent_id, plaid_item_id, institution_id, institution_name)
     values ($1,$2,$3,$4,$5)
     on conflict (plaid_item_id) do update set status = 'active', error_code = null, revoked_at = null, consent_id = excluded.consent_id
       where fin.plaid_items.user_id = excluded.user_id
     returning id`,
    [userId, consentId, item_id, item.institution_id, item.institution_name])).rows[0];
  if (!row) throw new FinError(409, 'item_owned_by_another_member');
  await tx.query(
    `insert into fin.plaid_item_secrets(item_id, access_token_enc, key_version) values ($1,$2,$3)
     on conflict (item_id) do update set access_token_enc = excluded.access_token_enc, key_version = excluded.key_version, updated_at = now()`,
    [row.id, await seal(keys, access_token, aad(userId, item_id)), keys.current.version]);
  const accounts = await syncAccounts(tx, plaid, keys, row.id);
  return { item_id: row.id, institution_name: item.institution_name, accounts };
}

async function tokenFor(tx: Tx, keys: TokenKeys, itemId: string) {
  const r = (await tx.query<{ user_id: string; plaid_item_id: string; access_token_enc: string | null; status: string }>(
    `select i.user_id, i.plaid_item_id, s.access_token_enc, i.status from fin.plaid_items i left join fin.plaid_item_secrets s on s.item_id = i.id where i.id = $1`, [itemId])).rows[0];
  if (!r) throw new FinError(404, 'not_found');
  if (!r.access_token_enc || r.status === 'revoked') throw new FinError(409, 'item_revoked');
  return { ...r, token: await open(keys, r.access_token_enc, aad(r.user_id, r.plaid_item_id)) };
}

/** Upsert the minimized account view; drop accounts the member no longer shares. */
export async function syncAccounts(tx: Tx, plaid: PlaidClient, keys: TokenKeys, itemId: string): Promise<number> {
  const t = await tokenFor(tx, keys, itemId);
  let accts;
  try { accts = await plaid.getAccounts(t.token); } catch (e) {
    if (e instanceof PlaidError && e.code === 'ITEM_LOGIN_REQUIRED') {
      await tx.query("update fin.plaid_items set status = 'login_required', error_code = $2 where id = $1", [itemId, e.code]);
      throw new FinError(409, 'login_required');
    }
    throw e;
  }
  const ids: string[] = [];
  for (const a of accts.map(minimizeAccount)) {
    ids.push(a.plaid_account_id);
    await tx.query(
      `insert into fin.accounts(user_id, item_id, plaid_account_id, name, mask, type, subtype, current_cents, available_cents, iso_currency)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (plaid_account_id) do update set name = excluded.name, mask = excluded.mask, type = excluded.type, subtype = excluded.subtype,
         current_cents = excluded.current_cents, available_cents = excluded.available_cents, iso_currency = excluded.iso_currency, updated_at = now()
       where fin.accounts.item_id = excluded.item_id`,
      [t.user_id, itemId, a.plaid_account_id, a.name, a.mask, a.type, a.subtype, a.current_cents, a.available_cents, a.iso_currency]);
  }
  await tx.query('delete from fin.accounts where item_id = $1 and not (plaid_account_id = any($2::text[]))', [itemId, ids]);
  await tx.query("update fin.plaid_items set last_synced_at = now(), status = 'active', error_code = null where id = $1", [itemId]);
  return ids.length;
}

/** Disconnect: remove at Plaid (best effort if Plaid already revoked it), wipe token + accounts, revoke consent. */
export async function disconnect(tx: Tx, plaid: PlaidClient | null, keys: TokenKeys | null, itemId: string, reason: string, callPlaid = true) {
  const r = (await tx.query<{ consent_id: string; access_token_enc: string | null }>(
    'select i.consent_id, s.access_token_enc from fin.plaid_items i left join fin.plaid_item_secrets s on s.item_id = i.id where i.id = $1', [itemId])).rows[0];
  if (!r) throw new FinError(404, 'not_found');
  if (callPlaid && plaid && keys && r.access_token_enc) {
    const t = await tokenFor(tx, keys, itemId);
    await plaid.removeItem(t.token).catch((e) => { if (!(e instanceof PlaidError && e.code === 'ITEM_NOT_FOUND')) throw e; });
  }
  await tx.query('delete from fin.plaid_item_secrets where item_id = $1', [itemId]);
  await tx.query('delete from fin.accounts where item_id = $1', [itemId]);
  await tx.query("update fin.plaid_items set status = 'revoked', revoked_at = now() where id = $1", [itemId]);
  const others = (await tx.query("select 1 from fin.plaid_items where consent_id = $1 and status <> 'revoked'", [r.consent_id])).rows.length;
  if (!others) await tx.query('update fin.consents set revoked_at = now(), revoke_reason = $2 where id = $1 and revoked_at is null', [r.consent_id, reason]);
}

export interface PlaidWebhook { webhook_type: string; webhook_code: string; item_id?: string; error?: { error_code?: string } | null }

/** Handle a verified webhook once (dedupe on body hash). Returns what was done, for logs/tests. */
export async function handleWebhook(tx: Tx, plaid: PlaidClient, keys: TokenKeys | null, raw: string, w: PlaidWebhook): Promise<string> {
  const h = await sha256Hex(raw);
  const ins = await tx.query(
    'insert into fin.webhook_events(body_sha256, webhook_type, webhook_code, plaid_item_id) values ($1,$2,$3,$4) on conflict (body_sha256) do nothing returning id',
    [h, w.webhook_type, w.webhook_code, w.item_id ?? null]);
  if (!ins.rows.length) return 'duplicate';
  const item = w.item_id ? (await tx.query<{ id: string; status: string }>('select id, status from fin.plaid_items where plaid_item_id = $1', [w.item_id])).rows[0] : undefined;
  let action = 'ignored';
  if (item && item.status !== 'revoked') {
    const key = `${w.webhook_type}:${w.webhook_code}`;
    if (key === 'ITEM:USER_PERMISSION_REVOKED' || key === 'ITEM:USER_ACCOUNT_REVOKED') {
      await disconnect(tx, plaid, keys, item.id, 'revoked_at_institution', false); action = 'revoked';
    } else if (key === 'ITEM:ERROR') {
      const code = w.error?.error_code ?? 'ERROR';
      await tx.query('update fin.plaid_items set status = $2, error_code = $3 where id = $1', [item.id, code === 'ITEM_LOGIN_REQUIRED' ? 'login_required' : 'error', code]); action = 'error';
    } else if (key === 'ITEM:PENDING_DISCONNECT' || key === 'ITEM:PENDING_EXPIRATION') {
      await tx.query("update fin.plaid_items set status = 'pending_disconnect' where id = $1", [item.id]); action = 'pending_disconnect';
    } else if (key === 'ITEM:LOGIN_REPAIRED' || key === 'ITEM:NEW_ACCOUNTS_AVAILABLE' || w.webhook_type === 'TRANSACTIONS' || key === 'HOLDINGS:DEFAULT_UPDATE') {
      if (keys) {
        try { await syncAccounts(tx, plaid, keys, item.id); action = 'synced'; } catch (e) { if (e instanceof FinError) action = e.message; else throw e; }
      }
    }
  }
  await tx.query('update fin.webhook_events set processed_at = now() where body_sha256 = $1', [h]);
  return action;
}
