import {redirect} from 'next/navigation';
import type {Metadata} from 'next';
import {getActiveLiftSession, getVipEntitlement} from '@/lib/vip-lift';
import {PenthouseScene} from './penthouse-scene';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'The Penthouse — Finesse', robots: {index: false}};

// /vip/penthouse — premium VIP destination INSIDE room 23 (not room 32).
// Double gate: middleware enforces /vip entitlement; this page additionally
// requires a live private-lift session issued by /api/vip-keylock/verify.
export default async function PenthousePage() {
  const ent = await getVipEntitlement();
  if (ent.state === 'signed_out') redirect('/login');
  if (ent.state !== 'entitled') redirect('/profile?upgrade=true');

  const lift = await getActiveLiftSession();
  if (!lift.active) redirect('/lobby?lift=closed#private-lift');

  return <PenthouseScene expiresAt={lift.expiresAt} />;
}
