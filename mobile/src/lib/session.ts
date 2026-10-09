// House session: which side of the house the member chose. Nothing sensitive lives here, but it is
// kept through the existing secure-storage wrapper so the choice survives a relaunch.
import {useSyncExternalStore} from 'react';
import type {Side} from './deco';
import {secureStorage} from './secure-storage';

const KEY = 'finesse_house_side';
let side: Side = 'her';
let chosen = false; // a late hydrate never overrides a pick made this launch
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const isSide = (v: unknown): v is Side => v === 'her' || v === 'him';

const hydrated: Promise<Side | null> = secureStorage
  .getItem(KEY)
  .then((v) => {
    if (isSide(v) && !chosen) { side = v; chosen = true; emit(); }
    return isSide(v) ? v : null;
  })
  .catch(() => null);

export const houseSession = {
  setSide(s: Side) {
    side = s; chosen = true; emit();
    void secureStorage.setItem(KEY, s).catch(() => {});
  },
  getSide: () => side,
  /** Resolves to the stored side, or null if the member has never chosen on this device. */
  stored: () => hydrated,
};

export function useSide(): Side {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => side, () => side);
}
