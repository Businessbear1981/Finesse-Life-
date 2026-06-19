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
  User,
  Bell,
  Eye,
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
  Hotel,
  Scissors,
  Calendar,
  Gamepad2,
  Plane,
  ChefHat,
  Dumbbell,
} from 'lucide-react';

interface RoomDef {
  path: string;
  label: string;
  icon: (props: {size: number; strokeWidth: number}) => ReactElement;
}

/* ─── LEFT RAIL: Style & Shopping ─── */
const LEFT_ROOMS: RoomDef[] = [
  {path: '/lobby',      label: 'Lobby',       icon: p => <Hotel {...p} />},
  {path: '/wardrobe',   label: 'Wardrobe',    icon: p => <Shirt {...p} />},
  {path: '/bag',        label: 'Bag',         icon: p => <Briefcase {...p} />},
  {path: '/registry',   label: 'Registry',    icon: p => <Gift {...p} />},
  {path: '/nightvision',label: 'NightVision', icon: p => <Eye {...p} />},
  {path: '/stylist',    label: 'Stylist',     icon: p => <Scissors {...p} />},
  {path: '/salon',      label: 'Salon',       icon: p => <Sparkles {...p} />},
  {path: '/kitchen',    label: 'Kitchen',     icon: p => <ChefHat {...p} />},
  {path: '/gym',        label: 'Gym',         icon: p => <Dumbbell {...p} />},
];

const LEFT_ROOMS_MASC: RoomDef[] = [
  {path: '/lobby',      label: 'Lobby',       icon: p => <Hotel {...p} />},
  {path: '/wardrobe',   label: 'Wardrobe',    icon: p => <Shirt {...p} />},
  {path: '/bag',        label: 'Bag',         icon: p => <Briefcase {...p} />},
  {path: '/perdiem',    label: 'Per Diem',    icon: p => <Calendar {...p} />},
  {path: '/nightvision',label: 'NightVision', icon: p => <Eye {...p} />},
  {path: '/market',     label: 'Market',      icon: p => <Store {...p} />},
  {path: '/clubhouse',  label: 'Game Room',   icon: p => <Gamepad2 {...p} />},
  {path: '/kitchen',    label: 'Kitchen',     icon: p => <ChefHat {...p} />},
  {path: '/gym',        label: 'Gym',         icon: p => <Dumbbell {...p} />},
];

/* ─── RIGHT RAIL: Experience & Intel ─── */
const RIGHT_ROOMS: RoomDef[] = [
  {path: '/archive',    label: 'Scrapbook',   icon: p => <Clapperboard {...p} />},
  {path: '/lounge',     label: 'Lounge',      icon: p => <Martini {...p} />},
  {path: '/entourage',  label: 'Entourage',   icon: p => <Users {...p} />},
  {path: '/lab',        label: 'Lab',         icon: p => <FlaskConical {...p} />},
  {path: '/switchboard',label: 'Switchboard', icon: p => <Phone {...p} />},
  {path: '/backstage',  label: 'Lair',        icon: p => <Monitor {...p} />},
  {path: '/clubhouse',  label: 'Game Room',   icon: p => <Gamepad2 {...p} />},
  {path: '/departures', label: 'Depart',      icon: p => <Plane {...p} />},
];

const RIGHT_ROOMS_MASC: RoomDef[] = [
  {path: '/archive',    label: 'Scrapbook',   icon: p => <Clapperboard {...p} />},
  {path: '/lounge',     label: 'Lounge',      icon: p => <Wine {...p} />},
  {path: '/entourage',  label: 'Entourage',   icon: p => <Users {...p} />},
  {path: '/lab',        label: 'Lab',         icon: p => <FlaskConical {...p} />},
  {path: '/switchboard',label: 'Switchboard', icon: p => <Phone {...p} />},
  {path: '/backstage',  label: 'Lair',        icon: p => <Monitor {...p} />},
  {path: '/carpe-diem', label: 'Carpe Diem',  icon: p => <TrendingUp {...p} />},
  {path: '/departures', label: 'Depart',      icon: p => <Plane {...p} />},
];

/* ─── BOTTOM DOCK: Commerce ─── */
const DOCK_LEFT: RoomDef[] = [
  {path: '/vault',    label: 'Vault',    icon: p => <Lock {...p} />},
  {path: '/scale',    label: 'Scale',    icon: p => <ScaleIcon {...p} />},
];
const DOCK_RIGHT: RoomDef[] = [
  {path: '/exchange',   label: 'Exchange',  icon: p => <TrendingUp {...p} />},
  {path: '/embassy',    label: 'Embassy',   icon: p => <Building2 {...p} />},
];

