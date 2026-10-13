// Behaviour test for supabase/migrations/20261019_r1_ugc.sql on PGlite (Postgres in WASM): Wardrobe looks
// under member safety (hide, block, terms before posting, reports with kind 'look').
// Roles are simulated with SET ROLE + request.jwt.claims and Supabase's default privileges are reproduced.
// wardrobe_looks is a stand-in with the production columns and policies (20260617_master_finesse_schema.sql).
// Run: node tests/db/r1-ugc.mjs
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';

const REPO = process.argv[2] ?? process.cwd();
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok: !!ok, detail});
const migration = (f) => fs.readFileSync(`${REPO}/supabase/migrations/${f}`, 'utf8');

const [A, B, C, D, E] = ['a1', 'b1', 'c1', 'd1', 'e1'].map((x) => `00000000-0000-4000-8000-0000000019${x}`);
const PHOTO = 'https://cdn.example.com/photos/x/1-abc.jpg';

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

create table public.wardrobe_looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  photo_url text not null, caption text, brands text[] not null default '{}',
  likes_count int not null default 0 check (likes_count >= 0), created_at timestamptz not null default now());
alter table public.wardrobe_looks enable row level security;
create policy "wardrobe_looks_read_all" on public.wardrobe_looks for select using (true);
create policy "wardrobe_looks_own_write" on public.wardrobe_looks using (auth.uid() = user_id) with check (auth.uid() = user_id);
`);

let r;
try { await db.exec(migration('20261017_s1_moderation.sql')); } catch (e) { check('s1 moderation applies (setup)', false, e.message); }

let applyError = null;
try { await db.exec(migration('20261019_r1_ugc.sql')); } catch (e) { applyError = e.message; }
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
const rows = (x) => x.r?.rows ?? [];
const accept = (id) => member(id, `update public.profiles set terms_accepted_at = now(), terms_version = '2026-10-17' where id = $1`, [id]);
const postLook = (id, caption = 'Friday') => member(id, `insert into public.wardrobe_looks (user_id, photo_url, caption) values ($1, $2, $3) returning id, moderation_hidden`, [id, PHOTO, caption]);
const report = (id, look, reason = 'harassment') => member(id, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'look', $2, $3) returning id, status`, [id, look, reason]);

// ── Terms before posting a look ──────────────────────────────────────────────────────────
r = await postLook(A);
check('posting a look without accepting the house rules is refused', !!r.error, r.error);
for (const id of [A, B, C, D, E]) await accept(id);
r = await postLook(A);
check('after accepting, the member can post a look', !r.error, r.error);
const lookA = rows(r)[0]?.id;
r = await member(A, `insert into public.wardrobe_looks (user_id, photo_url, moderation_hidden, moderation_note) values ($1, $2, true, 'x') returning moderation_hidden, moderation_note`, [A, PHOTO]);
check('a new look can never start hidden', rows(r)[0]?.moderation_hidden === false && rows(r)[0]?.moderation_note === null, r.error ?? JSON.stringify(rows(r)));
r = await member(A, `update public.wardrobe_looks set moderation_hidden = true where id = $1`, [lookA]);
check('members cannot flip moderation_hidden on their own look', !!r.error, r.error);
r = await member(A, `update public.wardrobe_looks set caption = 'Saturday' where id = $1`, [lookA]);
check('authors can still edit their own caption', !r.error && r.r.affectedRows === 1, r.error);
r = await member(B, `insert into public.wardrobe_looks (user_id, photo_url) values ($1, $2)`, [A, PHOTO]);
check('cannot post a look as someone else', !!r.error, r.error);

await service(`update public.profiles set posting_suspended_at = now() where id = $1`, [E]);
r = await postLook(E);
check('a suspended member cannot post a look', !!r.error, r.error);
await service(`update public.profiles set posting_suspended_at = null where id = $1`, [E]);

