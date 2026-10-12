// Behaviour test for supabase/migrations/20261016_w2_entourage.sql on PGlite. Run: node tests/db/w2-entourage.mjs
import {harness, ids} from './w2-harness.mjs';

const {A, B} = ids;
const {check, exec, member, anon, rows, reapply, finish} = await harness('20261016_w2_entourage.sql');

// ── People ────────────────────────────────────────────────────────────────────────────────
let r = await member(A, `insert into public.entourage_people (member_id, name, relation, birthday, loves)
  values ($1, 'Mum', 'family', '1960-10-20', '{Orchids,"Earl Grey"}') returning id`, [A]);
check('member can add a dossier', !r.error, r.error);
const mum = rows(r)[0]?.id;

r = await member(A, `insert into public.entourage_people (member_id, name) values ($1, 'Spoof') returning id`, [B]);
check('cannot write a dossier for someone else', !!r.error, r.error);

r = await member(B, `select * from public.entourage_people`);
check('other members cannot read your dossiers', !r.error && rows(r).length === 0, r.error ?? `${rows(r).length} rows`);
r = await member(B, `update public.entourage_people set name = 'x' where id = $1 returning id`, [mum]);
check('other members cannot edit your dossiers', !r.error && rows(r).length === 0, r.error);
r = await member(B, `delete from public.entourage_people where id = $1 returning id`, [mum]);
check('other members cannot delete your dossiers', !r.error && rows(r).length === 0, r.error);

r = await member(A, `update public.entourage_people set member_id = $1 where id = $2`, [B, mum]);
check('ownership cannot be moved', !!r.error, r.error);

r = await member(A, `insert into public.entourage_people (member_id, name) values ($1, '')`, [A]);
check('empty name rejected', !!r.error, r.error);
r = await member(A, `insert into public.entourage_people (member_id, name, loves) values ($1, 'Too many', $2)`, [A, Array.from({length: 13}, (_, i) => `l${i}`)]);
check('more than 12 loves rejected', !!r.error, r.error);
r = await member(A, `insert into public.entourage_people (member_id, name, linked_member_id) values ($1, 'Me', $1)`, [A]);
check('cannot link a dossier to yourself', !!r.error, r.error);
r = await member(A, `insert into public.entourage_people (member_id, name, linked_member_id) values ($1, 'Ben', $2) returning id`, [A, B]);
check('can link a dossier to another member', !r.error, r.error);

r = await member(A, `select updated_at from public.entourage_people where id = $1`, [mum]);
const before = rows(r)[0]?.updated_at;
await new Promise((res) => setTimeout(res, 15));
await member(A, `update public.entourage_people set notes = 'Loves the garden' where id = $1`, [mum]);
r = await member(A, `select updated_at from public.entourage_people where id = $1`, [mum]);
check('updated_at moves on edit', rows(r)[0]?.updated_at > before);

// ── Gifts ─────────────────────────────────────────────────────────────────────────────────
r = await member(A, `insert into public.entourage_gifts (member_id, person_id, title, price_cents, url, source)
  values ($1, $2, 'Silk carré', 42000, 'https://example.com/carre', 'nova') returning id`, [A, mum]);
check('member can save a gift idea on their own dossier', !r.error, r.error);
const gift = rows(r)[0]?.id;

r = await member(B, `insert into public.entourage_people (member_id, name) values ($1, 'Theo') returning id`, [B]);
const theo = rows(r)[0]?.id;
r = await member(A, `insert into public.entourage_gifts (member_id, person_id, title) values ($1, $2, 'sneaky')`, [A, theo]);
check("cannot hang a gift on someone else's dossier", !!r.error, r.error);
r = await member(B, `insert into public.entourage_gifts (member_id, person_id, title) values ($1, $2, 'x')`, [B, mum]);
check("other members cannot add gifts to your dossier", !!r.error, r.error);
r = await member(B, `select * from public.entourage_gifts`);
check('other members cannot read your gifts', rows(r).length === 0, r.error);

r = await member(A, `insert into public.entourage_gifts (member_id, person_id, title, url) values ($1, $2, 'bad link', 'javascript:alert(1)')`, [A, mum]);
check('non-http gift links rejected', !!r.error, r.error);
r = await member(A, `insert into public.entourage_gifts (member_id, person_id, title, status) values ($1, $2, 'x', 'booked')`, [A, mum]);
check('unknown gift status rejected', !!r.error, r.error);

r = await member(A, `update public.entourage_gifts set status = 'purchased' where id = $1 returning status`, [gift]);
check('member can mark a gift purchased', rows(r)[0]?.status === 'purchased', r.error);

// ── Signed out ────────────────────────────────────────────────────────────────────────────
r = await anon(`select * from public.entourage_people`);
check('anon cannot read dossiers', !!r.error, r.error);
r = await anon(`select * from public.entourage_gifts`);
check('anon cannot read gifts', !!r.error, r.error);

// ── Cascades ──────────────────────────────────────────────────────────────────────────────
await exec(`delete from public.entourage_people where id = $1`, [mum]);
r = await exec(`select count(*)::int n from public.entourage_gifts where person_id = $1`, [mum]);
check('deleting a dossier deletes its gifts', r.r.rows[0].n === 0);
await exec(`delete from public.profiles where id = $1`, [B]);
r = await exec(`select count(*)::int n from public.entourage_people where member_id = $1`, [B]);
check('deleting the profile deletes their dossiers', r.r.rows[0].n === 0);
r = await exec(`select count(*)::int n from public.entourage_people where member_id = $1 and linked_member_id is null and name = 'Ben'`, [A]);
check('a deleted linked member unlinks (dossier kept)', r.r.rows[0].n === 1);

await reapply();
finish();
