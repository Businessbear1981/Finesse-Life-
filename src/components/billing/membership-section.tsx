'use client';

import {useEffect, useState, type ReactNode} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  billingFailure,
  callJson,
  formatDate,
  getBillingStatus,
  safeRedirectUrl,
  sleep,
  type BillingStatus,
} from './billing-api';

type Load = {kind: 'loading'} | {kind: 'error'; text: string} | {kind: 'ready'; status: BillingStatus};
type Confirm = {kind: 'none'} | {kind: 'waiting'} | {kind: 'confirmed'} | {kind: 'slow'};
type Portal = {kind: 'idle'} | {kind: 'busy'} | {kind: 'hidden'} | {kind: 'error'; text: string};

const POLL_TRIES = 10;
const POLL_MS = 3000;

const SOURCE_LABEL = {
  subscription: 'Monthly membership',
  code: 'Invitation code',
  staff: 'Granted by the house',
} as const;

function Row({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2" style={{borderBottom: '1px solid rgba(201,169,97,0.06)'}}>
      <span className="font-label text-[8px] tracking-[0.3em] uppercase" style={{color: 'rgba(201,169,97,0.4)'}}>
        {label}
      </span>
      <span className="font-body text-sm text-right" style={{color: '#F4E8D0'}}>
        {children}
      </span>
    </div>
  );
}

function Banner({tone, children}: {tone: 'ok' | 'info' | 'warn' | 'error'; children: ReactNode}) {
  const color = tone === 'ok' ? '#7AF5B8' : tone === 'warn' ? '#FFA96B' : tone === 'error' ? '#FF4D7D' : '#E8C87A';
  return (
    <p
      role={tone === 'error' || tone === 'warn' ? 'alert' : 'status'}
      className="font-body text-xs italic px-3 py-2 mb-3"
      style={{color, border: `1px solid ${color}40`, background: `${color}0D`}}
    >
      {children}
    </p>
  );
}

const btnStyle = {border: '1px solid rgba(201,169,97,0.2)', color: 'rgba(201,169,97,0.7)'} as const;
const btnClass =
  'inline-block px-8 py-2.5 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed';

/**
 * /account → Membership. Reads GET /api/billing/status; after a Stripe return
 * (?billing=success) it polls until the server shows VIP active — the page never
 * claims the membership is live before the webhook has granted it.
 */
