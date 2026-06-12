// ─── Intelligence Signal Bus ──────────────────────────────────────────────────
// Non-blocking event tracker. Every user action that teaches the engine
// gets emitted here. Fire-and-forget — never blocks the calling request.

import { createServiceClient } from '@/lib/supabase/service';
import type { Signal, SignalKind } from './types';

export async function emit(signal: Signal): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from('intelligence_signals').insert({
      user_id: signal.user_id,
      kind: signal.kind,
      payload: signal.payload,
      context: signal.context ?? {},
    });
  } catch {
    // Signals are instrumentation — never surface errors to callers
  }
}

export async function emitBatch(signals: Signal[]): Promise<void> {
  if (signals.length === 0) return;
  try {
    const db = createServiceClient();
    await db.from('intelligence_signals').insert(
      signals.map((s) => ({
        user_id: s.user_id,
        kind: s.kind,
        payload: s.payload,
        context: s.context ?? {},
      })),
    );
  } catch {
    // Non-critical
  }
}

export async function getRecentSignals(
  userId: string,
  kinds?: SignalKind[],
  limit = 150,
): Promise<Signal[]> {
  const db = createServiceClient();
  let q = db
    .from('intelligence_signals')
    .select('id, user_id, kind, payload, context, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (kinds && kinds.length > 0) {
    q = q.in('kind', kinds);
  }

  const { data } = await q;
  return (data ?? []) as Signal[];
}

export async function getSignalCounts(
  userId: string,
  windowDays = 30,
): Promise<Record<string, number>> {
  const db = createServiceClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from('intelligence_signals')
    .select('kind')
    .eq('user_id', userId)
    .gte('created_at', since);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const r = row as { kind: string };
    counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  }
  return counts;
}

// Pull platform-wide signals for market intelligence (no PII)
export async function getGlobalSignals(
  kind: SignalKind,
  windowDays = 7,
  limit = 500,
): Promise<Array<{ payload: Record<string, unknown>; created_at: string }>> {
  const db = createServiceClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from('intelligence_signals')
    .select('payload, created_at')
    .eq('kind', kind)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as Array<{ payload: Record<string, unknown>; created_at: string }>;
}
