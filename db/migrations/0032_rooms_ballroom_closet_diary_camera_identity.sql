-- ============================================================
-- 0032 · Atlas rooms 24, 28–31 (Ballroom, This Is You, Closet, Diary, Camera). All member-owned, owner RLS, audited.
-- ============================================================
create table if not exists public.diary_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app.users(id) on delete cascade,
  day         date not null,
  title       text not null check (length(title) between 1 and 200),
  room        text,                                   -- which room produced it (salon, ballroom, registry…)
  status      text not null default 'needs_you' check (status in ('done','needs_you','approved','held','moved')),
  detail      jsonb not null default '{}',
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists diary_items_user_day_idx on public.diary_items (user_id, day);

create table if not exists public.closet_rotations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app.users(id) on delete cascade,
  week_start  date not null,
  looks       jsonb not null default '[]',            -- [{day, item_ids[], held?}]
  missing     jsonb not null default '[]',            -- missing-piece callouts kept separate from owned pieces
  status      text not null default 'proposed' check (status in ('proposed','approved')),
  approved_at timestamptz,
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.camera_scans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references app.users(id) on delete cascade,
  image_key    text,
  result       jsonb,
  confidence   numeric(3,2) check (confidence between 0 and 1),
  status       text not null default 'uploaded' check (status in ('uploaded','identified','catalogued','routed','failed')),
  routed_to    text check (routed_to in ('bag','scale','embassy','exchange','closet')),
  closet_item_id uuid references public.closet_items(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists camera_scans_user_idx on public.camera_scans (user_id, created_at desc);

create table if not exists public.ballroom_proposals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app.users(id) on delete cascade,
  starts_at   timestamptz not null,
  venue       jsonb not null default '{}',
  look        jsonb not null default '{}',
  gift        jsonb not null default '{}',
  route       jsonb not null default '{}',
  stage       text not null default 'proposal' check (stage in ('proposal','hold','confirmed','cancelled')),
  partner_disclosure text,                            -- commercial partners must be disclosed (atlas completion rule)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.identity_projections (
  user_id     uuid primary key references app.users(id) on delete cascade,
  public_card jsonb not null default '{}',            -- what other members see (Public Stage)
  private_card jsonb not null default '{}',           -- only the member
  visibility  jsonb not null default '{"profile":"members","standing":"private","closet":"private"}',
  updated_at  timestamptz not null default now()
);

select app.apply_owner_rls(t::regclass) from unnest(array[
  'public.diary_items','public.closet_rotations','public.camera_scans','public.ballroom_proposals','public.identity_projections']) t;
grant select, insert, update, delete on public.diary_items, public.closet_rotations, public.camera_scans, public.ballroom_proposals, public.identity_projections to app_user;
grant all on public.diary_items, public.closet_rotations, public.camera_scans, public.ballroom_proposals, public.identity_projections to app_service;
select app.enable_chronicle(t::regclass) from unnest(array['public.identity_projections','public.ballroom_proposals']) t;
