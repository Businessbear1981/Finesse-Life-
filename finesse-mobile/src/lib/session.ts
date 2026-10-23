import { useSyncExternalStore } from 'react';
import type { Side } from '../theme';

type Session = { side: Side; name: string; city: string; isVip: boolean };
let state: Session = { side: 'her', name: '', city: '', isVip: false };
const subs = new Set<() => void>();

export const setSession = (patch: Partial<Session>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
export const useSession = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state);
