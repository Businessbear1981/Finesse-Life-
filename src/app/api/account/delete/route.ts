import {NextResponse, type NextRequest} from 'next/server';
import {parseBody} from '@/lib/api/validate';
import {createClient} from '@/lib/supabase/server';
import {LOCKOUT, NO_STORE, hasServiceRole, newTraceId} from '@/lib/keylock-server';
import {
  accountSubject, auditEvent, deleteAccount, deleteAccountRequest, recentPasswordFailures,
  serviceDeletionDeps, sessionCookiesToClear, verifyPassword,
} from '@/lib/account';

export const runtime = 'nodejs';

// POST /api/account/delete {confirm: "DELETE", password} — the signed-in member (cookie or
// mobile bearer) permanently deletes their account. The password is re-checked even for a
// live session. Financial/audit rows are kept anonymised (see src/lib/account.ts and
// supabase/migrations/20261012_account_lifecycle.sql). → {deleted: true, traceId}
export async function POST(req: NextRequest) {
  const traceId = newTraceId();
  const reply = (body: Record<string, unknown>, status = 200, extra: Record<string, string> = {}) =>
    NextResponse.json({...body, traceId}, {status, headers: {...NO_STORE, ...extra}});

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return reply({error: 'signed_out'}, 401);

  const parsed = await parseBody(req, deleteAccountRequest);
  if (parsed.error) return parsed.error;

  if (!hasServiceRole()) return reply({error: 'unavailable', message: 'Account deletion is temporarily unavailable. Nothing was changed.'}, 503);
  if (!user.email) return reply({error: 'reauth_unavailable', message: 'This account has no password sign-in. Contact the front desk to delete it.'}, 400);

  const subject = accountSubject(user.id);
  if ((await recentPasswordFailures('account', subject)) >= LOCKOUT.maxFailures) {
    await auditEvent({lock: 'account', eventType: 'account.delete', outcome: 'rate_limited', subjectHash: subject, userId: user.id, traceId});
    const retryAfterS = Math.ceil(LOCKOUT.windowMs / 1000);
    return reply({error: 'rate_limited', retryAfterS}, 429, {'Retry-After': String(retryAfterS)});
  }

  if (!(await verifyPassword(user.email, parsed.data.password, user.id))) {
    await auditEvent({lock: 'account', eventType: 'account.delete', outcome: 'invalid', subjectHash: subject, userId: user.id, traceId});
    return reply({error: 'invalid_password'}, 401);
  }

  await auditEvent({lock: 'account', eventType: 'account.delete_requested', outcome: 'ok', subjectHash: subject, userId: user.id, traceId});
  const outcome = await deleteAccount(user.id, serviceDeletionDeps());

  if (!outcome.ok) {
    console.error(`[account] delete failed at ${outcome.stage}`, outcome.message, traceId);
    await auditEvent({lock: 'account', eventType: 'account.delete', outcome: `failed_${outcome.stage}`, subjectHash: subject, userId: outcome.stage === 'auth' ? null : user.id, traceId});
    return reply({error: 'deletion_incomplete', message: 'Your account could not be fully deleted. Try again, or contact the front desk.'}, 500);
  }

  if (outcome.storage.failed > 0) console.error('[account] storage objects left behind', outcome.storage.failed, traceId);
  // The auth user is gone, so user_id would violate the FK: the pseudonymous subject carries it.
  await auditEvent({lock: 'account', eventType: 'account.deleted', outcome: 'ok', subjectHash: subject, userId: null, traceId});

  const res = reply({deleted: true});
  for (const name of sessionCookiesToClear(req.cookies.getAll().map((c) => c.name))) {
    res.cookies.set(name, '', {path: '/', maxAge: 0});
  }
  return res;
}
