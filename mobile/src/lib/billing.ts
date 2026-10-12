// Membership status and Scale pledge payments, against the contract in docs/PAYMENTS.md.
// App Store 3.1.1: the app never sells the digital membership — it only READS its status.
// Scale group buys are physical goods, so a pledge in `payment_requested` may be paid through
// Stripe's hosted Checkout, opened in the phone's browser. Nothing here marks anything paid:
// only the server (Stripe webhook) does, and the app re-reads the pledge to find out.
import {Linking} from 'react-native';
import {api} from './api';
import {failure} from './live';

export type VipSource = 'code' | 'subscription' | 'staff';

export type BillingStatus = {
  configured: boolean;
  priceDisplay: string | null;
  vip: {active: boolean; source: VipSource | null; expiresAt: string | null};
  subscription: {status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean} | null;
};

export type PledgeState = 'pledged' | 'waitlisted' | 'goal_met' | 'payment_requested' | 'paid' | 'fulfilled' | 'refunded' | 'cancelled';

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

export const BILLING_STATUS_PATH = '/api/billing/status';
export const PLEDGES_PATH = '/api/scale/pledges';

export const VIP_SOURCE_LABEL: Record<VipSource, string> = {
  subscription: 'Monthly membership',
  code: 'Invitation code',
  staff: 'Granted by the house',
};

export const PLEDGE_LABEL: Record<PledgeState, string> = {
  pledged: 'PLEDGED · NO CHARGE',
  waitlisted: 'WAITLISTED',
  goal_met: 'GOAL MET',
  payment_requested: 'PAYMENT REQUESTED',
  paid: 'PAID',
  fulfilled: 'FULFILLED',
  refunded: 'REFUNDED',
  cancelled: 'CANCELLED',
};

export function pledgeCopy(p: Pledge): string {
  const goal = p.deal?.goal_count;
  switch (p.state) {
    case 'pledged':
      return `No charge yet. You'll be asked to pay only if the group reaches its goal${goal ? ` of ${goal}` : ''}.`;
    case 'waitlisted':
      return "The group is full. You'll move into the buy if a place frees up — no charge until then.";
    case 'goal_met':
      return "The group reached its goal. You'll be asked to pay when payment opens for this buy — it will show here.";
    case 'payment_requested':
      return 'Your place is held. Pay to confirm it — secure checkout by Stripe opens in your browser.';
    case 'paid':
      return 'Payment confirmed. Thank you.';
    case 'fulfilled':
      return 'Delivered. Enjoy it.';
    case 'refunded':
      return 'Your payment was refunded to your card.';
    case 'cancelled':
      return 'This pledge was cancelled. Nothing was charged.';
  }
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

export const formatCents = (cents: number | null | undefined) =>
  typeof cents === 'number' ? `$${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: cents % 100 ? 2 : 0})}` : null;

/**
 * Asks the server for a Stripe Checkout URL for one pledge and opens it in the browser.
 * Resolves to an honest outcome — `opened` means only that the browser opened, not that anything was paid.
 */
export async function payPledge(id: string): Promise<{kind: 'opened'} | {kind: 'not_payable'; text: string} | {kind: 'error'; text: string}> {
  const r = await api<{url?: string; error?: string; message?: string; state?: string}>(`/api/scale/pledges/${encodeURIComponent(id)}/pay`, {method: 'POST'});
  if (r.ok) {
    const url = r.body.url;
    if (typeof url !== 'string' || !url.startsWith('https://')) return {kind: 'error', text: 'The house sent back no checkout. Nothing was charged.'};
    try {
      await Linking.openURL(url);
      return {kind: 'opened'};
    } catch {
      return {kind: 'error', text: 'This phone could not open the browser. Nothing was charged.'};
    }
  }
  if (r.status === 409) return {kind: 'not_payable', text: "This pledge isn't awaiting payment any more. Showing its current state."};
  if (r.status === 404) return {kind: 'not_payable', text: 'That pledge is no longer here. Nothing was charged.'};
  if (r.status === 503) return {kind: 'error', text: "Payments aren't open yet. Nothing was charged."};
  return {kind: 'error', text: failure(r.status, r.body, 'Nothing was charged.')};
}
