-- ============================================================
-- 0030 · Security hardening: Yahoo OAuth provider for social_connections.
-- ============================================================
alter table public.social_connections drop constraint if exists social_connections_provider_check;
alter table public.social_connections add constraint social_connections_provider_check
  check (provider in ('instagram','tiktok','pinterest','facebook','x','google','yahoo'));

-- Strike ladder bookkeeping (workers/api/src/policy.ts SCALE_POLICY): assessed penalty and policy version.
alter table scale.strikes add column if not exists penalty_bps    int not null default 0 check (penalty_bps between 0 and 10000);
alter table scale.strikes add column if not exists penalty_cents  int not null default 0 check (penalty_cents >= 0);
alter table scale.strikes add column if not exists policy_version int not null default 1;

-- Referral clawback (REFERRAL_POLICY.clawbackAfterPayout): a credited payout can be reversed.
alter table social.referral_payouts drop constraint if exists referral_payouts_status_check;
alter table social.referral_payouts add constraint referral_payouts_status_check
  check (status in ('pending_partner','credited','failed','clawback_pending','clawed_back'));
alter table social.referral_payouts add column if not exists clawback_reason text;

-- Ship-to captured at pledge time for 3PL handoff (owner-RLS on scale.pledges already applies).
alter table scale.pledges add column if not exists ship_to jsonb
  check (ship_to is null or (ship_to ? 'name' and ship_to ? 'line1' and ship_to ? 'city' and ship_to ? 'postal_code' and ship_to ? 'country'));
