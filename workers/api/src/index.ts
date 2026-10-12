import type { Env, OutboxMessage } from './env';
import { createApp, defaultDeps } from './app';
import { relayOutbox, routeEvent } from './outbox';
import { pgDatabase } from './db';
import { defaultRegistry } from './engines';

const app = createApp(defaultDeps);

export default {
  fetch: app.fetch,

  /** Cron: relay the transactional outbox to Queues. */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const db = pgDatabase(env.HYPERDRIVE.connectionString);
    ctx.waitUntil(relayOutbox(db, env.EVENTS).then((n) => { if (n) console.log(`relayed ${n} events`); }));
  },

  /** Queue consumer: route each event to the engines that consume it. Handlers are wired per engine as they land. */
  async queue(batch: MessageBatch<OutboxMessage>, _env: Env) {
    const registry = defaultRegistry();
    for (const m of batch.messages) {
      const targets = routeEvent(registry, m.body);
      console.log(JSON.stringify({ outbox_id: m.body.outbox_id, type: m.body.payload.type, targets }));
      m.ack();
    }
  },
} satisfies ExportedHandler<Env, OutboxMessage>;
