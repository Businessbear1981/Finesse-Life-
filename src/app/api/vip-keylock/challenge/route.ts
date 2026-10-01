import {NextRequest, NextResponse} from 'next/server';
import {randomBytes} from 'crypto';
import {z} from 'zod';
import {CHALLENGE_TTL_MS, LOCKOUT, NO_STORE, audit, newTraceId, recentFailures, service, sha256} from '@/lib/keylock-server';
import {LIFT_COPY, getVipEntitlement, liftReady} from '@/lib/vip-lift';
import {recordEngagement} from '@/lib/revenue/events';
import {trackSchema, type VipLiftChallengeResponse} from '@/lib/contracts';

const body = z.object({track: trackSchema.optional()}).default({});

// POST /api/vip-keylock/challenge — Lobby private lift. Separate from the public entrance lock.
export async function POST(req: NextRequest) {
  const traceId = newTraceId();
  const json = await req.json().catch(() => ({}));
  const track = body.safeParse(json).data?.track ?? null;
  const reply = (b: VipLiftChallengeResponse, status = 200) => NextResponse.json(b, {status, headers: NO_STORE});

  const ent = await getVipEntitlement();
  if (ent.state === 'signed_out') return reply({state: 'signed_out', message: LIFT_COPY.signed_out, traceId}, 401);
  if (!liftReady()) return reply({state: 'unavailable', message: LIFT_COPY.unavailable, traceId}, 503);

  const subject = sha256(`vip_lift:${ent.userId}`);
  if (ent.state !== 'entitled') {
    await audit({lock: 'vip_lift', eventType: 'vip.keylock_challenge_refused', outcome: ent.state, subjectHash: subject, userId: ent.userId, traceId, track});
    await recordEngagement('vip.upgrade_viewed', {traceId, roomId: 'vip-room', memberId: ent.userId, track});
    return reply({state: ent.state, message: LIFT_COPY[ent.state], traceId}, 403);
  }

  if ((await recentFailures('vip_lift', subject)) >= LOCKOUT.maxFailures) {
    await audit({lock: 'vip_lift', eventType: 'vip.keylock_challenge_refused', outcome: 'rate_limited', subjectHash: subject, userId: ent.userId, traceId, track});
    return reply({state: 'rate_limited', message: LIFT_COPY.rate_limited, traceId}, 429);
  }

  const db = service();
  const {data: pin} = await db.from('vip_lift_pins').select('user_id').eq('user_id', ent.userId).maybeSingle();
  const mode = pin ? 'verify' : 'enroll';
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS.vip_lift).toISOString();

  const {data: ch, error} = await db
    .from('keylock_challenges')
    .insert({lock: 'vip_lift', subject_hash: subject, user_id: ent.userId, nonce: randomBytes(16).toString('hex'), mode, expires_at: expiresAt})
    .select('id')
    .single();
  if (error || !ch) {
    console.error('[vip-lift] challenge insert failed', error?.message, traceId);
    return reply({state: 'unavailable', message: LIFT_COPY.unavailable, traceId}, 503);
  }

  await audit({lock: 'vip_lift', eventType: 'vip.keylock_challenge_started', outcome: 'ok', subjectHash: subject, userId: ent.userId, challengeId: ch.id, traceId, track});
  await recordEngagement('vip.keylock_challenge_started', {traceId, roomId: 'vip-room', memberId: ent.userId, track});
  return reply({state: 'ready', challengeId: ch.id, mode, expiresAt, traceId});
}
