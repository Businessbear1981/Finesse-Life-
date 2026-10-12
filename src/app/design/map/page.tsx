import {LiveMapView} from '@/components/live-map/live-map-view';
import {afterHoursFonts} from '@/lib/fonts-after-hours';

/** /design/map — the hologram map with a generated city and a simulated crowd (dev preview). */
export default function MapPreviewPage() {
  return (
    <div className={afterHoursFonts}>
      <LiveMapView mode="demo" />
    </div>
  );
}
