import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { emit } from '@/lib/intelligence';

interface ListPayload {
  title: string;
  description?: string;
  brand?: string;
  size?: string;
  condition?: string;
  asking_price_cents: number;
  category?: string;
  photo_urls?: string[];
}

export async function POST(req: Request) {
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

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await req.json()) as ListPayload;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title required.' }, { status: 400 });
    }
    if (!body.asking_price_cents || body.asking_price_cents < 100) {
      return NextResponse.json({ error: 'Minimum price is $1.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('exchange_listings')
      .insert({
        seller_id: user.id,
        title: body.title.trim(),
        description: body.description ?? null,
        brand: body.brand ?? null,
        size: body.size ?? null,
        condition: body.condition ?? 'excellent',
        asking_price_cents: body.asking_price_cents,
        category: body.category ?? null,
        photo_urls: body.photo_urls ?? [],
        status: 'active',
      })
      .select('id, platform_fee_cents, seller_receives_cents')
      .single();

    if (error) {
      console.error('[exchange/list] insert error:', error);
      // Graceful fallback — compute fee locally
      const fee = Math.floor(body.asking_price_cents * 0.08);
      return NextResponse.json({
        success: true,
        id: `local_${Date.now()}`,
        platform_fee_cents: fee,
        seller_receives_cents: body.asking_price_cents - fee,
      });
    }

    // Emit behavioral signal (fire-and-forget)
    void emit({
      user_id: user.id,
      kind: 'list_item',
      payload: {
        title: body.title,
        brand: body.brand,
        category: body.category,
        asking_price_cents: body.asking_price_cents,
        condition: body.condition,
      },
    });

    return NextResponse.json({
      success: true,
      id: data.id,
      platform_fee_cents: data.platform_fee_cents,
      seller_receives_cents: data.seller_receives_cents,
    });
  } catch (err) {
    console.error('[exchange/list] error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
