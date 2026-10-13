import {NextResponse, type NextRequest} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {constantTimeEqual} from '@/lib/keylock-server';
import {JOB_COLS, storeResult, vendorState, type MediaJob} from '@/lib/lab';

// Generic media-vendor webhook receiver.
//
// Accepts callbacks from Higgsfield / Suno / Meshy when a generation job
// finishes. Pass ?vendor=higgsfield (or suno|meshy) on the URL when configuring
// the webhook in the vendor dashboard. The handler finishes the Lab's media_jobs
// row keyed by (provider, provider_job_id): a finished result is copied into R2
// and the job becomes 'complete' (waiting for the member's review); a failure
// becomes 'failed'. No member session exists here, so the service role is required.
//
// Every call must carry the shared secret MEDIA_WEBHOOK_SECRET, either as the
// `X-Finesse-Webhook-Secret` header or `?secret=` on the configured URL (for vendors that
// cannot send custom headers). Without the env var the endpoint refuses everything.

export const runtime = 'nodejs';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {persistSession: false},
  });
}

function authorised(req: NextRequest): boolean {
  const expected = process.env.MEDIA_WEBHOOK_SECRET;
  if (!expected || expected.length < 32) return false;
  const given = req.headers.get('x-finesse-webhook-secret') ?? req.nextUrl.searchParams.get('secret') ?? '';
  return constantTimeEqual(given, expected);
}

type Vendor = 'higgsfield' | 'suno' | 'meshy';

export async function POST(req: NextRequest) {
  if (!process.env.MEDIA_WEBHOOK_SECRET) {
    return NextResponse.json({error: 'media webhook not configured'}, {status: 503});
  }
  if (!authorised(req)) {
    return NextResponse.json({error: 'unauthorised'}, {status: 401});
  }

  const vendor = (req.nextUrl.searchParams.get('vendor') ?? '') as Vendor;
  if (!['higgsfield', 'suno', 'meshy'].includes(vendor)) {
    return NextResponse.json({error: 'unknown vendor'}, {status: 400});
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({error: 'invalid JSON'}, {status: 400});
  }

  // Each vendor's payload shape differs — pull the job id + result URL based on
  // vendor. Adjust these field paths as vendor schemas evolve.
  const jobId =
    (payload.id as string | undefined) ??
    (payload.job_id as string | undefined) ??
    (payload.task_id as string | undefined);

  const status =
    (payload.status as string | undefined)?.toLowerCase() ?? 'unknown';

  if (!jobId) {
    return NextResponse.json({error: 'missing job id'}, {status: 400});
  }

  const state = vendorState(status);
  const db = admin();
  const {data: job, error} = await db.from('media_jobs').select(JOB_COLS)
    .eq('provider', vendor).eq('provider_job_id', jobId).eq('status', 'processing').maybeSingle();
  if (error) return NextResponse.json({error: 'lookup_failed'}, {status: 500});
  if (!job) return NextResponse.json({received: true, vendor, jobId, status, matched: false});

  const pick = (o: unknown, path: string[]): string | undefined => {
    let cur: unknown = o;
    for (const k of path) cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[k] : undefined;
    return typeof cur === 'string' ? cur : undefined;
  };
  const resultUrl = pick(payload, ['result', 'url']) ?? pick(payload, ['audio_url']) ?? pick(payload, ['model_urls', 'glb']) ?? pick(payload, ['url']);

  try {
    if (state === 'failed') {
      await db.from('media_jobs').update({status: 'failed', error_message: 'The studio could not finish this one.'}).eq('id', job.id);
    } else if (state === 'done' && resultUrl) {
      await storeResult(job as MediaJob, resultUrl);
    }
  } catch (e) {
    console.error('[webhooks/media] finish failed', job.id, (e as Error)?.message ?? e);
    return NextResponse.json({error: 'finish_failed'}, {status: 500});
  }
  return NextResponse.json({received: true, vendor, jobId, status, matched: true});
}
