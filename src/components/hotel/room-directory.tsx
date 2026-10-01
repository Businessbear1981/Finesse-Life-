'use client';

import Link from 'next/link';
import {RAILS, ROOM_COUNT, TRUTH_LABEL, railRooms, trackAccent, type Track, type TruthState} from '@/lib/rooms/registry';

const TRUTH_STYLE: Record<TruthState, string> = {
  wired: 'border-emerald-400/40 text-emerald-200/80',
  preview: 'border-brass/40 text-brass-highlight/80',
  specified: 'border-cream/20 text-cream/55',
  gated: 'border-brass/60 text-brass',
};

/** The hotel directory — all 31 rooms from the canonical registry, in rail order. */
export function RoomDirectory({track}: {track: Track}) {
  const accent = trackAccent(track);
  return (
    <section aria-labelledby="directory-title" className="border border-brass/15 bg-ink/60">
      <header className="flex items-baseline justify-between px-4 pt-4">
        <h2 id="directory-title" className="font-label text-[10px] uppercase tracking-[0.45em] text-brass/80">
          The Directory
        </h2>
        <span className="font-label text-[9px] uppercase tracking-[0.3em] text-cream/50">{ROOM_COUNT} rooms</span>
      </header>
      {RAILS.map((rail, i) => (
        <details key={rail.id} open={i === 0} className="group border-t border-brass/10 first-of-type:mt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass">
            <span className="font-display text-lg italic text-cream/90">{rail.title}</span>
            <span className="font-label text-[9px] uppercase tracking-[0.3em] text-cream/50">
              {rail.roomIds.length} · <span className="inline-block transition group-open:rotate-90">›</span>
            </span>
          </summary>
          <ul className="pb-2">
            {railRooms(rail.id).map((room) => (
              <li key={room.id}>
                <Link
                  href={room.route}
                  className="flex min-h-11 items-center gap-3 px-4 py-2 transition hover:bg-brass/5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
                >
                  <span className="w-7 font-label text-[10px] tracking-[0.2em]" style={{color: `${accent}cc`}}>
                    {String(room.number).padStart(2, '0')}
                  </span>
                  <span className="flex-1">
                    <span className="block font-body text-[15px] text-cream/90">{room.name}</span>
                    <span className="block font-body text-xs italic text-cream/50">{room.primaryAction}</span>
                  </span>
                  <span className={`border px-2 py-0.5 font-label text-[8px] uppercase tracking-[0.2em] ${TRUTH_STYLE[room.truthState]}`}>
                    {room.id === 'vip-room' ? 'VIP' : TRUTH_LABEL[room.truthState]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
      <p className="px-4 pb-4 pt-2 font-body text-[11px] italic text-cream/45">
        The Penthouse is reached by the private lift inside the VIP Room — it is not a separate room.
      </p>
    </section>
  );
}
