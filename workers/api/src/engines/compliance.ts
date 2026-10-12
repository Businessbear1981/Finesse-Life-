import type { Engine } from './types';

const MONEY_ACTIONS = new Set(['charge', 'refund', 'transfer', 'scale.join', 'vault.withdraw']);

/**
 * Compliance engine (tier 0): nothing that charges, books, publishes, messages or transfers runs
 * without member confirmation. It turns a requested action into a proposed commitment.
 */
export const complianceEngine: Engine = {
  id: 'compliance',
  intents: ['compliance_check', 'action.propose'],
  consumes: [],
  emits: ['commitment.proposed'],
  tier: 0,
  provider: 'internal',
  timeoutMs: 1000,
  async handle({ payload }) {
    const action = String(payload.action ?? '');
    if (!action) throw new Error('payload.action is required');
    const amount = payload.amount_cents == null ? undefined : Number(payload.amount_cents);
    if (amount != null && (!Number.isInteger(amount) || amount < 0)) throw new Error('amount_cents must be a non-negative integer');
    const money = MONEY_ACTIONS.has(action) || (amount ?? 0) > 0;
    return {
      kind: 'compliance.decision',
      result: { action, requires_confirmation: true, requires_step_up: money },
      commitments: [{ action, amount_cents: amount, currency: amount != null ? String(payload.currency ?? 'usd') : undefined, requires_step_up: money }],
      events: [{ type: 'commitment.proposed', payload: { action, amount_cents: amount ?? null } }],
    };
  },
};
