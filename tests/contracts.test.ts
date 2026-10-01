import {randomUUID} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {entranceVerifyRequest, revenueEventSchema, vipLiftVerifyRequest} from '@/lib/contracts';

const base = {eventType: 'test.event', idempotencyKey: 'key-12345678', traceId: 'tr_1', roomId: 'vault', track: null, memberId: null};

describe('revenue event rules', () => {
  it('accepts an impression with no amount', () => {
    expect(revenueEventSchema.safeParse({...base, state: 'impression'}).success).toBe(true);
  });
  it('rejects money on a pledge / intent', () => {
    expect(revenueEventSchema.safeParse({...base, state: 'intent', amountMinor: 500}).success).toBe(false);
  });
  it('requires a provider receipt for booked revenue', () => {
    expect(revenueEventSchema.safeParse({...base, state: 'confirmed', amountMinor: 500, currency: 'USD'}).success).toBe(false);
    expect(revenueEventSchema.safeParse({...base, state: 'confirmed', amountMinor: 500, currency: 'USD', providerId: 'stripe', providerReceiptId: 'pi_1'}).success).toBe(true);
  });
  it('requires refunds to reference the original event', () => {
    const refund = {...base, state: 'refunded', amountMinor: -500, currency: 'USD', providerId: 'stripe', providerReceiptId: 'ch_1'};
    expect(revenueEventSchema.safeParse(refund).success).toBe(false);
    expect(revenueEventSchema.safeParse({...refund, reversesEventId: randomUUID()}).success).toBe(true);
  });
});

describe('KeyLock request contracts', () => {
  it('entrance needs a uuid challenge and exactly six digits', () => {
    expect(entranceVerifyRequest.safeParse({challengeId: randomUUID(), code: '123456'}).success).toBe(true);
    expect(entranceVerifyRequest.safeParse({challengeId: randomUUID(), code: '12345'}).success).toBe(false);
    expect(entranceVerifyRequest.safeParse({challengeId: 'x', code: '123456'}).success).toBe(false);
  });
  it('vip lift defaults to the penthouse destination', () => {
    const r = vipLiftVerifyRequest.parse({challengeId: randomUUID(), code: '482913'});
    expect(r.destination).toBe('penthouse');
  });
});
