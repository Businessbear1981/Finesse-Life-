import {z} from 'zod';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {JOB_COLS, refreshJob, type MediaJob} from '@/lib/lab';

export const runtime = 'nodejs';
export const maxDuration = 60;

// GET /api/lab/jobs/:id → {job}. A processing job is polled with its vendor (and finished if the vendor is done).
export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!z.string().uuid().safeParse(id).success) return json({error: 'not_found'}, ctx.traceId, 404);
  // Ownership is checked here with the member's own client (RLS) before any service-role write in refreshJob.
  const {data, error} = await ctx.supabase.from('media_jobs').select(JOB_COLS).eq('id', id).eq('user_id', ctx.userId).maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'lab');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  const job = await refreshJob(data as MediaJob);
  return json({job}, ctx.traceId);
}
