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
  const {data: {user: cookieUser}} = await supabase.auth.getUser();
  let user = cookieUser;
  // Native clients (Expo app) send the member's access token as a bearer header.
  const authz = request.headers.get('authorization') ?? '';
  if (!user && request.nextUrl.pathname.startsWith('/api/') && authz.toLowerCase().startsWith('bearer ')) {
    const {data} = await supabase.auth.getUser(authz.slice(7).trim());
    user = data.user;
  }

  const pathname = request.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/demo');

  // /intake is accessible to authenticated users only — not publicly reachable
  const isIntakeRoute = pathname.startsWith('/intake');

  // Public hotel routes — no login required
  const isPublicRoute = pathname === '/' ||
    pathname === '/terms' ||
    pathname === '/account/delete-info' ||
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
    // Public entrance KeyLock — must be reachable before sign-in
    pathname.startsWith('/api/keylock/entrance') ||
    // AI APIs (/api/nova, /api/agents, /api/stylist, /api/nightvision, /api/intelligence/market)
    // are members-only — signed-out callers get the JSON 401 below. The non-AI intelligence
    // endpoints (signal, logistics, health, query) keep their own route-level handling.
    (pathname.startsWith('/api/intelligence') && !pathname.startsWith('/api/intelligence/market'));

  // ── VIP gate ─────────────────────────────────────────────────────────
  // /vip routes require is_vip=true with a valid (non-expired) grant.
  // Authenticated but non-VIP users are redirected to /profile?upgrade=true.
  const isVipRoute = pathname.startsWith('/vip');

  // Penthouse lives INSIDE the VIP Room (room 23) — never a 32nd room.
  if (pathname === '/penthouse') {
    const url = request.nextUrl.clone();
    url.pathname = '/vip/penthouse';
    return NextResponse.redirect(url);
  }

  if (isVipRoute && user) {
    // Query as the signed-in member (their JWT, RLS applies). The previous version
    // sent the anon key as the bearer, which RLS answers with [] → every VIP was
    // bounced to /profile?upgrade=true.
    const {data: profile, error} = await supabase
      .from('profiles')
      .select('is_vip, vip_expires_at')
      .eq('id', user.id)
      .single();

    if (!error) {
      const isVip =
        profile?.is_vip === true &&
        (!profile.vip_expires_at || new Date(profile.vip_expires_at) > new Date());

      if (!isVip) {
        const url = request.nextUrl.clone();
        url.pathname = '/profile';
        url.search = '';
        url.searchParams.set('upgrade', 'true');
        return NextResponse.redirect(url);
      }
    }
    // On a read error the page's own server-side check (vip/page.tsx) still gates.
  }

  // /intake without auth → send to /login
  if (!user && isIntakeRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // API callers get a JSON 401, never an HTML login redirect (which fetch() would
  // follow and mistake for success).
  if (!user && !isPublicRoute && pathname.startsWith('/api/')) {
    // Webhooks authenticate by signature, not session.
    // The AI-usage export authenticates by its own bearer token (route-level, timing-safe).
    if (!pathname.startsWith('/api/webhooks/') && !pathname.startsWith('/api/telegram/webhook') && pathname !== '/api/admin/ai-usage') {
      return NextResponse.json({error: 'signed_out'}, {status: 401, headers: {'Cache-Control': 'no-store'}});
    }
    return supabaseResponse;
  }

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
