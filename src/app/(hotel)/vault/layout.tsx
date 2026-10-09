import {redirect} from 'next/navigation';
import {getVipEntitlement} from '@/lib/vip-lift';

// The room registry marks /vault as VIP, but middleware lists it as public and the
// page is a client component — so the gate runs here, server-side, before the page renders.
// Nested inside (hotel)/layout.tsx, so the Payload shell still wraps the page.
export default async function VaultLayout({children}: {children: React.ReactNode}) {
  const ent = await getVipEntitlement();
  if (ent.state === 'signed_out') redirect('/login');
  // Same destination middleware uses for /vip: profile with the upgrade / code panel open.
  if (ent.state !== 'entitled') redirect('/profile?upgrade=true');
  return <>{children}</>;
}
