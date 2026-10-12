import type { Tx } from '../db';
import type { Claim } from '../truth';

export interface EngineInput {
  intent: string;
  payload: Record<string, unknown>;
  userId: string;
  /** Member-scoped transaction: engines only see what RLS lets the member see. */
  read: Tx;
}

export interface ProposedCommitment {
  action: string;
  amount_cents?: number;
  currency?: string;
  requires_step_up?: boolean;
}

export interface EngineOutput {
  kind: string;
  result: Record<string, unknown>;
  claims?: Claim[];
  commitments?: ProposedCommitment[];
  events?: { type: string; payload: Record<string, unknown> }[];
}

/**
 * Engine contract. The orchestrator reads it; adding an engine is registering one object,
 * not editing a switch. Engines publish events and never read each other's tables.
 */
export interface Engine {
  id: string;
  intents: string[];
  consumes: string[];   // event types it listens to (Queues)
  emits: string[];      // event types it may publish
  tier: 0 | 1 | 2 | 3;  // 0 = pure code, 1 = fast model, 2 = strong model, 3 = long job (Railway)
  provider: string;     // breaker key
  timeoutMs: number;
  handle(input: EngineInput): Promise<EngineOutput>;
}
