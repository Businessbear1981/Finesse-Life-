import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ exclusives: [] });
    }

    const { data, error } = await supabase
      .from('vip_exclusives')
      .select('id, title, brand, price_cents, pledged_cents, category, description, partner_logo')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[GET /api/registry/vip]', error);
      return NextResponse.json({ exclusives: [] });
    }

    return NextResponse.json({ exclusives: data ?? [] });
  } catch (err) {
    console.error('[GET /api/registry/vip] error:', err);
    return NextResponse.json({ exclusives: [] });
  }
}
