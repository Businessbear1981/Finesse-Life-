// Per Diem — one planned night per date (GET/POST /api/per-diem, PATCH /api/per-diem/:id). Nova draws the
// evening through the hub (topic 'evening'); the server keeps her text and parses the stops. Mirrors the
// pure bits of src/lib/per-diem.ts (keep the two in step). Nothing is reserved or paid.
import {api} from '../api';
import {createRequest, requestErrorText} from './nova-requests';

export type PerDiemItem = {time: string; label: string; cost_cents: number; done: boolean};
export type PerDiemPlan = {
  id: string; plan_date: string; occasion: string; budget_cents: number; items: PerDiemItem[];
  plan_text: string | null; nova_request_id: string | null; status: 'draft' | 'planned' | 'done' | 'cancelled'; updated_at: string;
};
type Err = {message?: string; error?: string};

export function eveningBrief(occasion: string, budgetCents: number, extra?: string) {
  const budget = budgetCents > 0 ? `$${Math.round(budgetCents / 100).toLocaleString('en-US')} all in, for two` : 'no fixed budget';
  return [
    `${occasion} — plan the evening around ${budget}.`,
    extra?.trim() ?? '',
    'Lay the recommended night out as stops, one per line: "7:00 PM — what and where — $estimate". Keep the total inside the budget.',
  ].filter(Boolean).join(' ').slice(0, 600);
}

export function totals(items: PerDiemItem[], budgetCents: number) {
  const planned = items.reduce((s, i) => s + (Number.isFinite(i.cost_cents) ? i.cost_cents : 0), 0);
  const spent = items.filter((i) => i.done).reduce((s, i) => s + i.cost_cents, 0);
  return {planned, spent, left: budgetCents - planned, over: budgetCents > 0 && planned > budgetCents};
}

export const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

export const readNight = (date: string) => api<{date?: string; plan?: PerDiemPlan | null} & Err>(`/api/per-diem?date=${date}`);
export const toggleStop = (id: string, index: number, done: boolean) => api<{plan?: PerDiemPlan} & Err>(`/api/per-diem/${id}`, {method: 'PATCH', json: {toggle: {index, done}}});
export const closeNight = (id: string, status: 'done' | 'cancelled' | 'draft') => api<{plan?: PerDiemPlan} & Err>(`/api/per-diem/${id}`, {method: 'PATCH', json: {status}});

/** Save the night's budget, ask Nova for the evening, and attach her plan (parsed server-side). */
export async function planNight(date: string, budgetCents: number, occasion: string): Promise<{ok: true; plan: PerDiemPlan} | {ok: false; text: string; saved: boolean}> {
  const c = await api<{plan?: PerDiemPlan} & Err>('/api/per-diem', {method: 'POST', json: {date, budget_cents: budgetCents, occasion}});
  if (!c.ok || !c.body.plan) return {ok: false, saved: false, text: c.status === 401 ? 'Sign in first. Nothing was saved.' : c.body.message ?? 'The night couldn’t be saved. Nothing was changed.'};
  const r = await createRequest({kind: 'plan', title: `${occasion} · ${date}`, room: 'perdiem',
    details: {topic: 'evening', brief: eveningBrief(occasion, budgetCents), when: new Date(`${date}T19:00:00`).toISOString(), party_size: 2}}, true);
  if (!r.ok || r.data.status !== 'ready') return {ok: false, saved: true, text: `${r.ok ? 'Nova couldn’t finish the plan.' : requestErrorText(r.status, r.body)} Your budget for the night is saved.`};
  const p = await api<{plan?: PerDiemPlan} & Err>(`/api/per-diem/${c.body.plan.id}`, {method: 'PATCH', json: {nova_request_id: r.data.id}});
  if (!p.ok || !p.body.plan) return {ok: false, saved: true, text: 'Nova’s plan is in your Diary, but it couldn’t be attached to the night.'};
  return {ok: true, plan: p.body.plan};
}
