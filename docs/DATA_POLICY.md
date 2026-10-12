# Finesse data policy — financial data (Plaid)

> Policy version 1 (`PLAID_POLICY.version` in `workers/api/src/policy.ts`). Replaces the earlier
> "no financial data" rule. Approved by Sean, 2026-10-12. Decision record: `docs/decisions/0003-plaid-consented-financial-data.md`.

Finesse may use a member's financial data **only** when the member has connected a bank through Plaid
and given recorded consent, **only** for the stated purpose, and **only** the minimum fields needed.

## Rules

1. **Opt-in and recorded.** Before Plaid Link opens, the member sees the exact scopes and purpose and ticks
   "I agree". The Worker writes `fin.consents` (scopes, purpose, policy version, time, user agent).
   No consent row → no link token, no exchange (`403 consent_required`).
2. **Scoped.** Allowed scopes: `accounts`, `balances`. Anything else is refused (`400`).
3. **Minimized.** Stored: account name, type/subtype, last 4 of the mask, current/available balance in cents,
   currency, institution name. **Not stored:** account or routing numbers, transactions, identity, investments.
   Link initializes with the `transactions` product only because Plaid does not allow balance-only Link;
   we never call transaction endpoints or persist transactions.
4. **Server-side tokens, encrypted at rest.** The `public_token` is exchanged in the Worker. The `access_token`
   never reaches a browser or device. It is sealed with AES-256-GCM (`PLAID_TOKEN_KEY`, versioned for rotation,
   AAD = `user_id:plaid_item_id`) in `fin.plaid_item_secrets`, which members cannot read (no grant, RLS forced).
5. **Owner-only visibility.** `fin.consents`, `fin.plaid_items`, `fin.accounts` are RLS owner-select;
   all writes go through the Worker (`app_service`). Consent and link lifecycle are hash-chain audited.
6. **Purpose limits.** Used for budget-aware planning (Per Diem, Nightvision, Nova suggestions).
   **Never** an input to Standing (the social score), referral eligibility, Scale priority, pricing, or any
   eligibility decision. Never sold or shared with third parties.
7. **Revocable.** Disconnect (member) or `USER_PERMISSION_REVOKED`/`USER_ACCOUNT_REVOKED` (Plaid webhook):
   `/item/remove` at Plaid, delete the token and accounts, mark the Item revoked, revoke the consent.
   Account deletion cascades everything.
8. **Verified webhooks.** `POST /v1/plaid/webhook` accepts only an ES256 `Plaid-Verification` JWT, key fetched by
   `kid`, issued within 5 minutes, whose `request_body_sha256` matches the raw body. Receipts are deduped.

## Configuration

Worker secrets: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_TOKEN_KEY` (`openssl rand -base64 32`), optional
`PLAID_TOKEN_KEY_PREV` + `_VERSION` during rotation. Vars: `PLAID_ENV` (`sandbox` | `production`),
`PLAID_WEBHOOK_URL`. Without credentials every Plaid route fails closed with `503 plaid_not_configured`.

# Jazz Club music (Feed.fm)

Vendor: Feed.fm Streaming API v3. The device streams directly from Feed.fm (licensing requires the
listener's own IP). The Worker keeps the consumer secret (`FEEDFM_TOKEN`/`FEEDFM_SECRET`) and hands the device
a 1-hour access token plus the member's persistent `client_id` (`jazz.listeners`). The room reports
start/elapse/complete/skip/invalidate as required, gates Skip on `can_skip` and a successful skip response,
shows title/artist/album for 5 s, and displays "Powered by Feed.fm" with the disclaimer one click away.
