import {NextResponse} from 'next/server';
import {accessToken, API_URL} from '@/lib/data/server';

// Browser → Worker proxy. Attaches the member's WorkOS session; never the service key.
export async function POST(req: Request) {
  const token = await accessToken();
  if (!token) return NextResponse.json({data: null, error: {message: 'Not authenticated.', code: '401'}, count: null}, {status: 401});
  const r = await fetch(`${API_URL}/v1/data`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: await req.text(),
    cache: 'no-store',
  });
  return new NextResponse(await r.text(), {status: r.status, headers: {'Content-Type': 'application/json'}});
}
