-- ============================================================
-- 0000 · Platform foundation for Neon Postgres
-- Replaces Supabase's auth schema, roles and auth.uid().
-- Identity comes from WorkOS; the API Worker verifies the JWT and
-- calls app.set_claims() inside each request transaction.
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create schema if not exists app;

-- Roles (NOLOGIN; the connection user is granted them and SET ROLEs per request).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_anon') then create role app_anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'app_user') then create role app_user nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'app_service') then
    begin
      create role app_service nologin bypassrls;
    exception when insufficient_privilege then
      -- Some hosts only let roles that have BYPASSRLS grant it. The Worker's service
      -- path then runs as the table owner instead; see ADR-0002.
      create role app_service nologin;
      raise warning 'app_service created without BYPASSRLS';
    end;
  end if;
end $$;

-- Users: one row per WorkOS user. Replaces auth.users.
create table if not exists app.users (
  id              uuid primary key default gen_random_uuid(),
  workos_user_id  text unique not null,
  email           text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Session claims ───────────────────────────────────────────
-- Set per request with transaction scope (safe behind a pooler).
create or replace function app.set_claims(claims jsonb)
returns void language plpgsql as $$
begin
  perform set_config('app.claims', coalesce(claims, '{}'::jsonb)::text, true);
  perform set_config('app.user_id', coalesce(claims->>'uid', ''), true);
end $$;

create or replace function app.claims() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('app.claims', true), ''), '{}')::jsonb
$$;

create or replace function app.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app.tenant_id() returns uuid
language sql stable as $$ select nullif(app.claims()->>'tenant_id', '')::uuid $$;

-- Step-up: true when the token carried a passkey assertion recently.
create or replace function app.stepped_up(max_age_seconds int default 300) returns boolean
language sql stable as $$
  select coalesce((app.claims()->>'step_up_at')::bigint, 0)
         >= extract(epoch from now())::bigint - max_age_seconds
$$;

-- ── RLS template ─────────────────────────────────────────────
-- Service policy: explicit, so the service path works even where app_service
-- could not be given BYPASSRLS.
create or replace function app.apply_service_policy(tbl regclass)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists service_all on %s', tbl);
  execute format('create policy service_all on %s to app_service using (true) with check (true)', tbl);
  execute format('grant all on %s to app_service', tbl);
end $$;

-- Owner-scoped table: owner reads/writes own rows; app_service bypasses RLS.
create or replace function app.apply_owner_rls(tbl regclass, owner_col name default 'user_id')
returns void language plpgsql as $$
declare t text := tbl::text;
begin
  execute format('alter table %s enable row level security', t);
  execute format('alter table %s force row level security', t);
  execute format('drop policy if exists owner_select on %s', t);
  execute format('drop policy if exists owner_write on %s', t);
  execute format('create policy owner_select on %s for select to app_user using (%I = app.uid())', t, owner_col);
  execute format('create policy owner_write on %s for all to app_user using (%I = app.uid()) with check (%I = app.uid())', t, owner_col, owner_col);
  execute format('grant select, insert, update, delete on %s to app_user', t);
  perform app.apply_service_policy(tbl);
end $$;

-- ── Audit chronicle ──────────────────────────────────────────
-- Append-only, hash-chained. Each row hashes the previous row's hash.
create table if not exists app.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default clock_timestamp(),
  actor_id    uuid,
  table_name  text not null,
  op          text not null check (op in ('INSERT','UPDATE','DELETE')),
  row_id      text,
  diff        jsonb,
  prev_hash   bytea,
  hash        bytea not null
);
create index if not exists audit_log_table_row_idx on app.audit_log (table_name, row_id);

create or replace function app.chronicle() returns trigger
language plpgsql security definer set search_path = app, public as $$
declare
  prev bytea;
  rec  jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  d    jsonb;
  rid  text  := rec->>'id';
  h    bytea;
begin
  d := case tg_op when 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)) else rec end;
  perform pg_advisory_xact_lock(hashtext('app.audit_log'));
  select hash into prev from app.audit_log order by id desc limit 1;
  h := digest(coalesce(encode(prev,'hex'),'') || tg_table_schema || '.' || tg_table_name || tg_op
              || coalesce(rid,'') || coalesce(d::text,''), 'sha256');
  insert into app.audit_log(actor_id, table_name, op, row_id, diff, prev_hash, hash)
  values (app.uid(), tg_table_schema || '.' || tg_table_name, tg_op, rid, d, prev, h);
  return null;
end $$;

create or replace function app.enable_chronicle(tbl regclass) returns void
language plpgsql as $$
begin
  execute format('drop trigger if exists zz_chronicle on %s', tbl);
  execute format('create trigger zz_chronicle after insert or update or delete on %s for each row execute function app.chronicle()', tbl);
end $$;

-- Verify chain integrity; returns first broken id or null.
create or replace function app.verify_chronicle() returns bigint
language plpgsql stable as $$
declare r record; prev bytea := null;
begin
  for r in select * from app.audit_log order by id loop
    if r.prev_hash is distinct from prev then return r.id; end if;
    prev := r.hash;
  end loop;
  return null;
end $$;

revoke all on app.audit_log from public;
revoke update, delete, truncate on app.audit_log from app_user, app_service;
grant select on app.audit_log to app_service;

grant usage on schema app to app_anon, app_user, app_service;
grant usage on schema public to app_anon, app_user, app_service;
grant select on app.users to app_service;
grant all on app.users to app_service;
