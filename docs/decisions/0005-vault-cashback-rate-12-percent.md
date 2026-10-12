# 0005 — Vault cashback rate is 12%

> **Status:** ACCEPTED
> **Date:** 2026-10-12
> **Decision:** The Vault cashback rate is **12% (1200 basis points)**, decided by the founder (Sean Gilmore). This settles the "1% vs 12%" question left open in ADR-0002 and NEW_SOURCE_RECONCILIATION.md.

## Context

The code calculated 1%, the Vault manual said 12%, and the Scale sheet budgeted a −1% cost. ADR-0002 froze member-initiated Vault writes until the rate, funding source, card partner and settlement event were signed off. The founder has now decided the rate.

## Decision

- Rate: 12%. Configure `VAULT_CASHBACK_RATE_BPS=1200`; member-facing copy states 12%.
- Unchanged: Vault ledger writes stay frozen (`VAULT_LEDGER_WRITES_ENABLED` unset) until the card partner and a verified settlement/funding event source are signed. Credits are only minted from partner-confirmed events (ADR-0004: members never write Vault rows).

## Consequences

- AGENTS.md and the June audit called 12% "a bug" because no funding source covers it and the prospectus economics assume ~1%. That risk is now an accepted business decision rather than a code defect; the funding source must still be contracted before writes are enabled.
- AGENTS.md / STATE.md wording that calls 12% a bug is superseded by this record.

## Links

- ADR-0002 (Vault freeze) · ADR-0004 (server-managed entitlements) · `src/lib/vault-guard.ts`
