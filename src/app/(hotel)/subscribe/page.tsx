import {SubscribePanel} from '@/components/billing/subscribe-panel';

// VIP membership. Asks the server (GET /api/billing/status) whether paid
// membership is on sale; if Stripe isn't configured it says so plainly and points
// members to the invitation-code field on their profile. Nothing here grants VIP —
// only the Stripe webhook does (docs/PAYMENTS.md).
export default async function SubscribePage({searchParams}: {searchParams: Promise<{[key: string]: string | string[] | undefined}>}) {
  const {billing} = await searchParams;
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
            The inner rooms
          </p>
        </div>

        <div
          className="p-7"
          style={{
            border: '1px solid rgba(201,169,97,0.14)',
            background: 'rgba(10,4,6,0.8)',
            boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)',
          }}
        >
          <SubscribePanel returned={billing === 'cancelled' ? 'cancelled' : null} />
        </div>
      </div>
    </div>
  );
}
