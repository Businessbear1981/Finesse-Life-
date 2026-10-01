import {NextRequest, NextResponse} from 'next/server';
import {parseBody} from '@/lib/api/validate';
import {entranceVerifyRequest, type EntranceVerifyResponse} from '@/lib/contracts';
import {
  ENTRANCE_COOKIE, LOCKOUT, NO_STORE, anonSubject, audit, constantTimeEqual, keylockSecret,
  newTraceId, recentFailures, service, signEntrance,
} from '@/lib/keylock-server';
import {ENTRANCE_SESSION_TTL_MS, entranceConfig} from '@/lib/entrance-keylock';

// POST /api/keylock/entrance/verify — the full six digits are checked here, once.
// The client never learns digits individually (no per-digit oracle).
export async function POST(req: NextRequest) {
  const traceId = newTraceId();
  const parsed = await parseBody(req, entranceVerifyRequest);
  if (parsed.error) return parsed.error;
  const {challengeId, code} = parsed.data;
  const cfg = entranceConfig();

  const respond = (body: EntranceVerifyResponse, status = 200) => {
    const res = NextResponse.json(body, {status, headers: NO_STORE});
    const secret = keylockSecret();
    if (body.state === 'open' && secret) {
      res.cookies.set(ENTRANCE_COOKIE, signEntrance(secret, body.mode, ENTRANCE_SESSION_TTL_MS), {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
        maxAge: ENTRANCE_SESSION_TTL_MS / 1000,
      });
    }
    return res;
  };

  if (!cfg.production) return respond({state: 'open', mode: 'preview', traceId});

  const subject = anonSubject(req, cfg.secret!);
  if ((await recentFailures('entrance', subject)) >= LOCKOUT.maxFailures) {
    await audit({lock: 'entrance', eventType: 'keylock.verify', outcome: 'rate_limited', subjectHash: subject, challengeId, traceId});
    return respond({state: 'rate_limited', message: 'The mechanism rests. Try again in a few minutes.', traceId}, 429);
  }

  const db = service();
  const {data: ch} = await db
    .from('keylock_challenges')
    .select('id, subject_hash, attempts, max_attempts, expires_at, consumed_at')
    .eq('id', challengeId)
    .eq('lock', 'entrance')
    .maybeSingle();

  if (!ch || ch.subject_hash !== subject || ch.consumed_at || new Date(ch.expires_at) < new Date() || ch.attempts >= ch.max_attempts) {
    await audit({lock: 'entrance', eventType: 'keylock.verify', outcome: 'expired', subjectHash: subject, challengeId, traceId});
    return respond({state: 'expired', message: 'The tumblers reset. Begin again.', traceId}, 410);
  }

  if (!constantTimeEqual(code, cfg.code)) {
    await db.from('keylock_challenges').update({attempts: ch.attempts + 1}).eq('id', ch.id);
    await audit({lock: 'entrance', eventType: 'keylock.verify', outcome: 'invalid', subjectHash: subject, challengeId, traceId});
    return respond({state: 'invalid', message: 'The mechanism holds.', traceId}, 401);
  }

  await db.from('keylock_challenges').update({consumed_at: new Date().toISOString(), attempts: ch.attempts + 1}).eq('id', ch.id);
  await audit({lock: 'entrance', eventType: 'keylock.verified', outcome: 'ok', subjectHash: subject, challengeId, traceId});
  return respond({state: 'open', mode: 'production', traceId});
}
