'use client';

import {useEffect, useState, type ReactElement, type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  Wine,
  Martini,
  Scale as ScaleIcon,
  Sparkles,
  Building2,
  Trophy,
  Store,
  Crown,
  Hotel,
  User,
  Bell,
  Users,
  Shirt,
  Lock,
  FlaskConical,
  Briefcase,
  Clapperboard,
  Monitor,
  Phone,
  Gift,
  Wallet,
  TrendingUp,
  Plane,
} from 'lucide-react';

/* ─── Room Config ─── */

interface RoomDef {
  path: string;
  label: string;
  icon: (props: {size: number; strokeWidth: number}) => ReactElement;
  color: string;
}

const PUBLIC_ROOMS: RoomDef[] = [
  {
    path: '/lounge',
    label: 'Lounge',
    icon: (p) => {
      // SSR-safe: gender filtering is handled in the render via state
      return <Wine {...p} />;
    },
    color: '#FF4D7D',
  },
  {path: '/scale', label: 'Scale', icon: (p) => <ScaleIcon {...p} />, color: '#00FF88'},
  {path: '/salon', label: 'Salon', icon: (p) => <Sparkles {...p} />, color: '#E8C87A'},
  {path: '/embassy', label: 'Embassy', icon: (p) => <Building2 {...p} />, color: '#69C9D0'},
  {path: '/clubhouse', label: 'Club', icon: (p) => <Trophy {...p} />, color: '#00FF88'},
  {path: '/market', label: 'Market', icon: (p) => <Store {...p} />, color: '#E8C87A'},
  {path: '/vip', label: 'VIP', icon: (p) => <Crown {...p} />, color: '#FF4D7D'},
  {path: '/lobby', label: 'Lobby', icon: (p) => <Hotel {...p} />, color: '#C9A961'},
  {path: '/exchange', label: 'Exchange', icon: (p) => <TrendingUp {...p} />, color: '#00FF88'},
  {path: '/departures', label: 'Travel', icon: (p) => <Plane {...p} />, color: '#69C9D0'},
];

const PROFILE_TILE: RoomDef = {
  path: '/profile',
  label: 'Profile',
  icon: (p) => <User {...p} />,
  color: '#E8C87A',
};

const PRIVATE_ROOMS: RoomDef[] = [
  {path: '/concierge', label: 'Concierge', icon: (p) => <Bell {...p} />, color: '#FFA96B'},
  {path: '/entourage', label: 'Entourage', icon: (p) => <Users {...p} />, color: '#69C9D0'},
  {path: '/wardrobe', label: 'Wardrobe', icon: (p) => <Shirt {...p} />, color: '#E8C87A'},
  {path: '/vault', label: 'Vault', icon: (p) => <Lock {...p} />, color: '#C9A961'},
  {path: '/lab', label: 'Lab', icon: (p) => <FlaskConical {...p} />, color: '#FF4D7D'},
  {path: '/bag', label: 'Bag', icon: (p) => <Briefcase {...p} />, color: '#E8C87A'},
  {path: '/archive', label: 'Scrapbook', icon: (p) => <Clapperboard {...p} />, color: '#FFA96B'},
  {path: '/backstage', label: 'Lair', icon: (p) => <Monitor {...p} />, color: '#00FF88'},
  {path: '/switchboard', label: 'Switch', icon: (p) => <Phone {...p} />, color: '#69C9D0'},
  {path: '/registry', label: 'Registry', icon: (p) => <Gift {...p} />, color: '#C9A961'},
  {path: '/perdiem', label: 'Per Diem', icon: (p) => <Wallet {...p} />, color: '#00FF88'},
];

/* ─── Inline SVG: Art Deco border pattern ─── */
function DecoBorderSVG() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 h-[6px] w-full"
      preserveAspectRatio="none"
      viewBox="0 0 1200 6"
    >
      <defs>
        <linearGradient id="deco-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6B5028" stopOpacity="0" />
          <stop offset="15%" stopColor="#C9A961" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#E8C87A" stopOpacity="0.8" />
          <stop offset="85%" stopColor="#C9A961" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#6B5028" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Main brass line */}
      <rect x="0" y="0" width="1200" height="1" fill="url(#deco-grad)" />
      {/* Oxblood band */}
      <rect x="0" y="1" width="1200" height="2" fill="#4A1922" opacity="0.6" />
      {/* Thin brass accent */}
      <rect x="0" y="3" width="1200" height="0.5" fill="url(#deco-grad)" opacity="0.4" />
      {/* Silver/cream fine line */}
      <rect x="100" y="4" width="1000" height="0.5" fill="#A0A0A8" opacity="0.15" />
      {/* Repeating diamond pattern */}
      {Array.from({length: 40}).map((_, i) => (
        <rect
          key={i}
          x={30 * i + 14}
          y="1.5"
          width="2"
          height="2"
          transform={`rotate(45, ${30 * i + 15}, 2.5)`}
          fill="#C9A961"
          opacity="0.3"
        />
      ))}
      {/* Bottom oxblood */}
      <rect x="0" y="5" width="1200" height="1" fill="#6B1E2E" opacity="0.4" />
    </svg>
  );
}

