import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {FinesseLayout} from '@/components/finesse-layout';
import {getVipEntitlement} from '@/lib/vip-lift';
import {AccountActions} from './account-actions';

export const metadata: Metadata = {
  title: 'Account · Finesse',
};

// /account — signed-in only. Data export, lift PIN reset (VIP) and account deletion.
export default async function AccountPage() {
  const ent = await getVipEntitlement();
  if (ent.state === 'signed_out') redirect('/login');

  return (
    <FinesseLayout>
      <div className="min-h-screen relative overflow-hidden" style={{background: '#0A0406'}}>
        {/* Ambient glow — matches /profile */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]"
            style={{background: 'radial-gradient(ellipse at top, rgba(201,169,97,0.06) 0%, transparent 60%)'}}
          />
          <div
            className="absolute top-1/3 right-0 w-[300px] h-[300px]"
            style={{background: 'radial-gradient(circle, rgba(74,25,34,0.12) 0%, transparent 60%)'}}
          />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-20">
          <div className="text-center mb-8">
            <p className="font-label text-[9px] tracking-[0.4em] uppercase mb-2" style={{color: 'rgba(201,169,97,0.35)'}}>
              Front desk
            </p>
            <h1
              className="font-display text-3xl tracking-wide"
              style={{color: '#E8C87A', textShadow: '0 0 20px rgba(201,169,97,0.2)'}}
            >
              Account &amp; Privacy
            </h1>
            <Link
              href="/profile"
              className="inline-block mt-3 font-label text-[8px] tracking-[0.3em] uppercase"
              style={{color: 'rgba(201,169,97,0.35)'}}
            >
              ← Back to profile
            </Link>
          </div>

          <AccountActions isVip={ent.state === 'entitled'} />
        </div>
      </div>
    </FinesseLayout>
  );
}
