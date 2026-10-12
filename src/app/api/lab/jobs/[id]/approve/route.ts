import {z} from 'zod';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {JOB_COLS, STUDIOS, type MediaJob} from '@/lib/lab';

// POST /api/lab/jobs/:id/approve — keep a complete result: the job becomes 'approved' and the file is added to the
// member's library (media_assets). Only a 'complete' job with a stored result can be approved (RLS + trigger).
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!z.string().uuid().safeParse(id).success) return json({error: 'not_found'}, ctx.traceId, 404);
  const {data: job, error} = await ctx.supabase.from('media_jobs').select(JOB_COLS).eq('id', id).eq('user_id', ctx.userId).maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'lab');
  if (!job) return json({error: 'not_found'}, ctx.traceId, 404);
  const j = job as MediaJob;
  if (j.status !== 'complete' || !j.result_key || !j.result_url) return json({error: 'not_ready', status: j.status, message: 'Only a finished result can be kept.'}, ctx.traceId, 409);

  const {data: updated, error: uErr} = await ctx.supabase.from('media_jobs').update({status: 'approved'}).eq('id', id).eq('status', 'complete').select(JOB_COLS).maybeSingle();
  if (uErr) return dbFailure(uErr, ctx.traceId, 'lab');
  if (!updated) return json({error: 'not_ready', message: 'This result changed — reload the Lab.'}, ctx.traceId, 409);
  const {data: asset, error: aErr} = await ctx.supabase.from('media_assets').upsert({
    user_id: ctx.userId, r2_key: j.result_key, url: j.result_url, type: STUDIOS[j.type].asset, mime_type: j.result_mime, job_id: j.id,
  }, {onConflict: 'r2_key'}).select('id, url, type').maybeSingle();
  if (aErr) return dbFailure(aErr, ctx.traceId, 'lab');
  return json({job: updated, asset}, ctx.traceId);
}
