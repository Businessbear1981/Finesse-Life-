-- Finesse — The Switchboard: no "connected" without a real OAuth token. Idempotent.
-- Before: members could upsert social_accounts.connected = true with no token (a preference posing as a link), and
-- broadcast sent access_token_enc to X as if it were a raw token.
-- After:
--   • connected = true requires an access_token_enc (sealed with INTEGRATIONS_ENCRYPTION_KEY — src/lib/switchboard.ts).
--   • members can read and disconnect (delete) their own rows but never insert or update them: only a server-side
--     OAuth callback (service role) can link a network. No OAuth app is configured yet, so nothing is linked.
--   • every existing tokenless "connected" row is reset to not connected.
--   • broadcast log rows are the member's own; a broadcast that never reached a network is never logged 'sent'.

update public.social_accounts set connected = false, connected_at = null
  where connected and access_token_enc is null;

do $$ begin
  alter table public.social_accounts add constraint social_accounts_connected_has_token
    check (not connected or access_token_enc is not null);
exception when duplicate_object then null; end $$;

alter table public.social_accounts enable row level security;
drop policy if exists "social_accounts_own" on public.social_accounts;
drop policy if exists "social_own" on public.social_accounts;
drop policy if exists social_accounts_owner_read on public.social_accounts;
drop policy if exists social_accounts_owner_disconnect on public.social_accounts;
create policy social_accounts_owner_read on public.social_accounts
  for select to authenticated using (auth.uid() = user_id);
create policy social_accounts_owner_disconnect on public.social_accounts
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.social_accounts from anon;
revoke insert, update on public.social_accounts from authenticated;
grant select, delete on public.social_accounts to authenticated;

alter table public.social_broadcasts enable row level security;
drop policy if exists "social_broadcasts_own" on public.social_broadcasts;
drop policy if exists "broadcasts_own" on public.social_broadcasts;
drop policy if exists social_broadcasts_owner_read on public.social_broadcasts;
drop policy if exists social_broadcasts_owner_log on public.social_broadcasts;
create policy social_broadcasts_owner_read on public.social_broadcasts
  for select to authenticated using (auth.uid() = user_id);
create policy social_broadcasts_owner_log on public.social_broadcasts
  for insert to authenticated with check (auth.uid() = user_id);

revoke all on public.social_broadcasts from anon;
revoke update, delete on public.social_broadcasts from authenticated;
grant select, insert on public.social_broadcasts to authenticated;
