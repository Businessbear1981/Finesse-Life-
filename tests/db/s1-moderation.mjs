// Behaviour test for supabase/migrations/20261017_s1_moderation.sql on PGlite (Postgres in WASM).
// Roles are simulated with SET ROLE + request.jwt.claims and Supabase's default privileges are reproduced,
// so the migration's own revokes are what's tested. The UGC tables are stand-ins with the production
// columns and permissive policies the moderation layer sits on; the Game Room uses its real migration.
// Run: node tests/db/s1-moderation.mjs
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

const REPO = process.argv[2] ?? process.cwd();
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok: !!ok, detail});
const migration = (f) => fs.readFileSync(`${REPO}/supabase/migrations/${f}`, 'utf8');

const [A, B, C, D, E] = ['a1', 'b1', 'c1', 'd1', 'e1'].map((x) => `00000000-0000-4000-8000-0000000017${x}`);

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table public.profiles (id uuid primary key, username text, display_name text);
alter table public.profiles enable row level security;
create policy profiles_member_read on public.profiles for select to authenticated using (true);
create policy profiles_own_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
insert into public.profiles values ('${A}', 'a', 'Ava'), ('${B}', 'b', 'Ben'), ('${C}', 'c', 'Cy'), ('${D}', 'd', 'Dre'), ('${E}', 'e', 'Eve');

create table public.posts (id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
  content text, media_urls text[], likes_count int not null default 0, created_at timestamptz not null default now());
alter table public.posts enable row level security;
create policy posts_public_read on public.posts for select to authenticated using (true);
create policy posts_own_insert on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_own_update on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

create table public.vip_posts (id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
  content text, media_urls text[], likes_count int not null default 0, created_at timestamptz not null default now());
alter table public.vip_posts enable row level security;
create policy vip_posts_vip_read on public.vip_posts for select to authenticated using (true);
create policy vip_posts_vip_insert on public.vip_posts for insert to authenticated with check (author_id = auth.uid());

create table public.exchange_listings (id uuid primary key default gen_random_uuid(), seller_id uuid references public.profiles(id) on delete cascade,
  title text not null, asking_price_cents int not null default 100, status text not null default 'active');
alter table public.exchange_listings enable row level security;
create policy public_read_active on public.exchange_listings for select using (status = 'active');
create policy seller_manage on public.exchange_listings for all using (auth.uid() = seller_id);

