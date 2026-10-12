/** Payment processor behind an interface. Real adapter (Stripe off-session PaymentIntent) lands with credentials. */
export interface PaymentGateway {
  id: string;
  charge(input: { paymentMethodRef: string; amountCents: number; currency: string; idempotencyKey: string; description: string }):
    Promise<{ ok: true; chargeRef: string } | { ok: false; error: string }>;
  refund(input: { chargeRef: string; amountCents: number; idempotencyKey: string }): Promise<{ ok: boolean; error?: string }>;
}

/** 3PL behind an interface (ShipBob or Amazon MCF once chosen). */
export interface ShippingProvider {
  id: string;
  createOrder(input: { reference: string; userId: string; sku: string; quantity: number; addressRef: string | null }):
    Promise<{ ok: true; providerRef: string } | { ok: false; error: string }>;
}

/** Fake processor: tokens starting with "pm_fail" decline; every call is recorded. */
export function fakePayments(): PaymentGateway & { calls: { key: string; amount: number }[] } {
  const calls: { key: string; amount: number }[] = [];
  const done = new Map<string, string>();
  return {
    id: 'fake', calls,
    async charge({ paymentMethodRef, amountCents, idempotencyKey }) {
      calls.push({ key: idempotencyKey, amount: amountCents });
      if (done.has(idempotencyKey)) return { ok: true, chargeRef: done.get(idempotencyKey)! };
      if (paymentMethodRef.startsWith('pm_fail')) return { ok: false, error: 'card_declined' };
      const ref = `ch_fake_${done.size + 1}`;
      done.set(idempotencyKey, ref);
      return { ok: true, chargeRef: ref };
    },
    async refund() { return { ok: true }; },
  };
}

export function fakeShipping(): ShippingProvider & { orders: string[] } {
  const orders: string[] = [];
  return {
    id: 'fake-3pl', orders,
    async createOrder({ reference }) { orders.push(reference); return { ok: true, providerRef: `3pl_${orders.length}` }; },
  };
}
