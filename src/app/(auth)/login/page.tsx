'use client';

import {useActionState} from 'react';
import Link from 'next/link';
import {AHDisplay, AHEyebrow, AHRoom, AHTopBar} from '@/components/after-hours';
import {signIn} from './actions';

const initialState = {error: null as string | null};

/** Member sign-in (After Hours). Same server action and fields as before. */
export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <AHRoom>
      <AHTopBar right={<Link href="/signup" className="ah-pill ah-pill-ghost" style={{minHeight: 38, fontSize: 13}}>Request an invitation</Link>} />

      <div style={{maxWidth: 400, margin: '0 auto', paddingTop: 18}}>
        <AHEyebrow>Members · The door</AHEyebrow>
        <AHDisplay size="l" style={{marginTop: 8}}>Welcome back.</AHDisplay>
        <p style={{margin: '12px 0 26px', fontSize: 15, lineHeight: 1.5, color: 'var(--ah-mute)'}}>
          Sign in to the house. Your table, your card and your concierge are where you left them.
        </p>

        <div className="ah-card ah-card-glass" style={{padding: 22}}>
          <form action={formAction} style={{display: 'grid', gap: 18}}>
            <div style={{display: 'grid', gap: 8}}>
              <label htmlFor="email" className="ah-eyebrow">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="ah-input" />
            </div>

            <div style={{display: 'grid', gap: 8}}>
              <label htmlFor="password" className="ah-eyebrow">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="ah-input" />
            </div>

            {state.error && (
              <p role="alert" style={{margin: 0, fontSize: 14, color: '#ff8aa0', textAlign: 'center'}}>{state.error}</p>
            )}

            <button type="submit" disabled={pending} className="ah-pill ah-pill-solid ah-pill-block" style={{minHeight: 50, marginTop: 4}}>
              {pending ? 'Opening the door…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{margin: '22px 0 0', textAlign: 'center', fontSize: 14, color: 'var(--ah-mute)'}}>
          Not on the list?{' '}
          <Link href="/signup" style={{color: 'var(--ah-rose)', textDecoration: 'none', display: 'inline-block', padding: '12px 0'}}>
            Request an invitation
          </Link>
        </p>
      </div>
    </AHRoom>
  );
}
