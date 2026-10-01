import {createServerClient} from '@supabase/ssr';
import {createClient as createSupabaseClient} from '@supabase/supabase-js';
import {cookies, headers} from 'next/headers';

/** Bearer token from a native client (mobile), if any. Cookies still win when present. */
async function bearerToken(): Promise<string | null> {
  const h = await headers();
  const auth = h.get('authorization') ?? '';
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() || null : null;
}

export async function createClient() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.getAll().some((c) => c.name.startsWith('sb-'));
  const token = hasSessionCookie ? null : await bearerToken();

  if (token) {
    // Mobile: act as the member via their access token so RLS applies exactly as on web.
    const client = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {headers: {Authorization: `Bearer ${token}`}},
      auth: {persistSession: false, autoRefreshToken: false},
    });
    const getUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = ((jwt?: string) => getUser(jwt ?? token)) as typeof client.auth.getUser;
    return client as unknown as ReturnType<typeof createServerClient>;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({name, value, options}) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware will refresh sessions.
          }
        },
      },
    },
  );
}

/** True when this request authenticated with a bearer token (native client). */
export async function isBearerRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.getAll().some((c) => c.name.startsWith('sb-'))) return false;
  return (await bearerToken()) !== null;
}
