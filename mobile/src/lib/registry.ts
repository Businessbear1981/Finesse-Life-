/**
 * Mobile view of the canonical 31-room manifest. Same JSON as the web registry
 * (repo root FINESSE_31_ROOM_PROJECT.json) — one source of truth, no fork.
 */
import project from '../../../FINESSE_31_ROOM_PROJECT.json';

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
