'use client';

import {useState, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';

const DEMO_CODES: Record<string, {email: string; password: string}> = {
  FINESSE2026: {email: 'demo@finesselife.vip', password: 'Demo2026!'},
  INVESTOR: {email: 'demo@finesselife.vip', password: 'Demo2026!'},
  ARDENEDGE: {email: 'demo@finesselife.vip', password: 'Demo2026!'},
  PREVIEW: {email: 'demo@finesselife.vip', password: 'Demo2026!'},
};

export default function DemoPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    const creds = DEMO_CODES[trimmed];

    if (!creds) {
      setError('Invalid access code.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
      return;
    }

    setError('');
    setLoading(true);

    const supabase = createClient();
    const {error: authError} = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.password,
    });

    if (authError) {
      setError('Invalid access code.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      return;
    }

    router.push('/lobby');
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
      {/* Chandelier glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[360px]"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(201,169,97,0.10) 0%, rgba(74,25,34,0.06) 45%, transparent 70%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[40%]"
        style={{
          background: 'linear-gradient(to top, rgba(74,25,34,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] px-6 py-10">
        {/* Chandelier ornament */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-px h-8"
            style={{
              background: 'linear-gradient(to bottom, rgba(201,169,97,0.5), rgba(201,169,97,0.15))',
            }}
          />
          <div
            className="w-3 h-3 rotate-45 border mb-1"
            style={{
              borderColor: 'rgba(201,169,97,0.45)',
              boxShadow: '0 0 12px rgba(201,169,97,0.2)',
            }}
          />
          <div
            className="w-10 h-2 border-x border-b"
            style={{
              borderColor: 'rgba(201,169,97,0.22)',
              background: 'rgba(201,169,97,0.04)',
            }}
          />
          <div
            className="w-16 h-2 border-x border-b"
            style={{
              borderColor: 'rgba(201,169,97,0.12)',
              background: 'rgba(201,169,97,0.02)',
            }}
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="font-display italic tracking-[0.22em] text-3xl"
            style={{
              color: '#E8C87A',
              textShadow: '0 0 30px rgba(201,169,97,0.2), 0 2px 4px rgba(0,0,0,0.9)',
            }}
          >
            FINESSE
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2 mb-4">
            <div className="w-12 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
            <span
              className="font-label text-[7px] tracking-[0.5em] uppercase"
              style={{color: 'rgba(201,169,97,0.35)'}}
            >
              by invitation only
            </span>
            <div className="w-12 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
          </div>
          <p
            className="font-body text-sm leading-relaxed"
            style={{color: 'rgba(244,232,208,0.4)'}}
          >
            Private lifestyle intelligence.
            <br />
            Curated experiences. Zero noise.
          </p>
        </div>

        {/* Form card */}
        <div
          className="border p-7"
          style={{
            borderColor: 'rgba(201,169,97,0.12)',
            background: 'rgba(10,4,6,0.8)',
            boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="accessCode"
                className="font-label text-[9px] tracking-[0.3em] uppercase"
                style={{color: 'rgba(201,169,97,0.45)'}}
              >
                Access Code
              </label>
              <input
                ref={inputRef}
                id="accessCode"
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
                className="w-full px-4 py-3 border bg-transparent font-label text-sm tracking-[0.25em] uppercase focus:outline-none transition-colors duration-200"
                style={{
                  borderColor: error ? 'rgba(220,80,80,0.5)' : 'rgba(201,169,97,0.15)',
                  color: error ? 'rgba(220,80,80,0.9)' : '#F4E8D0',
                  caretColor: '#C9A961',
                  animation: shake ? 'shake 0.4s ease-in-out' : 'none',
                }}
                onFocus={(e) => {
                  if (!error)
                    e.currentTarget.style.borderColor = 'rgba(201,169,97,0.45)';
                }}
                onBlur={(e) => {
                  if (!error)
                    e.currentTarget.style.borderColor = 'rgba(201,169,97,0.15)';
                }}
                placeholder="——————"
              />
              {error && (
                <p
                  className="font-body text-xs italic mt-0.5"
                  style={{color: 'rgba(220,80,80,0.85)'}}
                >
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase transition-all duration-300 disabled:opacity-40"
              style={{
                borderColor: 'rgba(201,169,97,0.35)',
                color: '#E8C87A',
                background: 'rgba(201,169,97,0.04)',
                textShadow: '0 0 8px rgba(201,169,97,0.3)',
              }}
              onMouseEnter={(e) => {
                if (!loading && code.trim()) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(201,169,97,0.10)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    'rgba(201,169,97,0.55)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(201,169,97,0.04)';
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(201,169,97,0.35)';
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brass/60 animate-pulse" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-brass/60 animate-pulse"
                    style={{animationDelay: '150ms'}}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-brass/60 animate-pulse"
                    style={{animationDelay: '300ms'}}
                  />
                </span>
              ) : (
                'Enter'
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <div className="flex flex-col items-center mt-7 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-px" style={{background: 'rgba(201,169,97,0.1)'}} />
            <div className="w-1 h-1 rotate-45" style={{background: 'rgba(201,169,97,0.15)'}} />
            <div className="w-6 h-px" style={{background: 'rgba(201,169,97,0.1)'}} />
          </div>
          <p
            className="font-body text-xs text-center"
            style={{color: 'rgba(244,232,208,0.25)'}}
          >
            Requesting access? Contact your host.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes chandelier-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
