'use client';

// The private lift inside the VIP Room, on the member's own track (device preference, like the Lobby).
import {useLocalPref} from '@/components/after-hours';
import {PrivateLift} from '@/components/hotel/private-lift';
import {trackFromGender, type Track} from '@/lib/rooms/registry';

export function VipLift() {
  const track = useLocalPref<Track>('finesse_gender', trackFromGender, 'finesse');
  return <PrivateLift track={track} />;
}
