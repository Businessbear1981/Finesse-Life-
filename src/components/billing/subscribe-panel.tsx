'use client';

import {useCallback, useEffect, useState, type ReactNode} from 'react';
import Link from 'next/link';
import {
  billingFailure,
  callJson,
  formatDate,
  getBillingStatus,
  safeRedirectUrl,
  type BillingStatus,
} from './billing-api';

type Load =
  | {kind: 'loading'}
  | {kind: 'signed_out'}
  | {kind: 'error'; text: string}
  | {kind: 'ready'; status: BillingStatus};

type Checkout = {kind: 'idle'} | {kind: 'busy'} | {kind: 'redirecting'} | {kind: 'already'} | {kind: 'closed'} | {kind: 'error'; text: string};

const SOURCE_LABEL = {code: 'an invitation code', staff: 'the house', subscription: 'your membership'} as const;

function P({children, dim}: {children: ReactNode; dim?: boolean}) {
  return (
    <p className="font-body text-sm leading-relaxed" style={{color: dim ? 'rgba(244,232,208,0.55)' : 'rgba(244,232,208,0.7)'}}>
      {children}
    </p>
  );
}

function GhostLink({href, children}: {href: string; children: ReactNode}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-6 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
      style={{border: '1px solid rgba(201,169,97,0.35)', color: '#C9A961', background: 'rgba(201,169,97,0.04)'}}
    >
      <span>{children}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}

function Notice({tone, children}: {tone: 'info' | 'warn' | 'error'; children: ReactNode}) {
  const color = tone === 'error' ? '#FF4D7D' : tone === 'warn' ? '#FFA96B' : '#E8C87A';
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className="font-body text-xs italic px-3 py-2"
      style={{color, border: `1px solid ${color}33`, background: `${color}0D`}}
    >
      {children}
    </p>
  );
}

function InvitationOnly() {
  return (
    <>
      <p className="font-display italic text-xl" style={{color: '#E8C87A'}}>
        Membership opens soon
      </p>
      <P>VIP is by invitation code for now. The front desk can&apos;t take payment yet, and nothing on this page will charge you.</P>
      <P dim>
        If a host has given you a code, enter it under &ldquo;I Have a Code&rdquo; on your profile and the inner rooms open
        immediately. No code yet? Ask the host who invited you — we&apos;ll announce here when membership opens.
      </P>
      <div className="pt-2 text-center">
        <GhostLink href="/profile">Enter a code on your profile</GhostLink>
      </div>
    </>
  );
}

