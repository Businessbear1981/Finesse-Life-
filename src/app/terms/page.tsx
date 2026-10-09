import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of membership — Finesse',
};

// Placeholder. The full terms are not written yet; this page says so plainly
// rather than presenting invented legal text.
export default function TermsPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[360px]"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(201,169,97,0.10) 0%, rgba(74,25,34,0.06) 45%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[520px] px-6 py-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
            <div
              className="w-2 h-2 rotate-45 border"
              style={{borderColor: 'rgba(201,169,97,0.45)'}}
            />
            <div className="w-10 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
          </div>
          <h1
            className="font-display italic tracking-[0.12em] text-3xl"
            style={{
              color: '#E8C87A',
              textShadow: '0 0 30px rgba(201,169,97,0.2), 0 2px 4px rgba(0,0,0,0.9)',
            }}
          >
            Terms of membership
          </h1>
          <p
            className="font-label text-[8px] tracking-[0.5em] uppercase mt-3"
            style={{color: 'rgba(201,169,97,0.4)'}}
          >
            Finesse · Being finalised
          </p>
        </div>

        <div
          className="border p-7 space-y-4"
          style={{
            borderColor: 'rgba(201,169,97,0.12)',
            background: 'rgba(10,4,6,0.8)',
            boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)',
          }}
        >
          <p className="font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.7)'}}>
            The full terms of membership are still being finalised. They are not published
            yet, and this page will carry them once they are.
          </p>
          <p className="font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.55)'}}>
            Membership is currently by invitation, and no paid membership is on sale. Nothing
            on this page is a binding agreement.
          </p>
          <p className="font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.55)'}}>
            Questions about membership or these terms? Contact the host who invited you.
          </p>
        </div>

        <div className="flex justify-center gap-6 mt-8">
          <Link
            href="/signup"
            className="font-label text-[9px] tracking-[0.3em] uppercase"
            style={{color: 'rgba(201,169,97,0.55)'}}
          >
            ← Back to sign up
          </Link>
          <Link
            href="/lobby"
            className="font-label text-[9px] tracking-[0.3em] uppercase"
            style={{color: 'rgba(201,169,97,0.35)'}}
          >
            Lobby
          </Link>
        </div>
      </div>
    </div>
  );
}
