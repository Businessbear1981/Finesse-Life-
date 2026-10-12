import type { Env, OutboxMessage } from './env';
import { createApp, defaultDeps } from './app';
import { relayOutbox, routeEvent } from './outbox';
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
      // No real processor yet: never close a decline window with a fake or missing gateway in production.
      if (env.PAYMENTS_MODE === 'live') {
        throw new Error('live payment adapter not implemented');
      }
      await db.tx('app_service', null, (tx) => creditDue(tx));
      const d = new Date(event.scheduledTime);
      if (d.getUTCHours() === 3 && d.getUTCMinutes() === 0) await db.tx('app_service', null, (tx) => recompute(tx));
      if (env.PAYMENTS_MODE === 'sandbox') {
        const { fakePayments } = await import('./scale/adapters');
        await db.tx('app_service', null, (tx) => scaleTick(tx, { payments: fakePayments(), shipping: fakeShipping() }));
      }
    })());
  },

  async queue(batch: MessageBatch<OutboxMessage>, _env: Env) {
    const registry = defaultRegistry();
    for (const m of batch.messages) {
      const targets = routeEvent(registry, m.body);
      console.log(JSON.stringify({ outbox_id: m.body.outbox_id, type: m.body.payload.type, targets }));
      m.ack();
    }
  },
} satisfies ExportedHandler<Env, OutboxMessage>;
