'use client';

import {useActionState, useState} from 'react';
import Link from 'next/link';
import {AHDisplay, AHEyebrow, AHRoom, AHTopBar} from '@/components/after-hours';
import {signUp} from './actions';

const initialState = {error: null as string | null};

/** A 44px-tall toggle row that reads as a checkbox (state is posted via the hidden inputs below). */
function Consent({checked, onToggle, children}: {checked: boolean; onToggle: () => void; children: React.ReactNode}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="ah-focus"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        minHeight: 44,
        padding: '0 2px',
        border: 0,
        borderRadius: 12,
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      <span
        aria-hidden
        style={{
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          width: 22,
          height: 22,
          borderRadius: 7,
          border: `1px solid ${checked ? 'transparent' : 'var(--ah-line-2)'}`,
          background: checked ? '#fff' : 'rgba(0,0,0,0.35)',
          transition: 'background .2s, border-color .2s',
        }}
      >
        {checked && (
          <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span style={{fontSize: 14, lineHeight: 1.4, color: checked ? 'var(--ah-text)' : 'var(--ah-mute)', transition: 'color .2s'}}>
        {children}
      </span>
    </button>
  );
}

/** Request an invitation (After Hours). Same server action, fields and redirects as before. */
export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <AHRoom>
      <AHTopBar right={<Link href="/login" className="ah-pill ah-pill-ghost" style={{minHeight: 38, fontSize: 13}}>Sign in</Link>} />

      <div style={{maxWidth: 400, margin: '0 auto', paddingTop: 18}}>
        <AHEyebrow>By invitation · The list</AHEyebrow>
        <AHDisplay size="l" style={{marginTop: 8}}>Request an invitation.</AHDisplay>
        <p style={{margin: '12px 0 26px', fontSize: 15, lineHeight: 1.5, color: 'var(--ah-mute)'}}>
          Put your name down for the house. A few details now; your host takes it from there.
        </p>

        <div className="ah-card ah-card-glass" style={{padding: 22}}>
          <form action={formAction} style={{display: 'grid', gap: 18}}>
            <div style={{display: 'grid', gap: 8}}>
              <label htmlFor="email" className="ah-eyebrow">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="ah-input" />
            </div>

            <div style={{display: 'grid', gap: 8}}>
              <label htmlFor="password" className="ah-eyebrow">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required className="ah-input" aria-describedby="password-hint" />
              <span id="password-hint" style={{fontSize: 12, color: 'var(--ah-faint)'}}>At least 8 characters.</span>
            </div>

            <div style={{display: 'grid', gap: 8}}>
              <label htmlFor="confirmPassword" className="ah-eyebrow">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="ah-input" />
            </div>

            <input type="hidden" name="ageConfirmed" value={ageConfirmed ? 'true' : ''} />
            <input type="hidden" name="termsAccepted" value={termsAccepted ? 'true' : ''} />
            <div style={{display: 'grid', gap: 2, paddingTop: 8, borderTop: '1px solid var(--ah-line)'}}>
              <Consent checked={ageConfirmed} onToggle={() => setAgeConfirmed((v) => !v)}>
                I confirm I am 18 or older
              </Consent>
              <Consent checked={termsAccepted} onToggle={() => setTermsAccepted((v) => !v)}>
                I agree to the terms of membership
              </Consent>
              <Link
                href="/terms"
                className="ah-focus"
                style={{justifySelf: 'start', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginLeft: 36, fontSize: 13, color: 'var(--ah-rose)', textDecoration: 'none', marginTop: -10}}
              >
                Read the terms of membership
              </Link>
            </div>

            {state.error && (
              <p role="alert" style={{margin: 0, fontSize: 14, color: '#ff8aa0', textAlign: 'center'}}>{state.error}</p>
            )}

            <button type="submit" disabled={pending} className="ah-pill ah-pill-solid ah-pill-block" style={{minHeight: 50, marginTop: 4}}>
              {pending ? 'Adding you to the list…' : 'Request my invitation'}
            </button>
          </form>
        </div>

        <p style={{margin: '22px 0 0', textAlign: 'center', fontSize: 14, color: 'var(--ah-mute)'}}>
          Already a member?{' '}
          <Link href="/login" style={{color: 'var(--ah-rose)', textDecoration: 'none', display: 'inline-block', padding: '12px 0'}}>
            Sign in
          </Link>
        </p>
      </div>
    </AHRoom>
  );
}
