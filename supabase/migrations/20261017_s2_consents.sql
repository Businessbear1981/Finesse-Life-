-- Member consents (store readiness: Apple 5.1.2(i) third-party AI data sharing, Google Play AI-generated content,
-- in-app 18+ confirmation).
--
--   ai_processing  the member agreed that what they type to Nova is sent to our AI provider (Anthropic Claude,
--                  routed through Vercel AI Gateway when configured) to write the reply.
--   photo_ai       the member agreed that a photo they ask Nova / the Camera to read is sent to the same provider.
--   age_18         the member confirmed in the app that they are 18 or older.
--
-- One row per (member, kind). accepted_at is always the server's clock (a trigger overwrites whatever the
-- client sends). Members can read and withdraw (delete) their own rows and add new ones; nobody can edit a row.
-- Rows go with the account (profiles → auth.users cascade). Idempotent.

create table if not exists public.member_consents (
  member_id   uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('ai_processing', 'photo_ai', 'age_18')),
  accepted_at timestamptz not null default now(),
  -- The policy/copy version the member saw (e.g. the privacy policy date).
  version     text not null default '2026-10-12' check (char_length(version) between 1 and 32),
  platform    text check (platform is null or platform in ('ios', 'android', 'web')),
  primary key (member_id, kind)
);

alter table public.member_consents enable row level security;
revoke all on public.member_consents from anon;
revoke all on public.member_consents from authenticated;
grant select, insert, delete on public.member_consents to authenticated;

do $$ begin
  create policy member_consents_own_read on public.member_consents
    for select to authenticated using (member_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy member_consents_own_insert on public.member_consents
    for insert to authenticated with check (member_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy member_consents_own_withdraw on public.member_consents
    for delete to authenticated using (member_id = auth.uid());
exception when duplicate_object then null; end $$;

-- The server's clock, never the client's.
create or replace function public.member_consents_stamp()
returns trigger language plpgsql as $$
begin
  new.accepted_at := now();
  return new;
end $$;

drop trigger if exists member_consents_stamp on public.member_consents;
create trigger member_consents_stamp before insert on public.member_consents
  for each row execute function public.member_consents_stamp();
