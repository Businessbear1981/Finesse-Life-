'use client';

import type {ReactElement, ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  Wine,
  Martini,
  Scale as ScaleIcon,
  Sparkles,
  Building2,
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
  TrendingUp,
  Hotel,
  Scissors,
  Calendar,
  Gamepad2,
  Plane,
  ChefHat,
  Dumbbell,
  Gem,
  Music,
  Fingerprint,
  Archive,
  BookOpen,
  Camera,
  Sun,
} from 'lucide-react';
import {useLocalPref} from '@/components/after-hours';
import './finesse-layout.css';

interface RoomDef {
  path: string;
  label: string;
  icon: (props: {size: number; strokeWidth: number}) => ReactElement;
}

/*
 * Rail labels are the registry names (src/lib/rooms/registry.ts) with the
 * leading "The " dropped to fit the 72px tile. "Scrapbook" is kept for
 * /archive because CONTEXT.md defines it; "Market" is not a registry room.
 * Existing order is preserved; rooms that were reachable only from the Lobby
 * directory are appended at the end of each rail. Every registry room except
 * VIP Room (header crown) and Concierge (dock Nova) is on a rail or the dock
 * on both sides.
 */

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
  {path: '/closet',     label: 'Closet',      icon: p => <Archive {...p} />},
  {path: '/camera',     label: 'Camera',      icon: p => <Camera {...p} />},
  {path: '/perdiem',    label: 'Per Diem',    icon: p => <Calendar {...p} />},
];

const LEFT_ROOMS_MASC: RoomDef[] = [
  {path: '/lobby',      label: 'Lobby',       icon: p => <Hotel {...p} />},
  {path: '/wardrobe',   label: 'Wardrobe',    icon: p => <Shirt {...p} />},
  {path: '/bag',        label: 'Bag',         icon: p => <Briefcase {...p} />},
  {path: '/perdiem',    label: 'Per Diem',    icon: p => <Calendar {...p} />},
  {path: '/nightvision',label: 'NightVision', icon: p => <Eye {...p} />},
  {path: '/market',     label: 'Market',      icon: p => <Store {...p} />},
  {path: '/clubhouse',  label: 'Clubhouse',   icon: p => <Gamepad2 {...p} />},
  {path: '/kitchen',    label: 'Kitchen',     icon: p => <ChefHat {...p} />},
  {path: '/gym',        label: 'Gym',         icon: p => <Dumbbell {...p} />},
  {path: '/registry',   label: 'Registry',    icon: p => <Gift {...p} />},
  {path: '/stylist',    label: 'Stylist',     icon: p => <Scissors {...p} />},
  {path: '/salon',      label: 'Salon',       icon: p => <Sparkles {...p} />},
  {path: '/closet',     label: 'Closet',      icon: p => <Archive {...p} />},
  {path: '/camera',     label: 'Camera',      icon: p => <Camera {...p} />},
];

/* ─── RIGHT RAIL: Experience & Intel ─── */
const RIGHT_ROOMS: RoomDef[] = [
  {path: '/archive',    label: 'Scrapbook',   icon: p => <Clapperboard {...p} />},
  {path: '/lounge',     label: 'Lounge',      icon: p => <Martini {...p} />},
  {path: '/entourage',  label: 'Entourage',   icon: p => <Users {...p} />},
  {path: '/lab',        label: 'Lab',         icon: p => <FlaskConical {...p} />},
  {path: '/switchboard',label: 'Switchboard', icon: p => <Phone {...p} />},
  {path: '/backstage',  label: 'Backstage',   icon: p => <Monitor {...p} />},
  {path: '/clubhouse',  label: 'Clubhouse',   icon: p => <Gamepad2 {...p} />},
  {path: '/departures', label: 'Departures',  icon: p => <Plane {...p} />},
  {path: '/ballroom',   label: 'Ballroom',    icon: p => <Gem {...p} />},
  {path: '/jazz-club',  label: 'Jazz Club',   icon: p => <Music {...p} />},
  {path: '/this-is-you',label: 'This Is You', icon: p => <Fingerprint {...p} />},
  {path: '/diary',      label: 'Diary',       icon: p => <BookOpen {...p} />},
  {path: '/carpe-diem', label: 'Carpe Diem',  icon: p => <Sun {...p} />},
];

