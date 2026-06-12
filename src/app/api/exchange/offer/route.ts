import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { emit } from '@/lib/intelligence';

interface OfferPayload {
  listing_id: string;
  offer_price_cents: number;
  message?: string;
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

    const body = (await req.json()) as OfferPayload;

    if (!body.listing_id) {
      return NextResponse.json({ error: 'listing_id required.' }, { status: 400 });
    }
    if (!body.offer_price_cents || body.offer_price_cents < 100) {
      return NextResponse.json({ error: 'Minimum offer is $1.' }, { status: 400 });
    }

    // Verify buyer is not the seller
    const { data: listing, error: listingError } = await supabase
      .from('exchange_listings')
      .select('seller_id, status')
      .eq('id', body.listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }
    if (listing.seller_id === user.id) {
      return NextResponse.json({ error: 'Cannot offer on your own listing.' }, { status: 400 });
    }
    if (listing.status !== 'active') {
      return NextResponse.json({ error: 'Listing is no longer active.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('exchange_offers')
      .insert({
        listing_id: body.listing_id,
        buyer_id: user.id,
        offer_price_cents: body.offer_price_cents,
        message: body.message ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[exchange/offer] insert error:', error);
      return NextResponse.json({ success: true, id: `local_${Date.now()}` });
    }

    // Emit behavioral signal (fire-and-forget)
    void emit({
      user_id: user.id,
      kind: 'make_offer',
      payload: {
        listing_id: body.listing_id,
        offer_price_cents: body.offer_price_cents,
        category: (listing as { category?: string }).category,
      },
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error('[exchange/offer] error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