/* ─── Art Deco SVGs ─── */
function DecoBorderSVG() {
  return (
    <svg className="absolute bottom-0 left-0 right-0 h-[6px] w-full" preserveAspectRatio="none" viewBox="0 0 1200 6">
      <defs>
        <linearGradient id="deco-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#6B5028" stopOpacity="0" />
          <stop offset="15%"  stopColor="#C9A961" stopOpacity="0.6" />
          <stop offset="50%"  stopColor="#E8C87A" stopOpacity="0.8" />
          <stop offset="85%"  stopColor="#C9A961" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#6B5028" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="1" fill="url(#deco-grad)" />
      <rect x="0" y="1" width="1200" height="2" fill="#4A1922" opacity="0.6" />
      <rect x="0" y="3" width="1200" height="0.5" fill="url(#deco-grad)" opacity="0.4" />
      <rect x="100" y="4" width="1000" height="0.5" fill="#A0A0A8" opacity="0.15" />
      {Array.from({length: 40}).map((_, i) => (
        <rect key={i} x={30 * i + 14} y="1.5" width="2" height="2"
          transform={`rotate(45, ${30 * i + 15}, 2.5)`} fill="#C9A961" opacity="0.3" />
      ))}
      <rect x="0" y="5" width="1200" height="1" fill="#6B1E2E" opacity="0.4" />
    </svg>
  );
}

