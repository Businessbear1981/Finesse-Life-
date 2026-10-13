import { NextResponse } from 'next/server';
import {createClient} from '@/lib/supabase/server';
import { emit } from '@/lib/intelligence';
import { checkMediaUrls, screenFields } from '@/lib/moderation';
import { contentRejected, postingGate } from '@/lib/moderation-server';
import { r2PublicBase } from '@/lib/r2';

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
    const supabase = await createClient();

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

    // Member safety (Apple 1.2 / Play UGC): house rules accepted, text filter, own-storage photos only.
    const gate = await postingGate(supabase, user.id);
    if (gate) return gate;
    const verdict = screenFields([body.title, body.brand, body.size, body.description], 'listing');
    if (verdict.verdict === 'reject') return contentRejected(verdict);
    const photos = checkMediaUrls(body.photo_urls, r2PublicBase(), user.id, 8);
    if (!photos.ok) return NextResponse.json({ error: photos.message }, { status: 400 });

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
        photo_urls: photos.urls,
        status: 'active',
      })
      .select('id, platform_fee_cents, seller_receives_cents')
      .single();

    if (error) {
      console.error('[exchange/list] insert error:', error);
      // The listing was not saved — say so rather than returning a fake local id.
      return NextResponse.json(
        { error: 'Your listing could not be saved. Nothing was posted — please try again.' },
        { status: 500 },
      );
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
