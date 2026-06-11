import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {amount_cents} = await req.json() as {amount_cents: number};
  if (!amount_cents || amount_cents < 1000) {
    return NextResponse.json({error: 'Minimum top-up is $10'}, {status: 400});
  }

  // Upsert account so it exists before we write a transaction
  await supabase.from('vault_accounts').upsert(
    {user_id: user.id, updated_at: new Date().toISOString()},
    {onConflict: 'user_id', ignoreDuplicates: true},
  );

  // Record funding credit
  await supabase.from('vault_transactions').insert({
    user_id: user.id,
    merchant: 'Vault Top-Up',
    amount_cents,
    cashback_cents: 0,
    category: 'funding',
    direction: 'credit',
    cipher: null,
  });

  // Fetch current balance then increment
  const {data: acct} = await supabase
    .from('vault_accounts')
    .select('balance_cents')
    .eq('user_id', user.id)
    .single();

  const new_balance_cents = (acct?.balance_cents ?? 0) + amount_cents;

  await supabase.from('vault_accounts').update({
    balance_cents: new_balance_cents,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id);

  return NextResponse.json({
    funded: true,
    amount_cents,
    new_balance_cents,
  });
}
