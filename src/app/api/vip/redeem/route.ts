import {NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

export async function POST(req: Request) {
  try {
    const {code} = (await req.json()) as {code: string};

    if (!code || typeof code !== 'string') {
      return NextResponse.json({error: 'Code is required.'}, {status: 400});
    }

    const normalised = code.trim().toUpperCase();

    // ── Service-role client (bypasses RLS on vip_codes) ──
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    );

    // Anon client to get the current user from the session cookie
    const anonSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    );

    const {
      data: {user},
    } = await anonSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({error: 'Not authenticated.'}, {status: 401});
    }

    // ── 1. Look up code ──
    const {data: vipCode, error: lookupErr} = await supabase
      .from('vip_codes')
      .select('id, use_count, max_uses, expires_at, is_active, used_by')
      .eq('code', normalised)
      .eq('is_active', true)
      .single();

    if (lookupErr || !vipCode) {
      return NextResponse.json({error: 'Invalid or expired code.'}, {status: 404});
    }

    if (vipCode.use_count >= vipCode.max_uses) {
      return NextResponse.json({error: 'This code has already been fully redeemed.'}, {status: 409});
    }

    if (vipCode.expires_at && new Date(vipCode.expires_at as string) < new Date()) {
      return NextResponse.json({error: 'This code has expired.'}, {status: 410});
    }

    // ── 2. Increment use_count ──
    const {error: updateCodeErr} = await supabase
      .from('vip_codes')
      .update({
        use_count: vipCode.use_count + 1,
        used_by: vipCode.used_by ?? user.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', vipCode.id);

    if (updateCodeErr) {
      console.error('[vip/redeem] update code error:', updateCodeErr);
      return NextResponse.json({error: 'Redemption failed. Try again.'}, {status: 500});
    }

    // ── 3. Grant VIP on profile — 1 year from now ──
    const vipExpiresAt = new Date();
    vipExpiresAt.setFullYear(vipExpiresAt.getFullYear() + 1);

    const {error: profileErr} = await supabase
      .from('profiles')
      .update({
        is_vip: true,
        vip_expires_at: vipExpiresAt.toISOString(),
      })
      .eq('id', user.id);

    if (profileErr) {
      console.error('[vip/redeem] profile update error:', profileErr);
      return NextResponse.json({error: 'VIP grant failed. Contact support.'}, {status: 500});
    }

    // ── 4. Upsert subscription record ──
    const {error: subErr} = await supabase.from('subscriptions').insert({
      user_id: user.id,
      status: 'active',
      plan: 'vip_code',
      provider: 'vip_code',
      current_period_start: new Date().toISOString(),
      current_period_end: vipExpiresAt.toISOString(),
    });

    if (subErr) {
      // Non-fatal — log and continue
      console.warn('[vip/redeem] subscription insert warning:', subErr);
    }

    return NextResponse.json({
      success: true,
      message: 'VIP access granted. Welcome to the inner room.',
    });
  } catch (err) {
    console.error('[vip/redeem] unexpected error:', err);
    return NextResponse.json({error: 'Internal server error.'}, {status: 500});
  }
}
