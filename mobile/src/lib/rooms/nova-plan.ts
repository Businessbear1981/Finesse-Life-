// The orchestrator hub, as the signed-in member: GET /api/nova/requests and POST {kind:'plan', …, confirm:true}.
// Nova drafts options; nothing is booked (result.booked is always false) and a Diary item is created for review.
import {api} from '../api';

export type PlanTopic = 'table' | 'ride' | 'trip' | 'evening' | 'appointment' | 'other';
export type NovaRequest = {
  id: string; kind: string; title: string; room: string | null; status: string; error: string | null;
  details: {brief?: string; when?: string; party_size?: number; topic?: string};
  result: {plan?: string; booked?: boolean} | null; diary_item_id: string | null; created_at: string;
};
type Err = {error?: string; message?: string};

export const REQUEST_STATUS: Record<string, string> = {drafted: 'Draft', running: 'Nova is working', ready: 'Plan ready · nothing booked', failed: 'Nova could not finish', done: 'Done', cancelled: 'Cancelled'};

export function listRequests() {
  return api<{requests?: NovaRequest[]} & Err>('/api/nova/requests');
}

export function askNovaToPlan(input: {room: string; topic: PlanTopic; title: string; brief: string; when?: string; partySize?: number}) {
  const details: Record<string, unknown> = {topic: input.topic, brief: input.brief.trim().slice(0, 600)};
  if (input.when) details.when = input.when;
  if (input.partySize) details.party_size = Math.max(1, Math.min(40, input.partySize));
  return api<{request?: NovaRequest} & Err>('/api/nova/requests', {method: 'POST', json: {kind: 'plan', title: `${input.title}: ${input.brief.trim()}`.slice(0, 140), details, room: input.room, confirm: true}});
}

export function closeRequest(id: string, to: 'done' | 'cancel') {
  return api<{request?: NovaRequest} & Err>(`/api/nova/requests/${id}/${to}`, {method: 'POST'});
}

/** Plain words for a failed Nova call. */
export function novaFailure(status: number, body: Err) {
  if (status === 0) return 'The house line is down. Nothing was sent.';
  if (status === 401) return 'Sign in first. Nothing was sent.';
  if (status === 429) return 'Nova needs a breather — try again in a minute. Nothing was sent.';
  if (body.error === 'nova_unavailable') return 'Nova is unavailable right now. Nothing was booked.';
  return 'Nova could not draft that. Nothing was booked.';
}
