-- ============================================================
-- 0026 · Mobile check-in (Postgres version of finesse-mobile 0001_checkin.sql)
-- ============================================================
create table if not exists public.social_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references app.users(id) on delete cascade,
  provider      text not null check (provider in ('instagram','tiktok','pinterest','facebook','x','google')),
  handle        text,
  scopes        jsonb not null default '[]',
  access_token_enc  text,   -- encrypted by the API; never returned to clients
  refresh_token_enc text,
  webhook_id    text,
  status        text not null default 'connected' check (status in ('connected','revoked','error')),
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.interview_answers (
  user_id    uuid primary key references app.users(id) on delete cascade,
  answers    jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.member_staff (
  user_id         uuid primary key references app.users(id) on delete cascade,
  nova_voice      text not null default 'Discreet' check (nova_voice in ('Discreet','Warm','Direct')),
  nova_posting    text not null default 'Ask first' check (nova_posting in ('Drafts only','Ask first','Auto-post')),
  shopper_name    text not null default 'Celeste',
  shopper_cadence text not null default 'weekly_friday',
  updated_at      timestamptz not null default now()
);

create table if not exists public.closet_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references app.users(id) on delete cascade,
  name       text not null,
  category   text check (category in ('top','bottom','dress','outerwear','shoes','bag','accessory')),
  source     text not null check (source in ('shopper','camera','purchase','upload')),
  image_key  text,
  created_at timestamptz not null default now()
);
create index if not exists closet_items_user_created_idx on public.closet_items (user_id, created_at desc);

select app.apply_owner_rls(t::regclass) from unnest(array[
  'public.social_connections','public.interview_answers','public.member_staff','public.closet_items']) t;
-- Tokens are written only by the service role.
drop policy owner_write on public.social_connections;
revoke insert, update, delete on public.social_connections from app_user;
revoke select on public.social_connections from app_user;
grant select (id, user_id, provider, handle, scopes, webhook_id, status, connected_at, updated_at) on public.social_connections to app_user;
select app.enable_chronicle('public.social_connections');

-- VIP redemption as one atomic function (replaces the multi-call Next.js route).
create or replace function app.redeem_vip(p_code text)
returns timestamptz language plpgsql security definer set search_path = public, app as $$
declare c record; expires timestamptz := now() + interval '1 year';
begin
  if app.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into c from public.vip_codes where code = upper(trim(p_code)) and is_active for update;
  if not found then raise exception 'invalid_code' using errcode = 'P0002'; end if;
  if c.use_count >= c.max_uses then raise exception 'code_exhausted' using errcode = 'P0001'; end if;
  if c.expires_at is not null and c.expires_at < now() then raise exception 'code_expired' using errcode = 'P0001'; end if;
  update public.vip_codes set use_count = use_count + 1, used_by = coalesce(used_by, app.uid()), used_at = now() where id = c.id;
  update public.profiles set is_vip = true, vip_expires_at = expires where id = app.uid();
  insert into public.subscriptions(user_id, status, plan, provider, current_period_start, current_period_end)
  values (app.uid(), 'active', 'vip_code', 'vip_code', now(), expires);
  return expires;
end $$;
revoke execute on function app.redeem_vip(text) from public;
grant execute on function app.redeem_vip(text) to app_user;
