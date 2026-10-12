'use client';

import Image from 'next/image';
import Link from 'next/link';
import type {ReactNode} from 'react';

export const VIBE_COLORS: Record<string, string> = {
  magical: '#C9A0FF',
  warm: '#FFA96B',
  electric: '#FF2EA0',
  peaceful: '#7EE2B8',
  wild: '#E6FF00',
  chill: '#00C8FF',
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

/** A post in the Lounge (After Hours): glass card, avatar, name, vibe, time. */
export function CallingCard({
  name,
  nameHref,
  vibe,
  time,
  avatar,
  children,
  footer,
}: {
  name: string;
  nameHref?: string;
  vibe?: string | null;
  time: string;
  avatar?: string | null;
  /** Kept for API compatibility; After Hours cards sit straight. */
  tilt?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const vibeColor = VIBE_COLORS[vibe || ''] || 'var(--ah-rose)';
  return (
    <article className="ah-card" style={{padding: 18}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <span style={{flex: 'none', width: 40, height: 40, borderRadius: '50%', padding: 2, background: 'conic-gradient(from 200deg,#f4f4f2,#b76e79,#e8b4a0,#8e9298,#f4f4f2)'}}>
          <span style={{display: 'grid', placeItems: 'center', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid var(--ah-ink-2)', background: '#1b1b1f', overflow: 'hidden', fontSize: 13, fontWeight: 700}}>
            {avatar ? <Image src={avatar} alt="" width={36} height={36} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : initials(name)}
          </span>
        </span>
        <div style={{minWidth: 0, flex: 1}}>
          <p style={{margin: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {nameHref ? <Link href={nameHref} style={{color: 'inherit', textDecoration: 'none'}}>{name}</Link> : name}
          </p>
          <p style={{margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ah-mute)'}}>
            {vibe && (
              <>
                <span aria-hidden style={{width: 6, height: 6, borderRadius: '50%', background: vibeColor, boxShadow: `0 0 8px ${vibeColor}`}} />
                <span style={{textTransform: 'capitalize'}}>{vibe}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{time}</span>
          </p>
        </div>
      </div>
      <div style={{marginTop: 12}}>{children}</div>
      {footer && <div style={{marginTop: 10, paddingTop: 6, borderTop: '1px solid var(--ah-line)'}}>{footer}</div>}
    </article>
  );
}
