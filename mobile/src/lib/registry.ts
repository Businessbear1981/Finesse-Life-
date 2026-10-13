/**
 * Mobile view of the canonical 31-room manifest. room-manifest.json is a byte-for-byte copy of the repo-root
 * FINESSE_31_ROOM_PROJECT.json (the web registry's source), kept inside mobile/ so EAS can build mobile/ on its
 * own. Edit the root file, then run `node scripts/sync-room-manifest.mjs`; tests/room-manifest-sync.test.ts fails
 * when the two drift.
 */
import project from './room-manifest.json';

export type Track = 'finesse' | 'carpe_diem';
export type TruthState = 'wired' | 'specified' | 'preview' | 'gated';
export type Room = {
  number: number;
  id: string;
  name: string;
  plate: 'canonical' | 'cinematic';
  route: string;
  category: string;
  access: 'member' | 'vip';
  serviceDomains: string[];
  design: string;
  sceneBlueprint: {architecture: string; focalObject: string; motion: string; mobile: string; trackTreatment: Record<Track, string>};
  primaryAction: string;
  api: string[];
  revenue: string[];
  phase: string;
  truthState: TruthState;
};

export const rooms = project.rooms as Room[];
export const roomById = (id: string): Room | undefined => rooms.find((room) => room.id === id);
export const vipDestination = project.accessFlow.vipPenthouseElevator.destination;