create table public.outings (id uuid primary key default gen_random_uuid(), host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, status text not null default 'open');
alter table public.outings enable row level security;
create policy outings_read_all on public.outings for select using (true);
create policy outings_own_write on public.outings using (auth.uid() = host_id) with check (auth.uid() = host_id);
`);

try { await db.exec(migration('20261016_w2_clubhouse.sql')); } catch (e) { check('clubhouse migration applies (setup)', false, e.message); }

let applyError = null;
try { await db.exec(migration('20261017_s1_moderation.sql')); } catch (e) { applyError = e.message; }
check('migration applies', !applyError, applyError);

async function as(role, sub, fn) {
  const claims = JSON.stringify(sub ? {sub, role} : {role});
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${claims}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
const exec = async (sql, params) => { try { return {r: await db.query(sql, params)}; } catch (e) { return {error: e.message}; } };
const member = (id, sql, params) => as('authenticated', id, () => exec(sql, params));
const service = (sql, params) => as('service_role', null, () => exec(sql, params));
const anon = (sql, params) => as('anon', null, () => exec(sql, params));
const rows = (r) => r.r?.rows ?? [];
const accept = (id) => member(id, `update public.profiles set terms_accepted_at = now(), terms_version = '2026-10' where id = $1`, [id]);

// ── Terms before posting ─────────────────────────────────────────────────────────────────
let r = await member(A, `insert into public.posts (author_id, content) values ($1, 'hello') returning id`, [A]);
check('posting without accepting the terms is refused', !!r.error, r.error);
r = await accept(A);
check('member records their own terms acceptance', !r.error && r.r.affectedRows === 1, r.error);
r = await member(B, `update public.profiles set terms_accepted_at = now() where id = $1`, [A]);
check("cannot accept terms for someone else", !r.error && r.r.affectedRows === 0, r.error);
for (const id of [B, C, D, E]) await accept(id);

r = await member(A, `insert into public.posts (author_id, content) values ($1, 'hello') returning id`, [A]);
check('after accepting, the member can post', !r.error, r.error);
const postA = rows(r)[0]?.id;
r = await member(A, `insert into public.posts (author_id, content, moderation_hidden) values ($1, 'x', true) returning moderation_hidden`, [A]);
check('a new post can never start hidden (forced false)', rows(r)[0]?.moderation_hidden === false, r.error ?? JSON.stringify(rows(r)));
r = await member(A, `update public.posts set moderation_hidden = true where id = $1`, [postA]);
check('members cannot flip moderation_hidden on their own post', !!r.error, r.error);

r = await member(A, `update public.profiles set posting_suspended_at = null where id = $1`, [A]);
check('no-op update of the suspension column is fine', !r.error, r.error);
await service(`update public.profiles set posting_suspended_at = now() where id = $1`, [E]);
r = await member(E, `insert into public.posts (author_id, content) values ($1, 'x')`, [E]);
check('a suspended member cannot post', !!r.error, r.error);
r = await member(E, `update public.profiles set posting_suspended_at = null where id = $1`, [E]);
check('a suspended member cannot lift their own suspension', !!r.error, r.error);
await service(`update public.profiles set posting_suspended_at = null where id = $1`, [E]);

r = await member(B, `insert into public.vip_posts (author_id, content) values ($1, 'inner') returning id`, [B]);
check('VIP post insert works after acceptance', !r.error, r.error);
const vipB = rows(r)[0]?.id;
r = await member(B, `insert into public.exchange_listings (seller_id, title) values ($1, 'Loafers') returning id`, [B]);
check('listing works after acceptance', !r.error, r.error);
const listingB = rows(r)[0]?.id;
r = await member(C, `insert into public.club_tables (host_id, game, title, starts_at, seats) values ($1, 'spades', 'Late spades', now() + interval '2 hours', 4) returning id`, [C]);
check('hosting a table works after acceptance', !r.error, r.error);
const tableC = rows(r)[0]?.id;
await db.exec(`update public.profiles set terms_accepted_at = null where id = '${D}'`);
r = await member(D, `insert into public.club_tables (host_id, game, title, starts_at, seats) values ($1, 'poker', 'x', now() + interval '2 hours', 4)`, [D]);
check('hosting a table without the terms is refused', !!r.error, r.error);
await accept(D);

// ── Reports ──────────────────────────────────────────────────────────────────────────────
r = await member(B, `insert into public.content_reports (reporter_id, target_kind, target_id, reason, note) values ($1, 'post', $2, 'harassment', 'rude') returning id, status`, [B, postA]);
check('member can report a post', !r.error && rows(r)[0]?.status === 'open', r.error);
r = await member(B, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'post', $2, 'spam')`, [B, postA]);
check('one open report per member per item', !!r.error, r.error);
r = await member(B, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'post', $2, 'spam')`, [C, postA]);
check('cannot report as someone else', !!r.error, r.error);
r = await member(A, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'post', $2, 'spam')`, [A, postA]);
check('cannot report your own post', !!r.error && /report_own_content/.test(r.error), r.error);
r = await member(B, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'post', gen_random_uuid()::text, 'spam')`, [B]);
check('reporting something that does not exist is refused', !!r.error && /report_target_not_found/.test(r.error), r.error);
r = await member(B, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'post', $2, 'because')`, [B, vipB]);
check('unknown reasons rejected', !!r.error, r.error);
r = await member(B, `insert into public.content_reports (reporter_id, target_kind, target_id, reason, status) values ($1, 'profile', $2, 'spam', 'dismissed')`, [B, A]);
check('member cannot file a pre-resolved report', !!r.error, r.error);
r = await member(B, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'nova_reply', 'msg_123', 'other')`, [B]);
check('Nova replies can be reported (no member owner)', !r.error, r.error);
r = await member(D, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'club_table', $2, 'hate')`, [D, tableC]);
check('a Game Room table can be reported', !r.error, r.error);
r = await member(D, `select * from public.content_reports`);
check("reporters can't read target_owner_id (host stays anonymous)", !!r.error, r.error);
r = await member(D, `select id, target_kind, status from public.content_reports`);
check('members see only their own reports', !r.error && rows(r).length === 1, r.error ?? JSON.stringify(rows(r)));
r = await member(D, `update public.content_reports set status = 'dismissed'`);
check('members cannot resolve reports', !!r.error || r.r.affectedRows === 0, r.error);
r = await member(B, `delete from public.content_reports`);
check('members cannot delete reports', !!r.error || r.r.affectedRows === 0, r.error);
r = await anon(`insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'post', $2, 'spam')`, [B, postA]);
check('anon cannot report', !!r.error, r.error);
r = await service(`select target_owner_id from public.content_reports where target_kind = 'club_table'`);
check('staff see who owns the reported item', rows(r)[0]?.target_owner_id === C, r.error);

