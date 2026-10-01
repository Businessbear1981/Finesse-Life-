import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {emptyWeek, mondayOf, type RotationDay} from '@/lib/closet';

const body = z.object({weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), day: z.number().int().min(0).max(6)});

// POST /api/closet/looks/:id/hold — pin one owned look to a day (un-approves the week).
export async function POST(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const week = mondayOf(new Date(`${parsed.data.weekStart}T12:00:00Z`));

  const [{data: look, error: lErr}, {data: hung}] = await Promise.all([
    ctx.supabase.from('wardrobe_looks').select('id').eq('id', id).eq('user_id', ctx.userId).maybeSingle(),
    ctx.supabase.from('camera_items').select('id').eq('id', id).eq('user_id', ctx.userId).eq('routed_to', 'closet').maybeSingle(),
  ]);
  if (lErr) return dbFailure(lErr, ctx.traceId, 'closet');
  if (!look && !hung) return json({error: 'not_owned'}, ctx.traceId, 404);

  const {data: row, error: rErr} = await ctx.supabase.from('closet_rotations').select('days').eq('user_id', ctx.userId).eq('week_start', week).maybeSingle();
  if (rErr) return dbFailure(rErr, ctx.traceId, 'closet');
  const days = ((row?.days as RotationDay[] | undefined) ?? emptyWeek()).map((d) => (d.day === parsed.data.day ? {...d, lookId: id} : d));

  const {data, error} = await ctx.supabase
    .from('closet_rotations')
    .upsert({user_id: ctx.userId, week_start: week, days, approved_at: null, updated_at: new Date().toISOString()})
    .select('week_start, days, approved_at')
    .single();
  if (error) return dbFailure(error, ctx.traceId, 'closet');
  return json({rotation: data}, ctx.traceId);
}
