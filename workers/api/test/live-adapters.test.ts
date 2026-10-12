import { describe, expect, it } from 'vitest';
import { shipbobShipping, stripePayments } from '../src/scale/live';
import { createApp } from '../src/app';
import { _resetRateLimit } from '../src/ratelimit';

const fakeFetch = (status: number, body: unknown, seen: { url: string; init: RequestInit }[]) =>
  (async (url: string, init: RequestInit) => { seen.push({ url, init }); return new Response(JSON.stringify(body), { status }); }) as unknown as typeof fetch;

describe('Stripe adapter', () => {
  it('confirms an off-session PaymentIntent with idempotency', async () => {
    const seen: any[] = [];
    const s = stripePayments('sk_test_x', fakeFetch(200, { id: 'pi_1', status: 'succeeded' }, seen));
    expect(await s.charge({ paymentMethodRef: 'cus_1:pm_1', amountCents: 1234, currency: 'usd', idempotencyKey: 'k1', description: 'd' })).toEqual({ ok: true, chargeRef: 'pi_1' });
    const body = new URLSearchParams(seen[0].init.body as URLSearchParams);
    expect(seen[0].url).toBe('https://api.stripe.com/v1/payment_intents');
    expect(seen[0].init.headers['Idempotency-Key']).toBe('k1');
    expect(Object.fromEntries(body)).toMatchObject({ amount: '1234', customer: 'cus_1', payment_method: 'pm_1', off_session: 'true', confirm: 'true' });
  });
  it('maps declines and rejects malformed refs', async () => {
    const s = stripePayments('sk', fakeFetch(402, { error: { code: 'card_declined', decline_code: 'insufficient_funds' } }, []));
    expect(await s.charge({ paymentMethodRef: 'cus_1:pm_1', amountCents: 1, currency: 'usd', idempotencyKey: 'k', description: '' })).toEqual({ ok: false, error: 'insufficient_funds' });
    expect(await s.charge({ paymentMethodRef: 'pm_only', amountCents: 1, currency: 'usd', idempotencyKey: 'k', description: '' })).toEqual({ ok: false, error: 'invalid_payment_method_ref' });
  });
});

describe('ShipBob adapter', () => {
  it('creates an order with recipient and channel header; refuses without ship_to', async () => {
    const seen: any[] = [];
    const sb = shipbobShipping('tok', '42', fakeFetch(201, { id: 9001 }, seen));
    expect(await sb.createOrder({ reference: 'p1', userId: 'u', sku: 'SKU', quantity: 2, shipTo: null })).toEqual({ ok: false, error: 'missing_ship_to' });
    const r = await sb.createOrder({ reference: 'p1', userId: 'u', sku: 'SKU', quantity: 2, shipTo: { name: 'A', line1: '1 St', city: 'Chicago', postal_code: '60601', country: 'US' } });
    expect(r).toEqual({ ok: true, providerRef: '9001' });
    expect(seen[0].init.headers.shipbob_channel_id).toBe('42');
    expect(JSON.parse(seen[0].init.body)).toMatchObject({ reference_id: 'p1', products: [{ reference_id: 'SKU', quantity: 2 }] });
  });
});

describe('rate limit', () => {
  it('returns 429 past the limit per client, exempts service key', async () => {
    _resetRateLimit();
    const app = createApp(() => ({}) as any, { rateLimit: 3 });
    const hit = async (h: Record<string, string> = {}) => (await app.request('/v1/engines', { headers: h }, {} as any)).status;
    const codes = [await hit(), await hit(), await hit(), await hit()];
    expect(codes.slice(0, 3).every((c) => c !== 429)).toBe(true);
    expect(codes[3]).toBe(429);
    expect(await hit({ 'x-service-key': 'x' })).not.toBe(429);
  });
});
