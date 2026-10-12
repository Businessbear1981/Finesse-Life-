import {afterHoursFonts} from '@/lib/fonts-after-hours';
import {Directions} from './directions';

/**
 * /design/directions — three candidate visual directions for the 18–27 luxury audience,
 * each shown as the Lobby at phone width. `?d=a|b|c` renders one direction full-bleed.
 */
export default async function DirectionsPage({searchParams}: {searchParams: Promise<{d?: string}>}) {
  const {d} = await searchParams;
  return (
    <div className={afterHoursFonts}>
      <Directions only={d === 'a' || d === 'b' || d === 'c' ? d : undefined} />
    </div>
  );
}
