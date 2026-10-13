import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {bySoonest, isIsoDate, nextBirthday, type EntourageGift, type EntouragePerson} from '@/lib/entourage';
import {emptyToNull, GIFT_COLS, loves, PERSON_COLS, personFields} from './_shared';

const create = z.object({
  name: personFields.name,
  relation: personFields.relation.default('friend'),
  city: personFields.city.optional(),
  birthday: personFields.birthday.optional(),
  loves: loves.default([]),
  notes: personFields.notes.optional(),
  linked_member_id: personFields.linked_member_id.optional(),
});

// GET /api/entourage?today=YYYY-MM-DD → {today, people: [{...person, next, gifts}]} — the member's own
// dossiers, soonest birthday first. `today` is the member's local day (defaults to the server's UTC day).
export async function GET(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const q = req.nextUrl.searchParams.get('today');
  const today = q && isIsoDate(q) ? q : new Date().toISOString().slice(0, 10);
  const [people, gifts] = await Promise.all([
    ctx.supabase.from('entourage_people').select(PERSON_COLS).eq('member_id', ctx.userId).limit(200),
    ctx.supabase.from('entourage_gifts').select(GIFT_COLS).eq('member_id', ctx.userId).order('created_at', {ascending: false}).limit(1000),
  ]);
  if (people.error) return dbFailure(people.error, ctx.traceId, 'entourage');
  if (gifts.error) return dbFailure(gifts.error, ctx.traceId, 'entourage');
  const byPerson = new Map<string, EntourageGift[]>();
  for (const g of (gifts.data ?? []) as EntourageGift[]) byPerson.set(g.person_id, [...(byPerson.get(g.person_id) ?? []), g]);
  const rows = bySoonest((people.data ?? []) as EntouragePerson[], today).map((p) => ({
    ...p, next: nextBirthday(p.birthday, today), gifts: byPerson.get(p.id) ?? [],
  }));
  return json({today, people: rows}, ctx.traceId);
}

// POST /api/entourage — add a dossier.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, create);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase.from('entourage_people').insert({
    member_id: ctx.userId, name: b.name, relation: b.relation, city: emptyToNull(b.city), birthday: b.birthday ?? null,
    loves: [...new Set(b.loves)], notes: emptyToNull(b.notes), linked_member_id: b.linked_member_id ?? null,
  }).select(PERSON_COLS).single();
  if (error) {
    if (error.code === '23503' || error.code === '23514') return json({error: 'bad_request', message: 'That detail could not be saved. Nothing was added.'}, ctx.traceId, 400);
    return dbFailure(error, ctx.traceId, 'entourage');
  }
  return json({person: {...data, gifts: []}}, ctx.traceId, 201);
}
