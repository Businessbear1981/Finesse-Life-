/**
 * Vault write freeze (see docs/decisions/0002 and the 30-Sep-2026 source reconciliation).
 * Rate: 12% (1200 bps) — founder decision 2026-10-12 (ADR-0005). Funding source, card
 * partner and settlement event remain OPEN; until they are signed, writes stay frozen.
 * Until a reviewed partner event source exists, member-initiated routes must not
 * mint spendable balance or cashback.
 *
 * Enable only after sign-off by setting BOTH:
 *   VAULT_LEDGER_WRITES_ENABLED=true
 *   VAULT_CASHBACK_RATE_BPS=1200   (12%, ADR-0005)
 */
import {NextResponse} from 'next/server';

export function vaultWritesFrozen(): NextResponse | null {
  if (process.env.VAULT_LEDGER_WRITES_ENABLED === 'true') return null;
  return NextResponse.json(
    {
      error: 'vault_writes_frozen',
      message: 'The Vault ledger opens once the card partner and settlement source are signed off. Nothing was recorded.',
      truthState: 'gated',
    },
    {status: 423},
  );
}

/** Approved cashback rate in basis points, or null if not configured (fail closed). */
export function cashbackRateBps(): number | null {
  const raw = Number(process.env.VAULT_CASHBACK_RATE_BPS);
  return Number.isInteger(raw) && raw >= 0 && raw <= 2000 ? raw : null;
}
