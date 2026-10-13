import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {reply, sessionMember, unauthorized} from '@/app/api/billing/_member';
import {TERMS_VERSION} from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const notOpen = () => reply({error: 'room_not_open', message: 'The house rules can be accepted once member safety is switched on.'}, 503);
const missingColumn = (e: {code?: string; message?: string}) => e.code === '42703' || /column .* does not exist/i.test(e.message ?? '');

// GET /api/account/accept-terms → {accepted, accepted_at, version, current_version}
export async function GET() {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const {data, error} = await m.supabase.from('profiles').select('terms_accepted_at, terms_version').eq('id', m.userId).maybeSingle();
  if (error) return missingColumn(error) ? notOpen() : reply({error: 'unavailable'}, 500);
  const row = (data ?? {}) as {terms_accepted_at?: string | null; terms_version?: string | null};
  return reply({accepted: Boolean(row.terms_accepted_at), accepted_at: row.terms_accepted_at ?? null, version: row.terms_version ?? null, current_version: TERMS_VERSION});
}

// POST /api/account/accept-terms {accept: true} — the member accepts the house rules & terms
// (zero tolerance for objectionable content or abusive members). Required before posting or listing.
export async function POST(req: Request) {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const parsed = await parseBody(req, z.object({accept: z.literal(true)}));
  if (parsed.error) return parsed.error;
  const at = new Date().toISOString();
  const {data, error} = await m.supabase.from('profiles').update({terms_accepted_at: at, terms_version: TERMS_VERSION})
    .eq('id', m.userId).select('id');
  if (error) return missingColumn(error) ? notOpen() : reply({error: 'unavailable', message: 'That didn’t save. Try again.'}, 500);
  if (!data?.length) return reply({error: 'no_profile', message: 'Finish setting up your profile first.'}, 409);
  return reply({accepted: true, accepted_at: at, version: TERMS_VERSION});
}