export function SubscribePanel({returned}: {returned: 'cancelled' | null}) {
  const [load, setLoad] = useState<Load>({kind: 'loading'});
  const [checkout, setCheckout] = useState<Checkout>({kind: 'idle'});

  const refresh = useCallback(async () => {
    const r = await getBillingStatus();
    if (r.ok) setLoad({kind: 'ready', status: r.body});
    else if (r.status === 401) setLoad({kind: 'signed_out'});
    else setLoad({kind: 'error', text: billingFailure(r.status, 'Nothing was charged.')});
  }, []);

  useEffect(() => {
    let alive = true;
    void getBillingStatus().then((r) => {
      if (!alive) return;
      if (r.ok) setLoad({kind: 'ready', status: r.body});
      else if (r.status === 401) setLoad({kind: 'signed_out'});
      else setLoad({kind: 'error', text: billingFailure(r.status, 'Nothing was charged.')});
    });
    return () => {
      alive = false;
    };
  }, []);

  async function startCheckout() {
    if (checkout.kind === 'busy' || checkout.kind === 'redirecting') return;
    setCheckout({kind: 'busy'});
    const r = await callJson<{url?: string}>('/api/billing/checkout', {method: 'POST', json: {plan: 'vip_monthly'}});
    if (r.ok && safeRedirectUrl(r.body.url)) {
      setCheckout({kind: 'redirecting'});
      window.location.assign(r.body.url);
      return;
    }
    if (r.status === 409 && r.body.error === 'already_subscribed') setCheckout({kind: 'already'});
    else if (r.status === 503) setCheckout({kind: 'closed'});
    else if (r.status === 401) setLoad({kind: 'signed_out'});
    else setCheckout({kind: 'error', text: billingFailure(r.ok ? 500 : r.status, 'Nothing was charged.')});
  }

  let body: ReactNode;
  if (load.kind === 'loading') {
    body = (
      <p className="font-label text-[9px] tracking-[0.3em] uppercase text-center py-6" style={{color: 'rgba(201,169,97,0.45)'}} role="status">
        Checking with the front desk…
      </p>
    );
  } else if (load.kind === 'signed_out') {
    body = (
      <>
        <P>Sign in to become a member. Membership is tied to your Finesse account.</P>
        <div className="pt-2 text-center">
          <GhostLink href="/login">Sign in</GhostLink>
        </div>
      </>
    );
  } else if (load.kind === 'error') {
    body = (
      <>
        <Notice tone="error">{load.text}</Notice>
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => {
              setLoad({kind: 'loading'});
              void refresh();
            }}
            className="px-6 py-3 font-label text-[9px] tracking-[0.3em] uppercase"
            style={{border: '1px solid rgba(201,169,97,0.25)', color: 'rgba(201,169,97,0.7)'}}
          >
            Try again
          </button>
        </div>
      </>
    );
  } else {
    const st = load.status;
    const vip = st.vip;
    const price = st.priceDisplay ?? '$24.99 / month';
    const until = formatDate(vip.expiresAt);
    const periodEnd = formatDate(st.subscription?.currentPeriodEnd);
    const subscribed = vip.active && vip.source === 'subscription';
    const lifetime = vip.active && vip.source !== 'subscription' && !vip.expiresAt;
    const closed = !st.configured || checkout.kind === 'closed';

    const subscribeButton = (
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={startCheckout}
          disabled={checkout.kind === 'busy' || checkout.kind === 'redirecting'}
          className="inline-flex items-center gap-2 px-7 py-3.5 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
          style={{background: 'linear-gradient(135deg, #C9A961, #E8C87A)', color: '#0A0406', boxShadow: '0 0 16px rgba(201,169,97,0.25)'}}
        >
          {checkout.kind === 'busy'
            ? 'Opening checkout…'
            : checkout.kind === 'redirecting'
              ? 'Taking you to Stripe…'
              : `Become a member · ${price}`}
        </button>
        <p className="font-body text-[11px] italic mt-3" style={{color: 'rgba(244,232,208,0.35)'}}>
          Secure checkout by Stripe. Cancel any time from your account.
        </p>
      </div>
    );

    if (subscribed) {
      body = (
        <>
          <P>
            You&apos;re a member.{' '}
            {st.subscription?.cancelAtPeriodEnd && periodEnd
              ? `Your membership ends ${periodEnd} and won't renew.`
              : periodEnd && st.subscription?.status !== 'past_due'
                ? `It renews ${periodEnd}.`
                : ''}
          </P>
          {st.subscription?.status === 'past_due' && (
            <Notice tone="warn">Your last payment didn&apos;t go through. Update your card from your account to keep VIP access.</Notice>
          )}
          <div className="pt-2 text-center">
            <GhostLink href="/account">Manage your membership</GhostLink>
          </div>
        </>
      );
    } else if (closed && !vip.active) {
      body = <InvitationOnly />;
    } else if (vip.active) {
      body = (
        <>
          <P>
            You already hold VIP access through {SOURCE_LABEL[vip.source ?? 'staff']}
            {lifetime ? ', with no end date.' : until ? `, valid until ${until}.` : '.'}
          </P>
          {lifetime ? (
            <P dim>There&apos;s nothing to buy — enjoy the inner rooms.</P>
          ) : closed ? (
            <P dim>Paid membership opens soon. We&apos;ll announce here when you can subscribe to keep access after that date.</P>
          ) : (
            <>
              <P dim>
                Want to keep access after that? Subscribe now and your membership carries on when the code runs out. You&apos;re
                charged from today.
              </P>
              {subscribeButton}
            </>
          )}
        </>
      );
    } else {
      body = (
        <>
          <p className="font-display italic text-xl" style={{color: '#E8C87A'}}>
            {price}
          </p>
          <P>
            VIP opens the inner rooms: your Backstage profile, priority access, Scale group-buy privileges and the private lift.
          </P>
          <P dim>Billed monthly. Cancel any time and keep access until the end of the period you&apos;ve paid for.</P>
          {subscribeButton}
          <p className="text-center font-body text-[11px] italic" style={{color: 'rgba(244,232,208,0.35)'}}>
            Have an invitation code?{' '}
            <Link href="/profile" className="underline" style={{color: 'rgba(201,169,97,0.6)'}}>
              Enter it on your profile
            </Link>
            .
          </p>
        </>
      );
    }

    if (checkout.kind === 'already') {
      body = (
        <>
          {body}
          <Notice tone="info">
            You already have a membership.{' '}
            <Link href="/account" className="underline">
              Manage it from your account
            </Link>
            .
          </Notice>
        </>
      );
    } else if (checkout.kind === 'error') {
      body = (
        <>
          {body}
          <Notice tone="error">{checkout.text}</Notice>
        </>
      );
    }
  }

  return (
    <div className="space-y-4">
      {returned === 'cancelled' && <Notice tone="info">Checkout was cancelled. Nothing was charged.</Notice>}
      {body}
    </div>
  );
}
