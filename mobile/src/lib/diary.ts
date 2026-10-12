// The member's diary, read for one LOCAL day. GET /api/diary pages by UTC day, so a local evening can sit on
// the next UTC page; we read every UTC page the local day touches and keep only the entries inside it.
import {api} from './api';

export type DiaryItem = {id: string; title: string; starts_at: string; source_room: string; source_id: string | null; state: string; notes: string | null; updated_at: string};
export type DiaryDay = {day: string; items: DiaryItem[]; nextDecision: DiaryItem | null; counts: {done: number; needsYou: number}};

export const DIARY_LABEL: Record<string, string> = {needs_member_action: 'NEEDS YOU', held: 'HELD', moved: 'MOVED', approved: 'APPROVED', done: 'DONE'};
/** States the member can still approve or hold (the server's own rule). */
export const DECIDABLE = ['needs_member_action', 'held', 'moved'];

const pad = (n: number) => String(n).padStart(2, '0');
export const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function fromISO(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(day: string, n: number) {
  const d = fromISO(day); d.setDate(d.getDate() + n); return localISO(d);
}
/** Monday of the local week containing `day`. */
export function mondayOf(day: string) {
  const d = fromISO(day); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return localISO(d);
}

type Err = {message?: string; error?: string};

export async function readDiaryDay(day: string): Promise<{ok: boolean; status: number; body: DiaryDay & Err}> {
  const start = fromISO(day);
  const end = fromISO(addDays(day, 1));
  const pages = [...new Set([start.toISOString().slice(0, 10), new Date(end.getTime() - 1).toISOString().slice(0, 10)])];
  const results = await Promise.all(pages.map((p) => api<{items?: DiaryItem[]} & Err>(`/api/diary?day=${p}`)));
  const bad = results.find((r) => !r.ok);
  if (bad) return {ok: false, status: bad.status, body: {...(bad.body as Err), day, items: [], nextDecision: null, counts: {done: 0, needsYou: 0}}};
  const seen = new Set<string>();
  const items = results.flatMap((r) => r.body.items ?? [])
    .filter((i) => { const t = new Date(i.starts_at).getTime(); if (seen.has(i.id) || t < start.getTime() || t >= end.getTime()) return false; seen.add(i.id); return true; })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const needsYou = items.filter((i) => i.state === 'needs_member_action');
  return {ok: true, status: 200, body: {day, items, nextDecision: needsYou[0] ?? null, counts: {done: items.filter((i) => i.state === 'done').length, needsYou: needsYou.length}}};
}

/** Approve / hold / done / cancel / move — exactly the server's verbs. */
export function diaryAct(id: string, act: 'approve' | 'hold' | 'done' | 'cancel' | {startsAt: string}) {
  if (act === 'approve' || act === 'hold') return api<{item?: DiaryItem} & Err>(`/api/diary/items/${id}/${act}`, {method: 'POST'});
  const json = act === 'done' ? {state: 'done'} : act === 'cancel' ? {state: 'cancelled'} : {startsAt: act.startsAt};
  return api<{item?: DiaryItem} & Err>(`/api/diary/items/${id}`, {method: 'PATCH', json});
}

export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}).toUpperCase();
