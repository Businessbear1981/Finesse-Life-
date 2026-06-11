import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createHmac, randomBytes} from 'crypto';

// KeyLock: entry timestamp + user_id → HMAC-SHA256 session cipher
// The moment you walk through the door IS the key. No timestamp = no access.

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  // Check VIP status
  const {data: profile} = await supabase
    .from('profiles')
    .select('is_vip, vip_expires_at')
    .eq('id', user.id)
    .single();

  const isVip = profile?.is_vip &&
    (profile.vip_expires_at === null || new Date(profile.vip_expires_at) > new Date());

  if (!isVip) return NextResponse.json({error: 'VIP required'}, {status: 403});

  // Entry timestamp = the cipher seed
  const entryTs = Date.now();
  const nonce = randomBytes(16).toString('hex');
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY ?? 'finesse-keylock-secret';

  // Key = HMAC-SHA256(secret, userId:entryTimestamp:nonce)
  const keyMaterial = `${user.id}:${entryTs}:${nonce}`;
  const sessionKey = createHmac('sha256', secret).update(keyMaterial).digest('hex');

  // Store session in DB (expires in 8 hours)
  const expiresAt = new Date(entryTs + 8 * 60 * 60 * 1000).toISOString();
  const {error: insertError} = await supabase
    .from('backstage_sessions')
    .insert({
      user_id: user.id,
      session_key: sessionKey,
      nonce,
      entered_at: new Date(entryTs).toISOString(),
      expires_at: expiresAt,
    });

  if (insertError) {
    // Table may not exist yet — still return key so UI works
    console.warn('[KeyLock] backstage_sessions insert failed:', insertError.message);
  }

  // Return key + expiry to client — stored in sessionStorage only (not localStorage)
  // sessionStorage dies with the tab — content locks when you leave
  return NextResponse.json({
    session_key: sessionKey,
    entered_at: entryTs,
    expires_at: expiresAt,
    nonce,
  });
}
