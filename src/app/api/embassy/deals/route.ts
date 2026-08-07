import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/api/validate';

// POST { brand, item, source, retail_price, members_price, category, tier }
// Was a pure stub that always returned success without touching the database —
// nothing submitted via the Embassy brand-deal form ever actually persisted.
// Real schema (20260609_embassy.sql): retail_price_cents / members_price_cents
// (integers, cents), status defaults to 'pending' for ops review.
const dealSchema = z.object({
  brand: z.string().trim().min(1),
  item: z.string().trim().min(1),
  source: z.string().trim().optional(),
  retail_price: z.number().positive().optional(),
  members_price: z.number().positive().optional(),
  category: z.string().trim().optional(),
  tier: z.enum(['budget', 'mid', 'contemporary', 'premium']).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const parsed = await parseBody(req, dealSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

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
