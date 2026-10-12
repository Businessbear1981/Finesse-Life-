import type { Tx } from './db';

export const FAILURE_THRESHOLD = 5;
export const OPEN_SECONDS = 60;

/** Shared circuit breaker in orch.breakers (replaces per-isolate maps). Uses the service tx. */
export async function breakerAllows(tx: Tx, provider: string): Promise<boolean> {
  const { rows } = await tx.query<{ state: string; retry_after: Date | null }>(
    'select state, retry_after from orch.breakers where provider = $1', [provider]);
  const b = rows[0];
  if (!b || b.state === 'closed') return true;
  if (b.state === 'open' && b.retry_after && new Date(b.retry_after) <= new Date()) {
    await tx.query("update orch.breakers set state = 'half_open', updated_at = now() where provider = $1", [provider]);
    return true;
  }
  return b.state === 'half_open';
}

export async function recordResult(tx: Tx, provider: string, ok: boolean): Promise<void> {
  if (ok) {
    await tx.query(
      `insert into orch.breakers(provider) values ($1)
       on conflict (provider) do update set state = 'closed', failures = 0, opened_at = null, retry_after = null, updated_at = now()`,
      [provider]);
    return;
  }
  await tx.query(
    `insert into orch.breakers(provider, failures) values ($1, 1)
     on conflict (provider) do update set
       failures = orch.breakers.failures + 1,
       state = case when orch.breakers.state = 'half_open' or orch.breakers.failures + 1 >= $2 then 'open' else orch.breakers.state end,
       opened_at = case when orch.breakers.state = 'half_open' or orch.breakers.failures + 1 >= $2 then now() else orch.breakers.opened_at end,
       retry_after = case when orch.breakers.state = 'half_open' or orch.breakers.failures + 1 >= $2 then now() + make_interval(secs => $3) else orch.breakers.retry_after end,
       updated_at = now()`,
    [provider, FAILURE_THRESHOLD, OPEN_SECONDS]);
}
