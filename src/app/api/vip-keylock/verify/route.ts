import {NextRequest, NextResponse} from 'next/server';
import {randomBytes} from 'crypto';
import {parseBody} from '@/lib/api/validate';
import {vipLiftVerifyRequest, type VipLiftVerifyResponse} from '@/lib/contracts';
import {
  LOCKOUT, NO_STORE, VIP_LIFT_COOKIE, VIP_LIFT_SESSION_TTL_MS, audit, hashPin, isWeakPin,
  newTraceId, recentFailures, service, sha256, verifyPin,
} from '@/lib/keylock-server';
import {LIFT_COPY, getVipEntitlement, liftReady} from '@/lib/vip-lift';
import {recordEngagement} from '@/lib/revenue/events';

// POST /api/vip-keylock/verify — checks the six digits on the doors against the
// member's lift PIN (or enrolls it on first ride), re-checks VIP, and issues a
// 30-minute scoped lift session. Doors open in the UI only after this says so.
export async function POST(req: NextRequest) {
  const traceId = newTraceId();
  const parsed = await parseBody(req, vipLiftVerifyRequest);
  if (parsed.error) return parsed.error;
  const {challengeId, code, destination} = parsed.data;
  const reply = (b: VipLiftVerifyResponse, status = 200) => NextResponse.json(b, {status, headers: NO_STORE});

  const ent = await getVipEntitlement();
  if (ent.state === 'signed_out') return reply({state: 'signed_out', message: LIFT_COPY.signed_out, traceId}, 401);
  if (!liftReady()) return reply({state: 'unavailable', message: LIFT_COPY.unavailable, traceId}, 503);
  const subject = sha256(`vip_lift:${ent.userId}`);
  if (ent.state !== 'entitled') return reply({state: ent.state === 'expired' ? 'expired' : 'not_entitled', message: LIFT_COPY[ent.state], traceId}, 403);

  if ((await recentFailures('vip_lift', subject)) >= LOCKOUT.maxFailures) {
    await audit({lock: 'vip_lift', eventType: 'vip.keylock_verify', outcome: 'rate_limited', subjectHash: subject, userId: ent.userId, challengeId, traceId});
    return reply({state: 'rate_limited', message: LIFT_COPY.rate_limited, traceId}, 429);
  }

  const db = service();
  const {data: ch} = await db
    .from('keylock_challenges')
    .select('id, user_id, mode, attempts, max_attempts, expires_at, consumed_at')
    .eq('id', challengeId)
    .eq('lock', 'vip_lift')
    .maybeSingle();

  if (!ch || ch.user_id !== ent.userId || ch.consumed_at || new Date(ch.expires_at) <= new Date() || ch.attempts >= ch.max_attempts) {
    await audit({lock: 'vip_lift', eventType: 'vip.keylock_verify', outcome: 'expired', subjectHash: subject, userId: ent.userId, challengeId, traceId});
    return reply({state: 'expired', message: LIFT_COPY.challenge_expired, traceId}, 410);
  }

  if (ch.mode === 'enroll') {
    if (isWeakPin(code)) {
      return reply({state: 'invalid', message: 'Choose six numbers that are harder to guess.', attemptsRemaining: ch.max_attempts - ch.attempts, traceId}, 422);
    }
    const {error} = await db.from('vip_lift_pins').upsert({user_id: ent.userId, pin_hash: await hashPin(code), updated_at: new Date().toISOString()});
    if (error) return reply({state: 'unavailable', message: LIFT_COPY.unavailable, traceId}, 503);
    await audit({lock: 'vip_lift', eventType: 'vip.keylock_enrolled', outcome: 'enrolled', subjectHash: subject, userId: ent.userId, challengeId, traceId});
  } else {
    const {data: pin} = await db.from('vip_lift_pins').select('pin_hash').eq('user_id', ent.userId).maybeSingle();
    const ok = pin ? await verifyPin(code, pin.pin_hash) : false;
    if (!ok) {
      const attempts = ch.attempts + 1;
      await db.from('keylock_challenges').update({attempts}).eq('id', ch.id);
      await audit({lock: 'vip_lift', eventType: 'vip.keylock_verify', outcome: 'invalid', subjectHash: subject, userId: ent.userId, challengeId, traceId});
      return reply({state: 'invalid', message: LIFT_COPY.invalid, attemptsRemaining: Math.max(0, ch.max_attempts - attempts), traceId}, 401);
    }
  }

  await db.from('keylock_challenges').update({consumed_at: new Date().toISOString(), attempts: ch.attempts + 1}).eq('id', ch.id);

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + VIP_LIFT_SESSION_TTL_MS).toISOString();
  const {error: sessErr} = await db.from('vip_lift_sessions').insert({
    user_id: ent.userId, token_hash: sha256(token), destination, challenge_id: ch.id, expires_at: expiresAt,
  });
  if (sessErr) return reply({state: 'unavailable', message: LIFT_COPY.unavailable, traceId}, 503);

  await audit({lock: 'vip_lift', eventType: 'vip.keylock_verified', outcome: 'ok', subjectHash: subject, userId: ent.userId, challengeId, traceId});
  await recordEngagement('vip.keylock_verified', {traceId, roomId: 'vip-room', memberId: ent.userId});

  const res = reply({
    state: 'unlocked',
    destination,
    href: destination === 'penthouse' ? '/vip/penthouse' : '/vip',
    expiresAt,
    traceId,
  });
  res.cookies.set(VIP_LIFT_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/',
    maxAge: VIP_LIFT_SESSION_TTL_MS / 1000,
  });
  return res;
}
