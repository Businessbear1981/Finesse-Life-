import type { Env, OutboxMessage } from './env';
import { createApp, defaultDeps } from './app';
import { deliverEvent, relayOutbox } from './outbox';
import { pgDatabase } from './db';
import { defaultRegistry } from './engines';
import { tick as scaleTick } from './scale/service';
import { recompute } from './social/standing';
import { creditDue } from './social/referrals';
import { fakeShipping } from './scale/adapters';

const app = createApp(defaultDeps);

export default {
  fetch: app.fetch,

  /** Cron (every minute): outbox relay, Scale campaign lifecycle, referral credits; standing nightly at 03:00 UTC. */
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const db = pgDatabase(env.HYPERDRIVE.connectionString);
    ctx.waitUntil((async () => {
      await relayOutbox(db, env.EVENTS);
      await db.tx('app_service', null, (tx) => creditDue(tx));
      const d = new Date(event.scheduledTime);
      if (d.getUTCHours() === 3 && d.getUTCMinutes() === 0) await db.tx('app_service', null, (tx) => recompute(tx));
      if (env.PAYMENTS_MODE === 'sandbox') {
        const { fakePayments } = await import('./scale/adapters');
        await db.tx('app_service', null, (tx) => scaleTick(tx, { payments: fakePayments(), shipping: fakeShipping() }));
      } else if (env.PAYMENTS_MODE === 'live') {
        // Fail closed: never close a decline window without both real adapters configured.
        if (!env.STRIPE_SECRET_KEY || !env.SHIPBOB_TOKEN || !env.SHIPBOB_CHANNEL_ID) throw new Error('PAYMENTS_MODE=live needs STRIPE_SECRET_KEY, SHIPBOB_TOKEN, SHIPBOB_CHANNEL_ID');
        const { stripePayments, shipbobShipping } = await import('./scale/live');
        await db.tx('app_service', null, (tx) => scaleTick(tx, { payments: stripePayments(env.STRIPE_SECRET_KEY!), shipping: shipbobShipping(env.SHIPBOB_TOKEN!, env.SHIPBOB_CHANNEL_ID!) }));
      }
    })());
  },

  async queue(batch: MessageBatch<OutboxMessage>, env: Env) {
    const registry = defaultRegistry();
    const db = pgDatabase(env.HYPERDRIVE.connectionString);
    for (const m of batch.messages) {
      try {
        const handled = await deliverEvent(db, registry, m.body);
        console.log(JSON.stringify({ outbox_id: m.body.outbox_id, type: m.body.payload.type, handled }));
        m.ack();
      } catch (e) {
        console.error(JSON.stringify({ outbox_id: m.body.outbox_id, error: String(e) }));
        m.retry({ delaySeconds: Math.min(300, 2 ** m.attempts * 5) });
      }
    }
  },
} satisfies ExportedHandler<Env, OutboxMessage>;
