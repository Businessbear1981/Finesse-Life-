import { NextResponse } from 'next/server';
import {FINESSE_API, MEMBER_ROLE, SERVICE_ROLE, createServerClient} from '@/lib/data/compat';
import {createClient} from '@/lib/data/compat';
import { cookies } from 'next/headers';

const service = createClient(
  FINESSE_API,
  SERVICE_ROLE,
);

async function getUser() {
  const cookieStore = await cookies();
  const dbc = createServerClient(
    FINESSE_API,
    MEMBER_ROLE,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await dbc.auth.getUser();
  return user;
}

// GET — return connected platforms for this user
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ accounts: [] });

  const { data } = await service
    .from('social_accounts')
    .select('platform, connected, platform_username, connected_at')
    .eq('user_id', user.id);

  return NextResponse.json({ accounts: data ?? [] });
}

// POST — toggle platform connected state (for manual connection without OAuth)
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform, connected } = await req.json();

  if (!platform) return NextResponse.json({ error: 'platform required' }, { status: 400 });

  const payload: Record<string, unknown> = {
    user_id: user.id,
    platform,
    connected: connected ?? true,
  };
  if (connected) payload.connected_at = new Date().toISOString();

  const { data, error } = await service
    .from('social_accounts')
    .upsert(payload, { onConflict: 'user_id,platform' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: data });
}