// ── Auto-hide at 3 distinct reporters ────────────────────────────────────────────────────
r = await member(C, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'post', $2, 'harassment')`, [C, postA]);
r = await service(`select moderation_hidden from public.posts where id = $1`, [postA]);
check('two reports do not hide a post', rows(r)[0]?.moderation_hidden === false, r.error);
r = await member(D, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'post', $2, 'harassment')`, [D, postA]);
check('third distinct reporter is accepted', !r.error, r.error);
r = await service(`select moderation_hidden, moderation_note from public.posts where id = $1`, [postA]);
check('three distinct reporters hide the post pending review', rows(r)[0]?.moderation_hidden === true && /pending review/.test(rows(r)[0]?.moderation_note ?? ''), JSON.stringify(rows(r)));
r = await member(E, `select id from public.posts where id = $1`, [postA]);
check('a hidden post drops out of other members\' feeds', !r.error && rows(r).length === 0, r.error);
r = await member(A, `select id from public.posts where id = $1`, [postA]);
check('the author still sees their hidden post', rows(r).length === 1, r.error);
r = await service(`update public.posts set moderation_hidden = false where id = $1`, [postA]);
check('staff (service role) can restore a post', !r.error, r.error);
r = await member(E, `select id from public.posts where id = $1`, [postA]);
check('restored post is visible again', rows(r).length === 1, r.error);

// ── Blocks ───────────────────────────────────────────────────────────────────────────────
r = await member(B, `insert into public.posts (author_id, content) values ($1, 'from ben') returning id`, [B]);
const postB = rows(r)[0]?.id;
r = await member(A, `insert into public.member_blocks (blocker_id, blocked_id) values ($1, $2)`, [A, B]);
check('member can block another member', !r.error, r.error);
r = await member(A, `insert into public.member_blocks (blocker_id, blocked_id) values ($1, $2)`, [C, D]);
check('cannot block on someone else\'s behalf', !!r.error, r.error);
r = await member(A, `insert into public.member_blocks (blocker_id, blocked_id) values ($1, $1)`, [A]);
check('cannot block yourself', !!r.error, r.error);
r = await member(A, `select id from public.posts where author_id = $1`, [B]);
check("blocker no longer sees the blocked member's posts", rows(r).length === 0, r.error);
r = await member(B, `select id from public.posts where author_id = $1`, [A]);
check("blocked member no longer sees the blocker's posts (both directions)", rows(r).length === 0, r.error);
r = await member(A, `select id from public.vip_posts where id = $1`, [vipB]);
check('VIP posts filtered too', rows(r).length === 0, r.error);
r = await member(A, `select id from public.exchange_listings where id = $1`, [listingB]);
check('Exchange listings filtered too', rows(r).length === 0, r.error);
r = await member(A, `select id from public.profiles where id = $1`, [B]);
check("blocked member's profile disappears from the floor", rows(r).length === 0, r.error);
r = await member(B, `select id from public.profiles where id = $1`, [A]);
check("and the blocker's profile disappears for them", rows(r).length === 0, r.error);
r = await member(B, `select id from public.profiles where id = $1`, [B]);
check('members always see their own profile', rows(r).length === 1, r.error);
r = await member(C, `select id from public.posts where id in ($1, $2)`, [postA, postB]);
check('third parties are unaffected', rows(r).length === 2, r.error);
r = await member(B, `select * from public.member_blocks`);
check('the blocked member cannot read the block row', rows(r).length === 0, r.error);
r = await member(A, `select blocked_id from public.member_blocks`);
check('the blocker lists their own blocks', rows(r).length === 1 && rows(r)[0].blocked_id === B, r.error);

