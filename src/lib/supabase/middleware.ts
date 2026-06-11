import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({request});

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({name, value}) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({request});
          cookiesToSet.forEach(({name, value, options}) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not put logic between client creation and getUser().
  const {data: {user}} = await supabase.auth.getUser();

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
    pathname.startsWith('/api/agents');

  // ── VIP gate ─────────────────────────────────────────────────────────
  // /vip routes require is_vip=true with a valid (non-expired) grant.
  // Authenticated but non-VIP users are redirected to /profile?upgrade=true.
  const isVipRoute = pathname.startsWith('/vip');

  if (isVipRoute && user) {
    const profileRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_vip,vip_expires_at`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    );

    if (profileRes.ok) {
      const profiles = (await profileRes.json()) as Array<{
        is_vip: boolean;
        vip_expires_at: string | null;
      }>;
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

  return supabaseResponse;
}
