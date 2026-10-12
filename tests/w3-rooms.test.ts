import {describe, expect, it, beforeAll} from 'vitest';
import {randomBytes} from 'node:crypto';
import {bookingRequest, splitBookings} from '@/lib/salon';
import {byDay, gymWeekOf, sessionInput, sessionPatch, weekDays} from '@/lib/gym-week';
import {dishBook, previousPlan} from '@/lib/kitchen-book';
import {jobInput, missingEnv, studioStatus, vendorState} from '@/lib/lab';
import {networkStatus, openToken, sealToken} from '@/lib/switchboard';

describe('salon', () => {
  const row = (status: 'pending' | 'confirmed' | 'completed' | 'cancelled', requested_date: string, requested_time = '10:00') => ({status, requested_date, requested_time});

  it('splits upcoming requests (pending/confirmed, today onward, soonest first) from history', () => {
    const rows = [row('pending', '2026-10-20', '16:00'), row('confirmed', '2026-10-13'), row('pending', '2026-10-01'), row('cancelled', '2026-10-30'), row('pending', '2026-10-20', '09:00')];
    const {upcoming, history} = splitBookings(rows, '2026-10-12');
    expect(upcoming.map((b) => `${b.requested_date} ${b.requested_time}`)).toEqual(['2026-10-13 10:00', '2026-10-20 09:00', '2026-10-20 16:00']);
    expect(history.map((b) => b.status).sort()).toEqual(['cancelled', 'pending']);
  });

  it('validates a request: real date and 24h time, no status or price from the client', () => {
    expect(bookingRequest.safeParse({service_name: 'Silk press', requested_date: '2026-10-20', requested_time: '16:00'}).success).toBe(true);
    expect(bookingRequest.safeParse({service_name: 'Silk press', requested_date: '20/10/2026', requested_time: '16:00'}).success).toBe(false);
    expect(bookingRequest.safeParse({service_name: 'Silk press', requested_date: '2026-10-20', requested_time: '4pm'}).success).toBe(false);
    expect(bookingRequest.safeParse({service_name: ' ', requested_date: '2026-10-20', requested_time: '16:00'}).success).toBe(false);
    const parsed = bookingRequest.parse({service_name: 'x', requested_date: '2026-10-20', requested_time: '16:00', status: 'confirmed', price_cents: 1});
    expect(parsed).not.toHaveProperty('status');
    expect(parsed).not.toHaveProperty('price_cents');
  });
});

