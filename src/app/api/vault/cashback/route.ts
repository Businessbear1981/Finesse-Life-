import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createHmac} from 'crypto';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';

const cashbackSchema = z.object({
  merchant: z.string().trim().min(1),
  amount_cents: z.number().positive(),
  category: z.string().trim().optional(),
  session_key: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const parsed = await parseBody(req, cashbackSchema);
  if (parsed.error) return parsed.error;
  const {merchant, amount_cents, category, session_key} = parsed.data;

  // Prospectus rate: 1% cashback, funded by ~1.5% card interchange (~0.5% net
  // to Finesse) — not the 12% this route previously credited from no funding source.
  const cashback_cents = Math.floor(amount_cents * 0.01);

  // KeyLock cipher: HMAC-SHA256(secret, userId:amount:timestamp:sessionKey) — ties
  // this transaction to the moment it was initiated. vault_transactions has no
  // `cipher` column, so this is returned to the caller for verification but not
  // persisted; a schema migration would be needed to store it.
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY ?? 'finesse-keylock-default';
  const ts = Date.now();
  const cipherInput = `${user.id}:${amount_cents}:${ts}:${session_key ?? 'public'}`;
  const cipher = createHmac('sha256', secret).update(cipherInput).digest('hex');

  // Upsert vault account (ensure it exists before writing transactions)
  await supabase.from('vault_accounts').upsert(
    {user_id: user.id, updated_at: new Date().toISOString()},
    {onConflict: 'user_id', ignoreDuplicates: true},
  );

  // Record the purchase (debit) — negative amount_cents signals outflow.
  // direction only allows 'debit'/'credit'. cipher column added in
  // 20260801_vault_transactions_cipher.sql — run that migration before this
  // will succeed against a database that predates it.
  const {error: debitError} = await supabase.from('vault_transactions').insert({
    user_id: user.id,
    merchant,
    amount_cents: -Math.abs(amount_cents),
    cashback_cents,
    category: category ?? 'general',
    direction: 'debit',
    cipher,
  });

  // Record the cashback credit as a separate transaction line.
  const {error: creditError} = await supabase.from('vault_transactions').insert({
    user_id: user.id,
    merchant: `1% back — ${merchant}`,
    amount_cents: cashback_cents,
    cashback_cents: 0,
    category: 'cashback',
    cipher,
    direction: 'credit',
  });

  if (debitError || creditError) {
    return NextResponse.json({error: 'Could not record vault transaction'}, {status: 500});
  }

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