// Block a table host without learning who it is.
r = await member(E, `select public.block_content_owner('club_table', $1) as ok`, [tableC]);
check('block_content_owner blocks a table host by table id', rows(r)[0]?.ok === true, r.error);
r = await member(E, `select * from public.club_board()`);
check('blocked host\'s table leaves the board', !r.error && !rows(r).some((x) => x.id === tableC), r.error);
r = await member(D, `select * from public.club_board()`);
const boardRow = rows(r).find((x) => x.id === tableC);
check('board still has the same columns (no host id)', !r.error && boardRow && !('host_id' in boardRow), r.error ?? JSON.stringify(boardRow));
r = await member(C, `select public.block_content_owner('club_table', $1) as ok`, [tableC]);
check('cannot block yourself through your own table', rows(r)[0]?.ok === false, r.error);
r = await member(E, `select public.moderation_target_owner('club_table', $1)`, [tableC]);
check('members cannot look up owners directly', !!r.error, r.error);

r = await member(A, `delete from public.member_blocks where blocked_id = $1 returning 1`, [B]);
check('member can unblock', rows(r).length === 1, r.error);
r = await member(A, `select id from public.posts where author_id = $1`, [B]);
check('unblocked member is visible again', rows(r).length === 1, r.error);

// ── Staff hide on other kinds ────────────────────────────────────────────────────────────
r = await service(`update public.club_tables set moderation_hidden = true where id = $1`, [tableC]);
r = await member(D, `select * from public.club_board()`);
check('a hidden table leaves the board', !rows(r).some((x) => x.id === tableC), r.error);
r = await member(C, `select * from public.club_board()`);
check('its host still sees it', rows(r).some((x) => x.id === tableC), r.error);
await service(`update public.exchange_listings set moderation_hidden = true where id = $1`, [listingB]);
r = await member(B, `update public.exchange_listings set moderation_hidden = false where id = $1`, [listingB]);
check('sellers cannot un-hide a listing staff removed', !!r.error, r.error);

// ── Rate limit + cascade + re-apply ──────────────────────────────────────────────────────
await db.exec(`insert into public.content_reports (reporter_id, target_kind, target_id, reason)
  select '${E}', 'nova_reply', 'bulk_' || g, 'other' from generate_series(1, 50) g`);
r = await member(E, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'nova_reply', 'one-more', 'other')`, [E]);
check('reports are rate limited per member per day', !!r.error && /report_rate_limited/.test(r.error), r.error);

await exec(`delete from public.profiles where id = $1`, [E]);
r = await exec(`select count(*)::int n from public.content_reports where reporter_id = $1`, [E]);
check("deleting a profile deletes that member's reports", rows(r)[0]?.n === 0, r.error);

try { await db.exec(migration('20261017_s1_moderation.sql')); r = {}; } catch (e) { r = {error: e.message}; }
check('migration re-applies cleanly', !r.error, r.error);

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
