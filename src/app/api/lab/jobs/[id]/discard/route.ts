import {z} from 'zod';
import {dbFailure, json, requireMember} from '@/lib/api/room';

// POST /api/lab/jobs/:id/discard — throw away any job that isn't already approved (RLS + trigger enforce it).
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!z.string().uuid().safeParse(id).success) return json({error: 'not_found'}, ctx.traceId, 404);
  const {data, error} = await ctx.supabase.from('media_jobs').update({status: 'discarded'})
    .eq('id', id).eq('user_id', ctx.userId).not('status', 'in', '(approved,discarded)').select('id, status').maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'lab');
  if (!data) return json({error: 'not_found', message: 'Nothing to discard — it may already be kept in your library.'}, ctx.traceId, 404);
  return json({job: data}, ctx.traceId);
}
