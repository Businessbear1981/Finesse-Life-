import {NextResponse, type NextRequest} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';
import {isAdmin} from '@/lib/admin';
import {hasServiceRole} from '@/lib/keylock-server';
import {MODERATION_TARGETS, type ReportKind} from '@/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = {'Cache-Control': 'no-store'};

type Report = {
  id: string; reporter_id: string; target_kind: ReportKind; target_id: string; target_owner_id: string | null;
  reason: string; note: string | null; status: string; created_at: string;
};

// GET /api/moderation/queue?status=open — staff only (profiles.role admin/owner or ADMIN_EMAIL).
// Reports grouped by item, oldest first (the 24-hour commitment runs from the first report), with a
// snapshot of the reported content and its current hidden state.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!(await isAdmin(supabase, user))) return NextResponse.json({error: 'forbidden'}, {status: 403, headers: noStore});
  if (!hasServiceRole()) return NextResponse.json({error: 'unavailable'}, {status: 503, headers: noStore});

  const status = req.nextUrl.searchParams.get('status') ?? 'open';
  if (!['open', 'actioned', 'dismissed'].includes(status)) return NextResponse.json({error: 'bad_status'}, {status: 400, headers: noStore});

  const db = createServiceClient();
  const {data, error} = await db.from('content_reports')
    .select('id, reporter_id, target_kind, target_id, target_owner_id, reason, note, status, created_at')
    .eq('status', status).order('created_at', {ascending: true}).limit(500);
  if (error) {
    console.warn('[moderation/queue] read failed', error.code);
    return NextResponse.json({error: 'unavailable'}, {status: 503, headers: noStore});
  }

  const groups = new Map<string, {target_kind: ReportKind; target_id: string; owner_id: string | null; first_reported_at: string; reports: Report[]}>();
  for (const r of (data ?? []) as Report[]) {
    const key = `${r.target_kind}:${r.target_id}`;
    const g = groups.get(key) ?? {target_kind: r.target_kind, target_id: r.target_id, owner_id: r.target_owner_id, first_reported_at: r.created_at, reports: []};
    g.reports.push(r);
    groups.set(key, g);
  }

  // Snapshot each reported item (text + hidden state) per table.
  const snapshots = new Map<string, Record<string, unknown>>();
  for (const [kind, t] of Object.entries(MODERATION_TARGETS)) {
    const ids = [...groups.values()].filter((g) => g.target_kind === kind).map((g) => g.target_id);
    if (!ids.length) continue;
    const {data: rows} = await db.from(t.table).select(t.snapshot).in('id', ids);
    for (const row of (rows ?? []) as unknown as Array<Record<string, unknown>>) snapshots.set(`${kind}:${row.id}`, row);
  }

  const items = [...groups.entries()].map(([key, g]) => ({
    ...g,
    distinct_reporters: new Set(g.reports.map((r) => r.reporter_id)).size,
    content: snapshots.get(key) ?? null,
    due_by: new Date(new Date(g.first_reported_at).getTime() + 24 * 3600 * 1000).toISOString(),
  }));
  return NextResponse.json({status, items}, {headers: noStore});
}
