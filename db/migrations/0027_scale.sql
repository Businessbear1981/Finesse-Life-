-- ============================================================
-- 0027 · Scale: group-buy campaigns (schema scale)
-- Charge at goal, 12-hour decline window, decline = strike,
-- waitlist (20% of goal) backfill, bulk charge, 3PL handoff, rebate.
-- Members read; all writes go through the Worker (service role).
-- ============================================================
create schema if not exists scale;
grant usage on schema scale to app_user, app_service;

create table scale.campaigns (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  edition           text not null default 'both' check (edition in ('her','him','both')),
  product           jsonb not null default '{}',
  retail_cents      bigint not null check (retail_cents > 0),
  unit_goal         int not null check (unit_goal > 0),
  waitlist_size     int not null,
  max_per_member    int not null default 5 check (max_per_member > 0),
  status            text not null default 'draft'
                    check (status in ('draft','open','decision_window','charging','fulfilling','closed','failed','cancelled')),
  opens_at          timestamptz,
  closes_at         timestamptz not null,
  decline_window_hours int not null default 12 check (decline_window_hours between 1 and 72),
  window_ends_at    timestamptz,
  rebate_bps        int not null default 0 check (rebate_bps between 0 and 10000),
  wholesale         jsonb not null default '{}',   -- supplier, unit cost, MOQ, lead time, terms
  fulfilment        jsonb not null default '{}',   -- 3PL provider and ship-from
  created_by        uuid references app.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (waitlist_size >= 0)
);

create table scale.tiers (
  campaign_id      uuid not null references scale.campaigns(id) on delete cascade,
  min_units        int not null check (min_units >= 0),
  unit_price_cents bigint not null check (unit_price_cents > 0),
  unit_cost_cents  bigint,
  primary key (campaign_id, min_units)
);

create table scale.pledges (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references scale.campaigns(id) on delete cascade,
  user_id         uuid not null references app.users(id) on delete cascade,
  quantity        int not null check (quantity > 0),
  status          text not null default 'pledged'
                  check (status in ('pledged','waitlisted','payment_requested','paid','declined','missed','withdrawn','refunded')),
  waitlist_position int,
  payment_method_ref text,              -- processor token, never a card number
  unit_price_cents bigint,
  amount_cents    bigint,
  charge_ref      text,
  promoted_at     timestamptz,
  declined_at     timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (campaign_id, user_id)
);
create index on scale.pledges (campaign_id, status, created_at);

create table scale.strikes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app.users(id) on delete cascade,
  campaign_id uuid references scale.campaigns(id) on delete set null,
  pledge_id   uuid references scale.pledges(id) on delete set null,
  reason      text not null check (reason in ('declined_in_window','charge_failed','manual')),
  expires_at  timestamptz,               -- null until Sean sets an expiry policy
  voided_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index on scale.strikes (user_id) where voided_at is null;

create table scale.shipments (
  id           uuid primary key default gen_random_uuid(),
  pledge_id    uuid not null unique references scale.pledges(id) on delete cascade,
  user_id      uuid not null references app.users(id) on delete cascade,
  provider     text not null,
  provider_ref text,
  status       text not null default 'requested' check (status in ('requested','accepted','shipped','in_transit','delivered','exception')),
  carrier      text,
  tracking     text,
  updated_at   timestamptz not null default now()
);

create table scale.rebates (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references scale.campaigns(id) on delete cascade,
  user_id     uuid not null references app.users(id) on delete cascade,
  amount_cents bigint not null check (amount_cents >= 0),
  status      text not null default 'owed' check (status in ('owed','credited','void')),
  created_at  timestamptz not null default now(),
  unique (campaign_id, user_id)
);

-- Members can read open campaigns and tiers; their own pledges, strikes, shipments, rebates.
alter table scale.campaigns enable row level security;
alter table scale.tiers enable row level security;
create policy campaigns_read on scale.campaigns for select to app_user using (status <> 'draft');
create policy tiers_read on scale.tiers for select to app_user using (exists (select 1 from scale.campaigns c where c.id = campaign_id and c.status <> 'draft'));
grant select on scale.campaigns, scale.tiers to app_user;
select app.apply_service_policy('scale.campaigns'); select app.apply_service_policy('scale.tiers');

select app.apply_owner_rls(t::regclass) from unnest(array['scale.pledges','scale.strikes','scale.shipments','scale.rebates']) t;
do $$ declare t text; begin
  foreach t in array array['scale.pledges','scale.strikes','scale.shipments','scale.rebates'] loop
    execute format('drop policy owner_write on %s', t);
    execute format('revoke insert, update, delete on %s from app_user', t);
  end loop;
end $$;

-- Append-only, hash-chained event log for every campaign state change.
select app.enable_chronicle(t::regclass) from unnest(array['scale.campaigns','scale.tiers','scale.pledges','scale.strikes','scale.shipments','scale.rebates']) t;

-- Current unit price for a campaign given total committed units.
create or replace function scale.unit_price(p_campaign uuid, p_units int) returns bigint
language sql stable as $$
  select unit_price_cents from scale.tiers where campaign_id = p_campaign and min_units <= p_units
  order by min_units desc limit 1
$$;

create or replace function scale.committed_units(p_campaign uuid) returns int
language sql stable as $$
  select coalesce(sum(quantity), 0)::int from scale.pledges
  where campaign_id = p_campaign and status in ('pledged','payment_requested','paid')
$$;
