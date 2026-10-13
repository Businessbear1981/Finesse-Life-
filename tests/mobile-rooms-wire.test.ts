import {describe, expect, it} from 'vitest';
import {
  ago, compatScore, dealTier, dollars, fundedPct, goalPct, groupBySeason, parseDollars,
  pipelineStatus, rankMembers, savingsPct, seasonOf, seasonSortKey, switchboardLines,
} from '../mobile/src/lib/rooms/logic';

describe('money', () => {
  it('formats and parses dollars', () => {
    expect(dollars(125000)).toBe('$1,250');
    expect(dollars(1999)).toBe('$19.99');
    expect(dollars(null)).toBe('—');
    expect(parseDollars('$1,250')).toBe(125000);
    expect(parseDollars('19.99')).toBe(1999);
    expect(parseDollars('0')).toBeNull();
    expect(parseDollars('abc')).toBeNull();
  });
  it('reads relative time', () => {
    const now = Date.parse('2026-10-12T12:00:00Z');
    expect(ago('2026-10-12T11:59:40Z', now)).toBe('Just now');
    expect(ago('2026-10-12T11:30:00Z', now)).toBe('30m ago');
    expect(ago('2026-10-12T09:00:00Z', now)).toBe('3h ago');
    expect(ago('2026-10-10T12:00:00Z', now)).toBe('2d ago');
    expect(ago(null, now)).toBe('');
  });
});

describe('scrapbook seasons (mirrors /api/scrapbook/log getSeason)', () => {
  it('names the season', () => {
    expect(seasonOf(new Date(2026, 2, 1))).toBe('Spring 2026');
    expect(seasonOf(new Date(2026, 6, 4))).toBe('Summer 2026');
    expect(seasonOf(new Date(2026, 9, 12))).toBe('Fall 2026');
    expect(seasonOf(new Date(2026, 11, 25))).toBe('Winter 2026');
    expect(seasonOf(new Date(2027, 0, 5))).toBe('Winter 2027');
  });
  it('groups newest season first, falling back to created_at', () => {
    const g = groupBySeason([
      {id: 'a', season: 'Spring 2026', created_at: '2026-04-01T00:00:00Z'},
      {id: 'b', season: 'Fall 2026', created_at: '2026-10-01T00:00:00Z'},
      {id: 'c', season: null, created_at: '2026-10-05T12:00:00Z'},
    ]);
    expect(g.map(([k]) => k)).toEqual(['Fall 2026', 'Spring 2026']);
    expect(g[0][1].map((e) => e.id)).toEqual(['b', 'c']);
    expect(seasonSortKey('Winter 2026')).toBeGreaterThan(seasonSortKey('Fall 2026'));
  });
});

describe('lounge compat score (mirrors lounge/page.tsx)', () => {
  const me = {vibe: 'jazz', city: 'Atlanta', interests: ['art', 'watches', 'travel']};
  it('is deterministic and capped', () => {
    const m = {id: 'abc', vibe: 'jazz', city: 'Atlanta', interests: ['art', 'watches', 'travel', 'golf'], check_in: true};
    expect(compatScore(m, me)).toBe(compatScore(m, me));
    expect(compatScore(m, me)).toBeLessThanOrEqual(99);
    const plain = {id: 'abc'};
    expect(compatScore(m, me)).toBeGreaterThan(compatScore(plain, me));
  });
  it('drops the member themself and sorts by score', () => {
    const ranked = rankMembers([{id: 'me'}, {id: 'x', vibe: 'jazz'}, {id: 'y'}], me, 'me');
    expect(ranked.map((r) => r.id)).not.toContain('me');
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});

describe('scale / embassy mapping (mirrors embassy/page.tsx)', () => {
  it('tiers by retail price', () => {
    expect(dealTier(150000)).toBe('premium');
    expect(dealTier(30000)).toBe('contemporary');
    expect(dealTier(5000)).toBe('mid');
    expect(dealTier(4999)).toBe('budget');
  });
  it('maps pipeline status', () => {
    expect(pipelineStatus({status: 'met', current_count: 0, goal_count: 10})).toBe('live');
    expect(pipelineStatus({status: 'open', current_count: 5, goal_count: 10})).toBe('live');
    expect(pipelineStatus({status: 'open', current_count: 4, goal_count: 10})).toBe('pending');
    expect(pipelineStatus({status: 'closed', current_count: 10, goal_count: 10})).toBe('review');
  });
  it('computes savings and progress safely', () => {
    expect(savingsPct(10000, 7500)).toBe(25);
    expect(savingsPct(0, 100)).toBe(0);
    expect(goalPct(5, 10)).toBe(50);
    expect(goalPct(15, 10)).toBe(100);
    expect(goalPct(1, 0)).toBe(0);
    expect(fundedPct(2500, 10000)).toBe(25);
    expect(fundedPct(null, 0)).toBe(0);
  });
});

describe('switchboard lines', () => {
  it('shows every known line and only server-confirmed connections as on', () => {
    const lines = switchboardLines([{platform: 'instagram', connected_at: '2026-10-01T00:00:00Z'}, {platform: 'threads', connected_at: null}]);
    expect(lines.find((l) => l.key === 'instagram')?.on).toBe(true);
    expect(lines.find((l) => l.key === 'tiktok')?.on).toBe(false);
    expect(lines.find((l) => l.key === 'threads')?.on).toBe(true);
    expect(switchboardLines([]).every((l) => !l.on)).toBe(true);
  });
});
