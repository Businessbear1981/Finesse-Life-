import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { emit } from '@/lib/intelligence';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? '';
    const min = parseInt(searchParams.get('min') ?? '0', 10);
    const max = parseInt(searchParams.get('max') ?? '0', 10);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const mine = searchParams.get('mine') === '1';
    const offersMode = searchParams.get('offers') === '1';
    const pageSize = 24;
    const offset = (page - 1) * pageSize;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    );

    const { data: { user } } = await supabase.auth.getUser();

    // ── My Offers: listings where I'm the buyer ───────────────────────────────
    if (offersMode) {
      if (!user) return NextResponse.json({ listings: [], total: 0, page });
      const { data, error, count } = await supabase
        .from('exchange_offers')
        .select('*, exchange_listings(*)', { count: 'exact' })
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) return NextResponse.json({ listings: [], total: 0, page });
      // Flatten to listing shape with offer status attached
      const listings = (data ?? []).map((row) => ({
        ...(row.exchange_listings as Record<string, unknown>),
        my_offer_cents: row.offer_price_cents,
        my_offer_status: row.status,
        my_offer_id: row.id,
      }));
      return NextResponse.json({ listings, total: count ?? 0, page });
    }

    // ── My Listings: items I posted ───────────────────────────────────────────
    if (mine) {
      if (!user) return NextResponse.json({ listings: [], total: 0, page });
      const { data, error, count } = await supabase
        .from('exchange_listings')
        .select('*', { count: 'exact' })
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) return NextResponse.json({ listings: [], total: 0, page });
      return NextResponse.json({ listings: data ?? [], total: count ?? 0, page });
    }

    // ── Browse: active listings with filters ──────────────────────────────────
    let query = supabase
      .from('exchange_listings')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (category && category !== 'all') query = query.eq('category', category);
    if (min > 0) query = query.gte('asking_price_cents', min);
    if (max > 0) query = query.lte('asking_price_cents', max);

    const { data, error, count } = await query;

    if (error) {
      console.error('[exchange/listings] query error:', error);
      return NextResponse.json({ listings: [], total: 0, page });
    }

    void emit({
      user_id: user?.id ?? 'guest',
      kind: 'view_listing',
      payload: { category: category || 'All', count: count ?? 0 },
    });

    return NextResponse.json({ listings: data ?? [], total: count ?? 0, page });
  } catch (err) {
    console.error('[exchange/listings] error:', err);
    return NextResponse.json({ listings: [], total: 0, page: 1 });
  }
}
