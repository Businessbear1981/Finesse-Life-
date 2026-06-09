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

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup');

  // Public hotel routes — no login required
  const isPublicRoute = request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/lobby') ||
    request.nextUrl.pathname.startsWith('/perdiem') ||
    request.nextUrl.pathname.startsWith('/lounge') ||
    request.nextUrl.pathname.startsWith('/concierge');

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
