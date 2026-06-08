'use client';

import { create } from 'zustand';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

/* ────────────────────────────────────────
   Types
   ──────────────────────────────────────── */

type CurtainState = 'open' | 'closing' | 'closed' | 'opening';
type TransitionStyle = 'curtain' | 'doors' | 'vault' | 'fog' | 'static' | 'none';

/* ────────────────────────────────────────
   Route → transition style map
   ──────────────────────────────────────── */

const ROUTE_TRANSITIONS: Record<string, TransitionStyle> = {
  '/': 'none',
  '/lobby': 'curtain',
  '/concierge': 'doors',
  '/wardrobe': 'doors',
  '/switchboard': 'static',
  '/vault': 'vault',
  '/backstage': 'doors',
  '/lounge': 'curtain',
  '/registry': 'doors',
  '/archive': 'curtain',
  '/salon': 'fog',
  '/embassy': 'doors',
  '/lab': 'static',
  '/scale': 'doors',
  '/bag': 'doors',
  '/profile': 'fog',
  '/vip': 'vault',
  '/entourage': 'static',
  '/clubhouse': 'doors',
  '/perdiem': 'doors',
  '/market': 'doors',
  '/exchange': 'curtain',
  '/departures': 'fog',
};

/* close durations per style (ms) */
const CLOSE_DURATION: Record<TransitionStyle, number> = {
  curtain: 550,
  doors: 500,
  vault: 700,
  fog: 400,
  static: 350,
  none: 0,
};

/* ────────────────────────────────────────
   Zustand store
   ──────────────────────────────────────── */

interface CurtainStore {
  state: CurtainState;
  setState: (s: CurtainState) => void;
}

export const useCurtainStore = create<CurtainStore>((set) => ({
  state: 'open',
  setState: (state) => set({ state }),
}));

/* ────────────────────────────────────────
   CurtainOverlay — renders the active transition
   ──────────────────────────────────────── */

export function CurtainOverlay() {
  const { state } = useCurtainStore();
  const pathname = usePathname();

  const style: TransitionStyle = ROUTE_TRANSITIONS[pathname] ?? 'curtain';

  // panels "entering" = closing toward center OR fully closed
  const entering = state === 'closing' || state === 'closed';

  if (state === 'open' || style === 'none') return null;

  switch (style) {
    case 'curtain':
      return <CurtainPanels entering={entering} />;
    case 'doors':
      return <DoorPanels entering={entering} />;
    case 'vault':
      return <VaultDoor entering={entering} />;
    case 'fog':
      return <FogScreen entering={entering} />;
    case 'static':
      return <StaticWipe entering={entering} />;
    default:
      return null;
  }
}

/* ────────────────────────────────────────
   useCurtainNavigate hook
   ──────────────────────────────────────── */

export function useCurtainNavigate() {
  const router = useRouter();
  const { setState } = useCurtainStore();

  return useCallback(
    (href: string) => {
      const style: TransitionStyle = ROUTE_TRANSITIONS[href] ?? 'curtain';

      if (style === 'none') {
        router.push(href);
        return;
      }

      const duration = CLOSE_DURATION[style];

      setState('closing');
      setTimeout(() => {
        setState('closed');
        router.push(href);
        // hotel-shell.tsx handles the 'opening' phase after pathname changes
      }, duration);
    },
    [router, setState],
  );
}

/* ────────────────────────────────────────
   CurtainLink — button wrapper
   ──────────────────────────────────────── */

interface CurtainLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CurtainLink({ href, children, className, style }: CurtainLinkProps) {
  const navigate = useCurtainNavigate();
  return (
    <button onClick={() => navigate(href)} className={className} style={style}>
      {children}
    </button>
  );
}

/* ════════════════════════════════════════
   OVERLAY COMPONENTS
   All CSS-only, no framer-motion
   ════════════════════════════════════════ */

/* ────────────────────────────────────────
   CURTAINS — burgundy velvet sweep
   ──────────────────────────────────────── */

