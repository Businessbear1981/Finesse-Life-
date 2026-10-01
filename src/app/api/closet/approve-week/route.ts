import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {mondayOf} from '@/lib/closet';
import {recordEngagement} from '@/lib/revenue/events';

const body = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.array(z.object({day: z.number().int().min(0).max(6), lookId: z.string().uuid().nullable()})).length(7),
});

// POST /api/closet/approve-week — lock the rotation. Every look must be the member's own.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const week = mondayOf(new Date(`${parsed.data.weekStart}T12:00:00Z`));
  const ids = [...new Set(parsed.data.days.map((d) => d.lookId).filter(Boolean))] as string[];

  if (ids.length) {
    const [{data: mine, error}, {data: hung}] = await Promise.all([
      ctx.supabase.from('wardrobe_looks').select('id').eq('user_id', ctx.userId).in('id', ids),
      ctx.supabase.from('camera_items').select('id').eq('user_id', ctx.userId).eq('routed_to', 'closet').in('id', ids),
    ]);
    if (error) return dbFailure(error, ctx.traceId, 'closet');
    if ((mine ?? []).length + (hung ?? []).length !== ids.length) return json({error: 'not_owned', message: 'Only your own looks can go on the rail.'}, ctx.traceId, 422);
  }

  const now = new Date().toISOString();
  const {data, error} = await ctx.supabase
    .from('closet_rotations')
    .upsert({user_id: ctx.userId, week_start: week, days: parsed.data.days, approved_at: now, updated_at: now})
    .select('week_start, days, approved_at')
    .single();
  if (error) return dbFailure(error, ctx.traceId, 'closet');
  await recordEngagement('closet.week_approved', {traceId: ctx.traceId, roomId: 'closet', memberId: ctx.userId, key: `closet.week_approved:${ctx.userId}:${week}:${now}`});
  return json({rotation: data}, ctx.traceId);
}
