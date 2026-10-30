// Server half of member safety (see src/lib/moderation.ts and 20261017_s1_moderation.sql): the posting
// gate (house rules accepted, not suspended) and the member's own block list. Runs with the member's
// session client, so RLS still applies underneath.
import {NextResponse} from 'next/server';
import type {FilterVerdict} from '@/lib/moderation';
import type {createClient} from '@/lib/supabase/server';

type Db = Awaited<ReturnType<typeof createClient>>;

const NO_STORE = {'Cache-Control': 'no-store'};

export const TERMS_REQUIRED_MESSAGE = 'Accept the house rules & terms before you post. Nothing was posted.';

/**
 * null when the member may post; otherwise the 403/503 answer to return as-is.
 * 403 terms_required → the client shows the house rules & terms sheet, then retries.
 */
export async function postingGate(supabase: Db, userId: string): Promise<NextResponse | null> {
  // Own row via the SECURITY DEFINER helper (terms/accepted columns are not SELECT-granted, 20261020_s4).
  const {data, error} = await supabase.rpc('get_own_profile');
  if (error) {
    if (error.code === '42703' || /column .* does not exist/i.test(error.message ?? '') || /could not find the function/i.test(error.message ?? '')) {
      return NextResponse.json(
        {error: 'room_not_open', message: 'Posting opens once the house finishes switching on member safety. Nothing was posted.'},
        {status: 503, headers: NO_STORE},
      );
    }
    console.error('[moderation] posting gate read failed', error.code);
    return NextResponse.json({error: 'unavailable', message: 'Something went wrong on the house side. Nothing was posted.'}, {status: 500, headers: NO_STORE});
  }
  const row = (data?.[0] ?? null) as {id?: string; terms_accepted_at?: string | null; posting_suspended_at?: string | null} | null;
  // get_own_profile is auth.uid()-scoped; if the session's own row isn't the expected member, fail closed.
  if (row && row.id && row.id !== userId) {
    console.error('[moderation] posting gate identity mismatch');
    return NextResponse.json({error: 'unavailable', message: 'Something went wrong on the house side. Nothing was posted.'}, {status: 500, headers: NO_STORE});
  }
  if (row?.posting_suspended_at) {
    return NextResponse.json(
      {error: 'posting_suspended', message: 'Posting is paused on your account while the house reviews a report. Nothing was posted.'},
      {status: 403, headers: NO_STORE},
    );
  }
  if (!row?.terms_accepted_at) {
    return NextResponse.json({error: 'terms_required', message: TERMS_REQUIRED_MESSAGE}, {status: 403, headers: NO_STORE});
  }
  return null;
}

/** 422 for text the filter rejected — the member sees why; nothing is saved. */
export function contentRejected(v: Extract<FilterVerdict, {verdict: 'reject'}>) {
  return NextResponse.json({error: 'content_rejected', reason: v.reason, message: v.message}, {status: 422, headers: NO_STORE});
}

/** Ids this member has blocked (the other direction is enforced by RLS). Empty on any read problem. */
export async function myBlockedIds(supabase: Db, userId: string): Promise<Set<string>> {
  try {
    const {data, error} = await supabase.from('member_blocks').select('blocked_id').eq('blocker_id', userId);
    if (error || !data) return new Set();
    return new Set((data as Array<{blocked_id: string}>).map((r) => String(r.blocked_id)));
  } catch {
    return new Set();
  }
}
