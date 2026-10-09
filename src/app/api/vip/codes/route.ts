import {randomInt} from 'crypto';
import {NextResponse} from 'next/server';
import {isAdmin} from '@/lib/admin';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1 confusion

// VIP codes are bearer credentials for a paid entitlement: use a CSPRNG, not Math.random.
function generateCode(): string {
  const segment = (len: number) => Array.from({length: len}, () => CHARS[randomInt(CHARS.length)]).join('');
  return `FNS-${segment(4)}${segment(4)}`;
}

async function getClients() {
  // The member is read from their own session (cookie or mobile bearer); code rows are
  // read/written with the real service-role client, never a cookie-bound one.
  return {serviceSupabase: createServiceClient(), anonSupabase: await createClient()};
}

async function checkAdmin(anonSupabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: {user},
  } = await anonSupabase.auth.getUser();
  return {user, isAdmin: await isAdmin(anonSupabase, user)};
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