describe('gym week', () => {
  it('weeks start on Monday and list seven days', () => {
    expect(gymWeekOf('2026-10-15')).toBe('2026-10-12');
    expect(gymWeekOf('2026-10-18')).toBe('2026-10-12');
    expect(gymWeekOf('garbage')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(weekDays('2026-10-12')).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
  });

  it('groups sessions per day, timed first in order', () => {
    const days = byDay([
      {day: '2026-10-13', at_time: '18:00'}, {day: '2026-10-13', at_time: null}, {day: '2026-10-13', at_time: '07:00'}, {day: '2026-10-18', at_time: null}, {day: '2026-10-25', at_time: null},
    ], '2026-10-12');
    expect(days).toHaveLength(7);
    expect(days[1].map((s) => s.at_time)).toEqual(['07:00', '18:00', null]);
    expect(days[6]).toHaveLength(1);
    expect(days.flat()).toHaveLength(4);
  });

  it('validates sessions and patches', () => {
    expect(sessionInput.safeParse({day: '2026-10-13', title: 'Barre', kind: 'class', atTime: '07:00'}).success).toBe(true);
    expect(sessionInput.safeParse({day: '2026-10-13', title: 'Barre', kind: 'brunch'}).success).toBe(false);
    expect(sessionInput.safeParse({day: '2026-10-13', title: 'Barre', atTime: '7am'}).success).toBe(false);
    expect(sessionPatch.safeParse({}).success).toBe(false);
    expect(sessionPatch.safeParse({done: true}).success).toBe(true);
  });
});

describe('kitchen book', () => {
  const plans = [
    {week_start: '2026-09-28', meals: [{day: 0, slot: 'dinner' as const, name: 'Miso cod, greens', kcal: 520}, {day: 1, slot: 'dinner' as const, name: 'Dinner out', kcal: 700}]},
    {week_start: '2026-10-05', meals: [{day: 0, slot: 'dinner' as const, name: 'miso cod,  greens', kcal: null}, {day: 2, slot: 'lunch' as const, name: 'Chicken, farro', kcal: 610}]},
    {week_start: '2026-10-12', meals: []},
  ];

  it('derives the recipe book from planned plates, merging case/spacing, skipping "dinner out"', () => {
    const book = dishBook(plans);
    expect(book.map((b) => b.name)).toEqual(['miso cod,  greens', 'Chicken, farro']);
    expect(book[0].times).toBe(2);
    expect(book[0].kcal).toBe(520);
    expect(book[0].lastWeek).toBe('2026-10-05');
  });

  it('finds the most recent earlier plan with meals', () => {
    expect(previousPlan(plans, '2026-10-12')?.week_start).toBe('2026-10-05');
    expect(previousPlan(plans, '2026-10-05')?.week_start).toBe('2026-09-28');
    expect(previousPlan(plans, '2026-09-28')).toBeNull();
  });
});

describe('lab', () => {
  const storage = {R2_ACCESS_KEY_ID: 'a', R2_SECRET_ACCESS_KEY: 'b', R2_PUBLIC_URL: 'https://cdn'};

  it('names exactly what a studio still needs', () => {
    expect(missingEnv('voice', {})).toEqual(['ELEVENLABS_API_KEY', 'ELEVENLABS_DEFAULT_VOICE_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL']);
    expect(missingEnv('3d', {...storage, MESHY_API_KEY: 'k'})).toEqual([]);
    expect(missingEnv('music', {SUNO_API_KEY: 'k'})).toEqual(['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL']);
  });

  it('reports each studio as connected only with vendor + storage keys', () => {
    const s = studioStatus({...storage, HIGGSFIELD_API_KEY_ID: 'i', HIGGSFIELD_API_SECRET: 's'});
    expect(s.filter((x) => x.connected).map((x) => x.type)).toEqual(['image', 'video']);
    expect(studioStatus({}).every((x) => !x.connected)).toBe(true);
  });

  it('maps vendor status words', () => {
    expect(vendorState('SUCCEEDED')).toBe('done');
    expect(vendorState('complete')).toBe('done');
    expect(vendorState('FAILED')).toBe('failed');
    expect(vendorState('IN_PROGRESS')).toBe('running');
    expect(vendorState(undefined)).toBe('running');
  });

  it('validates a job request', () => {
    expect(jobInput.safeParse({type: 'image', prompt: 'a brass lamp at midnight'}).success).toBe(true);
    expect(jobInput.safeParse({type: 'hologram', prompt: 'x y z'}).success).toBe(false);
    expect(jobInput.safeParse({type: 'image', prompt: 'x'}).success).toBe(false);
  });
});

describe('switchboard', () => {
  beforeAll(() => { process.env.INTEGRATIONS_ENCRYPTION_KEY = randomBytes(32).toString('base64'); });

  it('seals and opens a token; anything else opens to null', () => {
    const sealed = sealToken({access_token: 'tok-123'});
    expect(sealed.startsWith('v1:')).toBe(true);
    expect(sealed).not.toContain('tok-123');
    expect(openToken(sealed)?.access_token).toBe('tok-123');
    expect(openToken('tok-123')).toBeNull(); // a raw legacy value is never used as a token
    expect(openToken('v1:AAAA:BBBB')).toBeNull();
    expect(openToken(null)).toBeNull();
    const [v, iv, ct] = sealed.split(':');
    const tampered = `${v}:${iv}:${Buffer.from(Buffer.from(ct, 'base64').map((b, i) => (i === 0 ? b ^ 1 : b))).toString('base64')}`;
    expect(openToken(tampered)).toBeNull();
  });

  it('is connected only with a token that opens; broadcast only where posting is supported', () => {
    const rows = [
      {platform: 'twitter', connected: true, access_token_enc: sealToken({access_token: 't'}), connected_at: '2026-10-01T00:00:00Z'},
      {platform: 'instagram', connected: true, access_token_enc: sealToken({access_token: 'i'})},
      {platform: 'tiktok', connected: true, access_token_enc: null},
      {platform: 'youtube', connected: true, access_token_enc: 'raw-token'},
    ];
    const s = Object.fromEntries(networkStatus(rows).map((n) => [n.platform, n]));
    expect(s.twitter).toMatchObject({connected: true, canBroadcast: true, connectedAt: '2026-10-01T00:00:00Z'});
    expect(s.instagram).toMatchObject({connected: true, canBroadcast: false});
    expect(s.tiktok.connected).toBe(false);
    expect(s.youtube.connected).toBe(false);
    expect(s.snapchat).toMatchObject({connected: false, oauth: 'coming_soon'});
  });
});
