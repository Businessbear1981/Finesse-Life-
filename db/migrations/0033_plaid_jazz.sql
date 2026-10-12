-- ============================================================
-- 0033 · Consented, scoped financial data via Plaid + Jazz Club (Feed.fm) listeners.
-- Policy: docs/DATA_POLICY.md. Financial data is opt-in per member, scoped to the consent record,
-- minimized (account metadata + balances; no account/routing numbers, no raw transactions stored),
-- never used for Standing, and deleted on disconnect.
-- ============================================================
create schema if not exists fin;
grant usage on schema fin to app_user, app_service;

-- Consent ledger: what the member agreed to, for what purpose, under which policy version.
create table if not exists fin.consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references app.users(id) on delete cascade,
  provider       text not null check (provider in ('plaid')),
  scopes         text[] not null check (cardinality(scopes) > 0),
  purpose        text not null check (length(purpose) between 3 and 300),
  policy_version int  not null,
  user_agent     text,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  revoke_reason  text
);
create index if not exists consents_user_idx on fin.consents(user_id);

-- One row per linked institution (Plaid Item). The access token lives in plaid_item_secrets.
create table if not exists fin.plaid_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references app.users(id) on delete cascade,
  consent_id       uuid not null references fin.consents(id),
  plaid_item_id    text not null unique,
  institution_id   text,
  institution_name text,
  status           text not null default 'active' check (status in ('active','login_required','pending_disconnect','revoked','error')),
  error_code       text,
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  revoked_at       timestamptz
);
create index if not exists plaid_items_user_idx on fin.plaid_items(user_id);

-- Encrypted access tokens (AES-256-GCM, AAD = user_id:plaid_item_id). Service role only; members never read it.
create table if not exists fin.plaid_item_secrets (
  item_id          uuid primary key references fin.plaid_items(id) on delete cascade,
  access_token_enc text not null,
  key_version      text not null default 'v1',
  updated_at       timestamptz not null default now()
);

-- Minimized account view: no full account numbers, no routing numbers.
create table if not exists fin.accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references app.users(id) on delete cascade,
  item_id          uuid not null references fin.plaid_items(id) on delete cascade,
  plaid_account_id text not null unique,
  name             text not null,
  mask             text check (mask is null or mask ~ '^[0-9A-Za-z]{0,4}$'),
  type             text not null,
  subtype          text,
  current_cents    bigint,
  available_cents  bigint,
  iso_currency     text,
  updated_at       timestamptz not null default now()
);
create index if not exists accounts_item_idx on fin.accounts(item_id);

-- Webhook receipts: dedupe on body hash, keep the minimum for audit.
create table if not exists fin.webhook_events (
  id            bigint generated always as identity primary key,
  body_sha256   text not null unique,
  webhook_type  text not null,
  webhook_code  text not null,
  plaid_item_id text,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);

-- RLS: members read their own consents/items/accounts; every write goes through the Worker as app_service.
do $$ declare t text; begin
  foreach t in array array['fin.consents','fin.plaid_items','fin.accounts'] loop
    execute format('alter table %s enable row level security', t);
    execute format('alter table %s force row level security', t);
    execute format('drop policy if exists owner_select on %s', t);
    execute format('create policy owner_select on %s for select to app_user using (user_id = app.uid())', t);
    execute format('grant select on %s to app_user', t);
    perform app.apply_service_policy(t::regclass);
  end loop;
end $$;
alter table fin.plaid_item_secrets enable row level security;
alter table fin.plaid_item_secrets force row level security;
alter table fin.webhook_events enable row level security;
alter table fin.webhook_events force row level security;
select app.apply_service_policy('fin.plaid_item_secrets'::regclass);
select app.apply_service_policy('fin.webhook_events'::regclass);
revoke all on fin.plaid_item_secrets, fin.webhook_events from app_user;
grant usage on all sequences in schema fin to app_service;

-- Jazz Club: one persistent Feed.fm client id per member (keeps play history and skip limits).
create schema if not exists jazz;
grant usage on schema jazz to app_user, app_service;
create table if not exists jazz.listeners (
  user_id        uuid primary key references app.users(id) on delete cascade,
  feed_client_id text not null,
  created_at     timestamptz not null default now()
);
alter table jazz.listeners enable row level security;
alter table jazz.listeners force row level security;
drop policy if exists owner_select on jazz.listeners;
create policy owner_select on jazz.listeners for select to app_user using (user_id = app.uid());
grant select on jazz.listeners to app_user;
select app.apply_service_policy('jazz.listeners'::regclass);

-- Hash-chained audit trail for consent and link lifecycle (never the token table).
select app.enable_chronicle(t::regclass) from unnest(array['fin.consents','fin.plaid_items']) t;
