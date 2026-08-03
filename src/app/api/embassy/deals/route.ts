import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST { brand, item, source, retail_price, members_price, category, tier }
// Was a pure stub that always returned success without touching the database —
// nothing submitted via the Embassy brand-deal form ever actually persisted.
// Real schema (20260609_embassy.sql): retail_price_cents / members_price_cents
// (integers, cents), status defaults to 'pending' for ops review.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = (await req.json()) as {
    brand?: string;
    item?: string;
    source?: string;
    retail_price?: number;
    members_price?: number;
    category?: string;
    tier?: string;
  };

  if (!body.brand?.trim() || !body.item?.trim()) {
    return NextResponse.json({ error: 'brand and item are required' }, { status: 400 });
  }

  const { error } = await supabase.from('embassy_deals').insert({
    brand: body.brand.trim(),
    item: body.item.trim(),
    source: body.source ?? null,
    retail_price_cents: body.retail_price ? Math.round(body.retail_price * 100) : null,
    members_price_cents: body.members_price ? Math.round(body.members_price * 100) : null,
    category: body.category ?? null,
    tier: body.tier ?? null,
    submitted_by: user?.id ?? null,
  });

  if (error) {
    console.error('[POST /api/embassy/deals]', error);
    return NextResponse.json({ error: 'Could not submit deal' }, { status: 500 });
  }

  return Response.json({ success: true, message: 'Deal submitted for review. Our team will assess within 24h.' });
}
