-- ============================================================
-- 0030 · Security hardening: Yahoo OAuth provider for social_connections.
-- ============================================================
alter table public.social_connections drop constraint if exists social_connections_provider_check;
alter table public.social_connections add constraint social_connections_provider_check
  check (provider in ('instagram','tiktok','pinterest','facebook','x','google','yahoo'));
