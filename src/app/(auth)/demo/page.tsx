'use client';

import {useActionState, useRef, useState} from 'react';
import Link from 'next/link';
import {AHDisplay, AHEyebrow, AHRoom, AHTopBar} from '@/components/after-hours';
import {enterDemo} from './actions';

const initialState = {error: null as string | null};

/** Demo entry by access code (After Hours). Same server action and behaviour as before. */
export default function DemoPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sign-in happens server-side; the demo account never reaches this bundle.
  const [, formAction, loading] = useActionState(
    async (prev: {error: string | null}, formData: FormData) => {
      const result = await enterDemo(prev, formData);
      if (result.error) {
        setError(result.error);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        inputRef.current?.focus();
      }
      return result;
    },
    initialState,
  );

  return (
    <AHRoom>
      <AHTopBar right={<Link href="/login" className="ah-pill ah-pill-ghost" style={{minHeight: 38, fontSize: 13}}>Member sign in</Link>} />

      <div style={{maxWidth: 400, margin: '0 auto', paddingTop: 18}}>
        <AHEyebrow>Demo · By invitation only</AHEyebrow>
        <AHDisplay size="l" style={{marginTop: 8}}>A look inside.</AHDisplay>
        <p style={{margin: '12px 0 26px', fontSize: 15, lineHeight: 1.5, color: 'var(--ah-mute)'}}>
          Private lifestyle intelligence. Curated experiences. Zero noise. Enter the access code your host gave you.
        </p>

        <div className="ah-card ah-card-glass" style={{padding: 22}}>
          <form action={formAction} style={{display: 'grid', gap: 18}}>
            <div style={{display: 'grid', gap: 8}}>
              <label htmlFor="accessCode" className="ah-eyebrow">Access code</label>
              <input
                ref={inputRef}
                id="accessCode"
                name="code"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError('');
                }}
                className={`ah-input ah-num${shake ? ' demo-shake' : ''}`}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'accessCode-error' : undefined}
                style={{
                  minHeight: 54,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.32em',
                  fontSize: 17,
                  fontWeight: 600,
                  ...(error ? {borderColor: 'rgba(255,138,160,0.6)', color: '#ff8aa0'} : null),
                }}
                placeholder="——————"
              />
              {error && (
                <p id="accessCode-error" role="alert" style={{margin: '2px 0 0', fontSize: 14, color: '#ff8aa0', textAlign: 'center'}}>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="ah-pill ah-pill-solid ah-pill-block"
              style={{minHeight: 50, marginTop: 4}}
            >
              {loading ? 'Checking the list…' : 'Enter'}
            </button>
          </form>
        </div>

        <p style={{margin: '22px 0 0', textAlign: 'center', fontSize: 14, color: 'var(--ah-mute)'}}>
          Requesting access? Contact your host.
        </p>
      </div>

      <style>{`
        @keyframes demo-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
        .demo-shake { animation: demo-shake 0.4s ease-in-out; }
        @media (prefers-reduced-motion: reduce) { .demo-shake { animation: none; } }
      `}</style>
    </AHRoom>
  );
}
