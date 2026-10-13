import {reply, sessionMember, unauthorized} from '@/app/api/billing/_member';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  open: 'With the house',
  actioned: 'Removed — it broke the rules',
  dismissed: 'Reviewed — no rule was broken',
};

// GET /api/moderation/reports → {reports: [{id, target_kind, target_id, reason, note, status, status_label, created_at}]}
// The signed-in member's own reports (cookie or mobile bearer). Runs as the member: RLS returns only their rows
// and the column grants never expose who owns the reported item or who reviewed it (20261017_s1_moderation.sql).
export async function GET() {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const {data, error} = await m.supabase
    .from('content_reports')
    .select('id, target_kind, target_id, reason, note, status, created_at')
    .eq('reporter_id', m.userId)
    .order('created_at', {ascending: false})
    .limit(100);
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return reply({reports: []});
    console.error('[moderation/reports] read failed', error.code);
    return reply({error: 'unavailable', message: 'Your reports couldn’t load just now.'}, 500);
  }
  const rows = (data ?? []) as Array<{id: string; target_kind: string; target_id: string; reason: string; note: string | null; status: string; created_at: string}>;
  return reply({reports: rows.map((r) => ({...r, status_label: STATUS_LABEL[r.status] ?? r.status}))});
}