export function MembershipSection({returned}: {returned: 'success' | 'cancelled' | null}) {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({kind: 'loading'});
  const [confirm, setConfirm] = useState<Confirm>(returned === 'success' ? {kind: 'waiting'} : {kind: 'none'});
  const [portal, setPortal] = useState<Portal>({kind: 'idle'});
  useEffect(() => {
    let alive = true;

    void (async () => {
      const first = await getBillingStatus();
      if (!alive) return;
      if (!first.ok) {
        setLoad({kind: 'error', text: billingFailure(first.status, 'Your membership was not changed.')});
        if (returned === 'success') setConfirm({kind: 'slow'});
        return;
      }
      setLoad({kind: 'ready', status: first.body});
      if (returned !== 'success') return;

      // Drop the query so a reload doesn't restart the wait.
      try {
        window.history.replaceState(null, '', '/account');
      } catch {
        // History API unavailable — harmless.
      }

      if (first.body.vip.active && first.body.vip.source === 'subscription') {
        setConfirm({kind: 'confirmed'});
        router.refresh();
        return;
      }
      for (let i = 0; i < POLL_TRIES; i++) {
        await sleep(POLL_MS);
        if (!alive) return;
        const r = await getBillingStatus();
        if (!alive) return;
        if (!r.ok) continue;
        setLoad({kind: 'ready', status: r.body});
        if (r.body.vip.active && r.body.vip.source === 'subscription') {
          setConfirm({kind: 'confirmed'});
          router.refresh(); // server-rendered VIP sections (lift PIN) appear
          return;
        }
      }
      setConfirm({kind: 'slow'});
    })();

    return () => {
      alive = false;
    };
  }, [returned, router]);

  async function openPortal() {
    if (portal.kind === 'busy') return;
    setPortal({kind: 'busy'});
    const r = await callJson<{url?: string}>('/api/billing/portal', {method: 'POST'});
    if (r.ok && safeRedirectUrl(r.body.url)) {
      window.location.assign(r.body.url);
      return;
    }
    if (r.status === 404) setPortal({kind: 'hidden'});
    else setPortal({kind: 'error', text: billingFailure(r.ok ? 500 : r.status, 'Your membership was not changed.')});
  }

  let content: ReactNode;
  if (load.kind === 'loading') {
    content = (
      <p className="font-label text-[8px] tracking-[0.3em] uppercase" style={{color: 'rgba(201,169,97,0.4)'}} role="status">
        Checking with the front desk…
      </p>
    );
  } else if (load.kind === 'error') {
    content = (
      <p role="alert" className="font-body text-xs italic" style={{color: '#FF4D7D'}}>
        {load.text}
      </p>
    );
  } else {
    const {vip, subscription: sub, configured, priceDisplay} = load.status;
    const until = formatDate(vip.expiresAt);
    const periodEnd = formatDate(sub?.currentPeriodEnd);
    const hasSub = Boolean(sub && sub.status !== 'canceled');
    const showPortal = (hasSub || vip.source === 'subscription') && portal.kind !== 'hidden';

    content = (
      <>
        {sub?.status === 'past_due' && (
          <Banner tone="warn">
            Your last membership payment didn&apos;t go through. Update your card under Manage billing — VIP stays open for a
            short grace period while Stripe retries.
          </Banner>
        )}
        {sub?.cancelAtPeriodEnd && periodEnd && (
          <Banner tone="info">Your membership is cancelled and won&apos;t renew. VIP stays open until {periodEnd}.</Banner>
        )}

        <div className="mb-4">
          <Row label="Status">
            {vip.active ? (
              <span style={{color: '#E8C87A'}}>◆ VIP</span>
            ) : (
              <span style={{color: 'rgba(244,232,208,0.55)'}}>Not a member</span>
            )}
          </Row>
          {vip.active && vip.source && <Row label="Through">{SOURCE_LABEL[vip.source]}</Row>}
          {hasSub && periodEnd && (
            <Row label={sub?.cancelAtPeriodEnd ? 'Ends' : sub?.status === 'past_due' ? 'Payment due' : 'Renews'}>{periodEnd}</Row>
          )}
          {vip.active && vip.source !== 'subscription' && <Row label="Valid until">{until ?? 'No end date'}</Row>}
        </div>

        <div className="flex flex-wrap gap-3">
          {showPortal && (
            <button type="button" onClick={openPortal} disabled={portal.kind === 'busy'} className={btnClass} style={btnStyle}>
              {portal.kind === 'busy' ? 'Opening…' : 'Manage billing'}
            </button>
          )}
          {!vip.active && !hasSub && (
            <Link href="/subscribe" className={btnClass} style={btnStyle}>
              {configured ? `Become a member · ${priceDisplay ?? '$24.99 / month'}` : 'Membership opens soon'}
            </Link>
          )}
          {vip.active && vip.source !== 'subscription' && vip.expiresAt && configured && !hasSub && (
            <Link href="/subscribe" className={btnClass} style={btnStyle}>
              Keep access after {until ?? 'expiry'}
            </Link>
          )}
        </div>
        {showPortal && (
          <p className="font-body text-[11px] italic mt-3" style={{color: 'rgba(244,232,208,0.35)'}}>
            Change your card, see invoices or cancel on Stripe&apos;s secure billing page.
          </p>
        )}
        {portal.kind === 'error' && (
          <p role="alert" className="font-body text-xs italic mt-3" style={{color: '#FF4D7D'}}>
            {portal.text}
          </p>
        )}
      </>
    );
  }

  return (
    <section className="w-full px-5 py-5 mb-6" style={{border: '1px solid rgba(201,169,97,0.1)', background: 'rgba(10,4,6,0.6)'}}>
      <h2 className="font-label text-[9px] tracking-[0.35em] uppercase mb-3" style={{color: 'rgba(201,169,97,0.5)'}}>
        Membership
      </h2>
      {returned === 'cancelled' && <Banner tone="info">Checkout was cancelled. Nothing was charged.</Banner>}
      {confirm.kind === 'waiting' && (
        <Banner tone="info">Payment received — your VIP access updates within a minute. Waiting for the house to confirm…</Banner>
      )}
      {confirm.kind === 'confirmed' && <Banner tone="ok">Welcome to VIP. Your membership is active.</Banner>}
      {confirm.kind === 'slow' && (
        <Banner tone="warn">
          Stripe has sent you back, but the house hasn&apos;t confirmed your membership yet. Refresh this page in a minute — if VIP
          still isn&apos;t showing, contact the front desk.
        </Banner>
      )}
      {content}
    </section>
  );
}
