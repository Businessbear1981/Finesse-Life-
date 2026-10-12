// Client-safe view model for Nova requests (the orchestrator hub — src/lib/nova-requests.ts).
// Pure functions only: no fetch, no React, no server imports. Shared by the web request card and tests;
// the mobile app keeps a mirror in mobile/src/lib/rooms/nova-requests.ts.

export type RequestKind = 'find_item' | 'price_check' | 'style_for_occasion' | 'procurement' | 'plan';
export type RequestStatus = 'drafted' | 'running' | 'ready' | 'failed' | 'done' | 'cancelled';

/** The subset of a nova_requests row the UI reads. Drafts from Nova's tool carry only id/kind/title/status. */
export type NovaRequest = {
  id: string;
  kind: RequestKind;
  title: string;
  status: RequestStatus;
  room?: string | null;
  details?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string | null;
  created_at?: string;
};

export type ItemView = {title: string; brand: string; price_cents: number | null; source: string; url: string | null; image_url: string | null; partner: string | null};
export type PriceView = {source: string; price_cents: number | null; url: string | null; members: boolean; savings_cents: number};
export type PathView = {method: string; partner: string | null; url: string | null; token: string | null; instructions: string; savings_cents: number};

export type ResultView =
  | {type: 'items'; agent: 'scout' | 'stylist'; items: ItemView[]}
  | {type: 'prices'; prices: PriceView[]}
  | {type: 'path'; path: PathView}
  | {type: 'plan'; text: string; booked: false}
  | {type: 'empty'};

const KINDS: readonly RequestKind[] = ['find_item', 'price_check', 'style_for_occasion', 'procurement', 'plan'];
const STATUSES: readonly RequestStatus[] = ['drafted', 'running', 'ready', 'failed', 'done', 'cancelled'];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  drafted: 'Drafted', running: 'Working', ready: 'Ready', done: 'Done', cancelled: 'Cancelled', failed: 'Failed',
};

export const KIND_LABEL: Record<RequestKind, string> = {
  find_item: 'Find it', price_check: 'Price check', style_for_occasion: 'Styling', procurement: 'Best way to buy', plan: 'Plan',
};

/** What the member can do next at each status. Mirrors closeRequest/confirmAndDispatch transitions. */
export function actionsFor(status: RequestStatus): {confirm: boolean; retry: boolean; cancel: boolean; done: boolean} {
  return {
    confirm: status === 'drafted',
    retry: status === 'failed',
    cancel: status === 'drafted' || status === 'ready' || status === 'failed',
    done: status === 'ready',
  };
}

const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cents = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);

/** Only http(s) links are rendered; anything else (javascript:, data:, relative junk) is dropped. */
export function safeUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function formatCents(c: number | null | undefined): string {
  if (c == null || !Number.isFinite(c)) return '—';
  return `$${(c / 100).toLocaleString('en-US', {minimumFractionDigits: c % 100 === 0 ? 0 : 2, maximumFractionDigits: 2})}`;
}

const SOURCE_LABEL: Record<string, string> = {scale: 'Scale', embassy: 'Embassy', nova: 'Nova’s pick', web: 'Web'};
export const sourceLabel = (s: string) => SOURCE_LABEL[s] ?? (s || 'Nova');

function toItem(raw: unknown): ItemView | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title, 160);
  if (!title) return null;
  return {
    title, brand: str(r.brand, 80), price_cents: cents(r.price_cents), source: str(r.source, 40) || 'nova',
    url: safeUrl(r.purchase_url), image_url: safeUrl(r.image_url), partner: str(r.partner, 80) || null,
  };
}

function toPrice(raw: unknown): PriceView | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const source = str(r.source, 80);
  if (!source) return null;
  return {source, price_cents: cents(r.price_cents), url: safeUrl(r.url), members: r.is_members_price === true, savings_cents: cents(r.savings_cents) ?? 0};
}

