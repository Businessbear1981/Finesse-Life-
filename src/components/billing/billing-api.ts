// Client-side helpers for the Stripe billing contract in docs/PAYMENTS.md.
// The server is the only source of truth for VIP and pledge state: nothing here
// ever claims a payment succeeded until a GET shows it.

export type VipSource = 'code' | 'subscription' | 'staff';

export type BillingStatus = {
  configured: boolean;
  priceDisplay: string | null;
  vip: {active: boolean; source: VipSource | null; expiresAt: string | null};
  subscription: {status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean} | null;
};

export type PledgeState =
  | 'pledged'
  | 'waitlisted'
  | 'goal_met'
  | 'payment_requested'
  | 'paid'
  | 'fulfilled'
  | 'refunded'
  | 'cancelled';

export type Pledge = {
  id: string;
  deal_id: string;
  state: PledgeState;
  joined_at: string;
  state_changed_at: string | null;
  deal: {
    title: string | null;
    brand: string | null;
    group_price_cents: number | null;
    goal_count: number | null;
    current_count: number | null;
    deadline: string | null;
    status: string | null;
  } | null;
};

export type ApiResult<T> = {ok: boolean; status: number; body: T & {error?: string; message?: string; state?: string}};

export async function callJson<T = Record<string, unknown>>(
  path: string,
  init: {method?: 'GET' | 'POST'; json?: unknown} = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: init.method ?? 'GET',
      headers: init.json !== undefined ? {'Content-Type': 'application/json'} : undefined,
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      cache: 'no-store',
      credentials: 'same-origin',
    });
    let body = {} as ApiResult<T>['body'];
    try {
      body = (await res.json()) as ApiResult<T>['body'];
    } catch {
      // Empty or non-JSON body — status alone tells the story.
    }
    return {ok: res.ok, status: res.status, body};
  } catch {
    return {ok: false, status: 0, body: {} as ApiResult<T>['body']};
  }
}

export const getBillingStatus = () => callJson<BillingStatus>('/api/billing/status');
export const getPledges = () => callJson<{pledges: Pledge[]}>('/api/scale/pledges');

/** True only for a same-site path or an https URL (Stripe-hosted pages). */
export function safeRedirectUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
}

export const formatCents = (cents: number | null | undefined) =>
  typeof cents === 'number' ? `$${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: cents % 100 ? 2 : 0})}` : null;

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Generic failure copy for a billing call. `nothing` ends the sentence. */
export function billingFailure(status: number, nothing = 'Nothing was charged.'): string {
  if (status === 0) return `The front desk line is down. ${nothing}`;
  if (status === 401) return `Sign in first. ${nothing}`;
  if (status === 503) return `Payments aren't open yet. ${nothing}`;
  if (status === 429) return `Too many attempts — try again in a minute. ${nothing}`;
  return `Something went wrong at the front desk. ${nothing}`;
}
