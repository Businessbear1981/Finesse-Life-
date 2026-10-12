'use client';

import {useCallback, useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {
  billingFailure,
  callJson,
  formatCents,
  formatDate,
  getPledges,
  safeRedirectUrl,
  sleep,
  type Pledge,
  type PledgeState,
} from './billing-api';

// Scale → "Your pledges". Lists the member's pledges (GET /api/scale/pledges) with
// their honest state. Only a pledge in `payment_requested` can be paid: Pay now →
// POST /api/scale/pledges/[id]/pay → Stripe Checkout. On return (?paid=<id>) the
// list is polled until the server shows `paid`; until then it says "processing".

type Load = {kind: 'loading'} | {kind: 'signed_out'} | {kind: 'error'; text: string} | {kind: 'ready'; pledges: Pledge[]};
type Confirm = {kind: 'none'} | {kind: 'waiting'} | {kind: 'paid'} | {kind: 'processing'};

const POLL_TRIES = 10;
const POLL_MS = 3000;

const caps: CSSProperties = {fontFamily: 'Cinzel, serif', textTransform: 'uppercase'};
const serif: CSSProperties = {fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic'};

const STATE_META: Record<PledgeState, {label: string; color: string}> = {
  pledged: {label: 'Pledged', color: 'rgba(244,232,208,0.55)'},
  waitlisted: {label: 'Waitlisted', color: 'rgba(244,232,208,0.45)'},
  goal_met: {label: 'Goal met', color: '#00FF88'},
  payment_requested: {label: 'Payment requested', color: '#FFA96B'},
  paid: {label: 'Paid', color: '#00FF88'},
  fulfilled: {label: 'Fulfilled', color: '#00FF88'},
  refunded: {label: 'Refunded', color: '#C9A961'},
  cancelled: {label: 'Cancelled', color: 'rgba(244,232,208,0.35)'},
};

function stateCopy(p: Pledge): string {
  const goal = p.deal?.goal_count;
  switch (p.state) {
    case 'pledged':
      return `No charge yet. You'll be asked to pay only if the group reaches its goal${goal ? ` of ${goal}` : ''}.`;
    case 'waitlisted':
      return "The group is full. You'll move into the buy if a place frees up — no charge until then.";
    case 'goal_met':
      return "The group reached its goal. You'll be asked to pay when payment opens for this buy — it will show here.";
    case 'payment_requested':
      return 'Your place is held. Pay to confirm it — secure checkout by Stripe.';
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

function Banner({tone, children}: {tone: 'ok' | 'info' | 'warn' | 'error'; children: ReactNode}) {
  const color = tone === 'ok' ? '#00FF88' : tone === 'warn' ? '#FFA96B' : tone === 'error' ? '#FF4D7D' : '#C9A961';
  return (
    <p
      role={tone === 'error' || tone === 'warn' ? 'alert' : 'status'}
      style={{...serif, fontSize: '14px', color, padding: '10px 14px', border: `1px solid ${color}40`, background: `${color}0D`, marginBottom: '12px'}}
    >
      {children}
    </p>
  );
}

export function ScalePledges({paid}: {paid: string | null}) {
  const returnedId = paid && paid !== 'cancelled' ? paid : null;
  const [load, setLoad] = useState<Load>({kind: 'loading'});
  const [confirm, setConfirm] = useState<Confirm>(returnedId ? {kind: 'waiting'} : {kind: 'none'});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<{id: string; text: string} | null>(null);

  const apply = useCallback((r: Awaited<ReturnType<typeof getPledges>>) => {
    if (r.ok) setLoad({kind: 'ready', pledges: Array.isArray(r.body.pledges) ? r.body.pledges : []});
    else if (r.status === 401) setLoad({kind: 'signed_out'});
    else setLoad({kind: 'error', text: 'Your pledges could not be loaded right now. Nothing was changed.'});
    return r;
  }, []);

  useEffect(() => {
    let alive = true;
    const isPaid = (r: Awaited<ReturnType<typeof getPledges>>) =>
      r.ok && (r.body.pledges ?? []).some((p) => p.id === returnedId && (p.state === 'paid' || p.state === 'fulfilled'));

    void (async () => {
      const first = await getPledges();
      if (!alive) return;
      apply(first);
      if (!returnedId) return;
      try {
        window.history.replaceState(null, '', '/scale');
      } catch {
        // History API unavailable — harmless.
      }
      if (isPaid(first)) {
        setConfirm({kind: 'paid'});
        return;
      }
      if (first.status === 401) {
        setConfirm({kind: 'none'});
        return;
      }
      for (let i = 0; i < POLL_TRIES; i++) {
        await sleep(POLL_MS);
        if (!alive) return;
        const r = await getPledges();
        if (!alive) return;
        if (!r.ok) continue;
        apply(r);
        if (isPaid(r)) {
          setConfirm({kind: 'paid'});
          return;
        }
      }
      setConfirm({kind: 'processing'});
    })();

    return () => {
      alive = false;
    };
  }, [apply, returnedId]);

  async function pay(id: string) {
    if (busyId) return;
    setBusyId(id);
    setRowMsg(null);
    const r = await callJson<{url?: string}>(`/api/scale/pledges/${encodeURIComponent(id)}/pay`, {method: 'POST'});
    if (r.ok && safeRedirectUrl(r.body.url)) {
      window.location.assign(r.body.url);
      return;
    }
    setBusyId(null);
    if (r.status === 409) {
      setRowMsg({id, text: "This pledge isn't awaiting payment any more. Showing its current state."});
      apply(await getPledges());
    } else if (r.status === 404) {
      setRowMsg({id, text: 'That pledge is no longer here. Nothing was charged.'});
      apply(await getPledges());
    } else {
      setRowMsg({id, text: billingFailure(r.ok ? 500 : r.status)});
    }
  }

  if (load.kind === 'signed_out') return null; // visitors just browse the deals
  if (load.kind === 'loading' && !returnedId && paid !== 'cancelled') return null;

  const pledges = load.kind === 'ready' ? load.pledges : [];
  if (load.kind === 'ready' && pledges.length === 0 && !paid) return null;

  return (
    <section style={{maxWidth: '672px', margin: '0 auto 28px', padding: '0 16px', position: 'relative', zIndex: 10}} aria-label="Your pledges">
      {paid === 'cancelled' && <Banner tone="info">Payment cancelled — nothing was charged. Your pledge is unchanged — you can pay from here while payment is open.</Banner>}
      {confirm.kind === 'waiting' && <Banner tone="info">Confirming your payment with the house…</Banner>}
      {confirm.kind === 'paid' && <Banner tone="ok">Payment confirmed. Thank you — your place in the buy is locked in.</Banner>}
      {confirm.kind === 'processing' && (
        <Banner tone="warn">
          Processing. Stripe has sent you back, but the house hasn&apos;t confirmed the payment yet. It will show as Paid here once it
          lands — check back in a few minutes.
        </Banner>
      )}

      <h2 style={{...caps, fontSize: '10px', letterSpacing: '0.35em', color: 'rgba(244,232,208,0.45)', marginBottom: '10px'}}>Your pledges</h2>

      {load.kind === 'loading' && <p style={{...serif, fontSize: '13px', color: 'rgba(244,232,208,0.3)'}}>Loading your pledges…</p>}
      {load.kind === 'error' && <p role="alert" style={{...serif, fontSize: '13px', color: '#FF4D7D'}}>{load.text}</p>}

      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        {pledges.map((p) => {
          const meta = STATE_META[p.state] ?? {label: p.state, color: 'rgba(244,232,208,0.5)'};
          const price = formatCents(p.deal?.group_price_cents);
          const highlight = p.id === returnedId;
          return (
            <div
              key={p.id}
              style={{
                padding: '14px 16px',
                background: '#0D0508',
                border: highlight
                  ? '1px solid rgba(0,255,136,0.4)'
                  : p.state === 'payment_requested'
                    ? '1px solid rgba(255,169,107,0.45)'
                    : '1px solid rgba(244,232,208,0.06)',
              }}
            >
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap'}}>
                <div style={{minWidth: 0}}>
                  {p.deal?.brand && (
                    <p style={{...caps, fontSize: '8px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)', marginBottom: '2px'}}>{p.deal.brand}</p>
                  )}
                  <p style={{fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontSize: '16px', color: '#F4E8D0'}}>
                    {p.deal?.title ?? 'Group buy'}
                  </p>
                </div>
                <div style={{display: 'flex', alignItems: 'baseline', gap: '10px'}}>
                  {price && <span style={{fontFamily: 'Courier New, monospace', fontSize: '14px', color: '#00FF88'}}>{price}</span>}
                  <span style={{...caps, fontSize: '8px', letterSpacing: '0.25em', color: meta.color, padding: '3px 8px', border: `1px solid ${meta.color}`}}>
                    {meta.label}
                  </span>
                </div>
              </div>

              <p style={{...serif, fontSize: '13px', color: 'rgba(244,232,208,0.5)', marginTop: '8px', lineHeight: 1.5}}>
                {stateCopy(p)}
                {p.state === 'pledged' && typeof p.deal?.current_count === 'number' && typeof p.deal?.goal_count === 'number'
                  ? ` ${p.deal.current_count}/${p.deal.goal_count} so far${formatDate(p.deal.deadline) ? `, closes ${formatDate(p.deal.deadline)}` : ''}.`
                  : ''}
              </p>

              {p.state === 'payment_requested' && (
                <button
                  type="button"
                  onClick={() => pay(p.id)}
                  disabled={busyId !== null}
                  style={{
                    ...caps,
                    marginTop: '12px',
                    width: '100%',
                    padding: '12px',
                    fontSize: '10px',
                    letterSpacing: '0.3em',
                    background: busyId === p.id ? 'rgba(201,169,97,0.15)' : '#00FF88',
                    color: busyId === p.id ? '#C9A961' : '#0A0406',
                    border: busyId === p.id ? '1px solid rgba(201,169,97,0.3)' : 'none',
                    cursor: busyId !== null ? 'wait' : 'pointer',
                    opacity: busyId !== null && busyId !== p.id ? 0.5 : 1,
                  }}
                >
                  {busyId === p.id ? 'Opening secure checkout…' : `Pay now${price ? ` · ${price}` : ''}`}
                </button>
              )}

              {rowMsg?.id === p.id && (
                <p role="alert" style={{...serif, fontSize: '12px', color: '#FF4D7D', marginTop: '8px'}}>
                  {rowMsg.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
