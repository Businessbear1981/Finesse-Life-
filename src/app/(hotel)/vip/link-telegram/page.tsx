import {redirect} from 'next/navigation';
import Link from 'next/link';
import {getVipEntitlement} from '@/lib/vip-lift';
import {TelegramLinkClient} from './telegram-link-client';

export default async function LinkTelegramPage() {
  // Middleware gates /vip/*; check again server-side (it lets a profile read error through).
  const ent = await getVipEntitlement();
  if (ent.state === 'signed_out') redirect('/login');
  if (ent.state !== 'entitled') redirect('/profile?upgrade=true');

  return (
    <div className="min-h-screen relative overflow-hidden" style={{background: '#060203'}}>
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(201,169,97,0.1) 0%, rgba(74,25,34,0.06) 40%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-xl mx-auto px-5 pt-10 pb-24">
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
            Connect Telegram
          </h1>
          <p className="font-body text-sm italic mt-3" style={{color: 'rgba(244,232,208,0.4)'}}>
            Inner-room notifications, delivered privately.
          </p>
        </div>

        <TelegramLinkClient />

        <div className="text-center mt-8">
          <Link
            href="/vip"
            className="font-label text-[9px] tracking-[0.3em] uppercase"
            style={{color: 'rgba(201,169,97,0.5)'}}
          >
            ← Back to the VIP room
          </Link>
        </div>
      </div>
    </div>
  );
}
