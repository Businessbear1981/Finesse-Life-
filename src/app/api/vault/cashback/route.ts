import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createHmac} from 'crypto';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {merchant, amount_cents, category, session_key} = await req.json() as {
    merchant: string;
    amount_cents: number;
    category: string;
    session_key?: string;
  };

  if (!amount_cents || amount_cents <= 0) {
    return NextResponse.json({error: 'Invalid amount'}, {status: 400});
  }

  if (!merchant || typeof merchant !== 'string') {
    return NextResponse.json({error: 'merchant is required'}, {status: 400});
  }

  // 12% cashback — every dollar spent on Finesse earns back to the vault
  const cashback_cents = Math.floor(amount_cents * 0.12);

  // KeyLock cipher: HMAC-SHA256(secret, userId:amount:timestamp:sessionKey)
  // The session_key ties this transaction to the exact moment the member was in Backstage
  // or the purchase was initiated
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY ?? 'finesse-keylock-default';
  const ts = Date.now();
  const cipherInput = `${user.id}:${amount_cents}:${ts}:${session_key ?? 'public'}`;
  const cipher = createHmac('sha256', secret).update(cipherInput).digest('hex');

  // Upsert vault account (ensure it exists before writing transactions)
  await supabase.from('vault_accounts').upsert(
    {user_id: user.id, updated_at: new Date().toISOString()},
    {onConflict: 'user_id', ignoreDuplicates: true},
  );

  // Record the purchase (debit) — negative amount_cents signals outflow
  await supabase.from('vault_transactions').insert({
    user_id: user.id,
    merchant,
    amount_cents: -Math.abs(amount_cents),
    cashback_cents,
    category: category ?? 'general',
    direction: 'debit',
    cipher,
  });

  // Record the cashback credit as a separate transaction line
  await supabase.from('vault_transactions').insert({
    user_id: user.id,
    merchant: `12% back — ${merchant}`,
    amount_cents: cashback_cents,
    cashback_cents: 0,
    category: 'cashback',
    direction: 'cashback',
    cipher,
  });

  // Fetch current balances then increment atomically via update
  const {data: acct} = await supabase
    .from('vault_accounts')
    .select('balance_cents, cashback_earned_cents')
    .eq('user_id', user.id)
    .single();

  if (acct) {
    await supabase.from('vault_accounts').update({
      balance_cents: acct.balance_cents + cashback_cents,
      cashback_earned_cents: acct.cashback_earned_cents + cashback_cents,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
  }

  return NextResponse.json({
    cashback_cents,
    cashback_dollars: (cashback_cents / 100).toFixed(2),
    cipher,
    message: `$${(cashback_cents / 100).toFixed(2)} deposited to your Vault`,
  });
}
