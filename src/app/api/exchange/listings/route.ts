import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? '';
    const min = parseInt(searchParams.get('min') ?? '0', 10);
    const max = parseInt(searchParams.get('max') ?? '0', 10);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = 24;
    const offset = (page - 1) * pageSize;

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

    let query = supabase
      .from('exchange_listings')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (min > 0) {
      query = query.gte('asking_price_cents', min);
    }
    if (max > 0) {
      query = query.lte('asking_price_cents', max);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[exchange/listings] query error:', error);
      // Return empty on error rather than crashing
      return NextResponse.json({ listings: [], total: 0, page });
    }

    return NextResponse.json({
      listings: data ?? [],
      total: count ?? 0,
      page,
    });
  } catch (err) {
    console.error('[exchange/listings] error:', err);
    return NextResponse.json({ listings: [], total: 0, page: 1 });
  }
}
