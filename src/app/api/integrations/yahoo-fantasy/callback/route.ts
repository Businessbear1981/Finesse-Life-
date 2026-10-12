import {NextResponse, type NextRequest} from 'next/server';
import {requireUser} from '@/lib/api-guard';
import {createServiceClient} from '@/lib/data/service';
import {exchangeCode, sealTokens} from '@/lib/integrations/yahoo';
import {safeEqual} from '@/lib/net/webhook-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const me = await requireUser();
  if (me instanceof NextResponse) return me;
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const [cookieState, cookieUser] = (req.cookies.get('yf_state')?.value ?? '').split('.');
  // State must match the cookie and the cookie must belong to the signed-in member.
  if (!code || !safeEqual(state, cookieState) || cookieUser !== me.id) {
    return NextResponse.json({error: 'invalid OAuth state'}, {status: 400});
  }
  const tokens = await exchangeCode(code);
  const {error} = await createServiceClient().from('social_connections').upsert({
    user_id: me.id, provider: 'yahoo', scopes: ['fspt-r'], access_token_enc: sealTokens(tokens), status: 'connected', updated_at: new Date().toISOString(),
  }, {onConflict: 'user_id,provider'});
  if (error) return NextResponse.json({error: 'could not save connection'}, {status: 500});
  const res = NextResponse.redirect(new URL('/carpe-diem?fantasy=connected', req.url));
  res.cookies.delete('yf_state');
  return res;
}
