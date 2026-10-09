import Link from 'next/link';

// Paid membership is not on sale yet (no checkout is wired). This page says so
// plainly and points members to the invitation-code field on their profile.
export default function SubscribePage() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{background: '#060203'}}>
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(201,169,97,0.1) 0%, rgba(74,25,34,0.06) 40%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-xl mx-auto px-5 pt-12 pb-24">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
            <div
              className="w-2 h-2 rotate-45 border"
              style={{borderColor: 'rgba(201,169,97,0.5)', boxShadow: '0 0 8px rgba(201,169,97,0.3)'}}
            />
            <div className="w-8 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
          </div>
          <h1
            className="font-display italic tracking-[0.12em] text-3xl"
            style={{color: '#E8C87A', textShadow: '0 0 30px rgba(201,169,97,0.2)'}}
          >
            VIP membership
          </h1>
          <p
            className="font-label text-[8px] tracking-[0.5em] uppercase mt-3"
            style={{color: 'rgba(201,169,97,0.4)'}}
          >
            By invitation, for now
          </p>
        </div>

        <div
          className="p-7 space-y-4"
          style={{
            border: '1px solid rgba(201,169,97,0.14)',
            background: 'rgba(10,4,6,0.8)',
            boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)',
          }}
        >
          <p className="font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.7)'}}>
            Paid membership isn&apos;t on sale yet. The front desk can&apos;t take payment today, and
            nothing on this page will charge you.
          </p>
          <p className="font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.55)'}}>
            For now, VIP access is by invitation code. If a host has given you one, enter it under
            &ldquo;I Have a Code&rdquo; on your profile and the inner rooms open immediately.
          </p>
          <p className="font-body text-sm leading-relaxed" style={{color: 'rgba(244,232,208,0.55)'}}>
            No code yet? Ask the host who invited you. We&apos;ll announce here when membership opens.
          </p>

          <div className="pt-2 text-center">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-6 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
              style={{border: '1px solid rgba(201,169,97,0.35)', color: '#C9A961', background: 'rgba(201,169,97,0.04)'}}
            >
              <span>Enter a code on your profile</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
