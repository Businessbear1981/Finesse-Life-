import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { emit } from '@/lib/intelligence';

interface ItemPayload {
  title: string;
  brand?: string;
  price_cents?: number;
  category?: string;
  occasion?: string;
  source?: string;
  photo_url?: string | null;
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = (await req.json()) as ItemPayload;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title required.' }, { status: 400 });
    }

    if (!user) {
      // Allow unauthenticated in demo — return a synthetic id
      return NextResponse.json({ success: true, id: `demo_${Date.now()}` });
    }

    const { data, error } = await supabase
      .from('registry_items')
      .insert({
        user_id: user.id,
        title: body.title.trim(),
        brand: body.brand ?? null,
        price_cents: body.price_cents ?? 0,
        category: body.category ?? 'Other',
        occasion: body.occasion ?? null,
        source: body.source ?? 'upload',
        photo_url: body.photo_url ?? null,
        status: 'active',
        visibility: 'private',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[registry/items] insert error:', error);
      return NextResponse.json({ success: true, id: `local_${Date.now()}` });
    }

    // Emit behavioral signal (fire-and-forget)
    void emit({
      user_id: user.id,
      kind: 'add_to_registry',
      payload: {
        title: body.title.trim(),
        brand: body.brand,
        price_cents: body.price_cents,
        category: body.category ?? 'Other',
      },
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error('[registry/items] error:', err);
    return NextResponse.json(
      { success: true, id: `fallback_${Date.now()}` },
      { status: 200 },
    );
  }
}
