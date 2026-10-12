import {authkit} from '@workos-inc/authkit-nextjs';
import {NextResponse, type NextRequest} from 'next/server';

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
    // Agent dispatch API — callable from authenticated or public contexts
    pathname.startsWith('/api/agents') ||
    // AI APIs — auth is optional; routes handle no-session gracefully
    pathname.startsWith('/api/nova') ||
    pathname.startsWith('/api/intelligence') ||
    pathname.startsWith('/api/stylist') ||
    pathname.startsWith('/api/nightvision');

  // ── VIP gate ─────────────────────────────────────────────────────────
  // /vip routes require is_vip=true with a valid (non-expired) grant.
  // Authenticated but non-VIP users are redirected to /profile?upgrade=true.
  const isVipRoute = pathname.startsWith('/vip');

  if (isVipRoute && user && session.accessToken) {
    const profileRes = await fetch(`${process.env.FINESSE_API_URL ?? 'https://api.finesselife.vip'}/v1/data`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({table: 'profiles', op: 'select', columns: 'is_vip,vip_expires_at', filters: [], limit: 1}),
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

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
