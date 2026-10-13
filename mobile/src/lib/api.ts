/** Calls the production Next.js API as the signed-in member (bearer token). */
import {Platform} from 'react-native';
import {secureStorage} from './secure-storage';
import {supabase} from './supabase';

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://finesselife.vip').replace(/\/$/, '');
const LIFT_KEY = 'finesse_lift_token';

/** Every request gives up after this long (uploads get longer) and says so, rather than hanging. */
export const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 60_000;

type Reply<T> = {ok: boolean; status: number; body: T & {message?: string; state?: string; error?: string}};

/** status 0 = the line is down (nothing reached the house); 408 = no answer in time (a write may still have landed). */
function offline<T>(err: unknown, write: boolean): Reply<T> {
  if (err instanceof Error && err.name === 'AbortError') {
    const message = write
      ? 'The house took too long to answer. It may still have gone through — check before trying again.'
      : 'The house took too long to answer. Try again in a moment.';
    return {ok: false, status: 408, body: {error: 'timeout', message} as Reply<T>['body']};
  }
  return {ok: false, status: 0, body: {message: 'The house line is down.'} as Reply<T>['body']};
}

async function authHeaders(lift?: boolean) {
  const headers: Record<string, string> = {Accept: 'application/json'};
  const {data} = await supabase.auth.getSession();
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  if (lift) {
    const lt = await secureStorage.getItem(LIFT_KEY);
    if (lt) headers['X-Finesse-Lift'] = lt;
  }
  return headers;
}

export async function api<T = Record<string, unknown>>(path: string, init: {method?: string; json?: unknown; lift?: boolean} = {}): Promise<Reply<T>> {
  const method = init.method ?? 'GET';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = await authHeaders(init.lift);
    if (init.json !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE}${path}`, {method, headers, body: init.json !== undefined ? JSON.stringify(init.json) : undefined, signal: ctrl.signal});
    const body = (await res.json().catch(() => ({}))) as Reply<T>['body'];
    return {ok: res.ok, status: res.status, body};
  } catch (err) {
    return offline<T>(err, method !== 'GET');
  } finally {
    clearTimeout(timer);
  }
}

/** Multipart upload of one local image (camera or library) plus string fields, as the signed-in member. */
export async function apiUpload<T = Record<string, unknown>>(path: string, file: {uri: string; mimeType?: string | null; fileName?: string | null}, fields: Record<string, string> = {}): Promise<Reply<T>> {
  const type = file.mimeType ?? 'image/jpeg';
  const name = file.fileName ?? `photo.${type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const headers = await authHeaders();
    const form = new FormData();
    if (Platform.OS === 'web') form.append('file', await (await fetch(file.uri)).blob(), name);
    else form.append('file', {uri: file.uri, name, type} as unknown as Blob);
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    const res = await fetch(`${API_BASE}${path}`, {method: 'POST', headers, body: form, signal: ctrl.signal});
    const body = (await res.json().catch(() => ({}))) as Reply<T>['body'];
    return {ok: res.ok, status: res.status, body};
  } catch (err) {
    return offline<T>(err, true);
  } finally {
    clearTimeout(timer);
  }
}

export const liftToken = {
  get: () => secureStorage.getItem(LIFT_KEY),
  save: (t: string) => secureStorage.setItem(LIFT_KEY, t),
  clear: () => secureStorage.removeItem(LIFT_KEY),
};
