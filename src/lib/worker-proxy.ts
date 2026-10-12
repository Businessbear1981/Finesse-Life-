import 'server-only';
import {NextResponse} from 'next/server';
import {API_URL, accessToken} from '@/lib/data/server';

/** Forward a member request to the Worker with the session's bearer token. Only fixed, allowlisted paths are passed in. */
export async function toWorker(path: string, init: {method: string; body?: string | null; userAgent?: string | null}) {
  const token = await accessToken();
  if (!token) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const r = await fetch(`${API_URL}${path}`, {
    method: init.method,
    headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.userAgent ? {'User-Agent': init.userAgent} : {})},
    body: init.body ?? undefined,
    cache: 'no-store',
  }).catch(() => null);
  if (!r) return NextResponse.json({error: 'upstream_unavailable'}, {status: 502});
  return new NextResponse(await r.text(), {status: r.status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
}
