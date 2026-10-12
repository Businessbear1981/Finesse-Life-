'use client';

// After Hours kit — shared pieces for every room. Styles: ./after-hours.css. See docs/DESIGN_AFTER_HOURS.md.

import Link from 'next/link';
import {useEffect, useState, useSyncExternalStore, type ReactNode} from 'react';
import {CARD_FINISHES, type CardFinish} from '@/lib/card-finishes';
import './after-hours.css';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Page shell: noir ground, film grain, a rose glow up top. */
export function AHRoom({children, wide, glow = true, className}: {children: ReactNode; wide?: boolean; glow?: boolean; className?: string}) {
  return (
    <div className={cx('ah-room', className)}>
      {glow && <div className="ah-room-glow" aria-hidden />}
      <div className={cx('ah-wrap', wide && 'ah-wrap-wide')}>{children}</div>
    </div>
  );
}

/** Top bar: chrome wordmark left, anything (clock, avatar, chip) right. */
export function AHTopBar({right, left}: {right?: ReactNode; left?: ReactNode}) {
  return (
    <header style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 30}}>
      {left ?? <span className="ah-mark ah-topbar-mark">FINESSE</span>}
      <div className="ah-topbar-right" style={{display: 'flex', alignItems: 'center', gap: 10}}>{right}</div>
    </header>
  );
}

export function AHEyebrow({children, className, style}: {children: ReactNode; className?: string; style?: React.CSSProperties}) {
  return <p className={cx('ah-eyebrow', className)} style={style}>{children}</p>;
}

export function AHDisplay({children, size = 'l', as: Tag = 'h1', style}: {children: ReactNode; size?: 'xl' | 'l' | 'm'; as?: 'h1' | 'h2' | 'h3' | 'p'; style?: React.CSSProperties}) {
  return <Tag className={cx('ah-display', `ah-display-${size}`)} style={style}>{children}</Tag>;
}

/** Section heading: small caps label + optional right-side action. */
export function AHSection({title, action, children, style}: {title: ReactNode; action?: ReactNode; children: ReactNode; style?: React.CSSProperties}) {
  return (
    <section style={{marginTop: 34, ...style}}>
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14}}>
        <AHEyebrow>{title}</AHEyebrow>
        {action}
      </div>
      {children}
    </section>
  );
}

type PillProps = {
  children: ReactNode;
  variant?: 'solid' | 'rose' | 'ghost';
  block?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  ariaLabel?: string;
};

export function AHPill({children, variant = 'solid', block, href, onClick, disabled, type = 'button', className, ariaLabel}: PillProps) {
  const cls = cx('ah-pill', `ah-pill-${variant}`, block && 'ah-pill-block', className);
  if (href) return <Link href={href} className={cls} aria-label={ariaLabel}>{children}</Link>;
  return <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{children}</button>;
}

export function AHChip({children, live, style}: {children: ReactNode; live?: boolean; style?: React.CSSProperties}) {
  return (
    <span className="ah-chip" style={style}>
      {live && <i className="ah-live-dot ah-live-dot-pulse" />}
      {children}
    </span>
  );
}

export function AHCard({children, glass, style, className}: {children: ReactNode; glass?: boolean; style?: React.CSSProperties; className?: string}) {
  return <div className={cx('ah-card', glass && 'ah-card-glass', className)} style={style}>{children}</div>;
}

/** Hero card with smoky rose (or neon-city) light, content anchored to the bottom. */
export function AHSmoke({children, tone = 'rose', aspect = '4 / 4.2', top}: {children: ReactNode; tone?: 'rose' | 'city'; aspect?: string; top?: ReactNode}) {
  return (
    <div className={cx('ah-smoke', tone === 'city' && 'ah-smoke-blue')} style={{aspectRatio: aspect}}>
      <div className="ah-shade" />
      {top && <div className="ah-over" style={{position: 'absolute', top: 18, left: 18, right: 18, zIndex: 2}}>{top}</div>}
      <div className="ah-over" style={{position: 'absolute', inset: 'auto 0 0 0', padding: 22}}>{children}</div>
    </div>
  );
}

