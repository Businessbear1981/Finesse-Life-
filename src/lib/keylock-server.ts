/**
 * Server-only KeyLock primitives shared by the public entrance lock and the
 * VIP private lift. The two locks never share challenges, cookies or audit rows.
 * SERVER-ONLY — never import from a client component.
 */
import {createHash, createHmac, randomBytes, randomUUID, scrypt as _scrypt, timingSafeEqual} from 'crypto';
import {promisify} from 'util';
import type {NextRequest} from 'next/server';
import {createServiceClient} from '@/lib/supabase/service';

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, keylen: number, opts: {N: number}) => Promise<Buffer>;

export type LockName = 'entrance' | 'vip_lift';

export const ENTRANCE_COOKIE = 'fl_entrance';
export const VIP_LIFT_COOKIE = 'fl_vip_lift';

export const CHALLENGE_TTL_MS = {entrance: 2 * 60_000, vip_lift: 3 * 60_000} as const;
export const VIP_LIFT_SESSION_TTL_MS = 30 * 60_000;
/** Max failed verifications per subject per window before the lock holds. */
export const LOCKOUT = {windowMs: 15 * 60_000, maxFailures: 8} as const;

export const newTraceId = () => `tr_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
export const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Signing secret — fails closed. No hard-coded fallback ever ships. */
export function keylockSecret(): string | null {
  const s = process.env.KEYLOCK_SECRET;
  return s && s.length >= 32 ? s : null;
}

export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function service() {
  return createServiceClient();
}

/** Anonymous subject: hash of IP + UA, salted with the secret. Never stored raw. */
export function anonSubject(req: NextRequest, secret: string): string {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ua = req.headers.get('user-agent') ?? '';
  return createHmac('sha256', secret).update(`${ip}|${ua}`).digest('hex');
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/* ── PIN hashing (scrypt) ─────────────────────────────────────────────── */
const SCRYPT_N = 16384;
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32, {N: SCRYPT_N});
  return `scrypt$${SCRYPT_N}$${salt.toString('hex')}$${hash.toString('hex')}`;
}
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [alg, n, saltHex, hashHex] = stored.split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const hash = await scrypt(pin, Buffer.from(saltHex, 'hex'), 32, {N: Number(n)});
  return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

/** Trivial PINs are refused at enrollment. */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1{5}$/.test(pin)) return true;
  const asc = '01234567890';
  const desc = '09876543210';
  return asc.includes(pin) || desc.includes(pin) || pin === '123123' || pin === '121212';
}

/* ── Signed entrance cookie (stateless) ───────────────────────────────── */
export function signEntrance(secret: string, mode: 'production' | 'preview', ttlMs: number): string {
  const payload = Buffer.from(JSON.stringify({m: mode, exp: Date.now() + ttlMs, n: randomBytes(8).toString('hex')})).toString('base64url');
  const sig = createHmac('sha256', `${secret}:entrance`).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
export function readEntrance(secret: string, value: string | undefined): {mode: string; exp: number} | null {
  if (!value) return null;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expect = createHmac('sha256', `${secret}:entrance`).update(payload).digest('base64url');
  if (!constantTimeEqual(sig, expect)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {m: string; exp: number};
    return data.exp > Date.now() ? {mode: data.m, exp: data.exp} : null;
  } catch {
    return null;
  }
}

/* ── Rate limiting via audit trail ────────────────────────────────────── */
export async function recentFailures(lock: LockName, subjectHash: string): Promise<number> {
  const since = new Date(Date.now() - LOCKOUT.windowMs).toISOString();
  const {count} = await service()
    .from('access_audit_events')
    .select('id', {count: 'exact', head: true})
    .eq('lock', lock)
    .eq('subject_hash', subjectHash)
    .in('outcome', ['invalid', 'expired'])
    .gte('created_at', since);
  return count ?? 0;
}

export async function audit(row: {
  lock: LockName;
  eventType: string;
  outcome: string;
  subjectHash: string;
  traceId: string;
  userId?: string | null;
  challengeId?: string | null;
  track?: 'finesse' | 'carpe_diem' | null;
}) {
  const {error} = await service().from('access_audit_events').insert({
    lock: row.lock,
    event_type: row.eventType,
    outcome: row.outcome,
    subject_hash: row.subjectHash,
    trace_id: row.traceId,
    user_id: row.userId ?? null,
    challenge_id: row.challengeId ?? null,
    track: row.track ?? null,
  });
  if (error) console.warn(`[keylock:${row.lock}] audit insert failed`, error.message, row.traceId);
}

export const NO_STORE = {'Cache-Control': 'no-store, max-age=0'} as const;
