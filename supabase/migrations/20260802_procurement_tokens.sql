-- Procurement previously generated random FSS-VIP-* tokens with nothing
-- persisting them — the "single-use, expires in 72 hours" instructions shown
-- to members were fiction with no backing state. This table + the redeem
-- endpoint make that real: a generated token can actually be looked up,
-- checked for expiry, and marked redeemed exactly once.
create table if not exists public.procurement_tokens (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles(id) on delete cascade,
  token                 text        not null unique,
  method                text        not null check (method in ('partner', 'scale')),
  partner_name          text,
  partner_url           text,
  item_title            text        not null,
  item_category         text        not null,
  estimated_savings_cents int       not null default 0,
  status                text        not null default 'unused' check (status in ('unused', 'redeemed', 'expired')),
  expires_at            timestamptz not null,
  redeemed_at           timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists idx_procurement_tokens_user on public.procurement_tokens (user_id);
create index if not exists idx_procurement_tokens_token on public.procurement_tokens (token);

alter table public.procurement_tokens enable row level security;

create policy "procurement_tokens_own_read" on public.procurement_tokens
  for select to authenticated using (user_id = auth.uid());

create policy "procurement_tokens_own_insert" on public.procurement_tokens
  for insert to authenticated with check (user_id = auth.uid());
