'use client';
import {useSyncExternalStore} from 'react';

// Edition preference ('masculine' → Carpe Diem, otherwise Finesse) lives in localStorage.
// useSyncExternalStore reads it without a setState-in-effect and is SSR-safe (server snapshot = null).
const KEY = 'finesse_gender';
function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener('storage', onStorage);
  window.addEventListener('finesse-gender', cb);
  return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('finesse-gender', cb); };
}
export function useStoredGender(): string | null {
  return useSyncExternalStore(subscribe, () => localStorage.getItem(KEY), () => null);
}
export function setStoredGender(g: string) {
  localStorage.setItem(KEY, g);
  window.dispatchEvent(new Event('finesse-gender'));
}
