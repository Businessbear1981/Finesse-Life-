import {describe, expect, it} from 'vitest';
import {missingConsent, neededKinds, requireAiConsent} from '@/lib/ai-consent-gate';

// A tiny stand-in for the member's session client: from(...).select(...).eq(...).in(...) → {data, error}.
function fakeSupabase(rows: Array<{kind: string}> | null, error: {code?: string; message: string} | null = null) {
  const q = {select: () => q, eq: () => q, in: async () => ({data: rows, error})};
  return {from: () => q} as unknown as Parameters<typeof requireAiConsent>[0];
}

describe('AI consent gate', () => {
  it('needs ai_processing always and photo_ai with a photo', () => {
    expect(neededKinds()).toEqual(['ai_processing']);
    expect(neededKinds({photo: true})).toEqual(['ai_processing', 'photo_ai']);
  });

  it('names the first missing kind', () => {
    expect(missingConsent([], ['ai_processing'])).toBe('ai_processing');
    expect(missingConsent(['ai_processing'], ['ai_processing', 'photo_ai'])).toBe('photo_ai');
    expect(missingConsent(['photo_ai', 'ai_processing'], ['ai_processing', 'photo_ai'])).toBeNull();
  });

  it('returns 403 consent_required when the member has not agreed', async () => {
    const res = await requireAiConsent(fakeSupabase([]), 'u1');
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({error: 'consent_required', kind: 'ai_processing'});
  });

  it('asks for photo_ai when a photo is sent without it', async () => {
    const res = await requireAiConsent(fakeSupabase([{kind: 'ai_processing'}]), 'u1', {photo: true});
    expect(await res?.json()).toEqual({error: 'consent_required', kind: 'photo_ai'});
  });

  it('lets an agreed member through', async () => {
    expect(await requireAiConsent(fakeSupabase([{kind: 'ai_processing'}]), 'u1')).toBeNull();
  });

  it('fails closed when consents cannot be read', async () => {
    const res = await requireAiConsent(fakeSupabase(null, {code: '42P01', message: 'missing'}), 'u1');
    expect(res?.status).toBe(503);
  });
});
