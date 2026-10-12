-- ============================================================
-- 0025 · Wave 0 orchestration (schema orch)
-- intents → plays → tier_runs → artifacts, guarded by breakers and
-- truth_checks, with a transactional outbox drained by Cloudflare Queues.
-- Separate schema so it does not collide with legacy public.truth_checks.
-- ============================================================
create schema if not exists orch;
grant usage on schema orch to app_user, app_service;

-- Seats: who may act (member, staff, agent) and in which capacity.
create table orch.seats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app.users(id) on delete cascade,
  kind        text not null check (kind in ('member','staff','agent','partner')),
  scope       text not null default 'self',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, kind, scope)
);

-- Intents: one per inbound envelope. idempotency_key makes retries safe.
create table orch.intents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references app.users(id) on delete cascade,
  kind             text not null,
  payload          jsonb not null default '{}',
  idempotency_key  text not null,
  status           text not null default 'received'
                   check (status in ('received','planned','running','awaiting_confirmation','done','failed','cancelled')),
  requires_step_up boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index on orch.intents (user_id, created_at desc);

-- Plays: the plan an engine chose for an intent.
create table orch.plays (
  id         uuid primary key default gen_random_uuid(),
  intent_id  uuid not null references orch.intents(id) on delete cascade,
  user_id    uuid not null references app.users(id) on delete cascade,
  engine     text not null,
  plan       jsonb not null default '{}',
  status     text not null default 'pending' check (status in ('pending','running','done','failed','skipped')),
  created_at timestamptz not null default now()
);
create index on orch.plays (intent_id);

