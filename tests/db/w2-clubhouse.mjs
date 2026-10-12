// Behaviour test for supabase/migrations/20261016_w2_clubhouse.sql on PGlite. Run: node tests/db/w2-clubhouse.mjs
import {harness, ids} from './w2-harness.mjs';

const {A, B, C, D} = ids;
const {check, exec, member, anon, rows, reapply, finish} = await harness('20261016_w2_clubhouse.sql');

// ── Hosting ───────────────────────────────────────────────────────────────────────────────
let r = await member(A, `insert into public.club_tables (host_id, game, title, starts_at, seats)
  values ($1, 'spades', 'Spades at midnight', now() + interval '2 hours', 3) returning id`, [A]);
check('member can host a table', !r.error, r.error);
const spades = rows(r)[0]?.id;

r = await member(A, `select count(*)::int n from public.club_seats where table_id = $1 and member_id = $2`, [spades, A]);
check('the host is seated automatically', rows(r)[0]?.n === 1, r.error);

r = await member(A, `insert into public.club_tables (host_id, game, title, starts_at, seats) values ($1, 'poker', 'x', now() + interval '1 hour', 6)`, [B]);
check('cannot host as someone else', !!r.error, r.error);
r = await member(A, `insert into public.club_tables (host_id, game, title, starts_at, seats) values ($1, 'spades', 'x', now() + interval '1 hour', 5)`, [A]);
check('seat cap follows the game (spades ≤ 4)', !!r.error, r.error);
r = await member(A, `insert into public.club_tables (host_id, game, title, starts_at, seats) values ($1, 'roulette', 'x', now() + interval '1 hour', 4)`, [A]);
check('unknown game rejected', !!r.error, r.error);
r = await member(A, `insert into public.club_tables (host_id, game, title, starts_at, seats) values ($1, 'poker', 'x', now() - interval '2 hours', 4)`, [A]);
check('a table cannot start in the past', !!r.error && /club_bad_start/.test(r.error), r.error);
r = await member(A, `insert into public.club_tables (host_id, game, title, starts_at, seats, status) values ($1, 'poker', 'x', now() + interval '1 hour', 4, 'cancelled')`, [A]);
check('new tables start open', !!r.error, r.error);

// ── The board ─────────────────────────────────────────────────────────────────────────────
r = await member(B, `select * from public.club_board()`);
const row = rows(r).find((x) => x.id === spades);
check('members see open tables on the board', !r.error && !!row, r.error);
check('board shows counts and host name only', row && row.seats_taken === 1 && row.host_name === 'Ava' && row.seated === false && row.is_host === false
  && !('host_id' in row), JSON.stringify(row));
r = await member(B, `select * from public.club_tables`);
check('non-hosts cannot read tables directly', rows(r).length === 0, r.error);
r = await anon(`select * from public.club_board()`);
check('anon cannot read the board', !!r.error, r.error);

// ── Seats ─────────────────────────────────────────────────────────────────────────────────
r = await member(B, `insert into public.club_seats (table_id, member_id) values ($1, $2)`, [spades, B]);
check('member can take a seat', !r.error, r.error);
r = await member(B, `insert into public.club_seats (table_id, member_id) values ($1, $2)`, [spades, B]);
check('cannot take the same seat twice', !!r.error, r.error);
r = await member(B, `insert into public.club_seats (table_id, member_id) values ($1, $2)`, [spades, C]);
check('cannot seat someone else', !!r.error, r.error);
r = await member(C, `insert into public.club_seats (table_id, member_id) values ($1, $2)`, [spades, C]);
check('third member fills the table', !r.error, r.error);
r = await member(D, `insert into public.club_seats (table_id, member_id) values ($1, $2)`, [spades, D]);
check('seat cap enforced in the database', !!r.error && /club_table_full/.test(r.error), r.error);

r = await member(B, `select * from public.club_board()`);
const full = rows(r).find((x) => x.id === spades);
check('board reflects seats and "seated" for the caller', full?.seats_taken === 3 && full?.seated === true, JSON.stringify(full));
r = await member(B, `select * from public.club_seats`);
check('members only see their own seats', rows(r).length === 1 && rows(r)[0].member_id === B, JSON.stringify(rows(r)));

r = await member(D, `delete from public.club_seats where table_id = $1 and member_id = $2 returning 1`, [spades, B]);
check("cannot remove someone else's seat", rows(r).length === 0, r.error);
r = await member(C, `delete from public.club_seats where table_id = $1 and member_id = $2 returning 1`, [spades, C]);
check('member can leave', rows(r).length === 1, r.error);
r = await member(D, `insert into public.club_seats (table_id, member_id) values ($1, $2)`, [spades, D]);
check('a freed seat can be taken', !r.error, r.error);

r = await member(A, `update public.club_tables set seats = 2 where id = $1`, [spades]);
check('host cannot shrink below seated members', !!r.error && /club_seats_below_taken/.test(r.error), r.error);
r = await member(B, `update public.club_tables set title = 'mine' where id = $1 returning id`, [spades]);
check('non-hosts cannot edit a table', rows(r).length === 0, r.error);
r = await member(A, `update public.club_tables set host_id = $2 where id = $1`, [spades, B]);
check('host cannot be changed', !!r.error, r.error);

r = await member(A, `update public.club_tables set status = 'cancelled' where id = $1 returning id`, [spades]);
check('host can cancel', rows(r).length === 1, r.error);
r = await member(B, `select * from public.club_board()`);
check('cancelled tables leave the board', !rows(r).some((x) => x.id === spades));
r = await member(C, `insert into public.club_seats (table_id, member_id) values ($1, $2)`, [spades, C]);
check('cannot join a cancelled table', !!r.error && /club_table_closed/.test(r.error), r.error);

// ── Host limit / guards are not callable ──────────────────────────────────────────────────
for (let i = 0; i < 5; i++) await member(D, `insert into public.club_tables (host_id, game, title, starts_at, seats) values ($1, 'rummy', 'r${i}', now() + interval '1 day', 2)`, [D]);
r = await member(D, `insert into public.club_tables (host_id, game, title, starts_at, seats) values ($1, 'rummy', 'r6', now() + interval '1 day', 2)`, [D]);
check('a member hosts at most 5 open tables', !!r.error && /club_host_limit/.test(r.error), r.error);
r = await member(B, `select public.club_seats_guard()`);
check('trigger functions are not callable by members', !!r.error, r.error);

await member(C, `insert into public.club_tables (host_id, game, title, starts_at, seats) values ($1, 'dominoes', 'Bones', now() + interval '3 hours', 4)`, [C]);
r = await member(A, `select * from public.club_board()`);
const bones = rows(r).find((x) => x.title === 'Bones');
check("host with a blank display name shows as 'A member'", bones?.host_name === 'A member', JSON.stringify(bones));

// ── Cascades ──────────────────────────────────────────────────────────────────────────────
r = await exec(`select id from public.club_tables where host_id = $1 limit 1`, [D]);
const dt = r.r.rows[0].id;
await member(B, `insert into public.club_seats (table_id, member_id) values ($1, $2)`, [dt, B]);
await exec(`delete from public.profiles where id = $1`, [B]);
r = await exec(`select count(*)::int n from public.club_seats where member_id = $1`, [B]);
check('deleting a profile frees their seats', r.r.rows[0].n === 0);
await exec(`delete from public.profiles where id = $1`, [D]);
r = await exec(`select count(*)::int n from public.club_tables where host_id = $1`, [D]);
check('deleting a profile removes the tables they host', r.r.rows[0].n === 0);

await reapply();
finish();
