import {NextResponse} from 'next/server';
import {NO_STORE, newTraceId} from '@/lib/keylock-server';
import {getActiveLiftSession} from '@/lib/vip-lift';

// GET /api/vip-keylock/session — is this browser holding a valid private-lift session?
export async function GET() {
  const traceId = newTraceId();
  const s = await getActiveLiftSession();
  return NextResponse.json(
    s.active ? {active: true, destination: s.destination, expiresAt: s.expiresAt, traceId} : {active: false, traceId},
    {headers: NO_STORE},
  );
}