/** Turn a stored request.result (untrusted JSON from an agent) into something safe to render. */
export function resultView(result: unknown): ResultView {
  if (!result || typeof result !== 'object') return {type: 'empty'};
  const r = result as Record<string, unknown>;
  switch (r.agent) {
    case 'scout':
    case 'stylist': {
      const items = (Array.isArray(r.items) ? r.items : []).map(toItem).filter((i): i is ItemView => !!i).slice(0, 12);
      return items.length ? {type: 'items', agent: r.agent, items} : {type: 'empty'};
    }
    case 'price-hunter': {
      const prices = (Array.isArray(r.prices) ? r.prices : []).map(toPrice).filter((p): p is PriceView => !!p).slice(0, 12)
        .sort((a, b) => (a.price_cents ?? Infinity) - (b.price_cents ?? Infinity));
      return prices.length ? {type: 'prices', prices} : {type: 'empty'};
    }
    case 'procurement': {
      const p = r.path && typeof r.path === 'object' ? (r.path as Record<string, unknown>) : null;
      if (!p) return {type: 'empty'};
      return {type: 'path', path: {
        method: str(p.method, 20) || 'manual', partner: str(p.partner_name, 80) || null, url: safeUrl(p.partner_url),
        token: str(p.token, 40) || null, instructions: str(p.instructions, 600), savings_cents: cents(p.estimated_savings_cents) ?? 0,
      }};
    }
    case 'planner': {
      const text = str(r.plan, 6000);
      // Always unbooked: no booking partner is connected, whatever the stored value says.
      return text ? {type: 'plan', text, booked: false} : {type: 'empty'};
    }
    default:
      return {type: 'empty'};
  }
}

/** Coerce a row from /api/nova/requests (or a tool result) into a NovaRequest, or null if it isn't one. */
export function toRequest(raw: unknown): NovaRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (!KINDS.includes(r.kind as RequestKind) || !STATUSES.includes(r.status as RequestStatus)) return null;
  return {
    id: r.id, kind: r.kind as RequestKind, title: str(r.title, 140) || KIND_LABEL[r.kind as RequestKind], status: r.status as RequestStatus,
    room: typeof r.room === 'string' ? r.room : null,
    details: r.details && typeof r.details === 'object' ? (r.details as Record<string, unknown>) : undefined,
    result: r.result && typeof r.result === 'object' ? (r.result as Record<string, unknown>) : null,
    error: typeof r.error === 'string' ? r.error : null,
    created_at: typeof r.created_at === 'string' ? r.created_at : undefined,
  };
}

/** Drafts Nova created this turn via the draft_request tool (only successful drafts). */
export function draftsFromToolCalls(toolCalls: unknown): NovaRequest[] {
  if (!Array.isArray(toolCalls)) return [];
  const out: NovaRequest[] = [];
  for (const tc of toolCalls) {
    if (!tc || typeof tc !== 'object' || (tc as {name?: unknown}).name !== 'draft_request') continue;
    const res = (tc as {result?: unknown}).result as {drafted?: unknown; request?: unknown} | undefined;
    if (!res || res.drafted !== true) continue;
    const req = toRequest(res.request);
    if (req && !out.some((o) => o.id === req.id)) out.push(req);
  }
  return out;
}

/** Honest copy for a failed hub call. Nothing ran unless the server said so. */
export function requestErrorText(status: number, body: {error?: unknown; retryAfterS?: unknown} | null | undefined): string {
  if (status === 0) return 'Couldn’t reach Nova. Nothing ran — try again when you’re connected.';
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

/** Error code stored on a failed row → member copy. */
export function storedErrorText(code: string | null | undefined): string {
  if (code === 'nova_unavailable') return 'Nova couldn’t be reached. Try again.';
  if (code === 'agent_failed') return 'Nova couldn’t finish this one. Try again.';
  return 'This didn’t finish. Try again.';
}
