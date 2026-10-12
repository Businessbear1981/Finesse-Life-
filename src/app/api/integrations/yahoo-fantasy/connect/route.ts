import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {requireUser} from '@/lib/api-guard';
import {authorizeUrl, yahooConfigured} from '@/lib/integrations/yahoo';

export const runtime = 'nodejs';

// Starts Yahoo OAuth. A random state is bound to this browser in an httpOnly cookie (CSRF).
export async function GET() {
  const me = await requireUser();
  if (me instanceof NextResponse) return me;
  if (!yahooConfigured()) return NextResponse.json({error: 'Yahoo Fantasy is not configured'}, {status: 503});
  const state = randomBytes(24).toString('base64url');
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set('yf_state', `${state}.${me.id}`, {httpOnly: true, secure: true, sameSite: 'lax', path: '/api/integrations/yahoo-fantasy', maxAge: 600});
  return res;
}
