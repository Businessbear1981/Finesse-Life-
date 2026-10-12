# 0003 — Consented, scoped financial data via Plaid (supersedes "no financial data")

> **Status:** ACCEPTED
> **Date:** 2026-10-12
> **Decision:** We allow Plaid-sourced account and balance data with recorded per-member consent, minimization and revocation, instead of banning financial data outright.

## Context

The Standing spec and early copy said "no financial data". Sean approved Plaid on 2026-10-12 so Nova and the
budget rooms (Per Diem, Nightvision) can plan within a member's real budget.

## Options considered

- **Consented, scoped Plaid (chosen):** real budget signal, member control, auditable.
- **Keep the ban:** no budget awareness; Nightvision keeps a dead Plaid toggle.
- **Full transactions ingestion:** more signal, much larger privacy and compliance surface; not needed yet.

## Decision

Implement per `docs/DATA_POLICY.md`: consent ledger, accounts + balances only, server-side exchange, AES-GCM
encrypted tokens, RLS, verified webhooks, disconnect deletes data. Financial data stays out of Standing.
Transactions remain out of scope until a separate decision.
