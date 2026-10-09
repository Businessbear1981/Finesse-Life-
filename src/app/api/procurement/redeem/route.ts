import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/api/validate';

// POST { token: string }
// Redeems a procurement token exactly once. Members have no UPDATE policy on
// procurement_tokens (and, since 20261009, no INSERT policy either), so the state change
// runs with the service role as ONE conditional update: only an unused, unexpired token
// owned by the caller flips to 'redeemed'. Two concurrent redeems cannot both succeed.
const redeemSchema = z.object({ token: z.string().trim().min(1).max(128) });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  const parsed = await parseBody(req, redeemSchema);
  if (parsed.error) return parsed.error;
  const { token } = parsed.data;

  const service = createServiceClient();
  const now = new Date().toISOString();

  const { data: redeemed, error: updateError } = await service
    .from('procurement_tokens')
    .update({ status: 'redeemed', redeemed_at: now })
    .eq('token', token)
    .eq('user_id', user.id)
    .eq('status', 'unused')
    .gt('expires_at', now)
    .select('partner_name,estimated_savings_cents')
    .maybeSingle();

  if (updateError) {
    console.error('[procurement/redeem] update failed:', updateError.message);
    return NextResponse.json({ error: 'Redemption failed. Try again.' }, { status: 500 });
  }

  if (redeemed) {
    return NextResponse.json({
      success: true,
      partner_name: redeemed.partner_name,
      estimated_savings_cents: redeemed.estimated_savings_cents,
      message: 'Token redeemed.',
    });
  }

  // Nothing changed — explain why from the member's own row (RLS read policy).
  const { data: row } = await supabase
    .from('procurement_tokens')
    .select('id,status')
    .eq('token', token)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }
  if (row.status === 'redeemed') {
    return NextResponse.json({ error: 'Token already redeemed' }, { status: 409 });
  }
  if (row.status === 'unused') {
    await service.from('procurement_tokens').update({ status: 'expired' }).eq('id', row.id).eq('status', 'unused');
  }
  return NextResponse.json({ error: 'Token expired' }, { status: 410 });
}
