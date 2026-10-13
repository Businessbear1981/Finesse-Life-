import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';
import {isAdmin} from '@/lib/admin';
import {hasServiceRole} from '@/lib/keylock-server';
import {MODERATION_TARGETS, REPORT_KINDS} from '@/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = {'Cache-Control': 'no-store'};

const action = z.object({
  target_kind: z.enum(REPORT_KINDS),
  target_id: z.string().trim().min(1).max(200),
  // hide: remove the item (reports → actioned) · restore: put it back (reports → dismissed)
  // dismiss: no violation (reports → dismissed, auto-hidden item restored)
  // suspend_author / unsuspend_author: stop or allow the owner posting anywhere (profiles.posting_suspended_at)
  action: z.enum(['hide', 'restore', 'dismiss', 'suspend_author', 'unsuspend_author']),
  note: z.string().trim().max(500).optional(),
});

// POST /api/moderation/action — staff only. Applies the decision to the item and closes its open reports.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user || !(await isAdmin(supabase, user))) return NextResponse.json({error: 'forbidden'}, {status: 403, headers: noStore});
  if (!hasServiceRole()) return NextResponse.json({error: 'unavailable'}, {status: 503, headers: noStore});
  const parsed = await parseBody(req, action);
  if (parsed.error) return parsed.error;
  const {target_kind: kind, target_id: id, action: act, note} = parsed.data;

  const db = createServiceClient();
  const target = kind === 'nova_reply' ? null : MODERATION_TARGETS[kind];
  const now = new Date().toISOString();
  const fail = (where: string, code?: string) => {
    console.error(`[moderation/action] ${where} failed`, code);
    return NextResponse.json({error: 'unavailable', where}, {status: 500, headers: noStore});
  };

  if ((act === 'hide' || act === 'restore' || act === 'dismiss') && target?.hideable) {
    const hidden = act === 'hide';
    const {error} = await db.from(target.table)
      .update({moderation_hidden: hidden, moderated_at: now, moderation_note: note || (hidden ? 'staff: removed' : 'staff: restored')})
      .eq('id', id);
    if (error) return fail('update item', error.code);
  } else if (act === 'hide' || act === 'restore') {
    return NextResponse.json({error: 'not_hideable', message: 'Profiles and Nova replies can’t be hidden — suspend the author or dismiss.'}, {status: 400, headers: noStore});
  }

  if (act === 'suspend_author' || act === 'unsuspend_author') {
    let owner: string | null = null;
    if (target) {
      const {data, error} = await db.from(target.table).select(target.owner).eq('id', id).maybeSingle();
      if (error) return fail('read owner', error.code);
      owner = ((data ?? {}) as Record<string, string | null>)[target.owner] ?? null;
    }
    if (!owner) return NextResponse.json({error: 'no_owner'}, {status: 404, headers: noStore});
    const {error} = await db.from('profiles').update({posting_suspended_at: act === 'suspend_author' ? now : null}).eq('id', owner);
    if (error) return fail('suspend', error.code);
  }

  const status = act === 'hide' || act === 'suspend_author' ? 'actioned' : act === 'unsuspend_author' ? null : 'dismissed';
  let closed = 0;
  if (status) {
    const {data, error} = await db.from('content_reports')
      .update({status, resolution: note || act, reviewed_by: user.id, reviewed_at: now})
      .eq('target_kind', kind).eq('target_id', id).eq('status', 'open').select('id');
    if (error) return fail('close reports', error.code);
    closed = data?.length ?? 0;
  }
  return NextResponse.json({ok: true, action: act, reports_closed: closed}, {headers: noStore});
}
