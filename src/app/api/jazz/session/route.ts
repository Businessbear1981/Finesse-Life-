import {toWorker} from '@/lib/worker-proxy';

/** Jazz Club device credentials (Feed.fm client id + short-lived token). Audio is streamed by the browser directly. */
export async function POST() {
  return toWorker('/v1/jazz/session', {method: 'POST', body: '{}'});
}
