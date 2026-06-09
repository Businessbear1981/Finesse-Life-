'use client';

import {useActionState} from 'react';
import Link from 'next/link';
import {signUp} from './actions';

const initialState = {error: null as string | null};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

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
          background:
            'linear-gradient(to top, rgba(74,25,34,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[380px] px-6 py-10">
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

        {/* Hotel nameplate */}
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
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="w-8 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
            <span
              className="font-label text-[7px] tracking-[0.5em] uppercase"
              style={{color: 'rgba(201,169,97,0.22)'}}
            >
              request membership
            </span>
            <div className="w-8 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
          </div>
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
          <form action={formAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="font-label text-[9px] tracking-[0.3em] uppercase"
                style={{color: 'rgba(201,169,97,0.45)'}}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border bg-transparent font-body text-sm focus:outline-none transition-colors duration-200"
                style={{
                  borderColor: 'rgba(201,169,97,0.15)',
                  color: '#F4E8D0',
                  caretColor: '#C9A961',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.45)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.15)')
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="font-label text-[9px] tracking-[0.3em] uppercase"
                style={{color: 'rgba(201,169,97,0.45)'}}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 border bg-transparent font-body text-sm focus:outline-none transition-colors duration-200"
                style={{
                  borderColor: 'rgba(201,169,97,0.15)',
                  color: '#F4E8D0',
                  caretColor: '#C9A961',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.45)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.15)')
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirmPassword"
                className="font-label text-[9px] tracking-[0.3em] uppercase"
                style={{color: 'rgba(201,169,97,0.45)'}}
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 border bg-transparent font-body text-sm focus:outline-none transition-colors duration-200"
                style={{
                  borderColor: 'rgba(201,169,97,0.15)',
                  color: '#F4E8D0',
                  caretColor: '#C9A961',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.45)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,169,97,0.15)')
                }
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    name="ageConfirmed"
                    value="true"
                    required
                    className="sr-only peer"
                  />
                  <div
                    className="w-4 h-4 border peer-checked:border-brass/60 transition-colors duration-200 flex items-center justify-center"
                    style={{borderColor: 'rgba(201,169,97,0.25)'}}
                  >
                    <svg
                      className="w-2.5 h-2.5 hidden peer-checked:block"
                      viewBox="0 0 10 8"
                      fill="none"
                    >
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="#C9A961"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <span
                  className="font-body text-xs leading-relaxed"
                  style={{color: 'rgba(244,232,208,0.45)'}}
                >
                  I confirm I am 18 or older
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    value="true"
                    required
                    className="sr-only peer"
                  />
                  <div
                    className="w-4 h-4 border peer-checked:border-brass/60 transition-colors duration-200 flex items-center justify-center"
                    style={{borderColor: 'rgba(201,169,97,0.25)'}}
                  >
                    <svg
                      className="w-2.5 h-2.5 hidden peer-checked:block"
                      viewBox="0 0 10 8"
                      fill="none"
                    >
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="#C9A961"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <span
                  className="font-body text-xs leading-relaxed"
                  style={{color: 'rgba(244,232,208,0.45)'}}
                >
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    className="underline underline-offset-2"
                    style={{color: 'rgba(201,169,97,0.5)'}}
                    tabIndex={-1}
                  >
                    terms of membership
                  </Link>
                </span>
              </label>
            </div>

            {state.error && (
              <p
                className="font-body text-sm italic text-center"
                style={{color: 'rgba(255,77,125,0.85)'}}
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3.5 border font-label text-[10px] tracking-[0.4em] uppercase transition-all duration-300 disabled:opacity-40"
              style={{
                borderColor: 'rgba(201,169,97,0.35)',
                color: '#E8C87A',
                background: 'rgba(201,169,97,0.04)',
                textShadow: '0 0 8px rgba(201,169,97,0.3)',
              }}
              onMouseEnter={(e) => {
                if (!pending) {
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
              {pending ? (
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
                'Create Account'
              )}
            </button>
          </form>
        </div>

        {/* Bottom link */}
        <div className="flex flex-col items-center mt-7 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-px" style={{background: 'rgba(201,169,97,0.1)'}} />
            <div className="w-1 h-1 rotate-45" style={{background: 'rgba(201,169,97,0.15)'}} />
            <div className="w-6 h-px" style={{background: 'rgba(201,169,97,0.1)'}} />
          </div>
          <p className="font-body text-sm" style={{color: 'rgba(244,232,208,0.3)'}}>
            Already a member?{' '}
            <Link
              href="/login"
              className="transition-colors duration-200"
              style={{color: 'rgba(201,169,97,0.55)'}}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  'rgba(201,169,97,0.85)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  'rgba(201,169,97,0.55)')
              }
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes chandelier-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
