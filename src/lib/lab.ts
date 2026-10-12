// The Lab — real generation jobs on media_jobs (supabase/migrations/20261016_w3_lab.sql) through the vendor
// adapters in src/lib/media. Server-side only.
//
//   member draft (session client, RLS)  →  needs_key (vendor not configured — nothing sent)
//                                       →  queued → submit (service role) → processing | complete | failed
//   processing → vendor webhook (/api/webhooks/media) or a status poll → complete (result stored in R2) | failed
//   complete → member approves (→ media_assets) or discards.
//
// Vendor progress is written with the service role only after the caller has checked the job belongs to the
// member — members can never mark their own job complete (see the migration's column grants + trigger).
import {z} from 'zod';
import {createServiceClient} from '@/lib/supabase/service';

export const STUDIO_TYPES = ['voice', 'image', 'video', '3d', 'music'] as const;
export type StudioType = (typeof STUDIO_TYPES)[number];
export type JobStatus = 'queued' | 'needs_key' | 'processing' | 'complete' | 'failed' | 'approved' | 'discarded';

type Studio = {name: string; vendor: string; provider: 'elevenlabs' | 'higgsfield' | 'meshy' | 'suno'; env: string[]; asset: 'audio' | 'image' | 'video' | '3d'};
/** Results are copied into R2, so every studio also needs storage. */
const STORAGE_ENV = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL'];

export const STUDIOS: Record<StudioType, Studio> = {
  voice: {name: 'Voice Studio', vendor: 'ElevenLabs', provider: 'elevenlabs', env: ['ELEVENLABS_API_KEY', 'ELEVENLABS_DEFAULT_VOICE_ID'], asset: 'audio'},
  image: {name: 'Image Studio', vendor: 'Higgsfield', provider: 'higgsfield', env: ['HIGGSFIELD_API_KEY_ID', 'HIGGSFIELD_API_SECRET'], asset: 'image'},
  video: {name: 'Video Studio', vendor: 'Higgsfield', provider: 'higgsfield', env: ['HIGGSFIELD_API_KEY_ID', 'HIGGSFIELD_API_SECRET'], asset: 'video'},
  '3d': {name: '3D Studio', vendor: 'Meshy', provider: 'meshy', env: ['MESHY_API_KEY'], asset: '3d'},
  music: {name: 'Music Studio', vendor: 'Suno', provider: 'suno', env: ['SUNO_API_KEY'], asset: 'audio'},
};

/** Env vars a studio still needs (empty ⇒ connected). Names only — values are never read out. */
export function missingEnv(type: StudioType, env: Record<string, string | undefined> = process.env): string[] {
  return [...STUDIOS[type].env, ...STORAGE_ENV].filter((k) => !env[k]);
}

export function studioStatus(env: Record<string, string | undefined> = process.env) {
  return STUDIO_TYPES.map((type) => ({type, name: STUDIOS[type].name, vendor: STUDIOS[type].vendor, connected: missingEnv(type, env).length === 0}));
}

export const jobInput = z.object({
  type: z.enum(STUDIO_TYPES),
  prompt: z.string().trim().min(3).max(1000),
  style: z.string().trim().max(40).optional(),
});

export type MediaJob = {
  id: string; user_id: string; type: StudioType; provider: string; prompt: string | null; style: string | null; status: JobStatus;
  result_url: string | null; result_key: string | null; result_mime: string | null; provider_job_id: string | null;
  error_message: string | null; created_at: string; completed_at: string | null; approved_at: string | null;
};
export const JOB_COLS = 'id, user_id, type, provider, prompt, style, status, result_url, result_key, result_mime, provider_job_id, error_message, created_at, completed_at, approved_at';

/** Vendor status words → our lifecycle. */
export function vendorState(raw: string | undefined | null): 'done' | 'failed' | 'running' {
  const s = (raw ?? '').toLowerCase();
  if (['complete', 'completed', 'succeeded', 'success', 'finished', 'done'].includes(s)) return 'done';
  if (['failed', 'error', 'cancelled', 'canceled', 'expired'].includes(s)) return 'failed';
  return 'running';
}

type Stored = {key: string; url: string; mime: string};
const MIME: Record<StudioType, string> = {voice: 'audio/mpeg', image: 'image/png', video: 'video/mp4', '3d': 'model/gltf-binary', music: 'audio/mpeg'};

