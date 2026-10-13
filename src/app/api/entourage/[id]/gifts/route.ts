import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {emit} from '@/lib/intelligence';
import {GIFT_COLS, isUuid} from '../../_shared';

const status = z.enum(['idea', 'purchased', 'given']);
const create = z.object({
  title: z.string().trim().min(1).max(160),
  status: status.default('idea'),
  price_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  url: z.string().trim().max(600).regex(/^https?:\/\//i).nullable().optional(),
  occasion: z.string().trim().max(80).nullable().optional(),
  source: z.enum(['member', 'nova']).default('member'),
});
const patch = z.object({gift_id: z.string().uuid(), status});

type Ctx = {params: Promise<{id: string}>};

// GET /api/entourage/:id/gifts → {gifts} for one of the member's dossiers.
export async function GET(_req: NextRequest, {params}: Ctx) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const {data, error} = await ctx.supabase.from('entourage_gifts').select(GIFT_COLS).eq('person_id', id).eq('member_id', ctx.userId).order('created_at', {ascending: false}).limit(200);
  if (error) return dbFailure(error, ctx.traceId, 'entourage');
  return json({gifts: data ?? []}, ctx.traceId);
}

// POST /api/entourage/:id/gifts — record a gift idea or a purchase. The dossier must be the member's own
// (RLS checks it too). Nothing is bought here.
export async function POST(req: NextRequest, {params}: Ctx) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const parsed = await parseBody(req, create);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const owner = await ctx.supabase.from('entourage_people').select('id').eq('id', id).eq('member_id', ctx.userId).maybeSingle();
  if (owner.error) return dbFailure(owner.error, ctx.traceId, 'entourage');
  if (!owner.data) return json({error: 'not_found'}, ctx.traceId, 404);
  const {data, error} = await ctx.supabase.from('entourage_gifts').insert({
    member_id: ctx.userId, person_id: id, title: b.title, status: b.status, price_cents: b.price_cents ?? null,
    url: b.url ?? null, occasion: b.occasion || null, source: b.source,
  }).select(GIFT_COLS).single();
  if (error) return dbFailure(error, ctx.traceId, 'entourage');
  if (b.status === 'idea') void emit({user_id: ctx.userId, kind: 'wishlist_add', payload: {category: 'gift', room: 'entourage', source: b.source, price_cents: b.price_cents ?? null}});
  return json({gift: data}, ctx.traceId, 201);
}

// PATCH /api/entourage/:id/gifts {gift_id, status} — idea → purchased → given.
export async function PATCH(req: NextRequest, {params}: Ctx) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const parsed = await parseBody(req, patch);
  if (parsed.error) return parsed.error;
  const {data, error} = await ctx.supabase.from('entourage_gifts').update({status: parsed.data.status})
    .eq('id', parsed.data.gift_id).eq('person_id', id).eq('member_id', ctx.userId).select(GIFT_COLS).maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'entourage');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({gift: data}, ctx.traceId);
}

// DELETE /api/entourage/:id/gifts?gift_id=…
export async function DELETE(req: NextRequest, {params}: Ctx) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  const giftId = req.nextUrl.searchParams.get('gift_id') ?? '';
  if (!isUuid(id) || !isUuid(giftId)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const {data, error} = await ctx.supabase.from('entourage_gifts').delete().eq('id', giftId).eq('person_id', id).eq('member_id', ctx.userId).select('id').maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'entourage');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({deleted: giftId}, ctx.traceId);
}
