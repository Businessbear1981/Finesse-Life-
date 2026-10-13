-- Entourage: the member's own dossiers on the people they love, and the gifts on record for each.
--
-- Private to the member who writes them. A dossier may point at another member (linked_member_id), but
-- that link exposes nothing to — and nothing about — the linked member; it is only a pointer the owner keeps.
-- Gift "ideas" can come from Nova (find_item via the nova_requests hub); nothing is bought here.

create table if not exists public.entourage_people (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.profiles(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  relation         text not null default 'friend' check (char_length(relation) between 1 and 40),
  city             text check (city is null or char_length(city) <= 80),
  birthday         date,
  loves            text[] not null default '{}'
                   check (cardinality(loves) <= 12 and char_length(array_to_string(loves, '|')) <= 600),
  notes            text check (notes is null or char_length(notes) <= 2000),
  linked_member_id uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint entourage_people_not_self check (linked_member_id is null or linked_member_id <> member_id)
);
create index if not exists entourage_people_member_idx on public.entourage_people (member_id, name);

create table if not exists public.entourage_gifts (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.profiles(id) on delete cascade,
  person_id   uuid not null references public.entourage_people(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 160),
  status      text not null default 'idea' check (status in ('idea', 'purchased', 'given')),
  price_cents integer check (price_cents is null or price_cents between 0 and 100000000),
  url         text check (url is null or (char_length(url) <= 600 and url ~* '^https?://')),
  occasion    text check (occasion is null or char_length(occasion) <= 80),
  source      text not null default 'member' check (source in ('member', 'nova')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists entourage_gifts_person_idx on public.entourage_gifts (person_id, created_at desc);
create index if not exists entourage_gifts_member_idx on public.entourage_gifts (member_id);

alter table public.entourage_people enable row level security;
alter table public.entourage_gifts enable row level security;
revoke all on public.entourage_people from anon;
revoke all on public.entourage_gifts from anon;
grant select, insert, update, delete on public.entourage_people to authenticated;
grant select, insert, update, delete on public.entourage_gifts to authenticated;

do $$ begin
  create policy entourage_people_owner on public.entourage_people
    for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
exception when duplicate_object then null; end $$;

-- A gift must hang off one of the member's own dossiers.
do $$ begin
  create policy entourage_gifts_owner on public.entourage_gifts
    for all to authenticated
    using (member_id = auth.uid())
    with check (
      member_id = auth.uid()
      and exists (select 1 from public.entourage_people p where p.id = person_id and p.member_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

create or replace function public.entourage_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists entourage_people_touch on public.entourage_people;
create trigger entourage_people_touch before update on public.entourage_people
  for each row execute function public.entourage_touch();
drop trigger if exists entourage_gifts_touch on public.entourage_gifts;
create trigger entourage_gifts_touch before update on public.entourage_gifts
  for each row execute function public.entourage_touch();

-- Ownership never moves.
create or replace function public.entourage_owner_guard()
returns trigger language plpgsql as $$
begin
  if new.member_id <> old.member_id then
    raise exception 'entourage_owner_immutable' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists entourage_people_owner_guard on public.entourage_people;
create trigger entourage_people_owner_guard before update on public.entourage_people
  for each row execute function public.entourage_owner_guard();
drop trigger if exists entourage_gifts_owner_guard on public.entourage_gifts;
create trigger entourage_gifts_owner_guard before update on public.entourage_gifts
  for each row execute function public.entourage_owner_guard();
