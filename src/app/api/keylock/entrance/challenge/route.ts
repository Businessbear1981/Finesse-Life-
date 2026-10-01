import {NextRequest, NextResponse} from 'next/server';
import {randomBytes, randomUUID} from 'crypto';
import {CHALLENGE_TTL_MS, LOCKOUT, NO_STORE, anonSubject, audit, newTraceId, recentFailures, service} from '@/lib/keylock-server';
import {entranceConfig} from '@/lib/entrance-keylock';

// POST /api/keylock/entrance/challenge — issue a short-lived public-entrance challenge.
// Separate from /api/keylock/enter (Backstage) and /api/vip-keylock/* (private lift).
export async function POST(req: NextRequest) {
  const traceId = newTraceId();
  const cfg = entranceConfig();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS.entrance).toISOString();

  if (!cfg.production) {
    return NextResponse.json({state: 'ready', mode: 'preview', challengeId: randomUUID(), expiresAt, traceId}, {headers: NO_STORE});
  }

  const subject = anonSubject(req, cfg.secret!);
  if ((await recentFailures('entrance', subject)) >= LOCKOUT.maxFailures) {
    await audit({lock: 'entrance', eventType: 'keylock.challenge_refused', outcome: 'rate_limited', subjectHash: subject, traceId});
    return NextResponse.json(
      {state: 'rate_limited', message: 'The mechanism rests. Try again in a few minutes.', traceId},
      {status: 429, headers: NO_STORE},
    );
  }

  const {data, error} = await service()
    .from('keylock_challenges')
    .insert({lock: 'entrance', subject_hash: subject, nonce: randomBytes(16).toString('hex'), expires_at: expiresAt})
    .select('id')
    .single();

  if (error || !data) {
    console.error('[keylock:entrance] challenge insert failed', error?.message, traceId);
    return NextResponse.json({state: 'unavailable', message: 'The entrance is being serviced.', traceId}, {status: 503, headers: NO_STORE});
  }

  await audit({lock: 'entrance', eventType: 'keylock.challenge_started', outcome: 'ok', subjectHash: subject, challengeId: data.id, traceId});
  return NextResponse.json({state: 'ready', mode: 'production', challengeId: data.id, expiresAt, traceId}, {headers: NO_STORE});
}