/* ─── Inline SVG: Top decorative frame lines ─── */
function DecoTopFrame() {
  return (
    <svg
      className="absolute top-0 left-0 right-0 h-[4px] w-full"
      preserveAspectRatio="none"
      viewBox="0 0 1200 4"
    >
      <defs>
        <linearGradient id="deco-top-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A1922" stopOpacity="0" />
          <stop offset="20%" stopColor="#4A1922" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#6B1E2E" stopOpacity="0.7" />
          <stop offset="80%" stopColor="#4A1922" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4A1922" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="2" fill="url(#deco-top-grad)" />
      <rect x="0" y="2" width="1200" height="0.5" fill="#C9A961" opacity="0.2" />
      <rect x="0" y="3" width="1200" height="1" fill="#4A1922" opacity="0.3" />
    </svg>
  );
}

/* ─── Room Tile Component ─── */
function RoomTile({room, active}: {room: RoomDef; active: boolean}) {
  return (
    <Link
      href={room.path}
      className={`relative flex flex-col items-center gap-1 px-2.5 py-2 border transition-all duration-300 min-w-[50px] overflow-hidden ${
        active ? 'border-green-500/40' : 'border-cream/5 hover:border-cream/15'
      }`}
      style={{
        background: active
          ? 'radial-gradient(ellipse at center, rgba(0,255,136,0.08) 0%, rgba(0,255,136,0.02) 60%, transparent 100%)'
          : 'transparent',
        boxShadow: active
          ? '0 0 20px rgba(0,255,136,0.15), 0 0 6px rgba(0,255,136,0.1), inset 0 0 12px rgba(0,255,136,0.05)'
          : 'none',
      }}
    >
      {/* Backlit glow when active */}
      {active && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, rgba(0,255,136,0.06) 0%, transparent 70%)',
          }}
        />
      )}
      {/* Lucide SVG icon — HD crisp */}
      <div
        className="relative z-10 transition-all duration-300"
        style={{
          color: active ? '#00FF88' : 'rgba(244,232,208,0.18)',
          filter: active
            ? 'drop-shadow(0 0 6px rgba(0,255,136,0.7)) drop-shadow(0 0 14px rgba(0,255,136,0.4))'
            : 'none',
        }}
      >
        {room.icon({size: 20, strokeWidth: active ? 2.2 : 1.5})}
      </div>
      {/* Label */}
      <span
        className="relative z-10 font-label text-[7px] tracking-[0.1em] uppercase transition-all duration-300 leading-tight"
        style={{
          color: active ? '#00FF88cc' : 'rgba(244,232,208,0.12)',
          textShadow: active ? '0 0 8px rgba(0,255,136,0.4)' : 'none',
        }}
      >
        {room.label}
      </span>
      {/* LED — bright green backlit when on, dark off */}
      <span
        className={`relative z-10 w-[5px] h-[5px] rounded-full transition-all duration-300 ${active ? 'animate-pulse' : ''}`}
        style={{
          background: active ? '#00FF88' : 'rgba(244,232,208,0.04)',
          boxShadow: active
            ? '0 0 8px rgba(0,255,136,0.8), 0 0 16px rgba(0,255,136,0.4), 0 0 24px rgba(0,255,136,0.2)'
            : 'none',
        }}
      />
    </Link>
  );
}

/* ─── Lounge Tile — gender-aware icon, rendered client-side ─── */
function LoungeTile({active}: {active: boolean}) {
  const [gender, setGender] = useState<string | null>(null);
  useEffect(() => {
    setGender(localStorage.getItem('finesse_gender'));
  }, []);

  const room: RoomDef = {
    path: '/lounge',
    label: 'Lounge',
    icon: (p) => (gender === 'masculine' ? <Wine {...p} /> : <Martini {...p} />),
    color: '#FF4D7D',
  };

  return <RoomTile room={room} active={active} />;
}

