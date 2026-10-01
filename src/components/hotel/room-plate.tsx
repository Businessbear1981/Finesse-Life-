'use client';

/**
 * RoomPlate — the shared frame every cinematic plate sits in.
 * Owns: wayfinding (number / rail / name), track accent, truth-state honesty,
 * the six required states, one primary action, API/revenue disclosure, and the
 * human-escalation path. The SCENE (children) is unique per room.
 */
import {useEffect, useState, type ReactNode} from 'react';
import Link from 'next/link';
import {motion, useReducedMotion} from 'framer-motion';
import {RAILS, TRUTH_LABEL, roomById, trackAccent, trackFromGender, type Track} from '@/lib/rooms/registry';

export type PlateState = 'loading' | 'empty' | 'preview' | 'gated' | 'error' | 'confirmed' | 'live';

export type LiveCtx<T> = {data: T; accent: string; track: Track; reload: () => void; reduce: boolean};

export function useTrack(): Track {
  const [track, setTrack] = useState<Track>('finesse');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only side preference
    setTrack(trackFromGender(localStorage.getItem('finesse_gender')));
  }, []);
  return track;
}

type Props<T = unknown> = {
  roomId: string;
  /** Member data endpoint. 200 → live view; 401 / 503 (not opened) → honest preview. */
  liveEndpoint?: string;
  live?: (ctx: LiveCtx<T>) => ReactNode;
  /** Live data counts as empty (shows emptyCopy above the live body). */
  isEmpty?: (data: T) => boolean;
  /** Scene renderer receives the accent + current state so motion can respond. */
  scene: (ctx: {accent: string; track: Track; state: PlateState; reduce: boolean}) => ReactNode;
  /** Track-aware one-line greeting under the title. */
  lede: Record<Track, string>;
  /** Preview narrative shown in the preview state (clearly marked as sample). */
  preview: (ctx: {accent: string; track: Track; act: () => void; acted: boolean}) => ReactNode;
  emptyCopy: string;
  /** What the primary action WILL do once wired. */
  actionConsequence: string;
};

