// In-memory house session: which side of the house the member chose. Nothing sensitive lives here.
import {useSyncExternalStore} from 'react';
import type {Side} from './deco';

let side: Side = 'her';
const subs = new Set<() => void>();
export const houseSession = {
  setSide(s: Side) { side = s; subs.forEach((f) => f()); },
  getSide: () => side,
};
export function useSide(): Side {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => side, () => side);
}
