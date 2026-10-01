import {NextResponse} from 'next/server';
import {cookies, headers} from 'next/headers';
import {NO_STORE, VIP_LIFT_COOKIE, hasServiceRole, newTraceId, service, sha256} from '@/lib/keylock-server';

// POST /api/vip-keylock/lock — revoke this browser's lift session and close the doors.
export async function POST() {
  const traceId = newTraceId();
  const token = (await cookies()).get(VIP_LIFT_COOKIE)?.value ?? (await headers()).get('x-finesse-lift') ?? undefined;
  if (token && hasServiceRole()) {
    await service().from('vip_lift_sessions').update({revoked_at: new Date().toISOString()}).eq('token_hash', sha256(token));
  }
  const res = NextResponse.json({state: 'locked', traceId}, {headers: NO_STORE});
  res.cookies.set(VIP_LIFT_COOKIE, '', {httpOnly: true, path: '/', maxAge: 0});
  return res;
}
