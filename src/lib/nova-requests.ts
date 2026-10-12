// Nova requests — the orchestrator hub (supabase/migrations/20261015_nova_requests.sql).
// draft → confirm → dispatch to an agent / planner → result + Diary item.

import {z} from 'zod';
import {createServiceClient} from '@/lib/supabase/service';
import {findProcurementPath, huntPrice, scoutByText, suggestForOccasion, filterByStyle, NovaUnavailableError} from '@/lib/agents';
import {runNova, type NovaPersona} from '@/lib/nova';

export const REQUEST_KINDS = ['find_item', 'price_check', 'style_for_occasion', 'procurement', 'plan'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];
export type RequestStatus = 'drafted' | 'running' | 'ready' | 'failed' | 'done' | 'cancelled';

const text = (max: number) => z.string().trim().min(1).max(max);
const when = z.string().datetime({offset: true}).optional();

/** Per-kind details. Anything else is rejected before it reaches an agent. */
export const DETAILS: {[K in RequestKind]: z.ZodType} = {
  find_item: z.object({query: text(200), budget_cents: z.number().int().min(0).max(100_000_000).optional()}),
  price_check: z.object({title: text(160), brand: z.string().trim().max(80).default(''), category: z.string().trim().max(60).default('fashion'), retail_cents: z.number().int().min(0).max(100_000_000)}),
  style_for_occasion: z.object({occasion: text(200), occasion_type: z.string().trim().max(60).default('evening')}),
  procurement: z.object({title: text(160), category: text(60), price_cents: z.number().int().min(0).max(100_000_000)}),
  plan: z.object({
    topic: z.enum(['table', 'ride', 'trip', 'evening', 'appointment', 'other']).default('other'),
    brief: text(600),
    when,
    party_size: z.number().int().min(1).max(40).optional(),
  }),
};

export const draftSchema = z.object({
  kind: z.enum(REQUEST_KINDS),
  title: text(140),
  details: z.record(z.string(), z.unknown()).default({}),
  room: z.string().trim().max(40).regex(/^[a-z0-9-]+$/).optional(),
});
export type DraftInput = z.infer<typeof draftSchema>;

