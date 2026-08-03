import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST { token: string }
// Verifies a procurement token is real, unexpired, and unused — then marks it
// redeemed. Previously tokens were random strings with no backing state at
// all; this is the first real enforcement of "single-use, expires in 72h."
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  const { token } = (await req.json()) as { token?: string };
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from('procurement_tokens')
    .select('id,status,expires_at,partner_name,estimated_savings_cents')
    .eq('token', token)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  if (row.status === 'redeemed') {
    return NextResponse.json({ error: 'Token already redeemed' }, { status: 409 });
  }

  if (row.status === 'expired' || new Date(row.expires_at) < new Date()) {
    if (row.status !== 'expired') {
      await supabase.from('procurement_tokens').update({ status: 'expired' }).eq('id', row.id);
    }
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  await supabase
    .from('procurement_tokens')
    .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
    .eq('id', row.id);

  return NextResponse.json({
    success: true,
    partner_name: row.partner_name,
    estimated_savings_cents: row.estimated_savings_cents,
    message: 'Token redeemed.',
  });
}
