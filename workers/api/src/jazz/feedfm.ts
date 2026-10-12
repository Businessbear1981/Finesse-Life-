// Jazz Club music vendor: Feed.fm Streaming API v3 (https://docs.feed.fm/api-reference/).
// Licensing rules we honour: the device streams directly from Feed.fm (geo-IP; no server proxy of /play),
// the consumer secret never leaves the Worker (we mint short-lived access tokens), and each member keeps one
// persistent client_id so play history and skip limits carry over.
import { JAZZ_POLICY } from '../policy';

export interface MusicProvider {
  id: 'feedfm' | 'fake';
  /** Mint a new Feed.fm client (listener) id. */
  createClient(): Promise<string>;
  /** Short-lived token/secret pair for the device. */
  mintAccessToken(ttlSeconds: number): Promise<{ token: string; secret: string }>;
  /** Stations the credentials are licensed to play (for the room UI; the device re-fetches with its own token). */
  stations(clientId: string): Promise<{ available: boolean; stations: Array<{ uuid: string; id: string; name: string }> }>;
}

export class MusicError extends Error { constructor(public code: string, public status = 502) { super(code); } }

export function feedFm(o: { token: string; secret: string; base?: string; fetchImpl?: typeof fetch }): MusicProvider {
  const base = o.base ?? 'https://feed.fm/api/v3';
  const f = o.fetchImpl ?? fetch;
  const auth = 'Basic ' + btoa(`${o.token}:${o.secret}`);
  const call = async <T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> => {
    const r = await f(base + path, { method, headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const j = (await r.json().catch(() => ({ success: false }))) as T & { success?: boolean; error?: { code?: number; message?: string } };
    // Feed.fm returns some errors with HTTP 200: always check success.
    if (!r.ok || j.success !== true) throw new MusicError(`feedfm_${j.error?.code ?? r.status}`, r.status === 401 ? 502 : r.status >= 500 ? 502 : 400);
    return j;
  };
  return {
    id: 'feedfm',
    async createClient() { return (await call<{ client_id: string }>('POST', '/client', {})).client_id; },
    async mintAccessToken(ttl) { return (await call<{ access_token: { token: string; secret: string } }>('POST', '/access_token', { ttl_seconds: ttl })).access_token; },
    async stations(client_id) {
      const j = await call<{ session: { available: boolean }; stations?: Array<{ uuid: string; id: string; name: string }> }>('POST', '/session', { client_id });
      return { available: j.session.available, stations: (j.stations ?? []).map((s) => ({ uuid: s.uuid, id: s.id, name: s.name })) };
    },
  };
}

export function fakeFeedFm(): MusicProvider & { minted: number } {
  let n = 0;
  const p = {
    id: 'fake' as const, minted: 0,
    async createClient() { return `fakeclient${++n}`.slice(0, 23); },
    async mintAccessToken() { p.minted++; return { token: `fake-token-${p.minted}`, secret: `fake-secret-${p.minted}` }; },
    async stations() { return { available: true, stations: [{ uuid: 'st-late-night', id: '1', name: 'Late Night Jazz' }, { uuid: 'st-lounge', id: '2', name: 'Lounge Standards' }] }; },
  };
  return p;
}

export const jazzCompliance = { attribution: JAZZ_POLICY.attribution, disclaimer: JAZZ_POLICY.disclaimer };