/* ─── Main Layout Export ─── */
export function FinesseLayout({children}: {children: ReactNode}) {
  const pathname = usePathname();

  // SSR-safe gender filtering
  const [gender, setGender] = useState<string | null>(null);
  useEffect(() => {
    setGender(localStorage.getItem('finesse_gender'));
  }, []);

  const filteredPublicRooms = PUBLIC_ROOMS.filter((room) => {
    if (room.path === '/lounge') return false; // rendered separately as LoungeTile
    if (room.path === '/clubhouse' && gender !== 'masculine') return false;
    if (room.path === '/salon' && gender === 'masculine') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-ink relative">
      {/* ═══ ART DECO BANNER ═══ */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background:
            'linear-gradient(to bottom, #0A0406 0%, #0E0608 40%, #12080A 70%, #0A0406 100%)',
        }}
      >
        <DecoTopFrame />

        {/* ── BRAND HERO — centered ── */}
        <div className="relative">
          {/* Side columns — art deco vertical accents */}
          <div className="absolute left-3 top-0 bottom-0 flex gap-px">
            <div className="w-[2px] bg-gradient-to-b from-brass/30 via-oxblood/20 to-brass/10" />
            <div className="w-[1px] bg-gradient-to-b from-brass/15 via-transparent to-brass/10" />
          </div>
          <div className="absolute right-3 top-0 bottom-0 flex gap-px">
            <div className="w-[1px] bg-gradient-to-b from-brass/15 via-transparent to-brass/10" />
            <div className="w-[2px] bg-gradient-to-b from-brass/30 via-oxblood/20 to-brass/10" />
          </div>

          <Link href="/lobby" className="block">
            <div className="flex items-center justify-center pt-2.5 pb-0.5">
              <div className="flex items-center gap-3">
                {/* Left ornament */}
                <div className="flex items-center gap-1">
                  <div className="w-6 h-px bg-gradient-to-r from-transparent to-oxblood/50" />
                  <div className="w-3 h-px bg-brass/30" />
                  <div className="w-1 h-1 rotate-45 bg-oxblood/40" />
                  <div className="w-1.5 h-1.5 rotate-45 border border-brass/40" />
                </div>

                <h1
                  className="font-display text-[22px] italic tracking-[0.18em] select-none"
                  style={{
                    color: '#E8C87A',
                    textShadow: '0 0 30px rgba(201,169,97,0.2), 0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  FINESSE
                </h1>

                {/* Right ornament */}
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rotate-45 border border-brass/40" />
                  <div className="w-1 h-1 rotate-45 bg-oxblood/40" />
                  <div className="w-3 h-px bg-brass/30" />
                  <div className="w-6 h-px bg-gradient-to-l from-transparent to-oxblood/50" />
                </div>
              </div>
            </div>
            <div className="flex justify-center pb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-px bg-oxblood/30" />
                <span className="font-label text-[6px] tracking-[0.5em] text-brass/30 uppercase">
                  est. mmxxvi
                </span>
                <div className="w-4 h-px bg-oxblood/30" />
              </div>
            </div>
          </Link>
        </div>

        {/* ── Art Deco divider between brand and rooms ── */}
        <div className="flex items-center justify-center gap-1 pb-1">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-oxblood/40 to-oxblood/20" />
          <div className="w-1 h-1 rotate-45 bg-brass/20" />
          <div className="flex gap-px">
            {Array.from({length: 5}).map((_, i) => (
              <div
                key={i}
                className="w-[3px] h-[3px] rotate-45"
                style={{background: i === 2 ? '#C9A96140' : '#4A192230'}}
              />
            ))}
          </div>
          <div className="w-1 h-1 rotate-45 bg-brass/20" />
          <div className="w-16 h-px bg-gradient-to-l from-transparent via-oxblood/40 to-oxblood/20" />
        </div>

        {/* ── Bottom Art Deco border ── */}
        <div className="relative h-[6px]">
          <DecoBorderSVG />
        </div>
      </div>

      {/* ═══ LEFT RAIL — Public rooms (gender-filtered) ═══ */}
      <div
        className="fixed left-0 top-[52px] bottom-0 z-40 w-[58px] flex flex-col items-center py-3 gap-0.5 overflow-y-auto"
        style={{
          background: 'linear-gradient(to right, rgba(10,4,6,0.98), rgba(10,4,6,0.88))',
          borderRight: '1px solid rgba(201,169,97,0.06)',
        }}
      >
        <RoomTile room={PROFILE_TILE} active={pathname === PROFILE_TILE.path} />
        <div className="w-6 h-px bg-brass/10 my-0.5" />
        <LoungeTile active={pathname === '/lounge'} />
        {filteredPublicRooms.map((room) => (
          <RoomTile key={room.path} room={room} active={pathname === room.path} />
        ))}
      </div>

      {/* ═══ RIGHT RAIL — Private rooms ═══ */}
      <div
        className="fixed right-0 top-[52px] bottom-0 z-40 w-[58px] flex flex-col items-center py-3 gap-0.5 overflow-y-auto"
        style={{
          background: 'linear-gradient(to left, rgba(10,4,6,0.98), rgba(10,4,6,0.88))',
          borderLeft: '1px solid rgba(201,169,97,0.06)',
        }}
      >
        {PRIVATE_ROOMS.map((room) => (
          <RoomTile key={room.path} room={room} active={pathname === room.path} />
        ))}
      </div>

      {/* Main content — offset for top banner + side rails */}
      <main className="pt-[58px] pl-[56px] pr-[56px]">{children}</main>

      {/* ═══ FLOATING CONCIERGE BELL ═══ */}
      {pathname !== '/concierge' && (
        <Link
          href="/concierge"
          className="fixed bottom-5 right-[68px] z-50 w-11 h-11 rounded-full flex items-center justify-center border border-brass/15 hover:border-brass/40 hover:bg-oxblood/20 transition-all duration-300 group"
          style={{
            background: 'linear-gradient(135deg, rgba(10,4,6,0.95), rgba(74,25,34,0.3))',
            boxShadow: '0 0 15px rgba(201,169,97,0.08), 0 4px 12px rgba(0,0,0,0.6)',
          }}
        >
          <Bell
            size={18}
            strokeWidth={1.5}
            className="text-brass/60 group-hover:text-brass transition-colors"
          />
        </Link>
      )}
    </div>
  );
}
