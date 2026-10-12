import {NextResponse, type NextRequest} from 'next/server';
import {parseBody} from '@/lib/api/validate';
import {createClient} from '@/lib/supabase/server';
import {LOCKOUT, NO_STORE, VIP_LIFT_COOKIE, audit, newTraceId, service} from '@/lib/keylock-server';
import {LIFT_COPY, getVipEntitlement, liftReady} from '@/lib/vip-lift';
import {PIN_RESET_DAILY_MAX, countAuditEvents, liftSubject, pinResetRequest, recentPasswordFailures, verifyPassword} from '@/lib/account';

export const runtime = 'nodejs';

const DAY_MS = 24 * 60 * 60_000;

// POST /api/vip-keylock/pin-reset {password} — a signed-in VIP who forgot their lift PIN
// re-enters their account password; the PIN is cleared, open lift sessions and challenges
// are revoked, and the next ride enrols a new PIN. Wrong passwords count toward the same
// lockout as wrong PINs (8 / 15 min); at most 3 resets a day. → {state: "reset", traceId}
export async function POST(req: NextRequest) {
  const traceId = newTraceId();
  const reply = (body: Record<string, unknown>, status = 200, extra: Record<string, string> = {}) =>
    NextResponse.json({...body, traceId}, {status, headers: {...NO_STORE, ...extra}});

  const ent = await getVipEntitlement();
  if (ent.state === 'signed_out') return reply({state: 'signed_out', message: LIFT_COPY.signed_out}, 401);
  if (!liftReady()) return reply({state: 'unavailable', message: LIFT_COPY.unavailable}, 503);
  if (ent.state !== 'entitled') return reply({state: ent.state, message: LIFT_COPY[ent.state]}, 403);

  const parsed = await parseBody(req, pinResetRequest);
  if (parsed.error) return parsed.error;

  const subject = liftSubject(ent.userId);
  const retryAfterS = Math.ceil(LOCKOUT.windowMs / 1000);
  if ((await recentPasswordFailures('vip_lift', subject)) >= LOCKOUT.maxFailures) {
    await audit({lock: 'vip_lift', eventType: 'vip.pin_reset', outcome: 'rate_limited', subjectHash: subject, userId: ent.userId, traceId});
    return reply({state: 'rate_limited', message: LIFT_COPY.rate_limited, retryAfterS}, 429, {'Retry-After': String(retryAfterS)});
  }
  const resetsToday = await countAuditEvents({lock: 'vip_lift', subjectHash: subject, outcomes: ['ok'], eventType: 'vip.pin_reset', sinceMs: DAY_MS});
  if (resetsToday >= PIN_RESET_DAILY_MAX) {
    await audit({lock: 'vip_lift', eventType: 'vip.pin_reset', outcome: 'rate_limited', subjectHash: subject, userId: ent.userId, traceId});
    return reply({state: 'rate_limited', message: LIFT_COPY.rate_limited, retryAfterS: DAY_MS / 1000}, 429, {'Retry-After': String(DAY_MS / 1000)});
  }

  const {data: {user}} = await (await createClient()).auth.getUser();
  if (!user?.email || user.id !== ent.userId) return reply({state: 'signed_out', message: LIFT_COPY.signed_out}, 401);
  if (!(await verifyPassword(user.email, parsed.data.password, user.id))) {
    await audit({lock: 'vip_lift', eventType: 'vip.pin_reset', outcome: 'invalid', subjectHash: subject, userId: ent.userId, traceId});
    return reply({state: 'invalid', error: 'invalid_password'}, 401);
  }

  const db = service();
  const now = new Date().toISOString();
  const {error: pinErr} = await db.from('vip_lift_pins').delete().eq('user_id', ent.userId);
  if (pinErr) {
    console.error('[vip-lift] pin reset failed', pinErr.message, traceId);
    return reply({state: 'unavailable', message: LIFT_COPY.unavailable}, 503);
  }
  // Doors that were open on the old PIN close; unanswered verify-mode challenges die so the
  // next call starts an enrol challenge instead of counting a failure against the new PIN.
  await db.from('vip_lift_sessions').update({revoked_at: now}).eq('user_id', ent.userId).is('revoked_at', null).gt('expires_at', now);
  await db.from('keylock_challenges').update({consumed_at: now}).eq('user_id', ent.userId).eq('lock', 'vip_lift').is('consumed_at', null);
  await audit({lock: 'vip_lift', eventType: 'vip.pin_reset', outcome: 'ok', subjectHash: subject, userId: ent.userId, traceId});

  const res = reply({state: 'reset'});
  res.cookies.set(VIP_LIFT_COOKIE, '', {httpOnly: true, path: '/', maxAge: 0});
  return res;
}
