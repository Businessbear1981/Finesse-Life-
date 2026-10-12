// Live adapters, fetch-only (Workers runtime, no SDKs). Activated with PAYMENTS_MODE=live.
import type { PaymentGateway, ShippingProvider, ShipTo } from './adapters';

/**
 * Stripe off-session PaymentIntent (https://docs.stripe.com/payments/save-and-reuse#charge-saved-payment-method).
 * paymentMethodRef = "cus_…:pm_…" saved via SetupIntent at pledge time. Idempotency-Key makes retries safe.
 */
export function stripePayments(secretKey: string, fetchImpl: typeof fetch = fetch): PaymentGateway {
  const call = async (path: string, form: Record<string, string>, key: string) => {
    const r = await fetchImpl(`https://api.stripe.com/v1/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': key, 'Stripe-Version': '2024-06-20' },
      body: new URLSearchParams(form),
    });
    return { ok: r.ok, j: (await r.json().catch(() => ({}))) as { id?: string; status?: string; error?: { code?: string; decline_code?: string; message?: string } } };
  };
  return {
    id: 'stripe',
    async charge({ paymentMethodRef, amountCents, currency, idempotencyKey, description }) {
      const [customer, pm] = paymentMethodRef.split(':');
      if (!customer?.startsWith('cus_') || !pm?.startsWith('pm_')) return { ok: false, error: 'invalid_payment_method_ref' };
      const { ok, j } = await call('payment_intents', {
        amount: String(amountCents), currency, customer, payment_method: pm, off_session: 'true', confirm: 'true', description,
        'metadata[idempotency_key]': idempotencyKey,
      }, idempotencyKey);
      if (ok && j.status === 'succeeded' && j.id) return { ok: true, chargeRef: j.id };
      return { ok: false, error: j.error?.decline_code ?? j.error?.code ?? j.status ?? 'charge_failed' };
    },
    async refund({ chargeRef, amountCents, idempotencyKey }) {
      const { ok, j } = await call('refunds', { payment_intent: chargeRef, amount: String(amountCents) }, idempotencyKey);
      return ok ? { ok: true } : { ok: false, error: j.error?.code ?? 'refund_failed' };
    },
  };
}

/** ShipBob orders API (https://developer.shipbob.com/api/orders/post-order). */
export function shipbobShipping(token: string, channelId: string, fetchImpl: typeof fetch = fetch, base = 'https://api.shipbob.com/1.0'): ShippingProvider {
  return {
    id: 'shipbob',
    async createOrder({ reference, sku, quantity, shipTo }) {
      if (!shipTo) return { ok: false, error: 'missing_ship_to' };
      const r = await fetchImpl(`${base}/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, shipbob_channel_id: channelId, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_id: reference, shipping_method: 'Standard',
          recipient: { name: shipTo.name, address: { address1: shipTo.line1, address2: shipTo.line2 ?? '', city: shipTo.city, state: shipTo.state ?? '', zip_code: shipTo.postal_code, country: shipTo.country } },
          products: [{ reference_id: sku, quantity }],
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { id?: number | string; title?: string };
      // 422 "duplicate reference" means the order already exists: treat as success (idempotent handoff).
      if (r.ok && j.id != null) return { ok: true, providerRef: String(j.id) };
      return { ok: false, error: `shipbob_${r.status}${j.title ? `: ${j.title}` : ''}` };
    },
  };
}
export type { ShipTo };