export function RoomPlate<T = unknown>({roomId, scene, lede, preview, emptyCopy, actionConsequence, liveEndpoint, live, isEmpty}: Props<T>) {
  const room = roomById(roomId);
  const track = useTrack();
  const reduce = Boolean(useReducedMotion());
  const [state, setState] = useState<PlateState>('loading');
  const [acted, setActed] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const reg = await fetch(`/api/rooms/${roomId}`, {cache: 'no-store'});
        if (!reg.ok) throw new Error(String(reg.status));
        const b = (await reg.json()) as {truthState: string};
        if (!alive) return;
        if (b.truthState === 'gated') { setState('gated'); return; }
        if (!liveEndpoint) { setState('preview'); return; }
        const res = await fetch(liveEndpoint, {cache: 'no-store'});
        if (!alive) return;
        if (res.ok) { setData((await res.json()) as T); setState('live'); return; }
        if (res.status === 401) setNote('Sign in to open your own room — below is a rehearsal with sample content.');
        else if (res.status === 503) setNote('This room is still being fitted out — below is a rehearsal with sample content.');
        else { setState('error'); return; }
        setState('preview');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [roomId, liveEndpoint, nonce]);

  if (!room) return null;
  const accent = trackAccent(track);
  const rail = RAILS.find((r) => r.roomIds.includes(room.id));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080406] pb-28 text-cream">
      {/* Wayfinding */}
      <header className="relative z-10 mx-auto max-w-5xl px-5 pt-10">
        <nav aria-label="Breadcrumb" className="font-label text-[10px] uppercase tracking-[0.4em] text-brass/70">
          <Link href="/lobby" className="hover:text-brass-highlight">Lobby</Link>
          <span className="mx-2 text-cream/30">/</span>
          <span>{rail?.title ?? 'The Hotel'}</span>
        </nav>
        <div className="mt-6 flex items-end gap-4">
          <span className="font-display text-5xl italic leading-none" style={{color: `${accent}`}} aria-hidden="true">
            {String(room.number).padStart(2, '0')}
          </span>
          <div>
            <p className="font-label text-[10px] uppercase tracking-[0.45em] text-brass/80">Room {room.number} of 31</p>
            <h1 className="font-display text-4xl italic tracking-[0.04em] text-brass-highlight sm:text-5xl">{room.name}</h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl font-body text-lg italic text-cream/80">{lede[track]}</p>
        <p className="mt-2 inline-block border px-2 py-0.5 font-label text-[9px] uppercase tracking-[0.3em] text-cream/70" style={{borderColor: `${accent}66`}}>
          {TRUTH_LABEL[room.truthState]} · phase {room.phase}
        </p>
      </header>

      {/* Scene */}
      <motion.section
        aria-label={`${room.name} scene: ${room.sceneBlueprint.architecture}`}
        className="relative z-0 mx-auto mt-8 max-w-5xl px-5"
        initial={reduce ? false : {opacity: 0, y: 16}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.9, ease: [0.16, 1, 0.3, 1]}}
      >
        <div className="relative overflow-hidden border border-brass/25" style={{aspectRatio: '16 / 9', minHeight: 260}}>
          {scene({accent, track, state, reduce})}
        </div>
        <p className="mt-2 font-body text-xs italic text-cream/50">{room.sceneBlueprint.focalObject}</p>
      </motion.section>

      {/* State body */}
      <section className="relative z-10 mx-auto mt-8 max-w-5xl px-5" aria-live="polite">
        {state === 'loading' && (
          <div className="h-28 animate-pulse border border-brass/10 bg-brass/5" role="status" aria-label="Loading room" />
        )}
        {state === 'error' && (
          <div role="alert" className="border border-neon-pink/40 p-5">
            <p className="font-display text-xl italic text-cream">The room did not answer.</p>
            <p className="mt-1 font-body text-sm text-cream/70">Nothing was changed. Try again, or ask Nova at the desk.</p>
            <button type="button" onClick={() => location.reload()} className="mt-3 min-h-11 border border-brass/50 px-4 font-label text-[10px] uppercase tracking-[0.3em] text-brass">Try again</button>
          </div>
        )}
        {state === 'gated' && (
          <div className="border border-brass/40 p-5">
            <p className="font-display text-xl italic">This room opens for the inner circle.</p>
            <Link href="/profile?upgrade=true" className="mt-3 inline-block min-h-11 border border-brass/60 px-4 py-3 font-label text-[10px] uppercase tracking-[0.3em] text-brass-highlight">View VIP access</Link>
          </div>
        )}
        {state === 'empty' && <p className="font-body text-base italic text-cream/70">{emptyCopy}</p>}
        {state === 'live' && data !== null && live && (
          <div className="border border-brass/25 bg-ink/70 p-5">
            <p className="font-label text-[9px] uppercase tracking-[0.35em] text-emerald-200/80">Your room · live</p>
            {isEmpty?.(data) && <p className="mt-3 font-body text-base italic text-cream/70">{emptyCopy}</p>}
            <div className="mt-4">{live({data, accent, track, reduce, reload: () => setNonce((n) => n + 1)})}</div>
          </div>
        )}
        {note && state === 'preview' && <p className="mb-3 font-body text-sm italic text-cream/65">{note}</p>}
        {(state === 'preview' || state === 'confirmed') && (
          <div className="border border-brass/20 bg-ink/70 p-5">
            <p className="font-label text-[9px] uppercase tracking-[0.35em]" style={{color: accent}}>
              Preview · sample content · nothing is booked, charged or shared
            </p>
            <div className="mt-4">{preview({accent, track, act: () => { setActed(true); setState('confirmed'); }, acted})}</div>
            {state === 'confirmed' && (
              <p role="status" className="mt-4 border-t border-brass/15 pt-3 font-body text-sm italic text-cream/75">
                Rehearsed, not performed. When this room is wired, this step will {actionConsequence}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Contract disclosure */}
      <section className="relative z-10 mx-auto mt-8 grid max-w-5xl gap-4 px-5 sm:grid-cols-3">
        <div className="border border-brass/10 p-4">
          <h2 className="font-label text-[9px] uppercase tracking-[0.35em] text-brass/80">Primary action</h2>
          <p className="mt-2 font-body text-sm text-cream/80">{room.primaryAction}</p>
        </div>
        <div className="border border-brass/10 p-4">
          <h2 className="font-label text-[9px] uppercase tracking-[0.35em] text-brass/80">Commercial disclosure</h2>
          <ul className="mt-2 space-y-1 font-body text-sm text-cream/70">
            {room.revenue.map((r) => <li key={r}>— {r}</li>)}
          </ul>
          <p className="mt-2 font-body text-[11px] italic text-cream/50">Viewing this room is never revenue. Partners are disclosed before any hand-off.</p>
        </div>
        <div className="border border-brass/10 p-4">
          <h2 className="font-label text-[9px] uppercase tracking-[0.35em] text-brass/80">A person, when you want one</h2>
          <p className="mt-2 font-body text-sm text-cream/80">Nova routes anything here to a human concierge on request.</p>
          <Link href="/concierge" className="mt-3 inline-block min-h-11 py-3 font-label text-[10px] uppercase tracking-[0.3em]" style={{color: accent}}>Ask Nova ›</Link>
        </div>
      </section>
    </main>
  );
}

/** Shared preview action button. */
export function PlateAction({label, onClick, accent, done}: {label: string; onClick: () => void; accent: string; done: boolean}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done}
      className="min-h-12 w-full border px-5 py-3 font-label text-[11px] uppercase tracking-[0.4em] transition disabled:opacity-60 sm:w-auto"
      style={{borderColor: accent, color: done ? '#F4E8D0' : accent, boxShadow: done ? 'none' : `0 0 22px ${accent}33`}}
    >
      {done ? 'Rehearsed ✓' : `${label} · preview`}
    </button>
  );
}
