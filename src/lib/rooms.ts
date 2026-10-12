'use client';
import {useEffect, useState} from 'react';
import {createClient} from '@/lib/data/client';

type Row = {kind: string; data: unknown};

/**
 * Room content loader. Keys are the room's content names (e.g. FEM_CLASSES); each maps to
 * room_catalog.kind / room_member_items.kind = key.toLowerCase(). `memberKeys` come from the member's
 * own rows (owner RLS); the rest from the editorial catalog. Until loaded, the empty fallbacks render.
 */
export function useRoomData<T extends Record<string, unknown[]>>(room: string, empty: T, memberKeys: (keyof T & string)[] = []): T {
  const [data, setData] = useState<T>(empty);
  useEffect(() => {
    let live = true;
    const dbc = createClient();
    const group = (rows: Row[] | null, keys: string[]) => {
      const out: Record<string, unknown[]> = {};
      for (const k of keys) out[k] = (rows ?? []).filter((r) => r.kind === k.toLowerCase()).map((r) => r.data);
      return out;
    };
    const catalogKeys = Object.keys(empty).filter((k) => !memberKeys.includes(k));
    Promise.all([
      catalogKeys.length
        ? dbc.from('room_catalog').select('kind, data').eq('room', room).order('position')
        : Promise.resolve({data: [] as Row[]}),
      memberKeys.length
        ? dbc.from('room_member_items').select('kind, data').eq('room', room).order('starts_at', {ascending: true})
        : Promise.resolve({data: [] as Row[]}),
    ]).then(([cat, mine]) => {
      if (!live) return;
      setData({...empty, ...group(cat.data as Row[] | null, catalogKeys), ...group(mine.data as Row[] | null, memberKeys)} as T);
    }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per room; `empty` is a fresh literal each render
  }, [room]);
  return data;
}
