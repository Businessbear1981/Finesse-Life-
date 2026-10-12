/**
 * Account lifecycle — member-initiated deletion (App Store 5.1.1(v), Google Play) and
 * password re-confirmation shared with the lift-PIN reset.
 * SERVER-ONLY — never import from a client component.
 *
 * Deletion order (deleteAccount):
 *   0. close the member's Stripe customer (cancels any subscription so a deleted member is
 *      never charged again). If this fails nothing else is deleted — the member can retry.
 *   1. collect the member's R2 object keys (before the rows that name them are gone)
 *   2. public.delete_member_data(uid) — one transaction (20261012_account_lifecycle.sql):
 *      cancels live Scale pledges, anonymises financial/shared rows, deletes member-owned rows
 *      whose FK would block step 4
 *   3. delete the R2 objects (best effort — a storage outage never strands the account half-deleted)
 *   4. auth.admin.deleteUser(uid) — cascades every remaining member table
 * Steps 2 and 4 are idempotent, so a failed run can simply be retried by the member.
 */
import {randomUUID} from 'crypto';
import {DeleteObjectsCommand, ListObjectsV2Command} from '@aws-sdk/client-s3';
import {createClient as createSupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {LOCKOUT, VIP_LIFT_COOKIE, service, sha256} from '@/lib/keylock-server';
import {closeStripeCustomer} from '@/lib/billing';
import {r2} from '@/lib/r2';

/* ── Request contracts ────────────────────────────────────────────────── */

export const DELETE_CONFIRM_WORD = 'DELETE';

const password = z.string().min(1, 'password required').max(512);

export const deleteAccountRequest = z.object({
  confirm: z.literal(DELETE_CONFIRM_WORD, {error: `Type ${DELETE_CONFIRM_WORD} to confirm.`}),
  password,
});

export const pinResetRequest = z.object({password});

/* ── Uploads: allowlisted prefixes, always namespaced by member ───────── */

/** Every `type` the app's upload forms send. Anything else is refused. */
export const UPLOAD_TYPES = ['upload', 'avatar', 'private-avatar', 'photo', 'private-photo', 'post', 'nightvision'] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID_RE.test(v);

/** Missing/empty → 'upload' (the old default); unknown → null (caller answers 400). */
export function resolveUploadType(raw: unknown): UploadType | null {
  if (raw === null || raw === undefined || raw === '') return 'upload';
  return typeof raw === 'string' && (UPLOAD_TYPES as readonly string[]).includes(raw) ? (raw as UploadType) : null;
}

/** `<type>s/<userId>/<ms>-<rand>.<ext>` — the layout existing objects already use. */
export function memberUploadKey(type: UploadType, userId: string, ext: string, now = Date.now(), rand = randomUUID()): string {
  if (!isUuid(userId)) throw new Error('memberUploadKey: userId must be a uuid');
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  return `${type}s/${userId}/${now}-${rand.replace(/-/g, '').slice(0, 8)}.${safeExt}`;
}

/** R2 prefixes that only ever hold this member's objects (uploads + Camera). */
export function memberStoragePrefixes(userId: string): string[] {
  if (!isUuid(userId)) throw new Error('memberStoragePrefixes: userId must be a uuid');
  return [...UPLOAD_TYPES.map((t) => `${t}s/${userId}/`), `camera/${userId}/`];
}

/* ── Session cookies to drop once the account is gone ─────────────────── */

export function sessionCookiesToClear(cookieNames: string[]): string[] {
  const names = new Set(cookieNames.filter((n) => n.startsWith('sb-')));
  names.add(VIP_LIFT_COOKIE);
  return [...names];
}

/* ── Password re-confirmation ─────────────────────────────────────────── */

/**
 * Checks the member's current password with a throwaway anon client (never the request's
 * session client, so the member's cookies are untouched), then revokes that throwaway
 * session only (scope 'local' — 'global' would sign the member out everywhere).
 */
export async function verifyPassword(email: string, pw: string, expectedUserId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  const client = createSupabaseClient(url, anon, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
  const {data, error} = await client.auth.signInWithPassword({email, password: pw});
  if (error || !data.user) return false;
  await client.auth.signOut({scope: 'local'}).catch(() => undefined);
  return data.user.id === expectedUserId;
}

/* ── Audit + rate limiting (access_audit_events, as the KeyLocks do) ───── */

export type AuditLock = 'account' | 'vip_lift';
export const accountSubject = (userId: string) => sha256(`account:${userId}`);
/** Same subject the lift uses, so password failures and PIN failures share one lockout. */
export const liftSubject = (userId: string) => sha256(`vip_lift:${userId}`);

export const PIN_RESET_DAILY_MAX = 3;

export async function countAuditEvents(q: {lock: AuditLock; subjectHash: string; outcomes: string[]; eventType?: string; sinceMs: number}): Promise<number> {
  let query = service()
    .from('access_audit_events')
    .select('id', {count: 'exact', head: true})
    .eq('lock', q.lock)
    .eq('subject_hash', q.subjectHash)
    .in('outcome', q.outcomes)
    .gte('created_at', new Date(Date.now() - q.sinceMs).toISOString());
  if (q.eventType) query = query.eq('event_type', q.eventType);
  const {count} = await query;
  return count ?? 0;
}

export const recentPasswordFailures = (lock: AuditLock, subjectHash: string) =>
  countAuditEvents({lock, subjectHash, outcomes: ['invalid'], sinceMs: LOCKOUT.windowMs});

export async function auditEvent(row: {lock: AuditLock; eventType: string; outcome: string; subjectHash: string; traceId: string; userId?: string | null}) {
  const {error} = await service().from('access_audit_events').insert({
    lock: row.lock,
    event_type: row.eventType,
    outcome: row.outcome,
    subject_hash: row.subjectHash,
    trace_id: row.traceId,
    user_id: row.userId ?? null,
  });
  if (error) console.warn(`[account] audit insert failed (${row.eventType})`, error.message, row.traceId);
}

/* ── Deletion orchestration ───────────────────────────────────────────── */

export type DeletionDeps = {
  /** Cancel billing first; must throw if the member could still be charged. */
  closeBilling?: (userId: string) => Promise<unknown>;
  collectStorageKeys: (userId: string) => Promise<string[]>;
  deleteMemberData: (userId: string) => Promise<unknown>;
  deleteStorageKeys: (keys: string[]) => Promise<{deleted: number; failed: number}>;
  deleteAuthUser: (userId: string) => Promise<void>;
};

export type DeletionOutcome =
  | {ok: true; summary: unknown; storage: {deleted: number; failed: number}}
  | {ok: false; stage: 'billing' | 'data' | 'auth'; message: string};

export async function deleteAccount(userId: string, deps: DeletionDeps): Promise<DeletionOutcome> {
  if (deps.closeBilling) {
    try {
      await deps.closeBilling(userId);
    } catch (e) {
      return {ok: false, stage: 'billing', message: (e as Error).message};
    }
  }

  let keys: string[] = [];
  try {
    keys = await deps.collectStorageKeys(userId);
  } catch (e) {
    console.warn('[account] could not list storage objects', (e as Error).message);
  }

  let summary: unknown;
  try {
    summary = await deps.deleteMemberData(userId);
  } catch (e) {
    return {ok: false, stage: 'data', message: (e as Error).message};
  }

  let storage = {deleted: 0, failed: keys.length};
  try {
    storage = keys.length ? await deps.deleteStorageKeys(keys) : {deleted: 0, failed: 0};
  } catch (e) {
    console.warn('[account] storage delete failed', (e as Error).message);
  }

  try {
    await deps.deleteAuthUser(userId);
  } catch (e) {
    return {ok: false, stage: 'auth', message: (e as Error).message};
  }
  return {ok: true, summary, storage};
}

/* ── Production dependencies (service role + R2) ──────────────────────── */

const R2_BUCKET = process.env.R2_BUCKET ?? 'finesse-life';
const r2Configured = () => Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

async function listPrefix(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await r2.send(new ListObjectsV2Command({Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken: token}));
    for (const o of page.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

export function serviceDeletionDeps(): DeletionDeps {
  const db = service();
  return {
    async closeBilling(userId) {
      const {data, error} = await db.from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
      if (error) throw new Error(`billing lookup failed: ${error.message}`);
      if (!data) return false; // never had a Stripe customer
      if (!process.env.STRIPE_SECRET_KEY) throw new Error('billing is not configured; cannot cancel the subscription');
      return closeStripeCustomer(db as never, userId);
    },
    async collectStorageKeys(userId) {
      if (!r2Configured()) return [];
      const keys = new Set<string>();
      // Keys recorded in rows (Camera photos, generated media under non-member prefixes).
      const camera = await db.from('camera_items').select('image_key').eq('user_id', userId);
      for (const row of (camera.data ?? []) as {image_key: string | null}[]) if (row.image_key) keys.add(row.image_key);
      const media = await db.from('media_assets').select('r2_key').eq('user_id', userId);
      for (const row of (media.data ?? []) as {r2_key: string | null}[]) if (row.r2_key) keys.add(row.r2_key);
      for (const prefix of memberStoragePrefixes(userId)) for (const k of await listPrefix(prefix)) keys.add(k);
      return [...keys];
    },
    async deleteMemberData(userId) {
      const {data, error} = await db.rpc('delete_member_data', {p_user: userId});
      if (error) throw new Error(error.message);
      return data;
    },
    async deleteStorageKeys(keys) {
      let deleted = 0;
      let failed = 0;
      for (let i = 0; i < keys.length; i += 1000) {
        const chunk = keys.slice(i, i + 1000);
        try {
          const out = await r2.send(new DeleteObjectsCommand({Bucket: R2_BUCKET, Delete: {Objects: chunk.map((Key) => ({Key})), Quiet: true}}));
          const errs = out.Errors?.length ?? 0;
          failed += errs;
          deleted += chunk.length - errs;
        } catch {
          failed += chunk.length;
        }
      }
      return {deleted, failed};
    },
    async deleteAuthUser(userId) {
      const {error} = await db.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
  };
}
