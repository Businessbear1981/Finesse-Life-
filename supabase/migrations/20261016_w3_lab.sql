-- Finesse — The Lab: real generation jobs on media_jobs. Idempotent.
-- Lifecycle:  queued | needs_key  →  processing  →  complete  →  approved | discarded   (or → failed)
--   needs_key   the studio's vendor key isn't configured on the server; the draft is kept, nothing was sent.
--   processing  submitted to the vendor (provider_job_id set); the vendor webhook or a status poll finishes it.
--   complete    a result exists and waits for the member's review.
--   approved    the member kept it — a media_assets row is written for their library.
--   discarded   the member threw it away.
-- Members may create drafts (queued / needs_key only, no result), read their own jobs, approve a complete job and
-- discard any job that isn't approved. Vendor progress (processing / result_url / complete / failed) is written by
-- the server with the service role, only for a job whose owner it has checked — the same split nova_requests uses —
-- so a member can never mark their own job "complete" with a result no studio produced.

alter table public.media_jobs add column if not exists result_key   text;
alter table public.media_jobs add column if not exists result_mime  text;
alter table public.media_jobs add column if not exists approved_at  timestamptz;
alter table public.media_jobs add column if not exists updated_at   timestamptz not null default now();
create index if not exists idx_media_jobs_provider_job on public.media_jobs (provider, provider_job_id);

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.media_jobs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.media_jobs drop constraint %I', c);
  end loop;
end $$;
alter table public.media_jobs add constraint media_jobs_status_check
  check (status in ('queued', 'needs_key', 'processing', 'complete', 'failed', 'approved', 'discarded'));

alter table public.media_jobs enable row level security;
drop policy if exists "Users manage own media jobs" on public.media_jobs;
drop policy if exists "media_jobs_own" on public.media_jobs;
drop policy if exists media_jobs_owner_read on public.media_jobs;
drop policy if exists media_jobs_owner_draft on public.media_jobs;
drop policy if exists media_jobs_owner_review on public.media_jobs;

create policy media_jobs_owner_read on public.media_jobs
  for select to authenticated using (auth.uid() = user_id);
create policy media_jobs_owner_draft on public.media_jobs
  for insert to authenticated
  with check (auth.uid() = user_id and status in ('queued', 'needs_key'));
create policy media_jobs_owner_review on public.media_jobs
  for update to authenticated
  using (auth.uid() = user_id and status <> 'approved')
  with check (auth.uid() = user_id and status in ('approved', 'discarded'));

-- Column grants: a member's draft carries no result and no vendor id; a review only touches status / approved_at.
revoke all on public.media_jobs from anon;
revoke insert, update, delete on public.media_jobs from authenticated;
grant select on public.media_jobs to authenticated;
grant insert (user_id, type, provider, prompt, style, status, error_message) on public.media_jobs to authenticated;
grant update (status, approved_at) on public.media_jobs to authenticated;

-- Transition rule for members (the service role is unrestricted): approve only a complete job; discard anything
-- not yet approved. Also keeps updated_at honest for every writer.
create or replace function public.media_jobs_transition() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    if not (
      (old.status = 'complete' and new.status in ('approved', 'discarded'))
      or (old.status in ('queued', 'needs_key', 'processing', 'failed') and new.status = 'discarded')
    ) then
      raise exception 'media_job_transition: % -> % is not allowed', old.status, new.status using errcode = '42501';
    end if;
    if new.status = 'approved' then new.approved_at := now(); else new.approved_at := null; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.media_jobs_transition() from public, anon, authenticated;

drop trigger if exists trg_media_jobs_transition on public.media_jobs;
create trigger trg_media_jobs_transition before update on public.media_jobs
  for each row execute function public.media_jobs_transition();

-- media_assets: the member's library. Approving a job writes one row as the member.
alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon;
