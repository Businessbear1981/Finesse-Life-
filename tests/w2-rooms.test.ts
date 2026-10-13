import {describe, expect, it} from 'vitest';
import {birthdayBrief, bySoonest, daysLabel, giftQuery, isIsoDate, nextBirthday} from '@/lib/entourage';
import {eveningBrief, parsePlanItems, totals} from '@/lib/per-diem';
import {clubErrorCode, clubErrorText, GAME_INFO, seatsLeft} from '@/lib/clubhouse';
import {daysUntil, rideBrief, tripBrief} from '@/lib/departures';

describe('entourage', () => {
  it('validates ISO dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('nope')).toBe(false);
  });
  it('counts down to the next birthday', () => {
    expect(nextBirthday('1960-10-20', '2026-10-12')).toEqual({date: '2026-10-20', days: 8, turning: 66});
    expect(nextBirthday('1990-10-12', '2026-10-12')).toEqual({date: '2026-10-12', days: 0, turning: 36});
    expect(nextBirthday('1990-01-05', '2026-10-12')).toEqual({date: '2027-01-05', days: 85, turning: 37});
  });
  it('handles 29 February and unknown years', () => {
    expect(nextBirthday('2000-02-29', '2027-02-01')?.date).toBe('2027-02-28');
    expect(nextBirthday('2000-02-29', '2028-02-01')?.date).toBe('2028-02-29');
    expect(nextBirthday('1800-06-01', '2026-05-01')?.turning).toBeNull();
    expect(nextBirthday(null, '2026-05-01')).toBeNull();
  });
  it('crosses the year end', () => {
    expect(nextBirthday('1980-01-01', '2026-12-31')).toEqual({date: '2027-01-01', days: 1, turning: 47});
  });
  it('sorts by soonest, undated last', () => {
    const people = [{name: 'Z', birthday: null}, {name: 'B', birthday: '1990-12-01'}, {name: 'A', birthday: '1990-10-20'}];
    expect(bySoonest(people, '2026-10-12').map((p) => p.name)).toEqual(['A', 'B', 'Z']);
  });
  it('writes gift queries and birthday briefs within the hub limits', () => {
    const q = giftQuery({relation: 'Family', loves: ['Orchids', 'Earl Grey'], notes: null});
    expect(q).toBe('a thoughtful gift for my family who loves Orchids, Earl Grey');
    expect(giftQuery({relation: 'x', loves: Array(12).fill('a'.repeat(50)), notes: null}).length).toBeLessThanOrEqual(200);
    const b = birthdayBrief({name: 'Mum', relation: 'Family', city: 'Savannah', loves: ['Orchids']}, 66);
    expect(b).toContain('turning 66');
    expect(b.length).toBeLessThanOrEqual(600);
    expect(daysLabel(0)).toBe('Today');
    expect(daysLabel(1)).toBe('Tomorrow');
    expect(daysLabel(9)).toBe('In 9 days');
  });
});

describe('per diem', () => {
  it('reads the recommended stops out of Nova’s plan', () => {
    const text = [
      'Option A — rooftop then steak',
      '- 7:00 PM — Bar Céleste rooftop — $90',
      '- 8:30 PM — Ember & Oak — $260',
      'Option B — jazz',
      '- 8:00 PM — Lucian tasting menu — $420',
      '',
      '**Recommended:**',
      '1. 7:00 PM — Drinks at Bar Céleste — $90',
      '2. 8:15pm: Dinner at Ember & Oak ($260)',
      '3. 10:30 PM — Late set at the Jazz Club — $1,120.50',
    ].join('\n');
    expect(parsePlanItems(text)).toEqual([
      {time: '7:00 PM', label: 'Drinks at Bar Céleste', cost_cents: 9000, done: false},
      {time: '8:15 PM', label: 'Dinner at Ember & Oak', cost_cents: 26000, done: false},
      {time: '10:30 PM', label: 'Late set at the Jazz Club', cost_cents: 112050, done: false},
    ]);
  });
  it('falls back to every timed line, deduped, when there is no recommended section', () => {
    const text = '7 PM - Cocktails\n7 PM - Cocktails\n21:00 | Dinner | $150\nNo time here — $50';
    expect(parsePlanItems(text)).toEqual([
      {time: '7 PM', label: 'Cocktails', cost_cents: 0, done: false},
      {time: '21:00', label: 'Dinner', cost_cents: 15000, done: false},
    ]);
  });
  it('returns nothing for empty or untimed text', () => {
    expect(parsePlanItems('')).toEqual([]);
    expect(parsePlanItems(null)).toEqual([]);
    expect(parsePlanItems('A lovely evening awaits.')).toEqual([]);
  });
  it('totals against the budget', () => {
    const items = [{time: '7 PM', label: 'a', cost_cents: 9000, done: true}, {time: '8 PM', label: 'b', cost_cents: 26000, done: false}];
    expect(totals(items, 30000)).toEqual({planned: 35000, spent: 9000, left: -5000, over: true, pct: 100});
    expect(totals([], 0).over).toBe(false);
  });
  it('writes the evening brief inside 600 chars', () => {
    const b = eveningBrief('Date night', 60000, 'x'.repeat(700));
    expect(b.length).toBeLessThanOrEqual(600);
    expect(eveningBrief('Date night', 60000)).toContain('$600 all in');
  });
});

describe('clubhouse', () => {
  it('maps trigger errors to member copy', () => {
    expect(clubErrorCode('club_table_full')).toBe('table_full');
    expect(clubErrorCode('ERROR: club_table_not_found')).toBe('not_found');
    expect(clubErrorCode('something else')).toBeNull();
    expect(clubErrorText('table_full')).toMatch(/filled up/);
  });
  it('mirrors the seat caps in the migration', () => {
    expect(GAME_INFO.spades.maxSeats).toBe(4);
    expect(GAME_INFO.poker.maxSeats).toBe(10);
    expect(seatsLeft({seats: 4, seats_taken: 5})).toBe(0);
  });
});

describe('departures', () => {
  it('writes trip and ride briefs', () => {
    const b = tripBrief({origin: 'Atlanta', destination: 'Naples', depart_at: '2026-11-01T18:40:00Z', return_at: '2026-11-05T10:00:00Z', party_size: 2, brief: 'Boats'});
    expect(b).toContain('A trip to Naples from Atlanta (2026-11-01 to 2026-11-05) for 2 people. Boats');
    expect(rideBrief('Home', 'Lucian', '8:30 PM')).toContain('from Home to Lucian at 8:30 PM');
  });
  it('counts days to departure', () => {
    const now = new Date('2026-10-12T12:00:00Z');
    expect(daysUntil('2026-10-15T13:00:00Z', now)).toBe(3);
    expect(daysUntil('2026-10-01T00:00:00Z', now)).toBeNull();
    expect(daysUntil(null, now)).toBeNull();
  });
});
