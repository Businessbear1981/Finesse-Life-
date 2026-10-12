// Behaviour test for supabase/migrations/20261016_w2_departures.sql on PGlite. Run: node tests/db/w2-departures.mjs
import {harness, ids} from './w2-harness.mjs';

const {A, B} = ids;
const {check, exec, member, anon, rows, reapply, finish} = await harness('20261016_w2_departures.sql');

let r = await member(A, `insert into public.trips (member_id, title, origin, destination, depart_at, return_at, party_size, brief)
  values ($1, 'Amalfi', 'Atlanta', 'Naples', now() + interval '10 days', now() + interval '14 days', 2, 'Boats and lemons') returning id, status`, [A]);
check('member can compose a trip (starts as draft)', !r.error && rows(r)[0]?.status === 'draft', r.error);
const trip = rows(r)[0]?.id;

r = await member(A, `insert into public.trips (member_id, title, destination) values ($1, 'x', 'y')`, [B]);
check('cannot create a trip for someone else', !!r.error, r.error);
r = await member(B, `select * from public.trips`);
check('other members cannot read your trips', rows(r).length === 0, r.error);
r = await member(B, `update public.trips set title = 'mine' where id = $1 returning id`, [trip]);
check('other members cannot edit your trips', rows(r).length === 0, r.error);
r = await member(B, `delete from public.trips where id = $1 returning id`, [trip]);
check('other members cannot delete your trips', rows(r).length === 0, r.error);

r = await member(A, `insert into public.trips (member_id, title, destination, depart_at, return_at)
  values ($1, 'Backwards', 'Rome', now() + interval '5 days', now() + interval '2 days')`, [A]);
check('return before departure rejected', !!r.error, r.error);
r = await member(A, `insert into public.trips (member_id, title, destination, party_size) values ($1, 'Crowd', 'Rome', 41)`, [A]);
check('party over 40 rejected', !!r.error, r.error);
r = await member(A, `insert into public.trips (member_id, title, destination, status) values ($1, 'Fake', 'Rome', 'booked')`, [A]);
check('there is no booked status', !!r.error, r.error);
r = await member(A, `update public.trips set status = 'planned' where id = $1`, [trip]);
check('cannot mark planned without a plan', !!r.error, r.error);
r = await member(A, `update public.trips set status = 'planned', plan = 'Day 1: Positano' where id = $1 returning status`, [trip]);
check('planned once the plan is stored', rows(r)[0]?.status === 'planned', r.error);
r = await member(A, `update public.trips set member_id = $1 where id = $2`, [B, trip]);
check('ownership cannot be moved', !!r.error, r.error);

r = await anon(`select * from public.trips`);
check('anon cannot read trips', !!r.error, r.error);

await exec(`delete from public.profiles where id = $1`, [A]);
r = await exec(`select count(*)::int n from public.trips where member_id = $1`, [A]);
check('deleting the profile deletes their trips', r.r.rows[0].n === 0);

await reapply();
finish();
