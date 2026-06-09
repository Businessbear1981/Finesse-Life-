import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {VipCodesAdmin} from './vip-codes-admin';

export default async function VipCodesPage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Server-side admin check
  const {data: profile} = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const isAdmin =
    profile?.username === 'admin' ||
    user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) redirect('/lobby');

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px]"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(201,169,97,0.05) 0%, transparent 60%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 pt-10 pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-2 h-2 rotate-45"
              style={{background: 'rgba(201,169,97,0.4)'}}
            />
            <span
              className="font-label text-[9px] tracking-[0.4em] uppercase"
              style={{color: 'rgba(201,169,97,0.3)'}}
            >
              Admin
            </span>
          </div>
          <h1
            className="font-display text-3xl tracking-wide"
            style={{color: '#E8C87A', textShadow: '0 0 20px rgba(201,169,97,0.15)'}}
          >
            VIP Code Manager
          </h1>
        </div>

        <VipCodesAdmin />
      </div>
    </div>
  );
}