function CurtainPanels({ entering }: { entering: boolean }) {
  const t = '0.55s cubic-bezier(0.65, 0, 0.35, 1)';
  return (
    <>
      {/* Left panel */}
      <div
        className="fixed inset-y-0 left-0 w-1/2 z-[100] curtain-fabric"
        style={{
          transform: entering ? 'translateX(0%)' : 'translateX(-100%)',
          transition: `transform ${t}`,
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/40 to-transparent" />
          <div className="absolute inset-y-0 left-1/4 w-1 bg-gradient-to-r from-lamp/10 to-transparent" />
          <div className="absolute inset-y-0 left-1/2 w-1 bg-gradient-to-r from-lamp/5 to-transparent" />
          <div className="absolute inset-y-0 left-3/4 w-1 bg-gradient-to-r from-lamp/10 to-transparent" />
        </div>
        <div className="absolute inset-y-0 right-0 w-px bg-brass/40" />
      </div>

      {/* Right panel */}
      <div
        className="fixed inset-y-0 right-0 w-1/2 z-[100] curtain-fabric"
        style={{
          transform: entering ? 'translateX(0%)' : 'translateX(100%)',
          transition: `transform ${t}`,
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/40 to-transparent" />
          <div className="absolute inset-y-0 right-1/4 w-1 bg-gradient-to-l from-lamp/10 to-transparent" />
          <div className="absolute inset-y-0 right-1/2 w-1 bg-gradient-to-l from-lamp/5 to-transparent" />
          <div className="absolute inset-y-0 right-3/4 w-1 bg-gradient-to-l from-lamp/10 to-transparent" />
        </div>
        <div className="absolute inset-y-0 left-0 w-px bg-brass/40" />
      </div>
    </>
  );
}

/* ────────────────────────────────────────
   DOORS — brass double-doors
   ──────────────────────────────────────── */

function DoorPanels({ entering }: { entering: boolean }) {
  const t = '0.5s cubic-bezier(0.4, 0, 0.2, 1)';
  return (
    <>
      {/* Left door */}
      <div
        className="fixed inset-y-0 left-0 w-1/2 z-[100] door-panel-left"
        style={{
          transform: entering ? 'translateX(0%)' : 'translateX(-100%)',
          transition: `transform ${t}`,
        }}
      >
        <div className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-brass/60 via-brass/30 to-brass/60" />
        <div className="absolute inset-8 border border-brass/15 pointer-events-none" />
        <div className="absolute inset-16 border border-brass/8 pointer-events-none" />
        <div className="absolute top-1/2 right-6 -translate-y-1/2 w-2 h-16 rounded-full bg-gradient-to-b from-brass-highlight via-brass to-brass-shadow" />
      </div>

      {/* Right door */}
      <div
        className="fixed inset-y-0 right-0 w-1/2 z-[100] door-panel-right"
        style={{
          transform: entering ? 'translateX(0%)' : 'translateX(100%)',
          transition: `transform ${t}`,
        }}
      >
        <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-brass/60 via-brass/30 to-brass/60" />
        <div className="absolute inset-8 border border-brass/15 pointer-events-none" />
        <div className="absolute inset-16 border border-brass/8 pointer-events-none" />
        <div className="absolute top-1/2 left-6 -translate-y-1/2 w-2 h-16 rounded-full bg-gradient-to-b from-brass-highlight via-brass to-brass-shadow" />
      </div>
    </>
  );
}

/* ────────────────────────────────────────
   VAULT — heavy steel slab slides in from right
   ──────────────────────────────────────── */

function VaultDoor({ entering }: { entering: boolean }) {
  const t = '0.7s cubic-bezier(0.2, 0, 0.3, 1)';
  return (
    <div
      className="fixed inset-0 z-[100] vault-door"
      style={{
        transform: entering ? 'translateX(0%)' : 'translateX(100%)',
        transition: `transform ${t}`,
      }}
    >
      {/* Combination dial */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-brass/20">
        <div className="absolute inset-4 rounded-full border border-brass/15" />
        <div className="absolute inset-8 rounded-full border border-brass/10" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-brass/15" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-brass/15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-brass/30" />
      </div>
      {/* Left bolt column */}
      <div className="absolute top-0 bottom-0 left-12 flex flex-col justify-evenly">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-brass/10 border border-brass/15" />
        ))}
      </div>
      {/* Right bolt column */}
      <div className="absolute top-0 bottom-0 right-12 flex flex-col justify-evenly">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-brass/10 border border-brass/15" />
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────
   FOG — soft mist opacity dissolve
   ──────────────────────────────────────── */

function FogScreen({ entering }: { entering: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[100] fog-overlay"
      style={{
        opacity: entering ? 1 : 0,
        transition: 'opacity 0.6s ease-in-out',
      }}
    />
  );
}

/* ────────────────────────────────────────
   STATIC — CRT scan-line wipe
   ──────────────────────────────────────── */

function StaticWipe({ entering }: { entering: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[100] static-wipe"
      style={{
        transform: entering ? 'scaleY(1)' : 'scaleY(0)',
        transformOrigin: 'center',
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="absolute inset-0 scanlines pointer-events-none" />
      <div
        className="absolute left-0 right-0 h-px bg-lamp/60 top-1/2"
        style={{
          transform: entering ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 0.25s ease-out 0.1s',
        }}
      />
    </div>
  );
}