function DecoTopFrame() {
  return (
    <svg className="absolute top-0 left-0 right-0 h-[4px] w-full" preserveAspectRatio="none" viewBox="0 0 1200 4">
      <defs>
        <linearGradient id="deco-top-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#4A1922" stopOpacity="0" />
          <stop offset="20%"  stopColor="#4A1922" stopOpacity="0.5" />
          <stop offset="50%"  stopColor="#6B1E2E" stopOpacity="0.7" />
          <stop offset="80%"  stopColor="#4A1922" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4A1922" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="2" fill="url(#deco-top-grad)" />
      <rect x="0" y="2" width="1200" height="0.5" fill="#C9A961" opacity="0.2" />
      <rect x="0" y="3" width="1200" height="1" fill="#4A1922" opacity="0.3" />
    </svg>
  );
}

/* ─── Rail Tile ─── */
function RailTile({room, active}: {room: RoomDef; active: boolean}) {
  return (
    <Link
      href={room.path}
      className="relative flex flex-col items-center gap-0.5 px-2.5 py-2 border transition-all duration-300 w-full overflow-hidden"
      style={{
        borderColor: active ? 'rgba(0,255,136,0.35)' : 'rgba(201,169,97,0.04)',
        background: active
          ? 'radial-gradient(ellipse at center, rgba(0,255,136,0.07) 0%, transparent 70%)'
          : 'transparent',
        boxShadow: active ? '0 0 16px rgba(0,255,136,0.12), inset 0 0 10px rgba(0,255,136,0.04)' : 'none',
      }}
    >
      <div className="relative z-10 transition-all duration-300"
        style={{
          color: active ? '#00FF88' : 'rgba(244,232,208,0.18)',
          filter: active ? 'drop-shadow(0 0 5px rgba(0,255,136,0.7))' : 'none',
        }}
      >
        {room.icon({size: 22, strokeWidth: active ? 2.2 : 1.5})}
      </div>
      <span className="relative z-10 font-label text-[8px] tracking-[0.08em] uppercase leading-tight text-center"
        style={{color: active ? '#00FF88bb' : 'rgba(244,232,208,0.11)'}}
      >
        {room.label}
      </span>
      <span className="relative z-10 w-[5px] h-[5px] rounded-full transition-all duration-300"
        style={{
          background: active ? '#00FF88' : 'rgba(244,232,208,0.04)',
          boxShadow: active ? '0 0 6px rgba(0,255,136,0.8), 0 0 12px rgba(0,255,136,0.4)' : 'none',
        }}
      />
    </Link>
  );
}

/* ─── Dock Tile ─── */
function DockTile({room, active}: {room: RoomDef; active: boolean}) {
  return (
    <Link
      href={room.path}
      className="relative flex flex-col items-center gap-1 px-4 py-2.5 border transition-all duration-300 flex-1 overflow-hidden"
      style={{
        borderColor: active ? 'rgba(201,169,97,0.5)' : 'rgba(201,169,97,0.08)',
        background: active
          ? 'radial-gradient(ellipse at center, rgba(201,169,97,0.1) 0%, transparent 70%)'
          : 'transparent',
        boxShadow: active ? '0 0 16px rgba(201,169,97,0.15), inset 0 0 8px rgba(201,169,97,0.04)' : 'none',
      }}
    >
      <div className="relative z-10 transition-all duration-300"
        style={{
          color: active ? '#E8C87A' : 'rgba(244,232,208,0.22)',
          filter: active ? 'drop-shadow(0 0 5px rgba(201,169,97,0.6))' : 'none',
        }}
      >
        {room.icon({size: 22, strokeWidth: active ? 2.2 : 1.5})}
      </div>
      <span className="relative z-10 font-label text-[9px] tracking-[0.1em] uppercase"
        style={{color: active ? '#E8C87Acc' : 'rgba(244,232,208,0.14)'}}
      >
        {room.label}
      </span>
    </Link>
  );
}

/* ─── Main Layout ─── */
export function FinesseLayout({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const [gender, setGender] = useState<string | null>(null);

  useEffect(() => {
    setGender(localStorage.getItem('finesse_gender'));
  }, []);

  const isMasc = gender === 'masculine';
  const brandName = isMasc ? 'CARPE DIEM' : 'FINESSE';

  const leftRooms  = isMasc ? LEFT_ROOMS_MASC  : LEFT_ROOMS;
  const rightRooms = isMasc ? RIGHT_ROOMS_MASC : RIGHT_ROOMS;

  return (
    <div className="min-h-screen bg-ink relative">

      {/* ═══ TOP BANNER ═══ */}
      <div className="fixed top-0 left-0 right-0 z-50"
        style={{background: 'linear-gradient(to bottom, #0A0406 0%, #0E0608 40%, #12080A 70%, #0A0406 100%)'}}
      >
        <DecoTopFrame />
        <div className="relative">
          {/* Art deco side columns */}
          <div className="absolute left-3 top-0 bottom-0 flex gap-px">
            <div className="w-[2px] bg-gradient-to-b from-brass/30 via-oxblood/20 to-brass/10" />
            <div className="w-[1px] bg-gradient-to-b from-brass/15 via-transparent to-brass/10" />
          </div>
          <div className="absolute right-3 top-0 bottom-0 flex gap-px">
            <div className="w-[1px] bg-gradient-to-b from-brass/15 via-transparent to-brass/10" />
            <div className="w-[2px] bg-gradient-to-b from-brass/30 via-oxblood/20 to-brass/10" />
          </div>

          {/* Profile icon — top left */}
          <Link href="/profile"
            className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center border transition-all duration-300 group"
            style={{
              borderColor: pathname === '/profile' ? 'rgba(201,169,97,0.5)' : 'rgba(201,169,97,0.1)',
              background: 'rgba(10,4,6,0.6)',
            }}
          >
            <User size={14} strokeWidth={1.5}
              style={{color: pathname === '/profile' ? '#E8C87A' : 'rgba(244,232,208,0.3)'}}
            />
          </Link>

          {/* Brand wordmark — center */}
          <Link href="/lobby" className="block">
            <div className="flex items-center justify-center pt-2.5 pb-0.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-px bg-gradient-to-r from-transparent to-oxblood/50" />
                  <div className="w-3 h-px bg-brass/30" />
                  <div className="w-1 h-1 rotate-45 bg-oxblood/40" />
                  <div className="w-1.5 h-1.5 rotate-45 border border-brass/40" />
                </div>
                <h1 className="font-display italic select-none"
                  style={{
                    color: '#E8C87A',
                    textShadow: '0 0 30px rgba(201,169,97,0.2), 0 1px 2px rgba(0,0,0,0.8)',
                    fontSize: isMasc ? '16px' : '22px',
                    letterSpacing: isMasc ? '0.12em' : '0.18em',
                  }}
                >{brandName}</h1>
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
                <span className="font-label text-[6px] tracking-[0.5em] text-brass/30 uppercase">est. mmxxvi</span>
                <div className="w-4 h-px bg-oxblood/30" />
              </div>
            </div>
          </Link>

          {/* VIP crown — top right */}
          <Link href="/vip"
            className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center border transition-all duration-300 group"
            style={{
              borderColor: pathname === '/vip' ? 'rgba(255,169,107,0.6)' : 'rgba(201,169,97,0.12)',
              background: pathname === '/vip' ? 'rgba(255,169,107,0.08)' : 'rgba(10,4,6,0.6)',
              boxShadow: pathname === '/vip' ? '0 0 12px rgba(255,169,107,0.2)' : 'none',
            }}
          >
            <Crown size={14} strokeWidth={1.5}
              style={{
                color: pathname === '/vip' ? '#FFA96B' : 'rgba(201,169,97,0.35)',
                filter: pathname === '/vip' ? 'drop-shadow(0 0 4px rgba(255,169,107,0.6))' : 'none',
              }}
            />
          </Link>
        </div>

        {/* Art deco divider */}
        <div className="flex items-center justify-center gap-1 pb-1">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-oxblood/40 to-oxblood/20" />
          <div className="w-1 h-1 rotate-45 bg-brass/20" />
          <div className="flex gap-px">
            {Array.from({length: 5}).map((_, i) => (
              <div key={i} className="w-[3px] h-[3px] rotate-45"
                style={{background: i === 2 ? '#C9A96140' : '#4A192230'}} />
            ))}
          </div>
          <div className="w-1 h-1 rotate-45 bg-brass/20" />
          <div className="w-16 h-px bg-gradient-to-l from-transparent via-oxblood/40 to-oxblood/20" />
        </div>
        <div className="relative h-[6px]"><DecoBorderSVG /></div>
      </div>

      {/* ═══ LEFT RAIL — Style & Shopping ═══ */}
      <div className="fixed left-0 top-[64px] bottom-[70px] z-40 w-[72px] flex flex-col items-center py-1 gap-0 overflow-y-auto"
        style={{
          background: 'linear-gradient(to right, rgba(10,4,6,0.98), rgba(10,4,6,0.88))',
          borderRight: '1px solid rgba(201,169,97,0.06)',
        }}
      >
        {leftRooms.map(room => (
          <RailTile key={room.path} room={room} active={pathname === room.path} />
        ))}
      </div>

      {/* ═══ RIGHT RAIL — Experience & Intel ═══ */}
      <div className="fixed right-0 top-[64px] bottom-[70px] z-40 w-[72px] flex flex-col items-center py-1 gap-0 overflow-y-auto"
        style={{
          background: 'linear-gradient(to left, rgba(10,4,6,0.98), rgba(10,4,6,0.88))',
          borderLeft: '1px solid rgba(201,169,97,0.06)',
        }}
      >
        {rightRooms.map(room => (
          <RailTile key={room.path} room={room} active={pathname === room.path} />
        ))}
      </div>

      {/* ═══ BOTTOM DOCK — Commerce ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-[70px] flex items-stretch"
        style={{
          background: 'linear-gradient(to top, #0A0406 0%, #0E0608 60%, rgba(10,4,6,0.92) 100%)',
          borderTop: '1px solid rgba(201,169,97,0.08)',
        }}
      >
        {/* Left: Vault + Scale */}
        {DOCK_LEFT.map(room => (
          <DockTile key={room.path} room={room} active={pathname === room.path} />
        ))}

        {/* Center: Nova FAB */}
        <Link href="/concierge"
          className="relative flex flex-col items-center justify-center gap-1 px-6 border-x transition-all duration-300 group"
          style={{
            borderColor: pathname === '/concierge' ? 'rgba(255,77,125,0.4)' : 'rgba(201,169,97,0.12)',
            background: pathname === '/concierge'
              ? 'radial-gradient(ellipse at center, rgba(255,77,125,0.12) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(201,169,97,0.06) 0%, transparent 70%)',
            minWidth: '100px',
          }}
        >
          {/* Pulsing ring */}
          <div className="absolute inset-[8px] rounded-full border"
            style={{borderColor: pathname === '/concierge' ? 'rgba(255,77,125,0.2)' : 'rgba(201,169,97,0.08)'}} />
          <Bell size={24} strokeWidth={pathname === '/concierge' ? 2.2 : 1.5}
            style={{
              color: pathname === '/concierge' ? '#FF4D7D' : 'rgba(201,169,97,0.6)',
              filter: pathname === '/concierge' ? 'drop-shadow(0 0 6px rgba(255,77,125,0.7))' : 'drop-shadow(0 0 4px rgba(201,169,97,0.3))',
              position: 'relative', zIndex: 10,
            }}
          />
          <span className="font-label text-[7px] tracking-[0.2em] uppercase relative z-10"
            style={{color: pathname === '/concierge' ? '#FF4D7Daa' : 'rgba(201,169,97,0.4)'}}
          >Nova</span>
        </Link>

        {/* Right: Exchange + Departures */}
        {DOCK_RIGHT.map(room => (
          <DockTile key={room.path} room={room} active={pathname === room.path} />
        ))}
      </div>

      {/* Main content */}
      <main className="pt-[68px] pl-[72px] pr-[72px] pb-[70px]">{children}</main>
    </div>
  );
}
