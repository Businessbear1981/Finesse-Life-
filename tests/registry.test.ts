import {describe, expect, it} from 'vitest';
import {PENTHOUSE_ROUTE, RAILS, ROOM_COUNT, roomById, rooms} from '@/lib/rooms/registry';

describe('31-room registry', () => {
  it('has exactly 31 unique rooms numbered 1..31', () => {
    expect(rooms).toHaveLength(ROOM_COUNT);
    expect(new Set(rooms.map((r) => r.id)).size).toBe(31);
    expect(rooms.map((r) => r.number).sort((a, b) => a - b)).toEqual(Array.from({length: 31}, (_, i) => i + 1));
  });
  it('rails cover every room exactly once', () => {
    const ids = RAILS.flatMap((r) => r.roomIds);
    expect(ids).toHaveLength(31);
    expect(new Set(ids).size).toBe(31);
    for (const id of ids) expect(roomById(id), id).toBeDefined();
  });
  it('Penthouse is inside the VIP Room, never room 32', () => {
    expect(roomById('penthouse')).toBeUndefined();
    expect(PENTHOUSE_ROUTE).toBe('/vip/penthouse');
    expect(roomById('vip-room')?.route).toBe('/vip');
  });
  it('only uses known truth states', () => {
    for (const r of rooms) expect(['wired', 'specified', 'preview', 'gated']).toContain(r.truthState);
  });
});
