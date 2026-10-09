/** Calls the production Next.js API as the signed-in member (bearer token). */
import {Platform} from 'react-native';
import {secureStorage} from './secure-storage';
import {supabase} from './supabase';

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://finesselife.vip').replace(/\/$/, '');
const LIFT_KEY = 'finesse_lift_token';

export async function api<T = Record<string, unknown>>(path: string, init: {method?: string; json?: unknown; lift?: boolean} = {}) {
  const {data} = await supabase.auth.getSession();
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  if (init.lift) {
    const lt = await secureStorage.getItem(LIFT_KEY);
    if (lt) headers['X-Finesse-Lift'] = lt;
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, {method: init.method ?? 'GET', headers, body: init.json !== undefined ? JSON.stringify(init.json) : undefined});
    const body = (await res.json().catch(() => ({}))) as T & {message?: string; state?: string};
    return {ok: res.ok, status: res.status, body};
  } catch {
    return {ok: false, status: 0, body: {message: 'The house line is down.'} as T & {message?: string; state?: string}};
  }
}

/** Multipart upload of one local image (camera or library) plus string fields, as the signed-in member. */
export async function apiUpload<T = Record<string, unknown>>(path: string, file: {uri: string; mimeType?: string | null; fileName?: string | null}, fields: Record<string, string> = {}) {
  const {data} = await supabase.auth.getSession();
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  const type = file.mimeType ?? 'image/jpeg';
  const name = file.fileName ?? `photo.${type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'}`;
  const form = new FormData();
  try {
    if (Platform.OS === 'web') form.append('file', await (await fetch(file.uri)).blob(), name);
    else form.append('file', {uri: file.uri, name, type} as unknown as Blob);
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    const res = await fetch(`${API_BASE}${path}`, {method: 'POST', headers, body: form});
    const body = (await res.json().catch(() => ({}))) as T & {message?: string; error?: string};
    return {ok: res.ok, status: res.status, body};
  } catch {
    return {ok: false, status: 0, body: {message: 'The house line is down.'} as T & {message?: string; error?: string}};
  }
}

export const liftToken = {
  get: () => secureStorage.getItem(LIFT_KEY),
  save: (t: string) => secureStorage.setItem(LIFT_KEY, t),
  clear: () => secureStorage.removeItem(LIFT_KEY),
};
