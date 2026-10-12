import type {Metadata} from 'next';
import {LiveMapView} from '@/components/live-map/live-map-view';
import {afterHoursFonts} from '@/lib/fonts-after-hours';

export const metadata: Metadata = {title: 'The City, Tonight · Finesse'};

/** /lounge/map — the live hologram city. Data is members-only (the API returns 401 otherwise). */
export default function LiveMapPage() {
  return (
    <div className={afterHoursFonts}>
      <LiveMapView mode="live" />
    </div>
  );
}
