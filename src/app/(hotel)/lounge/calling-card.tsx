'use client';

import Image from 'next/image';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {PaperSurface} from '@/components/continental';
import {GuillocheRosette} from '@/components/continental/ornaments';

export const VIBE_COLORS: Record<string, string> = {
  magical: '#C9A961',
  warm: '#FFA96B',
  electric: '#FF4D7D',
  peaceful: '#7DC9A9',
  wild: '#E8C87A',
  chill: '#69C9D0',
};

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** An engraved calling card on ivory cotton stock — the Lounge's post. */
export function CallingCard({
  name,
  nameHref,
  vibe,
  time,
  avatar,
  tilt = 0,
  children,
  footer,
}: {
  name: string;
  nameHref?: string;
  vibe?: string | null;
  time: string;
  avatar?: string | null;
  tilt?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const vibeColor = VIBE_COLORS[vibe || ''] || '#C9A961';
  return (
    <PaperSurface className="overflow-hidden px-5 pb-4 pt-5 motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:rotate-0" style={{transform: `rotate(${tilt}deg)`}}>
      <GuillocheRosette className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 opacity-[0.10]" color="#5b4630" strokeWidth={0.3} />
      <div className="pointer-events-none absolute inset-[5px] border border-[rgb(30_20_12/0.18)]" />
      <div className="relative flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{boxShadow: 'inset 0 0 0 1px rgb(30 20 12 / 40%), inset 0 0 0 3px var(--ivory), inset 0 0 0 4px rgb(30 20 12 / 18%)'}}
        >
          {avatar ? (
            <Image src={avatar} alt="" width={40} height={40} className="h-full w-full rounded-full object-cover p-[5px]" />
          ) : (
            <span className="font-display text-[15px] italic text-[var(--ivory-ink)]">{initials(name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-label text-[12px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.22em] text-[var(--ivory-ink)]" style={{textShadow: '0 1px 0 rgb(255 255 255 / 70%)'}}>
            {nameHref ? (
              <Link href={nameHref} className="hover:underline hover:decoration-[rgb(30_20_12/0.4)] hover:underline-offset-4">
                {name}
              </Link>
            ) : (
              name
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-2 font-label text-[9px] uppercase tracking-[0.24em] text-[var(--ivory-ink-soft)]">
            {vibe && (
              <>
                <span aria-hidden className="h-1.5 w-1.5 rotate-45" style={{background: vibeColor, boxShadow: '0 0 0 0.5px rgb(30 20 12 / 50%)'}} />
                <span>{vibe}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{time}</span>
          </p>
        </div>
      </div>
      <div className="relative mt-3">{children}</div>
      {footer && <div className="relative mt-3 border-t border-[rgb(30_20_12/0.15)] pt-2.5">{footer}</div>}
    </PaperSurface>
  );
}

