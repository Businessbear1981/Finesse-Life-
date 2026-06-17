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
  const user = await getUser();
  if (!user) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const edition = searchParams.get('edition') ?? 'finesse';

  const { data, error } = await service
    .from('bag_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('edition', edition)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ items: [], error: error.message });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, brand, category, value_est_cents, color, acquired_year, photo_url, note, edition } = body;

  if (!name?.trim() || !brand?.trim()) {
    return NextResponse.json({ error: 'name and brand required' }, { status: 400 });
  }

  const { data, error } = await service
    .from('bag_items')
    .insert({
      user_id: user.id,
      name: name.trim(),
      brand: brand.trim(),
      category: category ?? 'other',
      value_est_cents: value_est_cents ?? 0,
      color: color ?? null,
      acquired_year: acquired_year ?? null,
      photo_url: photo_url ?? null,
      note: note ?? null,
      edition: edition ?? 'finesse',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
