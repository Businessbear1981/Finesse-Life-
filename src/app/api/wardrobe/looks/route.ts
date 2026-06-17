import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
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
