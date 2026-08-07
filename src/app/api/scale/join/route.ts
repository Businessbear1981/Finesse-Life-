import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emit } from '@/lib/intelligence';
import { parseBody } from '@/lib/api/validate';

const joinSchema = z.object({
  deal_id: z.string().uuid(),
  amount_cents: z.number().positive(),
});

// POST { deal_id: string, amount_cents: number }
// MVP: auth check + record join intent. Full CCBill payment wired in phase 2.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  const parsed = await parseBody(req, joinSchema);
  if (parsed.error) return parsed.error;
  const { deal_id, amount_cents } = parsed.data;

  // Prospectus rate: 1% cashback, funded by ~1.5% card interchange (~0.5% net
  // to Finesse). This is an estimate shown to the user — actual settlement
  // (and the charge itself) happens when a payment processor is wired (Phase 1+);
  // scale_joins has no amount/cashback/status columns to persist this against yet.
  const cashback_cents = Math.floor(amount_cents * 0.01);

  // Upsert vault account before writing intent
  await supabase
    .from('vault_accounts')
    .upsert(
      { user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );

  // scale_joins real schema is (id, deal_id, user_id, joined_at) — only insert
  // columns that exist, so this actually succeeds and trg_scale_join_count fires.
  const { error: joinError } = await supabase.from('scale_joins').insert({
    user_id: user.id,
    deal_id,
  });

  if (joinError) {
    // unique(deal_id, user_id) violation = already joined; anything else is real
    if (joinError.code === '23505') {
      return NextResponse.json({ error: 'Already joined this deal' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Could not join deal' }, { status: 500 });
  }

  // Emit behavioral signal (fire-and-forget)
  void emit({
    user_id: user.id,
    kind: 'scale_join',
    payload: {deal_id, amount_cents, cashback_cents},
  });

  return NextResponse.json({
    success: true,
    joined: true,
    cashback_cents,
    message: "You're in. Deal activates when the group is full.",
  });
}
