// Security helpers used by the Next.js app (src/lib/net, src/lib/integrations).
import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { assertSafeUrl } from '../../../src/lib/net/safe-url';
import { verifyHmac, verifyMediaWebhook, verifyTelegram, safeEqual } from '../../../src/lib/net/webhook-auth';
import { normalizeSnapshot } from '../../../src/lib/integrations/yahoo';

describe('SSRF guard', () => {
  it.each([
    'http://api.example.com', 'https://127.0.0.1/', 'https://10.0.0.5', 'https://169.254.169.254/latest/meta-data',
    'https://[::1]/', 'https://[::ffff:127.0.0.1]/', 'https://[fd00::1]/', 'https://localhost/', 'https://db.internal/',
    'https://user:pw@api.example.com', 'https://100.64.0.1', 'https://192.168.1.1', 'https://172.16.0.1', 'file:///etc/passwd', 'https://metadata',
  ])('blocks %s', (u) => expect(() => assertSafeUrl(u)).toThrow());
  it('allows public https and enforces allowlist', () => {
    expect(assertSafeUrl('https://platform.higgsfield.ai/v1').hostname).toBe('platform.higgsfield.ai');
    expect(() => assertSafeUrl('https://evil.com', ['higgsfield.ai'])).toThrow();
    expect(() => assertSafeUrl('https://higgsfield.ai.evil.com', ['higgsfield.ai'])).toThrow();
  });
});

describe('webhook auth', () => {
  const body = '{"id":"job_1","status":"complete"}';
  const sig = createHmac('sha256', 's3cret').update(body).digest('hex');
  it('HMAC verifies and rejects tampering', () => {
    expect(verifyHmac(body, `sha256=${sig}`, 's3cret')).toBe(true);
    expect(verifyHmac(body + ' ', sig, 's3cret')).toBe(false);
    expect(verifyHmac(body, sig, undefined)).toBe(false);
  });
  it('media webhook fails closed and accepts sig / header / token', () => {
    const u = new URL('https://x.test/api/webhooks/media?vendor=suno');
    expect(verifyMediaWebhook(body, new Headers(), u, undefined)).toBe(false);
    expect(verifyMediaWebhook(body, new Headers(), u, 's3cret')).toBe(false);
    expect(verifyMediaWebhook(body, new Headers({ 'x-finesse-signature': sig }), u, 's3cret')).toBe(true);
    expect(verifyMediaWebhook(body, new Headers({ 'x-webhook-secret': 's3cret' }), u, 's3cret')).toBe(true);
    expect(verifyMediaWebhook(body, new Headers(), new URL(u + '&token=s3cret'), 's3cret')).toBe(true);
  });
  it('telegram secret header is required', () => {
    expect(verifyTelegram(new Headers(), undefined)).toBe(false);
    expect(verifyTelegram(new Headers({ 'x-telegram-bot-api-secret-token': 'a' }), 'b')).toBe(false);
    expect(verifyTelegram(new Headers({ 'x-telegram-bot-api-secret-token': 'b' }), 'b')).toBe(true);
    expect(safeEqual('', '')).toBe(false);
  });
});

describe('Yahoo snapshot normalization', () => {
  it('flattens Yahoo resource arrays into the UI shape', () => {
    const team = (extra: object) => ({ fantasy_content: { team: [[{ team_key: 'nfl.l.1.t.2' }, { team_id: '2' }, { name: 'Bears' }, { league_name: 'L' }], extra] } });
    const opp = [[{ team_id: '5' }, { name: 'Rivals' }], { team_projected_points: { total: '88.5' } }];
    const mine = [[{ team_id: '2' }, { name: 'Bears' }], { team_projected_points: { total: '101.2' } }];
    const snap = normalizeSnapshot('1', '2', team({}),
      team({ team_standings: { rank: '3', outcome_totals: { wins: '7', losses: '4', ties: '0' }, points_for: '1300', points_against: '1200' } }),
      team({ matchups: { 0: { matchup: { week: '12', status: 'midevent', 0: { teams: { 0: { team: mine }, 1: { team: opp } } } } } } }),
      team({ roster: { 0: { players: { 0: { player: [[{ name: { full: 'Joe B' } }, { display_position: 'QB' }], { player_points: { total: '20.1' } }] } } } } }));
    expect(snap).toMatchObject({ demo: false, team_name: 'Bears', rank: 3, record: { wins: 7, losses: 4, ties: 0 },
      week_matchup: { week: 12, opponent: 'Rivals', my_projected: 101.2, opponent_projected: 88.5 }, top_players: [{ name: 'Joe B', position: 'QB', projected_pts: 20.1 }] });
  });
});
