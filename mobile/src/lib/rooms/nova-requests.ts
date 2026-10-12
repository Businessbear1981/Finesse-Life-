// Nova request hub (/api/nova/requests) for the mobile rooms. Mirrors the web view model in
// src/lib/nova-request-view.ts (keep the two in step): untrusted agent JSON → safe view data.
import {api} from '../api';

export type RequestKind = 'find_item' | 'price_check' | 'style_for_occasion' | 'procurement' | 'plan';
export type RequestStatus = 'drafted' | 'running' | 'ready' | 'failed' | 'done' | 'cancelled';

export type NovaRequest = {
  id: string; kind: RequestKind; title: string; status: RequestStatus;
  room?: string | null; result?: Record<string, unknown> | null; error?: string | null; created_at?: string;
};

export type ItemView = {title: string; brand: string; price_cents: number | null; source: string; url: string | null; partner: string | null};
export type PriceView = {source: string; price_cents: number | null; url: string | null; members: boolean; savings_cents: number};
export type PathView = {method: string; partner: string | null; url: string | null; token: string | null; instructions: string; savings_cents: number};
export type ResultView =
  | {type: 'items'; items: ItemView[]}
  | {type: 'prices'; prices: PriceView[]}
  | {type: 'path'; path: PathView}
  | {type: 'plan'; text: string; booked: false}
  | {type: 'empty'};

const KINDS: readonly string[] = ['find_item', 'price_check', 'style_for_occasion', 'procurement', 'plan'];
const STATUSES: readonly string[] = ['drafted', 'running', 'ready', 'failed', 'done', 'cancelled'];

export const STATUS_LABEL: Record<RequestStatus, string> = {drafted: 'Drafted', running: 'Working', ready: 'Ready', done: 'Done', cancelled: 'Cancelled', failed: 'Failed'};
export const KIND_LABEL: Record<RequestKind, string> = {find_item: 'Find it', price_check: 'Price check', style_for_occasion: 'Styling', procurement: 'Best way to buy', plan: 'Plan'};

export function actionsFor(s: RequestStatus) {
  return {confirm: s === 'drafted', retry: s === 'failed', cancel: s === 'drafted' || s === 'ready' || s === 'failed', done: s === 'ready'};
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cents = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);

export function safeUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s) ? s : null;
}

export function formatCents(c: number | null | undefined): string {
  if (c == null || !Number.isFinite(c)) return '—';
  const whole = c % 100 === 0;
  return `$${(c / 100).toLocaleString('en-US', {minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2})}`;
}

const SOURCE: Record<string, string> = {scale: 'Scale', embassy: 'Embassy', nova: 'Nova’s pick', web: 'Web'};
export const sourceLabel = (s: string) => SOURCE[s] ?? (s || 'Nova');

export function resultView(result: unknown): ResultView {
  if (!result || typeof result !== 'object') return {type: 'empty'};
  const r = result as Record<string, unknown>;
  if (r.agent === 'scout' || r.agent === 'stylist') {
    const items = (Array.isArray(r.items) ? r.items : []).flatMap((raw): ItemView[] => {
      if (!raw || typeof raw !== 'object') return [];
      const i = raw as Record<string, unknown>;
      const title = str(i.title, 160);
      return title ? [{title, brand: str(i.brand, 80), price_cents: cents(i.price_cents), source: str(i.source, 40) || 'nova', url: safeUrl(i.purchase_url), partner: str(i.partner, 80) || null}] : [];
    }).slice(0, 12);
    return items.length ? {type: 'items', items} : {type: 'empty'};
  }
  if (r.agent === 'price-hunter') {
    const prices = (Array.isArray(r.prices) ? r.prices : []).flatMap((raw): PriceView[] => {
      if (!raw || typeof raw !== 'object') return [];
      const p = raw as Record<string, unknown>;
      const source = str(p.source, 80);
      return source ? [{source, price_cents: cents(p.price_cents), url: safeUrl(p.url), members: p.is_members_price === true, savings_cents: cents(p.savings_cents) ?? 0}] : [];
    }).slice(0, 12).sort((a, b) => (a.price_cents ?? Infinity) - (b.price_cents ?? Infinity));
    return prices.length ? {type: 'prices', prices} : {type: 'empty'};
  }
  if (r.agent === 'procurement' && r.path && typeof r.path === 'object') {
    const p = r.path as Record<string, unknown>;
    return {type: 'path', path: {method: str(p.method, 20) || 'manual', partner: str(p.partner_name, 80) || null, url: safeUrl(p.partner_url), token: str(p.token, 40) || null, instructions: str(p.instructions, 600), savings_cents: cents(p.estimated_savings_cents) ?? 0}};
  }
  if (r.agent === 'planner') {
    const text = str(r.plan, 6000);
    return text ? {type: 'plan', text, booked: false} : {type: 'empty'};
  }
  return {type: 'empty'};
}

