'use client';
// Honest states shared by the Entourage, Departures, Per Diem and Clubhouse web rooms.
import type {ReactNode} from 'react';
import Link from 'next/link';
import type {RoomData} from '@/lib/rooms/live-room';

export function SignInNote({what}: {what: string}) {
  return (
    <div className="border border-brass/25 bg-ink/60 p-5 text-center">
      <p className="font-label text-[9px] uppercase tracking-[0.35em] text-brass/70">Members only</p>
      <p className="mt-2 font-body text-sm text-cream/70">Sign in to open {what}. Nothing here is shown or saved until you do.</p>
      <Link href="/login" className="mt-4 inline-block min-h-11 border border-brass/50 px-6 py-3 font-label text-[10px] uppercase tracking-[0.3em] text-brass">Sign in</Link>
    </div>
  );
}

export function SampleLabel({children}: {children: ReactNode}) {
  return <p className="font-label text-[9px] uppercase tracking-[0.35em] text-cream/40">{children}</p>;
}

export function LoadingRows() {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      {[0, 1, 2].map((i) => <div key={i} className="h-16 border border-cream/8 bg-ink/40" style={{opacity: 0.5 - i * 0.12, animation: 'pulse 1.6s infinite'}} />)}
    </div>
  );
}

export function Notice({tone = 'quiet', children}: {tone?: 'quiet' | 'error'; children: ReactNode}) {
  return (
    <p role={tone === 'error' ? 'alert' : undefined} className={`font-body text-sm italic ${tone === 'error' ? 'text-neon-pink/90' : 'text-cream/50'}`}>{children}</p>
  );
}

/** Render children(data) when ready; otherwise the honest state. `signedOut` = labelled sample. */
export function LiveRoom<T>({room, what, reload, signedOut, children}: {
  room: RoomData<T>; what: string; reload: () => void; signedOut?: ReactNode; children: (data: T) => ReactNode;
}) {
  if (room.state === 'ready') return <>{children(room.data)}</>;
  if (room.state === 'loading') return <LoadingRows />;
  if (room.state === 'signed_out') return <div className="space-y-6"><SignInNote what={what} />{signedOut}</div>;
  if (room.state === 'not_open') return <Notice>{room.message}</Notice>;
  return (
    <div className="space-y-3">
      <Notice tone="error">{room.message}</Notice>
      <button type="button" onClick={reload} className="min-h-11 border border-brass/40 px-4 font-label text-[10px] uppercase tracking-[0.3em] text-brass">Try again</button>
    </div>
  );
}
