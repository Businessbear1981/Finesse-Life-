import {describe, expect, it} from 'vitest';
import {mondayOf} from '@/lib/closet';
import {recoveryRead} from '@/lib/gym';
import {dailyTotals} from '@/lib/kitchen';
import {NEVER_PROJECTED, PROJECTABLE_FIELDS, projectionsSchema} from '@/lib/identity';

describe('closet weeks', () => {
  it('snaps any day to its Monday (UTC)', () => {
    expect(mondayOf(new Date('2026-10-01T12:00:00Z'))).toBe('2026-09-28'); // Thursday
    expect(mondayOf(new Date('2026-10-04T12:00:00Z'))).toBe('2026-09-28'); // Sunday
    expect(mondayOf(new Date('2026-09-28T12:00:00Z'))).toBe('2026-09-28'); // Monday
  });
});

describe('gym recovery read', () => {
  it('says no_data with no sets', () => {
    expect(recoveryRead([]).status).toBe('no_data');
  });
  it('needs 48h after a hard session', () => {
    const at = '2026-10-01T08:00:00Z';
    const sets = [{exercise: 'squat', reps: 5, weight_kg: 100, duration_s: null, rpe: 9, performed_at: at}];
    expect(recoveryRead(sets, Date.parse(at) + 24 * 3_600_000).status).toBe('recovering');
    expect(recoveryRead(sets, Date.parse(at) + 49 * 3_600_000).status).toBe('ready');
    expect(recoveryRead(sets, Date.parse(at)).lastLoad).toBe(500);
  });
});

describe('kitchen ledger', () => {
  it('sums kcal per day', () => {
    const t = dailyTotals([{day: 0, slot: 'lunch', name: 'a', kcal: 600}, {day: 0, slot: 'dinner', name: 'b', kcal: 700}, {day: 3, slot: 'dinner', name: 'c'}]);
    expect(t[0]).toBe(1300);
    expect(t[3]).toBe(0);
    expect(t).toHaveLength(7);
  });
});

describe('This Is You allowlists', () => {
  it('never lets a sensitive field be projected', () => {
    for (const f of NEVER_PROJECTED) expect((PROJECTABLE_FIELDS as readonly string[]).includes(f), f).toBe(false);
    expect(projectionsSchema.safeParse({publicFields: ['email']}).success).toBe(false);
    expect(projectionsSchema.safeParse({publicFields: ['display_name', 'vibe']}).success).toBe(true);
  });
});