/** Write vendor progress for a job the caller has already verified belongs to the member. */
async function writeProgress(jobId: string, patch: Record<string, unknown>) {
  const db = createServiceClient();
  const {data, error} = await db.from('media_jobs').update(patch).eq('id', jobId).select(JOB_COLS).single();
  if (error) throw new Error(`media_jobs update failed: ${error.message}`);
  return data as MediaJob;
}

const fail = (job: Pick<MediaJob, 'id'>, e: unknown) => {
  console.error('[lab] vendor call failed', job.id, (e as Error)?.message ?? e);
  return writeProgress(job.id, {status: 'failed', error_message: 'The studio did not accept this job. Nothing was charged to you.'});
};

/** Send a queued job to its vendor. */
export async function submitJob(job: MediaJob): Promise<MediaJob> {
  const type = job.type;
  const prompt = [job.prompt ?? '', job.style ? `Style: ${job.style}.` : ''].filter(Boolean).join(' ');
  try {
    if (type === 'voice') {
      const {tts} = await import('@/lib/media/elevenlabs');
      const out = await tts({text: job.prompt ?? ''});
      return writeProgress(job.id, {status: 'complete', result_url: out.url, result_key: out.key, result_mime: 'audio/mpeg', completed_at: new Date().toISOString()});
    }
    if (type === 'image' || type === 'video') {
      const hf = await import('@/lib/media/higgsfield');
      const sub = type === 'image' ? await hf.submitImageJob({prompt}) : await hf.submitVideoJob({prompt});
      return writeProgress(job.id, {status: 'processing', provider_job_id: sub.id});
    }
    if (type === '3d') {
      const {textTo3D} = await import('@/lib/media/meshy');
      const sub = await textTo3D({prompt: job.prompt ?? ''});
      return writeProgress(job.id, {status: 'processing', provider_job_id: sub.result});
    }
    const {generateMusic} = await import('@/lib/media/suno');
    const sub = await generateMusic({prompt: job.prompt ?? '', style: job.style ?? undefined});
    return writeProgress(job.id, {status: 'processing', provider_job_id: sub.id});
  } catch (e) {
    return fail(job, e);
  }
}

/** Copy a vendor result into R2 and mark the job complete. */
export async function storeResult(job: Pick<MediaJob, 'id' | 'type'>, resultUrl: string): Promise<MediaJob> {
  let stored: Stored;
  if (job.type === '3d') {
    const m = await import('@/lib/media/meshy');
    const r = await m.downloadAndStore(resultUrl, 'glb');
    stored = {key: r.key, url: r.url, mime: MIME['3d']};
  } else if (job.type === 'music' || job.type === 'voice') {
    const m = await import('@/lib/media/suno');
    const r = await m.downloadAndStore(resultUrl);
    stored = {key: r.key, url: r.url, mime: MIME.music};
  } else {
    const m = await import('@/lib/media/higgsfield');
    const r = await m.downloadAndStore(resultUrl, job.type);
    stored = {key: r.key, url: r.url, mime: MIME[job.type]};
  }
  return writeProgress(job.id, {status: 'complete', result_url: stored.url, result_key: stored.key, result_mime: stored.mime, completed_at: new Date().toISOString(), error_message: null});
}

/** Poll the vendor for a processing job; finish it when the vendor is done. */
export async function refreshJob(job: MediaJob): Promise<MediaJob> {
  if (job.status !== 'processing' || !job.provider_job_id) return job;
  try {
    let state: 'done' | 'failed' | 'running';
    let url: string | undefined;
    if (job.type === 'image' || job.type === 'video') {
      const {pollJob} = await import('@/lib/media/higgsfield');
      const r = await pollJob(job.provider_job_id);
      state = vendorState(r.status); url = r.result?.url;
    } else if (job.type === '3d') {
      const {pollTask} = await import('@/lib/media/meshy');
      const r = await pollTask(job.provider_job_id);
      state = vendorState(r.status); url = r.model_urls?.glb;
    } else {
      const {pollTrack} = await import('@/lib/media/suno');
      const r = await pollTrack(job.provider_job_id);
      state = vendorState(r.status); url = r.audio_url;
    }
    if (state === 'failed') return writeProgress(job.id, {status: 'failed', error_message: 'The studio could not finish this one.'});
    if (state === 'done' && url) return storeResult(job, url);
    return job;
  } catch (e) {
    console.error('[lab] poll failed', job.id, (e as Error)?.message ?? e);
    return job; // keep it processing; the webhook or the next poll finishes it
  }
}
