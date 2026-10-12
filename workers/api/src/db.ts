import pg from 'pg';
import type { Claims } from './env';

export interface Tx {
  query<T = Record<string, any>>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}

export type DbRole = 'app_user' | 'app_service';

export interface Database {
  /** Run fn in one transaction as `role`, with the request's claims applied. */
  tx<T>(role: DbRole, claims: Claims | null, fn: (tx: Tx) => Promise<T>): Promise<T>;
}

/** Postgres via node-postgres. In Workers the connection string comes from Hyperdrive. */
export function pgDatabase(connectionString: string): Database & { close(): Promise<void> } {
  const clients: pg.Client[] = [];
  return {
    async tx(role, claims, fn) {
      const client = new pg.Client({ connectionString });
      clients.push(client);
      await client.connect();
      try {
        await client.query('begin');
        await client.query(`set local role ${role === 'app_user' ? 'app_user' : 'app_service'}`);
        await client.query('select app.set_claims($1::jsonb)', [JSON.stringify(claims ?? {})]);
        const tx: Tx = {
          query: async (sql, params) => {
            const r = await client.query(sql, params as any[]);
            return { rows: r.rows, rowCount: r.rowCount ?? 0 };
          },
        };
        const out = await fn(tx);
        await client.query('commit');
        return out;
      } catch (e) {
        await client.query('rollback').catch(() => {});
        throw e;
      } finally {
        await client.end().catch(() => {});
        clients.splice(clients.indexOf(client), 1);
      }
    },
    async close() {
      await Promise.all(clients.map((c) => c.end().catch(() => {})));
    },
  };
}
