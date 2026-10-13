-- Per Diem: one planned night per member per date, around a budget. Items are the stops of the night
-- ([{time, label, cost_cents, done}]), usually parsed from Nova's evening plan (nova_requests hub,
-- topic 'evening'). The member ticks stops off as they go. Nothing is reserved or paid here.

create table if not exists public.per_diem_plans (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.profiles(id) on delete cascade,
  plan_date       date not null,
  occasion        text not null default 'Night out' check (char_length(occasion) between 1 and 60),
  budget_cents    integer not null check (budget_cents between 0 and 10000000),
  items           jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 20 and octet_length(items::text) <= 8000),
  plan_text       text check (plan_text is null or char_length(plan_text) <= 8000),
  nova_request_id uuid,
  status          text not null default 'draft' check (status in ('draft', 'planned', 'done', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint per_diem_one_per_day unique (member_id, plan_date)
);
create index if not exists per_diem_member_idx on public.per_diem_plans (member_id, plan_date desc);

alter table public.per_diem_plans enable row level security;
revoke all on public.per_diem_plans from anon;
grant select, insert, update, delete on public.per_diem_plans to authenticated;

do $$ begin
  create policy per_diem_owner on public.per_diem_plans
    for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
exception when duplicate_object then null; end $$;

create or replace function public.per_diem_touch()
returns trigger language plpgsql as $$
begin
  if new.member_id <> old.member_id then
    raise exception 'per_diem_owner_immutable' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists per_diem_touch on public.per_diem_plans;
create trigger per_diem_touch before update on public.per_diem_plans
  for each row execute function public.per_diem_touch();
