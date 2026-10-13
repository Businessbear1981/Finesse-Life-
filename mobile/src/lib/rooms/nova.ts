// Short prose from a Nova persona — POST /api/nova {prompt, persona} — for the Carpe Diem brief and the
// Scrapbook's "write it with Nova". Agent work (find / price / style / source / plan) goes through the hub
// instead: lib/rooms/nova-requests.ts + components/rooms/NovaAsk.tsx.
// aiApi: a 403 consent_required opens the consent sheet and, once the member agrees, sends the same ask again.
import {aiApi} from '../consents';
import {requestErrorText} from './nova-requests';

/** Never invents text when Nova is unavailable. */
export async function novaText(prompt: string, persona: string): Promise<{ok: true; text: string} | {ok: false; text: string}> {
  const r = await aiApi<{text?: string; error?: string; retryAfterS?: number}>('/api/nova', {method: 'POST', json: {prompt, persona}});
  const text = (r.body.text ?? '').trim();
  if (r.ok && text) return {ok: true, text};
  return {ok: false, text: r.ok ? 'Nova had nothing to add just now.' : requestErrorText(r.status, r.body)};
}