export function toRequest(raw: unknown): NovaRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id || !KINDS.includes(r.kind as string) || !STATUSES.includes(r.status as string)) return null;
  const kind = r.kind as RequestKind;
  return {
    id: r.id, kind, title: str(r.title, 140) || KIND_LABEL[kind], status: r.status as RequestStatus,
    room: typeof r.room === 'string' ? r.room : null,
    result: r.result && typeof r.result === 'object' ? (r.result as Record<string, unknown>) : null,
    error: typeof r.error === 'string' ? r.error : null,
    created_at: typeof r.created_at === 'string' ? r.created_at : undefined,
  };
}

/** Drafts Nova made this turn via its draft_request tool. */
export function draftsFromToolCalls(toolCalls: unknown): NovaRequest[] {
  if (!Array.isArray(toolCalls)) return [];
  const out: NovaRequest[] = [];
  for (const tc of toolCalls) {
    if (!tc || typeof tc !== 'object' || (tc as {name?: unknown}).name !== 'draft_request') continue;
    const res = (tc as {result?: {drafted?: unknown; request?: unknown}}).result;
    if (!res || res.drafted !== true) continue;
    const req = toRequest(res.request);
    if (req && !out.some((o) => o.id === req.id)) out.push(req);
  }
  return out;
}

export function requestErrorText(status: number, body: {error?: unknown; retryAfterS?: unknown} | null | undefined): string {
  if (status === 0) return 'The house line is offline. Nothing ran — try again when we are connected.';
  if (status === 401) return 'Sign in to send this to Nova. Nothing ran.';
  if (status === 429) {
    const s = Number(body?.retryAfterS);
    return Number.isFinite(s) && s > 0 ? `Nova needs a moment — try again in ${Math.ceil(s)} s.` : 'Nova needs a moment — try again shortly.';
  }
  if (status === 409) return 'This request has already moved on. Refresh to see where it stands.';
  if (status === 404) return 'This request no longer exists.';
  if (status === 503 || body?.error === 'nova_unavailable') return 'Nova couldn’t be reached just now. Nothing ran — try again in a moment.';
  if (body?.error === 'agent_failed') return 'Nova couldn’t finish this one. Nothing was bought or booked — try again.';
  return 'Something went wrong. Nothing was bought or booked — try again in a moment.';
}

export function storedErrorText(code: string | null | undefined): string {
  if (code === 'nova_unavailable') return 'Nova couldn’t be reached. Try again.';
  if (code === 'agent_failed') return 'Nova couldn’t finish this one. Try again.';
  return 'This didn’t finish. Try again.';
}

// ─── Calls (member's bearer session via api()) ─────────────────────────────────

export type HubReply<T> = {ok: true; status: number; data: T} | {ok: false; status: number; body: {error?: string; retryAfterS?: number} | null};

type Body = {request?: unknown; requests?: unknown; error?: string; retryAfterS?: number};

function one(r: {ok: boolean; status: number; body: Body}): HubReply<NovaRequest> {
  const req = r.ok ? toRequest(r.body.request) : null;
  return req ? {ok: true, status: r.status, data: req} : {ok: false, status: r.ok ? 502 : r.status, body: r.body};
}

export async function listRequests(): Promise<HubReply<NovaRequest[]>> {
  const r = await api<Body>('/api/nova/requests');
  if (!r.ok) return {ok: false, status: r.status, body: r.body};
  const rows = Array.isArray(r.body.requests) ? r.body.requests : [];
  return {ok: true, status: r.status, data: rows.map(toRequest).filter((x): x is NovaRequest => !!x)};
}

export async function createRequest(input: {kind: RequestKind; title: string; details: Record<string, unknown>; room?: string}, confirm: boolean) {
  return one(await api<Body>('/api/nova/requests', {method: 'POST', json: {...input, title: input.title.slice(0, 140), confirm}}));
}

export async function confirmRequest(id: string) {
  return one(await api<Body>(`/api/nova/requests/${encodeURIComponent(id)}/confirm`, {method: 'POST'}));
}

export async function closeRequest(id: string, to: 'cancel' | 'done') {
  return one(await api<Body>(`/api/nova/requests/${encodeURIComponent(id)}/${to}`, {method: 'POST'}));
}
