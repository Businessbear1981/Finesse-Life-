import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {reply, sessionMember, unauthorized} from '@/app/api/billing/_member';
import {REPORTED_MESSAGE, REPORT_KINDS, REPORT_REASONS} from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const report = z.object({
  target_kind: z.enum(REPORT_KINDS),
  target_id: z.string().trim().min(1).max(200),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).optional().nullable(),
});

// POST /api/moderation/report {target_kind, target_id, reason, note?} — the signed-in member reports a
// post, VIP post, profile, listing, Game Room table, outing or Nova reply. The database resolves the
// owner, refuses self-reports and unknown targets, and hides an item once 3 members report it.
// → 201 {reported: true, message} | 200 {reported: true, already: true}
export async function POST(req: Request) {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const parsed = await parseBody(req, report);
  if (parsed.error) return parsed.error;
  const b = parsed.data;

  const {error} = await m.supabase.from('content_reports').insert({
    reporter_id: m.userId, target_kind: b.target_kind, target_id: b.target_id, reason: b.reason, note: b.note || null,
  });
  if (!error) return reply({reported: true, message: REPORTED_MESSAGE}, 201);

  const msg = error.message ?? '';
  if (error.code === '23505') return reply({reported: true, already: true, message: 'You already reported this. The house is reviewing it.'});
  if (/report_target_not_found/.test(msg)) return reply({error: 'not_found', message: 'That is no longer here. Nothing was reported.'}, 404);
  if (/report_own_content/.test(msg)) return reply({error: 'own_content', message: 'That’s yours — delete it instead. Nothing was reported.'}, 400);
  if (/report_rate_limited/.test(msg)) return reply({error: 'rate_limited', message: 'You’ve sent a lot of reports today. The house is on them — try again tomorrow.'}, 429);
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return reply({error: 'room_not_open', message: 'Reporting opens once the house finishes switching on member safety. Nothing was reported.'}, 503);
  }
  console.error('[moderation/report] insert failed', error.code);
  return reply({error: 'unavailable', message: 'Something went wrong on the house side. Nothing was reported.'}, 500);
}
