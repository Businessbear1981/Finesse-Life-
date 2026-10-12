-- ============================================================
-- 0029 · Personal Shopper, Nightvision (consent) and Learning skeletons
-- ============================================================
create schema if not exists engines;
grant usage on schema engines to app_user, app_service;

-- Nightvision: Style DNA is used only with explicit, revocable consent.
create table engines.nightvision_consents (
  user_id    uuid primary key references app.users(id) on delete cascade,
  scope      text[] not null default array['style_dna'],
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Personal Shopper: shortlists and wholesaler quotes that seed Scale campaign drafts.
create table engines.shortlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app.users(id) on delete cascade,
  title       text not null,
  brand       text,
  category    text,
  price_cents bigint,
  source      text not null check (source in ('exchange','registry','scale','retail','photo')),
  source_ref  text,
  image_key   text,                  -- R2 key (picture encouragement: member photos)
  created_at  timestamptz not null default now()
);
create table engines.wholesale_quotes (
  id            uuid primary key default gen_random_uuid(),
  product       jsonb not null,
  supplier      text not null,
  retail_cents  bigint not null,
  tiers         jsonb not null,      -- [{min_units, unit_cost_cents}]
  status        text not null default 'proposed' check (status in ('proposed','approved','rejected','used')),
  campaign_id   uuid references scale.campaigns(id),
  created_at    timestamptz not null default now()
);

-- Learning: closed campaigns become training rows; models are versioned, shadowed, promoted, rolled back.
create table engines.training_rows (
  campaign_id  uuid primary key references scale.campaigns(id) on delete cascade,
  category     text,
  unit_goal    int not null,
  final_units  int not null,
  declines     int not null,
  pledge_curve jsonb not null,       -- units per day since open
  created_at   timestamptz not null default now()
);
create table engines.model_versions (
  id          uuid primary key default gen_random_uuid(),
  engine      text not null,
  version     int not null,
  params      jsonb not null,
  status      text not null default 'shadow' check (status in ('shadow','live','retired')),
  metric      jsonb,
  created_at  timestamptz not null default now(),
  unique (engine, version)
);
create unique index model_versions_one_live on engines.model_versions (engine) where status = 'live';

select app.apply_owner_rls(t::regclass) from unnest(array['engines.nightvision_consents','engines.shortlist_items']) t;
do $$ declare t text; begin
  foreach t in array array['engines.nightvision_consents'] loop
    execute format('drop policy owner_write on %s', t);
    execute format('revoke insert, update, delete on %s from app_user', t);
  end loop;
end $$;
alter table engines.wholesale_quotes enable row level security;
alter table engines.training_rows enable row level security;
alter table engines.model_versions enable row level security;
select app.apply_service_policy(t::regclass) from unnest(array['engines.wholesale_quotes','engines.training_rows','engines.model_versions']) t;
select app.enable_chronicle(t::regclass) from unnest(array['engines.nightvision_consents','engines.wholesale_quotes','engines.model_versions']) t;

insert into engines.model_versions(engine, version, params, status)
values ('scale_forecast', 1, '{"decline_rate":0.08,"variance_multiplier":3,"curve":"flat"}', 'live');
