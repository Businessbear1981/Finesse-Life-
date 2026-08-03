-- Adds the cipher column vault/cashback/route.ts always intended to persist
-- (KeyLock HMAC tying a transaction to the session it was initiated in) but
-- never had a column for — the insert was silently failing on every call.
alter table public.vault_transactions
  add column if not exists cipher text;
