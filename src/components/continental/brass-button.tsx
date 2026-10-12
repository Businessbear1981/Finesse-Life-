import Link from 'next/link';
import type {ButtonHTMLAttributes, CSSProperties, ReactNode} from 'react';
import {brushedUri} from './textures';

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

type Variant = 'brass' | 'lacquer' | 'ivory';

type Common = {
  children: ReactNode;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  className?: string;
  style?: CSSProperties;
};

const CLIP = 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)';
const CLIP_SM = 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)';

function classes(variant: Variant, size: Common['size'], block?: boolean) {
  return cx(
    'group relative isolate inline-flex items-center justify-center overflow-hidden font-label font-semibold uppercase transition-[transform,filter] duration-300',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-200)]',
    'enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:opacity-50',
    size === 'sm' ? 'min-h-11 px-4 text-[10px] tracking-[0.3em]' : size === 'lg' ? 'min-h-14 px-8 text-[12px] tracking-[0.42em]' : 'min-h-12 px-6 text-[11px] tracking-[0.38em]',
    block && 'w-full',
    variant === 'brass' && 'hover:brightness-110',
    variant === 'lacquer' && 'hover:brightness-125',
    variant === 'ivory' && 'hover:brightness-105',
  );
}

function skin(variant: Variant, size: Common['size']): CSSProperties {
  const clipPath = size === 'sm' ? CLIP_SM : CLIP;
  if (variant === 'brass') {
    return {
      clipPath,
      color: 'var(--brass-ink)',
      textShadow: '0 1px 0 rgb(255 241 200 / 65%)',
      backgroundImage: [
        'linear-gradient(180deg, rgb(255 250 230 / 55%) 0%, rgb(255 250 230 / 0%) 18%, rgb(0 0 0 / 0%) 70%, rgb(60 40 10 / 35%) 100%)',
        'linear-gradient(172deg, #f2d99f 0%, #d6b46c 30%, #b38e47 55%, #cfad65 78%, #9c7a39 100%)',
      ].join(','),
      boxShadow: 'inset 0 0 0 1px rgb(70 48 14 / 80%), inset 0 0 0 2px rgb(255 238 190 / 45%), inset 0 0 0 4px rgb(0 0 0 / 0%), inset 0 0 0 5px rgb(90 62 20 / 30%)',
    };
  }
  if (variant === 'ivory') {
    return {
      clipPath,
      color: 'var(--ivory-ink)',
      background: 'linear-gradient(180deg, #fbf3e0 0%, #e9dcbe 100%)',
      boxShadow: 'inset 0 0 0 1px rgb(30 20 12 / 45%), inset 0 0 0 3px rgb(251 243 224 / 100%), inset 0 0 0 4px rgb(30 20 12 / 22%)',
    };
  }
  return {
    clipPath,
    color: 'var(--brass-200)',
    background: 'linear-gradient(180deg, #1b161c 0%, #09070a 100%)',
    boxShadow: 'inset 0 0 0 1px rgb(201 169 97 / 70%), inset 0 0 0 3px #0b080c, inset 0 0 0 4px rgb(201 169 97 / 28%), inset 0 1px 12px rgb(255 255 255 / 4%)',
  };
}

function Inner({children, variant}: {children: ReactNode; variant: Variant}) {
  return (
    <>
      {variant === 'brass' && (
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{backgroundImage: brushedUri(0.5), backgroundSize: '100% 100%', mixBlendMode: 'overlay', opacity: 0.55}} />
      )}
      {/* sheen sweep on hover / focus */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -translate-x-full skew-x-[-20deg] transition-transform duration-[1100ms] ease-out group-hover:translate-x-[400%] group-focus-visible:translate-x-[400%] motion-reduce:hidden"
        style={{background: 'linear-gradient(90deg, transparent, rgb(255 250 228 / 45%), transparent)', mixBlendMode: 'screen'}}
      />
      <span className="relative">{children}</span>
    </>
  );
}

/** Bevelled brass button with an engraved label and a slow sheen on hover. */
export function BrassButton({children, variant = 'brass', size = 'md', block, className, style, ...rest}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cx(classes(variant, size, block), className)} style={{...skin(variant, size), ...style}} {...rest}>
      <Inner variant={variant}>{children}</Inner>
    </button>
  );
}

/** Same skin, as a Next <Link>. */
export function BrassLink({children, href, variant = 'brass', size = 'md', block, className, style}: Common & {href: string}) {
  return (
    <Link href={href} className={cx(classes(variant, size, block), className)} style={{...skin(variant, size), ...style}}>
      <Inner variant={variant}>{children}</Inner>
    </Link>
  );
}
