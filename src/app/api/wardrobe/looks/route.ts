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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const feed = searchParams.get('feed') === 'true';
  const user = await getUser();

  if (feed) {
    // Community feed — all looks with profile join, most liked first
    const { data, error } = await service
      .from('wardrobe_looks')
      .select('*, profiles:user_id(display_name, username, avatar_url, city)')
      .order('likes_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) return NextResponse.json({ looks: [] });
    return NextResponse.json({ looks: data ?? [] });
  }

  // My closet
  if (!user) return NextResponse.json({ looks: [] });

  const { data, error } = await service
    .from('wardrobe_looks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ looks: [] });
  return NextResponse.json({ looks: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { photo_url, brands, caption } = await req.json();

  const { data, error } = await service
    .from('wardrobe_looks')
    .insert({
      user_id: user.id,
      photo_url: photo_url ?? null,
      brands: brands ?? [],
      caption: caption ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ look: data }, { status: 201 });
}
