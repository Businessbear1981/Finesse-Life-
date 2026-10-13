// Browser calls for member safety (cookie session). The app has its own copy in mobile/src/lib/rooms/moderation.ts.
import type {ReportKind, ReportReason} from '@/lib/moderation';

type Res<T> = {ok: boolean; status: number; body: T & {error?: string; message?: string}};

async function call<T>(path: string, init: {method?: string; json?: unknown} = {}): Promise<Res<T>> {
  try {
    const res = await fetch(path, {
      method: init.method ?? 'GET',
      headers: init.json !== undefined ? {'Content-Type': 'application/json'} : undefined,
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as Res<T>['body'];
    return {ok: res.ok, status: res.status, body};
  } catch {
    return {ok: false, status: 0, body: {message: 'The house line is down. Nothing was changed.'} as Res<T>['body']};
  }
}

export const reportContent = (target_kind: ReportKind, target_id: string, reason: ReportReason, note?: string) =>
  call<{reported?: boolean; already?: boolean}>('/api/moderation/report', {method: 'POST', json: {target_kind, target_id, reason, note: note?.trim() || undefined}});

export const blockMember = (member_id: string) =>
  call<{blocked?: boolean}>('/api/moderation/block', {method: 'POST', json: {member_id}});

/** Block whoever owns an item (used where the owner's id isn't shown, e.g. Game Room tables). */
export const blockOwnerOf = (target_kind: Exclude<ReportKind, 'nova_reply'>, target_id: string) =>
  call<{blocked?: boolean}>('/api/moderation/block', {method: 'POST', json: {target_kind, target_id}});

export const unblockMember = (member_id: string) =>
  call<{unblocked?: boolean}>(`/api/moderation/block?member_id=${encodeURIComponent(member_id)}`, {method: 'DELETE'});

export const readBlocks = () => call<{blocks?: Array<{member_id: string; name: string; blocked_at: string}>}>('/api/moderation/blocks');

export const readTerms = () => call<{accepted?: boolean}>('/api/account/accept-terms');
export const acceptTerms = () => call<{accepted?: boolean}>('/api/account/accept-terms', {method: 'POST', json: {accept: true}});

/** Plain words for a failed safety call. */
export function safetyFailure(r: Res<unknown>, nothing = 'Nothing was changed.') {
  if (r.status === 0) return `The house line is down. ${nothing}`;
  if (r.status === 401) return `Sign in first. ${nothing}`;
  return r.body.message ?? `Something went wrong on the house side. ${nothing}`;
}
