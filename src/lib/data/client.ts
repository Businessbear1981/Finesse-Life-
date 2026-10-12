import { DataClient, httpTransport, type AuthUser } from './query';

/** Browser client: queries go through the app's own /api/data proxy, which attaches the member's session. */
export function createClient(): DataClient {
  return new DataClient(httpTransport('/api/data', () => ({})), {
    async getUser() {
      const r = await fetch('/api/me', { cache: 'no-store' }).catch(() => null);
      const user = r?.ok ? (((await r.json()) as { user: AuthUser | null }).user) : null;
      return { data: { user }, error: null };
    },
  });
}
