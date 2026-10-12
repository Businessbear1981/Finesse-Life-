import 'server-only';
import { DataClient, httpTransport } from './query';
import { API_URL, currentUser } from './server';

/**
 * Service client — runs as app_service on the Worker (bypasses member RLS through explicit service policies).
 * SERVER-ONLY. Never import this in client components.
 */
export function createServiceClient(): DataClient {
  return new DataClient(
    httpTransport(`${API_URL}/v1/data`, () => ({ 'X-Service-Key': process.env.FINESSE_SERVICE_API_KEY ?? '' })),
    { async getUser() { return { data: { user: await currentUser() }, error: null }; } },
  );
}
