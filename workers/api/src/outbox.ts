import type { Database } from './db';
import type { OutboxMessage } from './env';
import type { EngineRegistry } from './engines';

export interface QueueLike { sendBatch(messages: { body: OutboxMessage }[]): Promise<unknown> }

/** Relay: claim pending outbox rows (SKIP LOCKED), publish to Queues, mark published. */
export async function relayOutbox(db: Database, queue: QueueLike, batch = 100): Promise<number> {
  return db.tx('app_service', null, async (tx) => {
    const { rows } = await tx.query<{ id: string; topic: string; payload: Record<string, unknown> }>(
      'select id, topic, payload from orch.claim_outbox($1)', [batch]);
    if (!rows.length) return 0;
    try {
      await queue.sendBatch(rows.map((r) => ({ body: { outbox_id: Number(r.id), topic: r.topic, payload: r.payload } })));
    } catch (e) {
      await tx.query('update orch.outbox set last_error = $2 where id = any($1)', [rows.map((r) => r.id), String((e as Error).message)]);
      return 0; // rows become available again after the claim lease
    }
    await tx.query('select orch.mark_published($1)', [rows.map((r) => r.id)]);
    return rows.length;
  });
}

/** Queue consumer: fan an event out to the engines that declare it in `consumes`. */
export function routeEvent(registry: EngineRegistry, msg: OutboxMessage): string[] {
  const type = String(msg.payload.type ?? '');
  return registry.consumersOf(type).map((e) => e.id);
}
