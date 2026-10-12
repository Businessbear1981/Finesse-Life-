import {NextRequest} from 'next/server';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {guardAiCall} from '@/lib/ai-rate-limit';
import {JOB_COLS, STUDIOS, jobInput, missingEnv, studioStatus, submitJob, type MediaJob} from '@/lib/lab';

export const runtime = 'nodejs';
export const maxDuration = 60;

// GET /api/lab/jobs → {jobs (own, newest first), studios: [{type, name, vendor, connected}]}
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {data, error} = await ctx.supabase.from('media_jobs').select(JOB_COLS).eq('user_id', ctx.userId)
    .neq('status', 'discarded').order('created_at', {ascending: false}).limit(30);
  if (error) return dbFailure(error, ctx.traceId, 'lab');
  return json({jobs: data ?? [], studios: studioStatus()}, ctx.traceId);
}

// POST /api/lab/jobs {type, prompt, style?} → 201 {job}
// The draft is written as the member. If the studio's vendor isn't configured the job is saved as 'needs_key' and
// nothing is sent anywhere; otherwise it is submitted to the vendor (processing, or complete for synchronous voice).
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, jobInput);
  if (parsed.error) return parsed.error;
  const {type, prompt, style} = parsed.data;
  const studio = STUDIOS[type];
  const missing = missingEnv(type);
  const needsKey = missing.length > 0;
  if (!needsKey) {
    const limited = await guardAiCall(ctx.userId, 'image');
    if (limited) return limited;
  }
  const {data, error} = await ctx.supabase.from('media_jobs').insert({
    user_id: ctx.userId, type, provider: studio.provider, prompt, style: style ?? null,
    status: needsKey ? 'needs_key' : 'queued',
    error_message: needsKey ? `${studio.name} isn't connected yet (${studio.vendor}).` : null,
  }).select(JOB_COLS).single();
  if (error || !data) return dbFailure(error, ctx.traceId, 'lab');
  if (needsKey) {
    return json({job: data, message: `${studio.name} isn’t connected yet — your prompt is saved, nothing was sent to ${studio.vendor}.`}, ctx.traceId, 201);
  }
  const job = await submitJob(data as MediaJob);
  return json({job, message: job.status === 'failed' ? 'The studio did not accept this job. Nothing was charged.' : job.status === 'complete' ? 'Ready for your review.' : `Sent to ${studio.vendor}. It appears here when it is ready.`}, ctx.traceId, 201);
}