const RIGHT_ROOMS_MASC: RoomDef[] = [
  {path: '/archive',    label: 'Scrapbook',   icon: p => <Clapperboard {...p} />},
  {path: '/lounge',     label: 'Lounge',      icon: p => <Wine {...p} />},
  {path: '/entourage',  label: 'Entourage',   icon: p => <Users {...p} />},
  {path: '/lab',        label: 'Lab',         icon: p => <FlaskConical {...p} />},
  {path: '/switchboard',label: 'Switchboard', icon: p => <Phone {...p} />},
  {path: '/backstage',  label: 'Backstage',   icon: p => <Monitor {...p} />},
  {path: '/carpe-diem', label: 'Carpe Diem',  icon: p => <TrendingUp {...p} />},
  {path: '/departures', label: 'Departures',  icon: p => <Plane {...p} />},
  {path: '/ballroom',   label: 'Ballroom',    icon: p => <Gem {...p} />},
  {path: '/jazz-club',  label: 'Jazz Club',   icon: p => <Music {...p} />},
  {path: '/this-is-you',label: 'This Is You', icon: p => <Fingerprint {...p} />},
  {path: '/diary',      label: 'Diary',       icon: p => <BookOpen {...p} />},
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

/* ─── Rail Tile ─── */
function RailTile({room, active}: {room: RoomDef; active: boolean}) {
  return (
    <Link
      href={room.path}
      aria-label={room.label}
      aria-current={active ? 'page' : undefined}
      title={room.label}
      className="hf-tile"
      data-active={active || undefined}
    >
      <span className="hf-icon">{room.icon({size: 20, strokeWidth: active ? 2 : 1.5})}</span>
      {/* Labels drop below 480px: icon + dot only. */}
      <span className="hf-label">{room.label}</span>
      <span className="hf-dot" />
    </Link>
  );
}

/* ─── Dock Tile ─── */
function DockTile({room, active}: {room: RoomDef; active: boolean}) {
  return (
    <Link href={room.path} className="hf-dock-tile" data-active={active || undefined} aria-current={active ? 'page' : undefined}>
      <span className="hf-icon">{room.icon({size: 20, strokeWidth: active ? 2 : 1.5})}</span>
      <span className="hf-dock-label">{room.label}</span>
    </Link>
  );
}

/** Active for the room itself and any nested route (e.g. /profile/edit). */
function isActivePath(pathname: string | null, path: string) {
  if (!pathname) return false;
  return pathname === path || pathname.startsWith(`${path}/`);
}

/*
 * Rails: 72px at every width ≥480px. Below 480px they collapse to a 44px
 * icon-only strip so content gets ~312px on a 400px phone. Rails scroll
 * vertically when the room list is taller than the viewport.
 * Frame heights are exposed as --hotel-top / --hotel-dock so rooms can sit fixed
 * UI above the dock (see AHDock).
 */

/* ─── Main Layout (After Hours) ─── */
export function FinesseLayout({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const gender = useLocalPref<string | null>('finesse_gender', (v) => v, null);

  const isMasc = gender === 'masculine';
  const brandName = isMasc ? 'CARPE DIEM' : 'FINESSE';

  const leftRooms  = isMasc ? LEFT_ROOMS_MASC  : LEFT_ROOMS;
  const rightRooms = isMasc ? RIGHT_ROOMS_MASC : RIGHT_ROOMS;
  const onVip = pathname === '/vip';
  const onProfile = pathname === '/profile';
  const onNova = pathname === '/concierge';

  return (
    <div className="hf ah-in-frame">
      {/* ═══ TOP BAR ═══ */}
      <header className="hf-top">
        <Link href="/profile" className="hf-round" data-active={onProfile || undefined} aria-label="Profile">
          <User size={16} strokeWidth={1.6} />
        </Link>
        <Link href="/lobby" className="hf-mark" aria-label={`${brandName} — the Lobby`}>{brandName}</Link>
        <Link href="/vip" className="hf-round hf-round-vip" data-active={onVip || undefined} aria-label="VIP Room">
          <Crown size={16} strokeWidth={1.6} />
        </Link>
      </header>

      {/* ═══ LEFT RAIL — Style & Shopping ═══ */}
      <nav aria-label="Left rail" className="hf-rail hf-rail-left">
        {leftRooms.map(room => (
          <RailTile key={room.path} room={room} active={isActivePath(pathname, room.path)} />
        ))}
      </nav>

      {/* ═══ RIGHT RAIL — Experience & Intel ═══ */}
      <nav aria-label="Right rail" className="hf-rail hf-rail-right">
        {rightRooms.map(room => (
          <RailTile key={room.path} room={room} active={isActivePath(pathname, room.path)} />
        ))}
      </nav>

      {/* ═══ BOTTOM DOCK — Commerce ═══ */}
      <nav aria-label="Dock" className="hf-dock">
        {DOCK_LEFT.map(room => (
          <DockTile key={room.path} room={room} active={pathname === room.path} />
        ))}

        {/* Center: Nova */}
        <Link href="/concierge" className="hf-nova" data-active={onNova || undefined} aria-current={onNova ? 'page' : undefined}>
          <span className="hf-nova-orb"><Bell size={18} strokeWidth={1.8} /></span>
          <span className="hf-dock-label">Nova</span>
        </Link>

        {DOCK_RIGHT.map(room => (
          <DockTile key={room.path} room={room} active={pathname === room.path} />
        ))}
      </nav>

      {/* Main content */}
      <main className="hf-main">{children}</main>
    </div>
  );
}