/** Avatar in a chrome/rose story ring. */
export function AHRing({name, src, href, quiet}: {name: string; src?: string | null; href?: string; quiet?: boolean}) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '·';
  const inner = src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt="" />
    : <span>{initials}</span>;
  const ring = <span className={cx('ah-ring', quiet && 'ah-ring-quiet')} style={{display: 'block'}}>{inner}</span>;
  return (
    <div style={{flex: 'none', width: 60}}>
      {href ? <Link href={href} aria-label={name} className="ah-focus" style={{borderRadius: '50%', display: 'block'}}>{ring}</Link> : ring}
      <span className="ah-ring-label">{name}</span>
    </div>
  );
}

export type IndexItem = {href: string; name: string; sub?: string; tag?: string; tagTone?: 'live' | 'key'; number?: number};

/** Numbered editorial index (rooms, menus): 01 Lounge — subtitle — tag. */
export function AHIndex({items}: {items: IndexItem[]}) {
  return (
    <ol className="ah-index">
      {items.map((it, i) => (
        <li key={it.href + it.name}>
          <Link href={it.href}>
            <span className="ah-index-num">{String(it.number ?? i + 1).padStart(2, '0')}</span>
            <span>
              <span className="ah-index-name">{it.name}</span>
              {it.sub && <span className="ah-index-sub">{it.sub}</span>}
            </span>
            <span className={cx('ah-index-tag', it.tagTone === 'live' && 'ah-index-tag-live', it.tagTone === 'key' && 'ah-index-tag-key')}>
              {it.tag ?? '→'}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** The Finesse card in the member's finish. `big` is the headline line (balance, "12% back"…). */
export function AHMemberCard({finish, big, label, right, flat}: {finish: CardFinish; big: ReactNode; label?: ReactNode; right?: ReactNode; flat?: boolean}) {
  const f = CARD_FINISHES[finish];
  const glow = finish === 'rose_gold' ? 'rgba(183,110,121,.35)' : finish === 'platinum' ? 'rgba(185,188,194,.25)' : 'rgba(183,110,121,.18)';
  return (
    <div className="ah-cardstage">
      <div
        className={cx('ah-member-card', flat && 'ah-member-card-flat')}
        style={{background: f.face, color: f.ink, boxShadow: `inset 0 0 0 1px rgba(255,255,255,.14), 0 30px 60px rgba(0,0,0,.75), 0 0 60px ${glow}`}}
      >
        <div className="ah-member-card-row"><span style={{fontWeight: 700}}>FINESSE</span><span className="ah-member-card-chip" /></div>
        <div className="ah-member-card-big">{big}</div>
        <div className="ah-member-card-row" style={{color: f.inkSoft}}>
          <span>{label ?? f.label.toUpperCase()}</span>
          {right && <span style={{letterSpacing: '0.06em', fontWeight: 700, color: f.ink}}>{right}</span>}
        </div>
      </div>
    </div>
  );
}

/** Fixed bottom action (above the home indicator). */
export function AHDock({children}: {children: ReactNode}) {
  return <div className="ah-dock"><div>{children}</div></div>;
}

export function AHSkeleton({h = 16, w = '100%', r, style}: {h?: number | string; w?: number | string; r?: number; style?: React.CSSProperties}) {
  return <div className="ah-skel" style={{height: h, width: w, borderRadius: r, ...style}} aria-hidden />;
}

/** Live clock, e.g. "11:42 PM". Renders nothing until mounted (no hydration mismatch). */
export function AHClock({className}: {className?: string}) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'}));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return <span className={cx('ah-num', className)} style={{fontSize: 13, color: 'var(--ah-mute)'}}>{time ?? ''}</span>;
}

/** Greeting for the hour: "Good evening," etc. */
export function greetingFor(d: Date) {
  const h = d.getHours();
  return h < 5 ? 'Still up,' : h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
}

/** A device-local preference (localStorage), SSR-safe. Falls back when storage is blocked. */
export function useLocalPref<T>(key: string, parse: (raw: string | null) => T, fallback: T): T {
  const raw = useSyncExternalStore(
    (on) => {
      window.addEventListener('storage', on);
      return () => window.removeEventListener('storage', on);
    },
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  return raw === null ? fallback : parse(raw);
}

export {cx as ahcx};
