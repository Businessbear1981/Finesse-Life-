// Member consents on the phone (server: GET/POST /api/account/consents, table member_consents —
// supabase/migrations/20261017_s2_consents.sql). The server is the record; a per-member cache in the Keychain /
// Keystore means the sheet isn't shown again on every launch and still works offline. An acceptance the server
// hasn't confirmed yet is kept as "unsynced" and retried on the next check.
import {Platform} from 'react-native';
import {api, apiUpload} from './api';
import {secureStorage} from './secure-storage';
import {supabase} from './supabase';

export type ConsentKind = 'ai_processing' | 'photo_ai' | 'video_ai' | 'age_18';
type Cached = Partial<Record<ConsentKind, {at: string; synced: boolean}>>;

/** Named in every AI disclosure. Keep in step with src/lib/ai.ts and /privacy#ai. */
export const AI_PROCESSOR = 'Anthropic (Claude)';
/** Named in the video_ai disclosure. Keep in step with the generate-video route. */
export const VIDEO_PROCESSOR = 'Higgsfield';
export const PRIVACY_URL = 'https://finesselife.vip/privacy';
export const TERMS_URL = 'https://finesselife.vip/terms';
export const SUPPORT_URL = 'https://finesselife.vip/support';
export const SUPPORT_EMAIL = 'support@finesselife.vip';

const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
const keyFor = (userId: string) => `finesse_consents_${userId.replace(/[^a-zA-Z0-9]/g, '')}`;

async function memberId(): Promise<string | null> {
  const {data} = await supabase.auth.getSession().catch(() => ({data: {session: null}}));
  return data.session?.user.id ?? null;
}

async function readCache(userId: string): Promise<Cached> {
  try { return JSON.parse((await secureStorage.getItem(keyFor(userId))) ?? '{}') as Cached; } catch { return {}; }
}
async function writeCache(userId: string, c: Cached) {
  await secureStorage.setItem(keyFor(userId), JSON.stringify(c)).catch(() => {});
}

async function post(kind: ConsentKind) {
  const r = await api<{consent?: {accepted_at?: string}}>('/api/account/consents', {method: 'POST', json: {kind, platform}});
  return r.ok;
}

/** True when the signed-in member has accepted `kind` (cache first, then the server). False when signed out. */
export async function hasConsent(kind: ConsentKind): Promise<boolean> {
  const uid = await memberId();
  if (!uid) return false;
  const cache = await readCache(uid);
  const hit = cache[kind];
  if (hit) {
    if (!hit.synced) void post(kind).then(async (ok) => { if (ok) await writeCache(uid, {...(await readCache(uid)), [kind]: {at: hit.at, synced: true}}); });
    return true;
  }
  const r = await api<{consents?: Array<{kind: string; accepted_at: string}>}>('/api/account/consents');
  if (!r.ok || !Array.isArray(r.body.consents)) return false;
  const next: Cached = {...cache};
  for (const c of r.body.consents) {
    if (c.kind === 'ai_processing' || c.kind === 'photo_ai' || c.kind === 'video_ai' || c.kind === 'age_18') next[c.kind] = {at: c.accepted_at, synced: true};
  }
  await writeCache(uid, next);
  return Boolean(next[kind]);
}

/** Records an acceptance: on this device at once, and on the server (retried later if offline). */
export async function recordConsent(kind: ConsentKind): Promise<{ok: boolean; synced: boolean}> {
  const uid = await memberId();
  if (!uid) return {ok: false, synced: false};
  const at = new Date().toISOString();
  await writeCache(uid, {...(await readCache(uid)), [kind]: {at, synced: false}});
  const synced = await post(kind);
  if (synced) await writeCache(uid, {...(await readCache(uid)), [kind]: {at, synced: true}});
  return {ok: true, synced};
}

