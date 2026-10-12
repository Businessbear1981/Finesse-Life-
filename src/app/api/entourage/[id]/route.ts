import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {emptyToNull, isUuid, PERSON_COLS, personFields} from '../_shared';

const patch = z.object({
  name: personFields.name.optional(),
  relation: personFields.relation.optional(),
  city: personFields.city.optional(),
  birthday: personFields.birthday.optional(),
  loves: personFields.loves.optional(),
  notes: personFields.notes.optional(),
  linked_member_id: personFields.linked_member_id.optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to change');

// PATCH /api/entourage/:id — edit a dossier (own only; RLS + member filter).
export async function PATCH(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const parsed = await parseBody(req, patch);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const update: Record<string, unknown> = {};
  if (b.name !== undefined) update.name = b.name;
  if (b.relation !== undefined) update.relation = b.relation;
  if (b.city !== undefined) update.city = emptyToNull(b.city);
  if (b.birthday !== undefined) update.birthday = b.birthday;
  if (b.loves !== undefined) update.loves = [...new Set(b.loves)];
  if (b.notes !== undefined) update.notes = emptyToNull(b.notes);
  if (b.linked_member_id !== undefined) update.linked_member_id = b.linked_member_id;
  const {data, error} = await ctx.supabase.from('entourage_people').update(update).eq('id', id).eq('member_id', ctx.userId).select(PERSON_COLS).maybeSingle();
  if (error) {
    if (error.code === '23503' || error.code === '23514') return json({error: 'bad_request', message: 'That detail could not be saved. Nothing was changed.'}, ctx.traceId, 400);
    return dbFailure(error, ctx.traceId, 'entourage');
  }
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({person: data}, ctx.traceId);
}

// DELETE /api/entourage/:id — remove a dossier and its gifts.
export async function DELETE(_req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const {data, error} = await ctx.supabase.from('entourage_people').delete().eq('id', id).eq('member_id', ctx.userId).select('id').maybeSingle();
  if (error) return dbFailure(error, ctx.traceId, 'entourage');
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({deleted: id}, ctx.traceId);
}
