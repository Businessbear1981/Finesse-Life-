import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {emit} from '@/lib/intelligence';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';

const fundSchema = z.object({
  amount_cents: z.number().int().min(1000, 'Minimum top-up is $10'),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const parsed = await parseBody(req, fundSchema);
  if (parsed.error) return parsed.error;
  const {amount_cents} = parsed.data;

  // Upsert account so it exists before we write a transaction
  const {error: upsertError} = await supabase.from('vault_accounts').upsert(
    {user_id: user.id, updated_at: new Date().toISOString()},
    {onConflict: 'user_id', ignoreDuplicates: true},
  );
  if (upsertError) {
    console.error('[vault/fund] account upsert error:', upsertError);
    return NextResponse.json({error: 'Could not fund Vault.'}, {status: 500});
  }

  // Record funding credit
  const {error: txnError} = await supabase.from('vault_transactions').insert({
    user_id: user.id,
    merchant: 'Vault Top-Up',
    amount_cents,
    cashback_cents: 0,
    category: 'funding',
    direction: 'credit',
    cipher: null,
  });
  if (txnError) {
    console.error('[vault/fund] transaction insert error:', txnError);
    return NextResponse.json({error: 'Could not fund Vault.'}, {status: 500});
  }

  // Fetch current balance then increment
  const {data: acct, error: fetchError} = await supabase
    .from('vault_accounts')
    .select('balance_cents')
    .eq('user_id', user.id)
    .single();
  if (fetchError) {
    console.error('[vault/fund] balance fetch error:', fetchError);
    return NextResponse.json({error: 'Could not fund Vault.'}, {status: 500});
  }

  const new_balance_cents = (acct?.balance_cents ?? 0) + amount_cents;

  const {error: updateError} = await supabase.from('vault_accounts').update({
    balance_cents: new_balance_cents,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id);
  if (updateError) {
    console.error('[vault/fund] balance update error:', updateError);
    return NextResponse.json({error: 'Could not fund Vault.'}, {status: 500});
  }

  // Emit behavioral signal (fire-and-forget)
  void emit({
    user_id: user.id,
    kind: 'vault_fund',
    payload: {amount_cents, new_balance_cents},
  });

  return NextResponse.json({
    funded: true,
    amount_cents,
    new_balance_cents,
  });
}
