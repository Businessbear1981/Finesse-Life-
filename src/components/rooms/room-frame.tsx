'use client';
import {useStoredGender} from '@/lib/use-gender';
import type {ReactNode} from 'react';

/** Shared shell for atlas rooms: brass structure, edition accent, truthful status line. */
export function RoomFrame({title, subtitle, status, children}: {title: string; subtitle: string; status?: {kind: 'loading' | 'empty' | 'error' | 'ok'; text?: string}; children?: ReactNode}) {
  const accent = useStoredGender() === 'masculine' ? '#FFA96B' : '#FF4D7D';
  return (
    <main className="min-h-screen px-4 pb-24 pt-12" style={{background: '#0A0406', color: '#F4E8D0'}}>
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-label text-[9px] uppercase tracking-[0.4em]" style={{color: '#C9A961'}}>Finesse Life</p>
        <h1 className="mt-2 font-display text-3xl" style={{color: accent}}>{title}</h1>
        <p className="mt-2 text-sm opacity-60">{subtitle}</p>
      </header>
      <section className="mx-auto mt-8 max-w-2xl space-y-4" aria-live="polite">
        {status && status.kind !== 'ok' && (
          <p role={status.kind === 'error' ? 'alert' : 'status'} className="rounded border px-4 py-3 text-sm" style={{borderColor: 'rgba(201,169,97,0.25)', opacity: 0.8}}>
            {status.text ?? (status.kind === 'loading' ? 'Loading…' : status.kind === 'empty' ? 'Nothing here yet.' : 'Something went wrong.')}
          </p>
        )}
        {children}
      </section>
    </main>
  );
}

export function Card({children}: {children: ReactNode}) {
  return <div className="rounded border p-4" style={{borderColor: 'rgba(201,169,97,0.25)', background: 'rgba(74,25,34,0.25)'}}>{children}</div>;
}

export function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`mr-2 mt-2 rounded border px-3 py-1 text-xs uppercase tracking-widest disabled:opacity-40 ${props.className ?? ''}`} style={{borderColor: '#C9A961', color: '#C9A961'}} />;
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {...init, headers: {'Content-Type': 'application/json', ...(init?.headers ?? {})}});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as {error?: string}).error ?? `HTTP ${r.status}`);
  return j as T;
}
