// "Report this response" for Nova's replies (Apple 1.2 / 5.1.2, Google Play AI-generated content policy).
// POST /api/moderation/report {target_kind: 'nova_reply', target_id, reason, note}. Reasons use the house's
// shared report vocabulary (src/lib/moderation.ts); the reply text travels in `note` so staff can see what
// Nova said. A server without the endpoint yet (404/405) is said plainly, with the support email instead.
import {api} from '../api';

export const REPLY_REASONS: Array<{reason: 'other' | 'hate' | 'sexual' | 'illegal' | 'harassment'; label: string}> = [
  {reason: 'other', label: 'Wrong or misleading'},
  {reason: 'hate', label: 'Offensive or hateful'},
  {reason: 'harassment', label: 'Rude or abusive'},
  {reason: 'sexual', label: 'Sexual content'},
  {reason: 'illegal', label: 'Unsafe or illegal advice'},
];

/** content_reports.note is capped at 500 characters (20261017_s1_moderation.sql). */
export const NOTE_MAX = 500;

export function reportNote(label: string, replyText: string): string {
  return `${label} — Nova said: ${replyText.replace(/\s+/g, ' ').trim()}`.slice(0, NOTE_MAX);
}

export async function reportNovaReply(targetId: string, reason: string, label: string, replyText: string): Promise<{ok: boolean; text: string}> {
  const r = await api<{error?: string}>('/api/moderation/report', {method: 'POST', json: {target_kind: 'nova_reply', target_id: targetId.slice(0, 200), reason, note: reportNote(label, replyText)}});
  if (r.ok) return {ok: true, text: 'Reported. Thank you — the house reviews reports within 24 hours.'};
  if (r.status === 409) return {ok: true, text: 'You’ve already reported this reply. The house is reviewing it.'};
  if (r.status === 0) return {ok: false, text: 'Offline — the report wasn’t sent. Try again when connected.'};
  if (r.status === 401) return {ok: false, text: 'Sign in to report. Nothing was sent.'};
  if (r.status === 429) return {ok: false, text: 'Too many reports just now. Try again later, or email support@finesselife.vip.'};
  if (r.status === 404 || r.status === 405) return {ok: false, text: 'Reporting isn’t open on the server yet. Email support@finesselife.vip and we’ll act within 24 hours.'};
  return {ok: false, text: 'The report couldn’t be sent. Email support@finesselife.vip instead.'};
}