// ─── Server refusals → the consent sheet (one place, every AI call) ───────────────────────────────────────
// The server refuses any AI call without consent: 403 {error:'consent_required', kind} (src/lib/ai-consent-gate.ts).
// AI calls go through aiApi / aiUpload below. On that refusal they ask the mounted <AIConsentHost/> (rendered once in
// app/_layout.tsx) to show the sheet; if the member agrees, the same request is sent again and its answer returned.
// If they decline — or no host is mounted — the original 403 comes back and the caller shows its usual error text.

export type AIConsentKind = Extract<ConsentKind, 'ai_processing' | 'photo_ai' | 'video_ai'>;
type Asker = (kind: AIConsentKind) => Promise<boolean>;
let asker: Asker | null = null;

/** The host registers how to ask; returns an unregister function. */
export function setConsentAsker(fn: Asker): () => void {
  asker = fn;
  return () => { if (asker === fn) asker = null; };
}

export const consentHostMounted = () => asker !== null;

/** Ask the member (through the host) for `kind`. Resolves true once they agreed and it was recorded. */
export function askForConsent(kind: AIConsentKind): Promise<boolean> {
  return asker ? asker(kind) : Promise.resolve(false);
}

/** The AI kind a server reply refused for, or null. */
export function consentRefusal(r: {status: number; body?: {error?: unknown; kind?: unknown} | null}): AIConsentKind | null {
  if (r.status !== 403 || r.body?.error !== 'consent_required') return null;
  return r.body.kind === 'photo_ai' ? 'photo_ai' : r.body.kind === 'video_ai' ? 'video_ai' : 'ai_processing';
}

/** Plain words when the member said "Not now". */
export const CONSENT_DECLINED_TEXT = 'Nova needs your OK before it can help with this. Nothing was sent.';

async function withConsentRetry<R extends {status: number; body?: {error?: unknown; kind?: unknown} | null}>(send: () => Promise<R>): Promise<R> {
  let r = await send();
  // At most two asks (ai_processing, then photo_ai or video_ai) so a server that keeps refusing can't loop.
  for (let i = 0; i < 2; i += 1) {
    const kind = consentRefusal(r);
    if (!kind || !(await askForConsent(kind))) return r;
    r = await send();
  }
  return r;
}

/** `api` for any call that reaches Nova / the model. */
export function aiApi<T = Record<string, unknown>>(path: string, init: Parameters<typeof api>[1] = {}) {
  return withConsentRetry(() => api<T>(path, init));
}

/** `apiUpload` for photos the model reads. */
export function aiUpload<T = Record<string, unknown>>(...args: Parameters<typeof apiUpload>) {
  return withConsentRetry(() => apiUpload<T>(...args));
}

export type ConsentRow = {kind: ConsentKind; accepted_at: string; version: string};

/** The member's consents as the server holds them (GET /api/account/consents). */
export async function listConsents(): Promise<{ok: boolean; status: number; consents: ConsentRow[]; message?: string}> {
  const r = await api<{consents?: ConsentRow[]}>('/api/account/consents');
  if (!r.ok) return {ok: false, status: r.status, consents: [], message: r.body.message};
  return {ok: true, status: r.status, consents: Array.isArray(r.body.consents) ? r.body.consents.filter((c) => c.kind === 'ai_processing' || c.kind === 'photo_ai' || c.kind === 'video_ai' || c.kind === 'age_18') : []};
}

/**
 * Withdraw a consent (DELETE /api/account/consents?kind=…) and forget it on this device, so the app asks again
 * before the next use. The device copy is only cleared once the server confirms.
 */
export async function withdrawConsent(kind: ConsentKind): Promise<{ok: boolean; status: number; message?: string}> {
  const r = await api<{withdrawn?: boolean}>(`/api/account/consents?kind=${encodeURIComponent(kind)}`, {method: 'DELETE'});
  if (!r.ok) return {ok: false, status: r.status, message: r.body.message};
  const uid = await memberId();
  if (uid) {
    const next = {...(await readCache(uid))};
    delete next[kind];
    await writeCache(uid, next);
  }
  return {ok: true, status: r.status};
}
