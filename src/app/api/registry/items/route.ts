import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { emit } from '@/lib/intelligence';

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
      return NextResponse.json({ items: [] });
    }

    // Real schema (registry_items): name/image_url, not title/photo_url;
    // purchased boolean, not a status column — 'active' means not yet purchased.
    const { data, error } = await supabase
      .from('registry_items')
      .select('id, name, brand, price_cents, pledged_cents, category, occasion, image_url, source')
      .eq('user_id', user.id)
      .eq('purchased', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/registry/items]', error);
      return NextResponse.json({ items: [] });
    }

    const items = (data ?? []).map((row) => ({
      id: row.id,
      title: row.name,
      brand: row.brand,
      price_cents: row.price_cents,
      pledged_cents: row.pledged_cents,
      category: row.category,
      occasion: row.occasion,
      photo_url: row.image_url,
      source: row.source,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error('[GET /api/registry/items] error:', err);
    return NextResponse.json({ items: [] });
  }
}

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

    // Real schema (registry_items): name/image_url, not title/photo_url; no
    // status/visibility columns exist — purchased defaults to false on insert.
    const { data, error } = await supabase
      .from('registry_items')
      .insert({
        user_id: user.id,
        name: body.title.trim(),
        brand: body.brand ?? null,
        price_cents: body.price_cents ?? 0,
        category: body.category ?? 'Other',
        occasion: body.occasion ?? null,
        source: body.source ?? 'upload',
        image_url: body.photo_url ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[registry/items] insert error:', error);
      return NextResponse.json({ error: 'Could not save registry item' }, { status: 500 });
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
