import 'server-only';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { DataClient, httpTransport, type AuthUser } from './query';

export const API_URL = process.env.FINESSE_API_URL ?? 'https://api.finesselife.vip';

/** Member access token from the WorkOS AuthKit session cookie (refreshed by the middleware). */
export async function accessToken(): Promise<string | null> {
  try {
    const s = await withAuth();
    return s.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<AuthUser | null> {
  const token = await accessToken();
  if (!token) return null;
  const r = await fetch(`${API_URL}/v1/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null);
  if (!r?.ok) return null;
  return ((await r.json()) as { user: AuthUser }).user;
}

/** Member-scoped client: every query runs under RLS as the signed-in member. Same API as the old database server client. */
export async function createClient(): Promise<DataClient> {
  const token = await accessToken();
  return new DataClient(
    httpTransport(`${API_URL}/v1/data`, (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {})),
    {
      async getUser() { const user = await currentUser(); return { data: { user }, error: null }; },
      async getSession() { return { data: { session: token ? { access_token: token } : null }, error: null }; },
    },
  );
}
