import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  // Get vault account (may not exist yet for new members)
  const {data: account} = await supabase
    .from('vault_accounts')
    .select('balance_cents, cashback_earned_cents')
    .eq('user_id', user.id)
    .maybeSingle();

  const {data: transactions} = await supabase
    .from('vault_transactions')
    .select('id, merchant, amount_cents, cashback_cents, category, direction, created_at')
    .eq('user_id', user.id)
    .order('created_at', {ascending: false})
    .limit(20);

  return NextResponse.json({
    balance_cents: account?.balance_cents ?? 0,
    cashback_earned_cents: account?.cashback_earned_cents ?? 0,
    transactions: transactions ?? [],
  });
}
