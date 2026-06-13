import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { emit } from '@/lib/intelligence';

// POST { deal_id: string, amount_cents: number }
// MVP: auth check + record join intent. Full CCBill payment wired in phase 2.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  const body = await req.json() as { deal_id?: string; amount_cents?: number };
  const { deal_id, amount_cents } = body;

  if (!deal_id || typeof deal_id !== 'string') {
    return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
  }

  if (!amount_cents || amount_cents <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  // Record join intent in vault — 12% cashback will be settled when deal unlocks
  // For MVP we record the intent; CCBill charge fires when group hits goal
  const cashback_cents = Math.floor(amount_cents * 0.12);

  // Upsert vault account before writing intent
  await supabase
    .from('vault_accounts')
    .upsert(
      { user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );

  // Store deal join intent (table may not exist in MVP — ignore error gracefully)
  await supabase.from('scale_joins').insert({
    user_id: user.id,
    deal_id,
    amount_cents,
    cashback_cents,
    status: 'pending',
  });

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
