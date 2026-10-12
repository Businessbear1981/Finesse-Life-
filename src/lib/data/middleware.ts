import {authkit} from '@workos-inc/authkit-nextjs';
import {NextResponse, type NextRequest} from 'next/server';

const PUBLIC_API_PREFIXES = [
  '/api/agents', '/api/nova', '/api/intelligence', '/api/stylist', '/api/nightvision',
  '/api/webhooks', '/api/telegram/webhook', '/api/keylock', '/api/callback', '/api/auth',
  '/api/integrations/yahoo-fantasy/callback', '/api/health',
];

export async function updateSession(request: NextRequest) {
  // WorkOS AuthKit: reads/refreshes the encrypted session cookie and returns headers to forward.
  const {session, headers: authkitHeaders} = await authkit(request);
  const user = session.user ? {id: session.user.id} : null;
  const next = () => {
    const res = NextResponse.next({request: {headers: authkitHeaders}});
    authkitHeaders.forEach((v, k) => { if (k.toLowerCase() === 'set-cookie') res.headers.append(k, v); });
    return res;
  };
  const response = next();

  const pathname = request.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/demo');

  // /intake is accessible to authenticated users only — not publicly reachable
  const isIntakeRoute = pathname.startsWith('/intake');

  // Public hotel routes — no login required
  const isPublicRoute = pathname === '/' ||
    pathname.startsWith('/lobby') ||
    pathname.startsWith('/perdiem') ||
    pathname.startsWith('/lounge') ||
    pathname.startsWith('/concierge') ||
    pathname.startsWith('/salon') ||
    pathname.startsWith('/vault') ||
    pathname.startsWith('/wardrobe') ||
    pathname.startsWith('/bag') ||
    pathname.startsWith('/lab') ||
    pathname.startsWith('/archive') ||
    pathname.startsWith('/entourage') ||
    pathname.startsWith('/backstage') ||
    pathname.startsWith('/clubhouse') ||
    pathname.startsWith('/scale') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/market') ||
    pathname.startsWith('/registry') ||
    pathname.startsWith('/exchange') ||
    pathname.startsWith('/departures') ||
    pathname.startsWith('/switchboard') ||
    pathname.startsWith('/embassy') ||
    pathname.startsWith('/nightvision') ||
    pathname.startsWith('/stylist') ||
    pathname.startsWith('/carpe-diem') ||
    // API routes that authenticate themselves (signature, secret, house code, OAuth state, or in-route guard)
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  // ── VIP gate ─────────────────────────────────────────────────────────
  // /vip routes require is_vip=true with a valid (non-expired) grant.
  // Authenticated but non-VIP users are redirected to /profile?upgrade=true.
  const isVipRoute = pathname.startsWith('/vip');

  if (isVipRoute && user && session.accessToken) {
    const apiBase = process.env.FINESSE_API_URL ?? 'https://api.finesselife.vip';
    const auth = {Authorization: `Bearer ${session.accessToken}`};
    const meRes = await fetch(`${apiBase}/v1/me`, {headers: auth, cache: 'no-store'}).catch(() => null);
    const meId = meRes?.ok ? ((await meRes.json()) as {user?: {id?: string}}).user?.id : undefined;
    const profileRes = !meId ? null : await fetch(`${apiBase}/v1/data`, {
      method: 'POST',
      headers: {...auth, 'Content-Type': 'application/json'},
      body: JSON.stringify({table: 'profiles', op: 'select', columns: 'is_vip,vip_expires_at', filters: [{col: 'id', op: 'eq', value: meId}], limit: 1}),
      cache: 'no-store',
    }).catch(() => null);

    if (profileRes?.ok) {
      const profiles = ((await profileRes.json()) as {data: Array<{is_vip: boolean; vip_expires_at: string | null}> | null}).data ?? [];
      const profile = profiles[0];
      const isVip =
        profile?.is_vip === true &&
        (!profile.vip_expires_at || new Date(profile.vip_expires_at) > new Date());

      if (!isVip) {
        const url = request.nextUrl.clone();
        url.pathname = '/profile';
        url.searchParams.set('upgrade', 'true');
        return NextResponse.redirect(url);
      }
    }
    // If the fetch failed we let the page's own server-side check handle it
  }

  // /intake without auth → send to /login
  if (!user && isIntakeRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (!user && pathname.startsWith('/api/') && !isPublicRoute) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401});
  }

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
