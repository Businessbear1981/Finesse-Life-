import {NextResponse} from 'next/server';
import {ENTRANCE_COOKIE, NO_STORE, newTraceId} from '@/lib/keylock-server';

// POST /api/keylock/entrance/lock — close the entrance session for this browser.
export async function POST() {
  const res = NextResponse.json({state: 'locked', traceId: newTraceId()}, {headers: NO_STORE});
  res.cookies.set(ENTRANCE_COOKIE, '', {httpOnly: true, path: '/', maxAge: 0});
  return res;
}
