-- ============================================================
-- 0028 · Social standing (not a credit score) and the $75 referral ledger
-- Engines Spec "Standing" + Workflow §2 and §6. No financial data is used.
-- ============================================================
create schema if not exists social;
grant usage on schema social to app_user, app_service;

-- Daily rollups per member and signal kind (spec: rollups, not raw events).
create table social.signals_daily (
  user_id uuid not null references app.users(id) on delete cascade,
  day     date not null,
  kind    text not null check (kind in (
    'message_sent','reply_received','conversation_continued','intro_made','intro_accepted',
    'post_created','like_received','save_received','scrapbook_shared',
    'campaign_share_pledge','attributed_signup','referral_pro',
    'help_given','helpful_marked','contribution_sent',
    'outing_attended','campaign_joined','pledge_kept')),
  count   int not null default 0 check (count >= 0),
  primary key (user_id, day, kind)
);

create table social.ratings (
  id         uuid primary key default gen_random_uuid(),
  rater_id   uuid not null references app.users(id) on delete cascade,
  ratee_id   uuid not null references app.users(id) on delete cascade,
  outing_id  uuid,
  score      smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  check (rater_id <> ratee_id)
);
create index on social.ratings (ratee_id, created_at desc);

create table social.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references app.users(id) on delete cascade,
  target_id   uuid not null references app.users(id) on delete cascade,
  reason      text not null,
  status      text not null default 'pending' check (status in ('pending','upheld','dismissed')),
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_id),
  check (reporter_id <> target_id)
);

create table social.standing (
  user_id     uuid primary key references app.users(id) on delete cascade,
  score       smallint not null check (score between 0 and 100),
  band        text not null check (band in ('Arrival','Resident','Regular','Patron','Ambassador')),
  building    boolean not null,
  factors     jsonb not null,     -- factor -> percentile 0..100
  weights     jsonb not null,
  strikes     int not null default 0,
  reasons     jsonb not null,     -- top two, room to grow
  version     int not null,
  confidence  real not null,
  computed_at timestamptz not null default now()
);

create table social.disputes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references app.users(id) on delete cascade,
  subject    text not null,
  note       text not null,
  status     text not null default 'open' check (status in ('open','accepted','rejected')),
  created_at timestamptz not null default now()
);

-- Referrals ------------------------------------------------------------------
create table social.referral_codes (
  user_id uuid primary key references app.users(id) on delete cascade,
  code    text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  created_at timestamptz not null default now()
);

create table social.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references app.users(id) on delete cascade,
  friend_id     uuid not null unique references app.users(id) on delete cascade,  -- one referrer per account
  status        text not null default 'signed_up' check (status in ('signed_up','paid','held','credited','void')),
  device_hash   text,
  card_fingerprint text,
  pro_paid_at   timestamptz,
  hold_until    timestamptz,
  payout_cents  int not null default 7500,
  void_reason   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (referrer_id <> friend_id)
);
create index on social.referrals (referrer_id, status);

create table social.referral_payouts (
  id           uuid primary key default gen_random_uuid(),
  referral_id  uuid not null unique references social.referrals(id) on delete cascade,
  user_id      uuid not null references app.users(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  status       text not null default 'pending_partner' check (status in ('pending_partner','credited','failed')),
  created_at   timestamptz not null default now()
);

-- RLS: members read their own standing, referrals (as referrer or friend), payouts, disputes, code.
select app.apply_owner_rls(t::regclass) from unnest(array['social.standing','social.disputes','social.referral_codes','social.referral_payouts','social.signals_daily']) t;
select app.apply_owner_rls('social.referrals', 'referrer_id');
select app.apply_owner_rls('social.ratings', 'rater_id');
select app.apply_owner_rls('social.reports', 'reporter_id');
do $$ declare t text; begin
  foreach t in array array['social.standing','social.disputes','social.referral_codes','social.referral_payouts','social.signals_daily','social.referrals','social.ratings','social.reports'] loop
    execute format('drop policy owner_write on %s', t);
    execute format('revoke insert, update, delete on %s from app_user', t);
  end loop;
end $$;
create policy friend_read on social.referrals for select to app_user using (friend_id = app.uid());

select app.enable_chronicle(t::regclass) from unnest(array['social.standing','social.ratings','social.reports','social.disputes','social.referrals','social.referral_payouts']) t;

create or replace function social.bump(p_user uuid, p_kind text, p_n int default 1) returns void
language sql security definer set search_path = social as $$
  insert into social.signals_daily(user_id, day, kind, count) values (p_user, current_date, p_kind, p_n)
  on conflict (user_id, day, kind) do update set count = social.signals_daily.count + excluded.count
$$;
revoke execute on function social.bump(uuid, text, int) from public;
grant execute on function social.bump(uuid, text, int) to app_service;
