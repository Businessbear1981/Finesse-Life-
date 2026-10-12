import {NextResponse} from 'next/server';
import {toWorker} from '@/lib/worker-proxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Allowlisted member Plaid routes → Worker /v1/plaid/*. The webhook goes to the Worker directly, not through here. */
function route(method: string, parts: string[]): string | null {
  const [a, b, c] = parts;
  if (method === 'POST' && parts.length === 1 && (a === 'consents' || a === 'link-token' || a === 'exchange')) return `/v1/plaid/${a}`;
  if (method === 'GET' && parts.length === 1 && a === 'items') return '/v1/plaid/items';
  if (a === 'items' && b && UUID.test(b)) {
    if (method === 'POST' && c === 'sync' && parts.length === 3) return `/v1/plaid/items/${b}/sync`;
    if (method === 'DELETE' && parts.length === 2) return `/v1/plaid/items/${b}`;
  }
  return null;
}

async function handle(req: Request, ctx: {params: Promise<{path: string[]}>}) {
  const path = route(req.method, (await ctx.params).path);
  if (!path) return NextResponse.json({error: 'not_found'}, {status: 404});
  const body = req.method === 'POST' ? await req.text() : null;
  if (body && body.length > 4096) return NextResponse.json({error: 'too_large'}, {status: 413});
  return toWorker(path, {method: req.method, body, userAgent: req.headers.get('user-agent')});
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
