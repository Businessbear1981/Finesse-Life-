-- ============================================================
-- 0024 · Neon hardening after the Supabase port
-- Supabase granted table access to its roles implicitly; Neon does not.
-- ============================================================
grant select, insert, update, delete on all tables in schema public to app_user;
grant all on all tables in schema public to app_service;
grant usage, select on all sequences in schema public to app_user, app_service;
alter default privileges in schema public grant select, insert, update, delete on tables to app_user;
alter default privileges in schema public grant all on tables to app_service;

-- Tables that were created without RLS: service-only (no app_user policy = no access).
alter table public.stripe_events enable row level security;
alter table public.truth_checks  enable row level security;

-- Note: RLS is not forced for the table owner here. Legacy SECURITY DEFINER
-- functions (e.g. handle_new_user) run as the owner and would otherwise be
-- blocked on Neon, where the owner role is not a superuser.

-- Explicit service policy on every RLS table (replaces Supabase's service_role bypass).
select app.apply_service_policy(format('%I.%I', schemaname, tablename)::regclass)
from pg_tables where schemaname = 'public' and rowsecurity;

-- Audit chronicle on money, identity and access tables.
select app.enable_chronicle(t::regclass) from unnest(array[
  'public.profiles','public.member_profiles','public.vault_accounts','public.vault_ledger',
  'public.vault_transactions','public.payments','public.subscriptions','public.vip_codes',
  'public.integrations','public.user_integrations','public.procurement_tokens',
  'public.scale_deals','public.scale_pledges','public.scale_joins','public.social_accounts'
]) as t;

-- WorkOS access tokens carry no email, so app.users rows can arrive without one.
-- profiles.username is NOT NULL UNIQUE: fall back to a stable handle from the id.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data->>'username', ''),
                   nullif(split_part(new.email, '@', 1), '') || '_' || left(replace(new.id::text, '-', ''), 6),
                   'member_' || left(replace(new.id::text, '-', ''), 12)))
  on conflict (id) do nothing;
  return new;
end;
$$;
