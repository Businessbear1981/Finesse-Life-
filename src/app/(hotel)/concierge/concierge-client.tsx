'use client';

import {useConcierge} from './use-concierge';
import {ConciergeView} from './concierge-view';

// FinesseLayout (src/components/finesse-layout.tsx) pins a 68px banner and a 70px dock around <main>;
// the sticky header and composer sit inside those so nothing hides under the hotel chrome.
const HOTEL_BANNER_PX = 68;
const HOTEL_DOCK_PX = 70;

export function ConciergeClient({prefill}: {prefill: string}) {
  const nova = useConcierge(prefill);
  return <ConciergeView {...nova} chromeTop={HOTEL_BANNER_PX} chromeBottom={HOTEL_DOCK_PX} />;
}
