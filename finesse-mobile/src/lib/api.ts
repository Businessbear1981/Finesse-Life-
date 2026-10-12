import * as WebBrowser from 'expo-web-browser';
import { getToken } from './auth';

const API = process.env.EXPO_PUBLIC_API_URL ?? '';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, { ...init, headers: { ...(await authHeaders()), ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `HTTP ${res.status}`), { status: res.status });
  return body as T;
}

/** Server verifies the house code. Dev fallback only when EXPO_PUBLIC_DEV_HOUSE_CODE is set. */
export async function verifyHouseCode(code: string): Promise<boolean> {
  try {
    const r = await call<{ ok: boolean }>('/api/keylock/house', { method: 'POST', body: JSON.stringify({ code }) });
    return r.ok;
  } catch (e: any) {
    const dev = process.env.EXPO_PUBLIC_DEV_HOUSE_CODE;
    if (dev && (e.status === 404 || !API)) return code === dev;
    return false;
  }
}

export type ProfilePatch = {
  display_name: string; gender: 'feminine' | 'masculine'; age: number; city: string;
  vibe?: string; bio?: string; intake_complete?: boolean;
};
export const saveProfile = (p: ProfilePatch) => call('/api/profile', { method: 'PATCH', body: JSON.stringify(p) });

export const redeemVip = (code: string) =>
  call<{ success: boolean; message: string }>('/api/vip/redeem', { method: 'POST', body: JSON.stringify({ code }) });

export type Provider = 'instagram' | 'tiktok' | 'pinterest' | 'facebook' | 'x' | 'google';
/** Opens the server OAuth flow; server stores tokens + registers webhooks, then redirects to finesse://connected */
export async function connectProvider(p: Provider): Promise<boolean> {
  const r = await WebBrowser.openAuthSessionAsync(`${API}/api/connect/${p}`, 'finesse://connected');
  return r.type === 'success';
}

export type StyleRead = { headline: string; accentWord: string; palette: string[]; tags: string[]; posts: number; accounts: number };
export async function getStyleRead(): Promise<StyleRead> {
  try { return await call<StyleRead>('/api/style-read'); }
  catch {
    return { headline: 'Old Hollywood,', accentWord: 'after dark.', palette: ['#1A120C', '#6B1424', '#C9A961', '#E8DBBE', '#2E3A2A'], tags: ['Old Hollywood', 'Tailored', 'Gold hardware', 'Evening-first'], posts: 312, accounts: 4 };
  }
}

export async function saveCheckIn(payload: {
  answers: Record<string, string>; nova: { voice: string; posting: string }; shopper: { name: string };
}) {
  if (!(await getToken())) return;
  await call('/api/check-in', { method: 'PUT', body: JSON.stringify(payload) });
}

/** Closet photos go straight to R2 through a presigned URL minted by the API. Returns the object key to store on the closet item. */
export async function uploadClosetImage(uri: string, contentType = 'image/jpeg'): Promise<string> {
  const { uploadUrl, key } = await call<{ uploadUrl: string; key: string }>('/api/uploads/sign', { method: 'POST', body: JSON.stringify({ contentType }) });
  const blob = await (await fetch(uri)).blob();
  const r = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
  if (!r.ok) throw new Error(`Upload failed (${r.status})`);
  return key;
}