// ── Reports with kind 'look' ─────────────────────────────────────────────────────────────
r = await report(B, lookA);
check("a member can report a look (kind 'look')", !r.error && rows(r)[0]?.status === 'open', r.error);
r = await report(A, lookA, 'spam');
check('cannot report your own look', !!r.error && /report_own_content/.test(r.error), r.error);
r = await member(B, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'look', gen_random_uuid()::text, 'spam')`, [B]);
check('reporting a look that does not exist is refused', !!r.error && /report_target_not_found/.test(r.error), r.error);
r = await member(B, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'wardrobe', $2, 'spam')`, [B, lookA]);
check('unknown target kinds are still rejected', !!r.error, r.error);
r = await member(C, `insert into public.content_reports (reporter_id, target_kind, target_id, reason) values ($1, 'profile', $2, 'spam')`, [C, A]);
check('earlier kinds (profile) still report', !r.error, r.error);
r = await service(`select target_owner_id from public.content_reports where target_kind = 'look'`);
check('staff see who owns a reported look', rows(r)[0]?.target_owner_id === A, r.error);

r = await report(C, lookA);
r = await service(`select moderation_hidden from public.wardrobe_looks where id = $1`, [lookA]);
check('two reports do not hide a look', rows(r)[0]?.moderation_hidden === false, r.error);
r = await report(D, lookA);
r = await service(`select moderation_hidden, moderation_note from public.wardrobe_looks where id = $1`, [lookA]);
check('three distinct reporters hide the look pending review', rows(r)[0]?.moderation_hidden === true && /pending review/.test(rows(r)[0]?.moderation_note ?? ''), JSON.stringify(rows(r)));
r = await member(E, `select id from public.wardrobe_looks where id = $1`, [lookA]);
check('a hidden look drops off the floor for other members', !r.error && rows(r).length === 0, r.error);
r = await anon(`select id from public.wardrobe_looks where id = $1`, [lookA]);
check('and for signed-out reads', !r.error && rows(r).length === 0, r.error);
r = await member(A, `select id from public.wardrobe_looks where id = $1`, [lookA]);
check('the author still sees their hidden look', rows(r).length === 1, r.error);
r = await service(`update public.wardrobe_looks set moderation_hidden = false where id = $1`, [lookA]);
check('staff (service role) can restore a look', !r.error, r.error);
r = await member(E, `select id from public.wardrobe_looks where id = $1`, [lookA]);
check('a restored look is back on the floor', rows(r).length === 1, r.error);

// ── Blocks ───────────────────────────────────────────────────────────────────────────────
r = await postLook(B, 'from ben');
const lookB = rows(r)[0]?.id;
r = await member(A, `insert into public.member_blocks (blocker_id, blocked_id) values ($1, $2)`, [A, B]);
check('member blocks another member', !r.error, r.error);
r = await member(A, `select id from public.wardrobe_looks where user_id = $1`, [B]);
check("the blocker no longer sees the blocked member's looks", rows(r).length === 0, r.error);
r = await member(B, `select id from public.wardrobe_looks where user_id = $1`, [A]);
check("the blocked member no longer sees the blocker's looks (both directions)", rows(r).length === 0, r.error);
r = await member(C, `select id from public.wardrobe_looks where id in ($1, $2)`, [lookA, lookB]);
check('third parties are unaffected', rows(r).length === 2, r.error);
r = await member(A, `delete from public.member_blocks where blocked_id = $1 returning 1`, [B]);
check('unblock', rows(r).length === 1, r.error);
r = await member(A, `select id from public.wardrobe_looks where user_id = $1`, [B]);
check('an unblocked member\'s looks come back', rows(r).length === 1, r.error);

r = await member(E, `select public.block_content_owner('look', $1) as ok`, [lookB]);
check('block_content_owner blocks a look\'s author by look id', rows(r)[0]?.ok === true, r.error);
r = await member(E, `select id from public.wardrobe_looks where id = $1`, [lookB]);
check('that author\'s look leaves the floor', rows(r).length === 0, r.error);
r = await member(B, `select public.block_content_owner('look', $1) as ok`, [lookB]);
check('cannot block yourself through your own look', rows(r)[0]?.ok === false, r.error);

// ── Re-apply ─────────────────────────────────────────────────────────────────────────────
try { await db.exec(migration('20261019_r1_ugc.sql')); r = {}; } catch (e) { r = {error: e.message}; }
check('migration re-applies cleanly', !r.error, r.error);
r = await report(E, lookA, 'spam');
check("'look' reports still accepted after re-apply", !r.error, r.error);

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : '  — ' + x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
