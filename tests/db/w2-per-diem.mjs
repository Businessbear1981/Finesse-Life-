// Behaviour test for supabase/migrations/20261016_w2_per_diem.sql on PGlite. Run: node tests/db/w2-per-diem.mjs
import {harness, ids} from './w2-harness.mjs';

const {A, B} = ids;
const {check, exec, member, anon, rows, reapply, finish} = await harness('20261016_w2_per_diem.sql');

const items = JSON.stringify([{time: '7:00 PM', label: 'Drinks at Bar Céleste', cost_cents: 9000, done: false}]);
let r = await member(A, `insert into public.per_diem_plans (member_id, plan_date, budget_cents, items)
  values ($1, '2026-10-17', 60000, $2::jsonb) returning id, status`, [A, items]);
check('member can plan a night', !r.error && rows(r)[0]?.status === 'draft', r.error);
const plan = rows(r)[0]?.id;

r = await member(A, `insert into public.per_diem_plans (member_id, plan_date, budget_cents) values ($1, '2026-10-17', 1000)`, [A]);
check('one plan per member per date', !!r.error, r.error);
r = await member(B, `insert into public.per_diem_plans (member_id, plan_date, budget_cents) values ($1, '2026-10-17', 1000) returning id`, [B]);
check('another member can plan the same date', !r.error, r.error);
r = await member(A, `insert into public.per_diem_plans (member_id, plan_date, budget_cents) values ($1, '2026-10-18', 1000)`, [B]);
check('cannot write a plan for someone else', !!r.error, r.error);
r = await member(B, `select * from public.per_diem_plans where member_id = $1`, [A]);
check('other members cannot read your plans', rows(r).length === 0, r.error);
r = await member(B, `update public.per_diem_plans set budget_cents = 1 where id = $1 returning id`, [plan]);
check('other members cannot edit your plans', rows(r).length === 0, r.error);

r = await member(A, `insert into public.per_diem_plans (member_id, plan_date, budget_cents, items) values ($1, '2026-10-19', 1000, '{"a":1}'::jsonb)`, [A]);
check('items must be an array', !!r.error, r.error);
const many = JSON.stringify(Array.from({length: 21}, (_, i) => ({time: '', label: `s${i}`, cost_cents: 0, done: false})));
r = await member(A, `insert into public.per_diem_plans (member_id, plan_date, budget_cents, items) values ($1, '2026-10-20', 1000, $2::jsonb)`, [A, many]);
check('more than 20 stops rejected', !!r.error, r.error);
r = await member(A, `insert into public.per_diem_plans (member_id, plan_date, budget_cents) values ($1, '2026-10-21', -5)`, [A]);
check('negative budget rejected', !!r.error, r.error);
r = await member(A, `update public.per_diem_plans set status = 'booked' where id = $1`, [plan]);
check('there is no booked status', !!r.error, r.error);

const ticked = JSON.stringify([{time: '7:00 PM', label: 'Drinks at Bar Céleste', cost_cents: 9000, done: true}]);
r = await member(A, `update public.per_diem_plans set items = $2::jsonb where id = $1 returning items`, [plan, ticked]);
check('member can tick a stop done', rows(r)[0]?.items?.[0]?.done === true, r.error);

r = await anon(`select * from public.per_diem_plans`);
check('anon cannot read plans', !!r.error, r.error);

await exec(`delete from public.profiles where id = $1`, [A]);
r = await exec(`select count(*)::int n from public.per_diem_plans where member_id = $1`, [A]);
check('deleting the profile deletes their plans', r.r.rows[0].n === 0);

await reapply();
finish();