export type NovaRequestRow = {
  id: string;
  member_id: string;
  kind: RequestKind;
  title: string;
  details: Record<string, unknown>;
  room: string | null;
  status: RequestStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  diary_item_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Validate a draft's details for its kind. Returns cleaned details or an error code. */
export function cleanDetails(kind: RequestKind, details: unknown): {ok: true; details: Record<string, unknown>} | {ok: false; error: string} {
  const parsed = DETAILS[kind].safeParse(details ?? {});
  return parsed.success ? {ok: true, details: parsed.data as Record<string, unknown>} : {ok: false, error: 'bad_details'};
}

const PLAN_PERSONA: Record<string, NovaPersona> = {table: 'date_planner', evening: 'date_planner', ride: 'travel', trip: 'travel', appointment: 'concierge', other: 'concierge'};

/** Agent/planner work for one request. Pure orchestration; throws NovaUnavailableError on model outage. */
export async function runAgent(row: Pick<NovaRequestRow, 'kind' | 'details' | 'member_id'>, styleDna: Record<string, unknown> | null): Promise<Record<string, unknown>> {
  const ctx = {userId: row.member_id};
  const d = row.details as Record<string, string> & {retail_cents: number; price_cents: number};
  switch (row.kind) {
    case 'find_item': {
      const found = await scoutByText(d.query, styleDna ? JSON.stringify(styleDna).slice(0, 1500) : undefined, ctx);
      const ranked = styleDna && found.length > 1 ? await filterByStyle(found.slice(0, 20), styleDna, ctx) : found;
      const budget = (row.details as {budget_cents?: number}).budget_cents;
      const items = (budget ? ranked.filter((i) => !i.price_cents || i.price_cents <= budget) : ranked).slice(0, 8);
      return {agent: 'scout', items};
    }
    case 'price_check': {
      const prices = await huntPrice(d.title, d.brand, d.category, d.retail_cents, ctx);
      return {agent: 'price-hunter', prices};
    }
    case 'style_for_occasion': {
      const items = await suggestForOccasion(d.occasion, d.occasion_type, styleDna ?? {}, ctx);
      return {agent: 'stylist', items};
    }
    case 'procurement': {
      const path = await findProcurementPath({title: d.title, category: d.category, price_cents: d.price_cents}, row.member_id);
      return {agent: 'procurement', path};
    }
    case 'plan': {
      const p = row.details as {topic: string; brief: string; when?: string; party_size?: number};
      const prompt = [
        `Draft a concrete plan the member can approve. Topic: ${p.topic}.`,
        `Brief: ${JSON.stringify(p.brief)}`,
        p.when ? `When: ${p.when}` : '',
        p.party_size ? `Party size: ${p.party_size}` : '',
        'Give 2–3 specific options with times and a short reason each, then one recommended choice. Do not claim anything is booked.',
      ].filter(Boolean).join('\n');
      const res = await runNova({userId: row.member_id, prompt, persona: PLAN_PERSONA[p.topic] ?? 'concierge', memberContext: true, feature: 'nova.requests.plan', maxOutputTokens: 900});
      if (!res.ok) throw new NovaUnavailableError(res.status);
      // Honest: no booking partner is connected, so nothing is reserved.
      return {agent: 'planner', persona: PLAN_PERSONA[p.topic] ?? 'concierge', plan: res.text, booked: false};
    }
  }
}

function diaryTitle(row: Pick<NovaRequestRow, 'kind' | 'title'>) {
  const prefix = row.kind === 'plan' ? 'Nova’s plan' : 'Nova found';
  return `${prefix}: ${row.title}`.slice(0, 200);
}

/**
 * Confirm + dispatch a member's request. Ownership is checked against `memberId`; all writes use the
 * service role (members can't write status/result themselves — see the migration).
 */
export async function confirmAndDispatch(requestId: string, memberId: string): Promise<{status: number; body: Record<string, unknown>}> {
  const db = createServiceClient();
  const {data: row, error} = await db.from('nova_requests').select('*').eq('id', requestId).maybeSingle();
  if (error) return {status: 502, body: {error: 'requests_unavailable'}};
  if (!row || row.member_id !== memberId) return {status: 404, body: {error: 'not_found'}};
  if (row.status !== 'drafted' && row.status !== 'failed') return {status: 409, body: {error: 'not_confirmable', status: row.status}};

  const claim = await db.from('nova_requests').update({status: 'running', error: null}).eq('id', requestId).eq('status', row.status).select('id').maybeSingle();
  if (claim.error || !claim.data) return {status: 409, body: {error: 'already_running'}};

  const {data: prof} = await db.from('profiles').select('nightvision_data, style_dna').eq('id', memberId).maybeSingle();
  const styleDna = (prof?.nightvision_data ?? prof?.style_dna ?? null) as Record<string, unknown> | null;

  let result: Record<string, unknown>;
  try {
    result = await runAgent(row as NovaRequestRow, styleDna);
  } catch (e) {
    const unavailable = e instanceof NovaUnavailableError;
    await db.from('nova_requests').update({status: 'failed', error: unavailable ? 'nova_unavailable' : 'agent_failed'}).eq('id', requestId);
    return {status: unavailable ? 503 : 502, body: {error: unavailable ? 'nova_unavailable' : 'agent_failed'}};
  }

  // Diary: one item pointing at the request, waiting for the member to review.
  const startsAt = (row.details as {when?: string}).when ?? new Date().toISOString();
  const diary = await db.from('diary_items').insert({
    user_id: memberId, title: diaryTitle(row as NovaRequestRow), starts_at: startsAt, source_room: 'nova', source_id: requestId,
    state: 'needs_member_action', notes: row.kind === 'plan' ? 'Drafted by Nova. Nothing is booked yet.' : null,
  }).select('id').maybeSingle();

  const done = await db.from('nova_requests')
    .update({status: 'ready', result, diary_item_id: diary.data?.id ?? null})
    .eq('id', requestId).select('*').single();
  if (done.error) return {status: 502, body: {error: 'requests_unavailable'}};
  return {status: 200, body: {request: done.data}};
}

/** Member closes a request: cancel (drafted/ready) or mark done (ready). */
export async function closeRequest(requestId: string, memberId: string, to: 'cancelled' | 'done') {
  const db = createServiceClient();
  const {data: row} = await db.from('nova_requests').select('id, member_id, status, diary_item_id').eq('id', requestId).maybeSingle();
  if (!row || row.member_id !== memberId) return {status: 404, body: {error: 'not_found'}};
  const allowed = to === 'done' ? row.status === 'ready' : row.status === 'drafted' || row.status === 'ready' || row.status === 'failed';
  if (!allowed) return {status: 409, body: {error: 'bad_transition', status: row.status}};
  const {data, error} = await db.from('nova_requests').update({status: to}).eq('id', requestId).select('*').single();
  if (error) return {status: 502, body: {error: 'requests_unavailable'}};
  if (row.diary_item_id) await db.from('diary_items').update({state: to === 'done' ? 'done' : 'cancelled'}).eq('id', row.diary_item_id);
  return {status: 200, body: {request: data}};
}

/** Create a draft as the member (service role, member id fixed by the caller). Used by Nova's tool. */
export async function createDraft(memberId: string, input: DraftInput) {
  const clean = cleanDetails(input.kind, input.details);
  if (!clean.ok) return {ok: false as const, error: clean.error};
  const db = createServiceClient();
  const {data, error} = await db.from('nova_requests')
    .insert({member_id: memberId, kind: input.kind, title: input.title, details: clean.details, room: input.room ?? 'concierge'})
    .select('id, kind, title, status').single();
  if (error) return {ok: false as const, error: 'requests_unavailable'};
  return {ok: true as const, request: data};
}
