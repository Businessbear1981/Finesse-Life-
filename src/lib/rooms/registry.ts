/**
 * Finesse 31-room registry — compiled, typed view of FINESSE_31_ROOM_PROJECT.json.
 * The JSON is the planning/interchange artifact; import rooms from HERE in app code.
 * Penthouse is a destination inside the VIP Room (room 23), never room 32.
 * Validate with: npm run rooms:validate
 */
import project from '../../../FINESSE_31_ROOM_PROJECT.json';

export type Track = 'finesse' | 'carpe_diem';
export type RoomAccess = 'member' | 'vip';
export type TruthState = 'wired' | 'specified' | 'preview' | 'gated';
export type RoomPlate = 'canonical' | 'cinematic';

export type RoomDefinition = {
  number: number;
  id: string;
  name: string;
  plate: RoomPlate;
  route: string;
  category: string;
  access: RoomAccess;
  serviceDomains: string[];
  design: string;
  sceneBlueprint: {
    architecture: string;
    focalObject: string;
    motion: string;
    mobile: string;
    trackTreatment: Record<Track, string>;
  };
  primaryAction: string;
  api: string[];
  revenue: string[];
  phase: string;
  truthState: TruthState;
};

export const rooms = project.rooms as RoomDefinition[];
export type RoomId = (typeof rooms)[number]['id'];

export const ROOM_COUNT = 31 as const;
export const PENTHOUSE_ROUTE = project.accessFlow.vipPenthouseElevator.destination; // '/vip/penthouse'
export const palette = project.designSystem.palette;

export const roomById = (id: string) => rooms.find((r) => r.id === id);
export const roomByRoute = (route: string) => rooms.find((r) => r.route === route);

/** Wayfinding rails in the order of the building attachment (Build Authority §4). */
export const RAILS: {id: string; title: string; roomIds: string[]}[] = [
  {id: 'dock', title: 'The Dock', roomIds: ['lobby', 'bag', 'scale', 'vault', 'exchange', 'embassy']},
  {
    id: 'public',
    title: 'Public Rail',
    roomIds: ['lounge', 'entourage', 'clubhouse', 'jazz-club', 'stylist', 'salon', 'gym', 'kitchen', 'departures', 'ballroom'],
  },
  {id: 'private', title: 'Private Rail', roomIds: ['this-is-you', 'closet', 'diary', 'camera', 'lab', 'archive', 'registry']},
  {
    id: 'system',
    title: 'Orchestrator Floor',
    roomIds: ['concierge', 'wardrobe', 'backstage', 'switchboard', 'nightvision', 'per-diem', 'carpe-diem', 'vip-room'],
  },
];

export const railRooms = (railId: string) =>
  (RAILS.find((r) => r.id === railId)?.roomIds ?? []).map((id) => roomById(id)).filter(Boolean) as RoomDefinition[];

export const trackAccent = (track: Track) => (track === 'finesse' ? palette.finessePink : palette.carpeLamp);

/** Existing app stores the side choice as 'feminine' | 'masculine' in localStorage. */
export const trackFromGender = (g: string | null | undefined): Track => (g === 'masculine' ? 'carpe_diem' : 'finesse');

export const TRUTH_LABEL: Record<TruthState, string> = {
  wired: 'Live',
  preview: 'Preview',
  specified: 'In construction',
  gated: 'Members of the inner room',
};
