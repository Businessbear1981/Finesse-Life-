import {NextResponse} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';

// The only path that grants VIP from a code. The member is identified from their own session
// (cookie or mobile bearer); the grant itself runs in public.redeem_vip_code
// (20261009_security_floor.sql), which locks the code row and is executable by the service
// role only — members cannot write is_vip / vip_expires_at themselves.

const redeemSchema = z.object({code: z.string().trim().min(4).max(64)});

const OUTCOMES: Record<string, {status: number; error: string}> = {
  invalid: {status: 404, error: 'Invalid or expired code.'},
  expired: {status: 410, error: 'This code has expired.'},
  exhausted: {status: 409, error: 'This code has already been fully redeemed.'},
  already_redeemed: {status: 409, error: 'You have already redeemed this code.'},
  no_profile: {status: 409, error: 'Finish setting up your profile first.'},
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({error: 'Not authenticated.'}, {status: 401});
  }

  const parsed = await parseBody(req, redeemSchema);
  if (parsed.error) return parsed.error;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({error: 'Redemption is unavailable right now.'}, {status: 503});
  }

  const {data, error} = await createServiceClient().rpc('redeem_vip_code', {
    p_code: parsed.data.code,
    p_user: user.id,
    p_months: 12,
  });

  if (error) {
    console.error('[vip/redeem] rpc error:', error.message);
    return NextResponse.json({error: 'Redemption failed. Try again.'}, {status: 500});
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | {result_status: string; result_expires: string | null}
    | undefined;
  if (!row || row.result_status !== 'granted') {
    const outcome = OUTCOMES[row?.result_status ?? 'invalid'] ?? OUTCOMES.invalid;
    return NextResponse.json({error: outcome.error}, {status: outcome.status});
  }

  return NextResponse.json({
    success: true,
    message: 'VIP access granted. Welcome to the inner room.',
    vip_expires_at: row.result_expires,
  });
}
