// Member consents on the phone (server: GET/POST /api/account/consents, table member_consents —
// supabase/migrations/20261017_s2_consents.sql). The server is the record; a per-member cache in the Keychain /
// Keystore means the sheet isn't shown again on every launch and still works offline. An acceptance the server
// hasn't confirmed yet is kept as "unsynced" and retried on the next check.
import {Platform} from 'react-native';
import {api} from './api';
import {secureStorage} from './secure-storage';
import {supabase} from './supabase';

export type ConsentKind = 'ai_processing' | 'photo_ai' | 'age_18';
type Cached = Partial<Record<ConsentKind, {at: string; synced: boolean}>>;

/** Named in every AI disclosure. Keep in step with src/lib/ai.ts and /privacy#ai. */
export const AI_PROCESSOR = 'Anthropic (Claude)';
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
    if (c.kind === 'ai_processing' || c.kind === 'photo_ai' || c.kind === 'age_18') next[c.kind] = {at: c.accepted_at, synced: true};
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
