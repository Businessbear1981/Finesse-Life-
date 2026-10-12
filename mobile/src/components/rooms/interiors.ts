// Every built room interior, keyed by hotel room id — shared by the hotel shell and /room/[id] so the two
// never disagree about which rooms have an interior. Manifest ids that differ are mapped in lib/room-ids.
import type {Side} from '@/lib/deco';
import {Lounge} from './Lounge';
import {Concierge} from './Concierge';
import {Vault} from './Vault';
import {Wardrobe} from './Wardrobe';
import {Gym} from './Gym';
import {Calendar} from './Calendar';
import {Kitchen} from './Kitchen';
import {Salon} from './Salon';
import {Scrapbook} from './Scrapbook';
import {Stylist} from './Stylist';
import {Starmaker} from './Starmaker';
import {Depart} from './Depart';
import {Entourage} from './Entourage';
import {Scale, Exchange, Embassy} from './Market';
import {Bag, Registry, Lab, Switchboard} from './Social';
import {NightVision, GameRoom, PerDiem} from './Lifestyle';
import {Profile} from './Penthouse';
import {CarpeDiem, Market, Ballroom} from './House';
import {Club} from './Club';
import {Closet} from './Closet';
import {Diary} from './Diary';
import {Camera} from './Camera';
import {JazzClub} from './JazzClub';

export const INTERIORS: Record<string, (p: {side: Side}) => React.JSX.Element> = {
  lounge: Lounge, concierge: Concierge, vault: Vault, wardrobe: Wardrobe, gym: Gym, calendar: Calendar, kitchen: Kitchen, salon: Salon,
  archive: Scrapbook, stylist: Stylist, starmaker: Starmaker, departures: Depart, entourage: Entourage, scale: Scale, exchange: Exchange,
  embassy: Embassy, bag: Bag, registry: Registry, lab: Lab, switchboard: Switchboard, nightvision: NightVision, clubhouse: GameRoom,
  perdiem: PerDiem, profile: Profile, 'carpe-diem': CarpeDiem, market: Market, ballroom: Ballroom, club: Club,
  closet: Closet, diary: Diary, camera: Camera, 'jazz-club': JazzClub,
};

// Rooms whose interiors make real server calls today. Only these get the green "ROOM ON" lamp; every other
// interior is sample or local-only and says so. (Signed out, live rooms show a sign-in prompt and a labelled sample.)
export const LIVE_ROOMS = new Set(['lounge', 'concierge', 'vault', 'gym', 'stylist', 'starmaker', 'kitchen', 'calendar', 'profile', 'closet', 'diary', 'camera', 'jazz-club']);