-- Tier runs: each model/tool call a play makes (tier = cost/latency class).
create table orch.tier_runs (
  id           uuid primary key default gen_random_uuid(),
  play_id      uuid not null references orch.plays(id) on delete cascade,
  user_id      uuid not null references app.users(id) on delete cascade,
  tier         smallint not null check (tier between 0 and 3),
  provider     text not null,
  status       text not null default 'running' check (status in ('running','ok','error','timeout','breaker_open')),
  latency_ms   int,
  cost_micros  bigint not null default 0,
  error        text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index on orch.tier_runs (play_id);

-- Breakers: shared circuit-breaker state (replaces per-process maps).
create table orch.breakers (
  provider     text primary key,
  state        text not null default 'closed' check (state in ('closed','open','half_open')),
  failures     int not null default 0,
  opened_at    timestamptz,
  retry_after  timestamptz,
  updated_at   timestamptz not null default now()
);

-- Artifacts: outputs of a play (text, R2 object, structured result).
create table orch.artifacts (
  id          uuid primary key default gen_random_uuid(),
  play_id     uuid not null references orch.plays(id) on delete cascade,
  user_id     uuid not null references app.users(id) on delete cascade,
  kind        text not null,
  body        jsonb,
  r2_key      text,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on orch.artifacts (play_id);

-- Source reads: every external/internal source the truth wrapper consulted.
create table orch.source_reads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references app.users(id) on delete cascade,
  tier_run_id  uuid references orch.tier_runs(id) on delete set null,
  source_type  text not null check (source_type in ('db','web','model','api','static')),
  ref          text not null,
  content_hash bytea,
  read_at      timestamptz not null default now()
);

-- Truth checks: verdict on an artifact's claims.
create table orch.truth_checks (
  id           uuid primary key default gen_random_uuid(),
  artifact_id  uuid not null references orch.artifacts(id) on delete cascade,
  user_id      uuid not null references app.users(id) on delete cascade,
  claim        text not null,
  verdict      text not null check (verdict in ('verified','contradicted','unverifiable','warn')),
  confidence   real not null check (confidence between 0 and 1),
  source_ids   uuid[] not null default '{}',
  gated        boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on orch.truth_checks (artifact_id);

-- Commitments: anything that charges, books, publishes, messages or transfers.
-- Never executed until confirmed (passkey step-up for money/irreversible).
create table orch.commitments (
  id             uuid primary key default gen_random_uuid(),
  intent_id      uuid not null references orch.intents(id) on delete cascade,
  user_id        uuid not null references app.users(id) on delete cascade,
  action         text not null,
  amount_cents   bigint,
  currency       text,
  status         text not null default 'proposed'
                 check (status in ('proposed','confirmed','executed','declined','expired','failed')),
  requires_step_up boolean not null default true,
  expires_at     timestamptz not null default now() + interval '12 hours',
  confirmed_at   timestamptz,
  created_at     timestamptz not null default now(),
  check (status <> 'confirmed' or confirmed_at is not null)
);
create index on orch.commitments (user_id, status);

-- Live touches: a member-visible interaction (Nova message, push, room nudge).
create table orch.live_touches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references app.users(id) on delete cascade,
  intent_id  uuid references orch.intents(id) on delete set null,
  channel    text not null check (channel in ('nova','push','email','sms','room')),
  body       jsonb not null,
  seen_at    timestamptz,
  created_at timestamptz not null default now()
);
create index on orch.live_touches (user_id, created_at desc);

-- Presence: last-seen per member and surface.
create table orch.presence (
  user_id    uuid not null references app.users(id) on delete cascade,
  surface    text not null,
  room       text,
  last_seen  timestamptz not null default now(),
  primary key (user_id, surface)
);

-- Events: append-only domain events (engines publish, never read each other's tables).
create table orch.events (
  id          bigint generated always as identity primary key,
  user_id     uuid references app.users(id) on delete set null,
  type        text not null,
  payload     jsonb not null default '{}',
  intent_id   uuid references orch.intents(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on orch.events (type, id);

-- Outbox: written in the same transaction as the event; relay publishes to Queues.
create table orch.outbox (
  id            bigint generated always as identity primary key,
  event_id      bigint not null references orch.events(id) on delete cascade,
  topic         text not null,
  payload       jsonb not null,
  attempts      int not null default 0,
  available_at  timestamptz not null default now(),
  published_at  timestamptz,
  last_error    text
);
create index outbox_pending_idx on orch.outbox (available_at, id) where published_at is null;

-- Emitting an event writes the outbox row atomically.
create or replace function orch.emit(p_type text, p_payload jsonb, p_topic text default 'events', p_intent uuid default null)
returns bigint language plpgsql security definer set search_path = orch, app, public as $$
declare eid bigint;
begin
  insert into orch.events(user_id, type, payload, intent_id) values (app.uid(), p_type, p_payload, p_intent) returning id into eid;
  insert into orch.outbox(event_id, topic, payload)
  values (eid, p_topic, jsonb_build_object('event_id', eid, 'type', p_type, 'user_id', app.uid(), 'payload', p_payload));
  return eid;
end $$;

-- Relay claims a batch without blocking other relays.
create or replace function orch.claim_outbox(batch int default 100)
returns setof orch.outbox language sql security definer set search_path = orch as $$
  update orch.outbox o set attempts = o.attempts + 1, available_at = now() + interval '30 seconds'
  where o.id in (
    select id from orch.outbox where published_at is null and available_at <= now()
    order by id limit batch for update skip locked)
  returning o.*
$$;

create or replace function orch.mark_published(ids bigint[]) returns void language sql security definer set search_path = orch as $$
  update orch.outbox set published_at = now(), last_error = null where id = any(ids)
$$;

-- ── RLS + audit ─────────────────────────────────────────────
select app.apply_owner_rls(t::regclass) from unnest(array[
  'orch.seats','orch.intents','orch.plays','orch.tier_runs','orch.artifacts','orch.source_reads',
  'orch.truth_checks','orch.commitments','orch.live_touches','orch.presence','orch.events'
]) t;

-- Members may read their own seats/plays/runs/checks/events but not forge them.
do $$ declare t text; begin
  foreach t in array array['orch.seats','orch.plays','orch.tier_runs','orch.artifacts','orch.source_reads','orch.truth_checks','orch.events'] loop
    execute format('drop policy owner_write on %s', t);
    execute format('revoke insert, update, delete on %s from app_user', t);
  end loop;
end $$;

-- Confirming a commitment that needs step-up requires a fresh passkey assertion.
create policy commitments_step_up on orch.commitments as restrictive for update to app_user
  using (true)
  with check (status <> 'confirmed' or not requires_step_up or app.stepped_up());

-- Breakers and outbox are infrastructure: service only.
-- Not forced: orch.emit / claim_outbox are SECURITY DEFINER and run as the owner.
alter table orch.breakers enable row level security;
alter table orch.outbox   enable row level security;
alter table orch.events   no force row level security;
grant all on all tables in schema orch to app_service;
select app.apply_service_policy('orch.breakers'); select app.apply_service_policy('orch.outbox');
grant usage, select on all sequences in schema orch to app_service;
grant execute on function orch.emit(text, jsonb, text, uuid) to app_user, app_service;
grant execute on function orch.claim_outbox(int), orch.mark_published(bigint[]) to app_service;
revoke execute on function orch.claim_outbox(int), orch.mark_published(bigint[]) from public;

select app.enable_chronicle(t::regclass) from unnest(array[
  'orch.seats','orch.intents','orch.commitments','orch.breakers'
]) t;
