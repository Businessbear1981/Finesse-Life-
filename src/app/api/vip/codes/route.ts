import {NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1 confusion

function generateCode(): string {
  const segment = (len: number) =>
    Array.from({length: len}, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  return `FNS-${segment(4)}${segment(4)}`;
}

async function getClients() {
  const cookieStore = await cookies();

  const serviceSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const anonSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  return {serviceSupabase, anonSupabase};
}

async function checkAdmin(anonSupabase: ReturnType<typeof createServerClient>) {
  const {
    data: {user},
  } = await anonSupabase.auth.getUser();
  if (!user) return {user: null, isAdmin: false};

  const {data: profile} = await anonSupabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const isAdmin =
    profile?.username === 'admin' ||
    user.email === process.env.ADMIN_EMAIL;

  return {user, isAdmin};
}

// ── GET — list all codes ──────────────────────────────────────────────────
export async function GET() {
  try {
    const {serviceSupabase, anonSupabase} = await getClients();
    const {isAdmin} = await checkAdmin(anonSupabase);

    if (!isAdmin) {
      return NextResponse.json({error: 'Forbidden.'}, {status: 403});
    }

    const {data, error} = await serviceSupabase
      .from('vip_codes')
      .select(
        `
        id,
        code,
        is_active,
        use_count,
        max_uses,
        expires_at,
        used_at,
        created_at,
        used_by_profile:profiles!vip_codes_used_by_fkey (
          username,
          display_name
        )
      `,
      )
      .order('created_at', {ascending: false});

    if (error) {
      console.error('[vip/codes] list error:', error);
      return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({codes: data ?? []});
  } catch (err) {
    console.error('[vip/codes] unexpected GET error:', err);
    return NextResponse.json({error: 'Internal server error.'}, {status: 500});
  }
}

// ── POST — generate codes ────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const {serviceSupabase, anonSupabase} = await getClients();
    const {user, isAdmin} = await checkAdmin(anonSupabase);

    if (!isAdmin || !user) {
      return NextResponse.json({error: 'Forbidden.'}, {status: 403});
    }

    const body = (await req.json()) as {count?: number; expires_days?: number; max_uses?: number};
    const count = Math.min(Math.max(Number(body.count ?? 1), 1), 100);
    const expiresDays = body.expires_days ? Number(body.expires_days) : null;
    const maxUses = Math.max(Number(body.max_uses ?? 1), 1);

    const expiresAt = expiresDays
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() + expiresDays);
          return d.toISOString();
        })()
      : null;

    // Generate unique codes — retry on collision
    const codes: string[] = [];
    let attempts = 0;
    while (codes.length < count && attempts < count * 5) {
      attempts++;
      const c = generateCode();
      if (!codes.includes(c)) codes.push(c);
    }

    const rows = codes.map((code) => ({
      code,
      created_by: user.id,
      max_uses: maxUses,
      expires_at: expiresAt,
      is_active: true,
    }));

    const {data, error} = await serviceSupabase
      .from('vip_codes')
      .insert(rows)
      .select('code');

    if (error) {
      console.error('[vip/codes] insert error:', error);
      return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({
      codes: (data ?? []).map((r: {code: string}) => r.code),
    });
  } catch (err) {
    console.error('[vip/codes] unexpected POST error:', err);
    return NextResponse.json({error: 'Internal server error.'}, {status: 500});
  }
}
