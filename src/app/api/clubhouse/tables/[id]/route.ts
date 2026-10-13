import {NextRequest} from 'next/server';
import {json, requireMember} from '@/lib/api/room';
import {clubFailure, isUuid} from '../../_shared';

// DELETE /api/clubhouse/tables/:id — the host closes their table (status → cancelled; seats stay for the record).
export async function DELETE(_req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const {data, error} = await ctx.supabase.from('club_tables').update({status: 'cancelled'}).eq('id', id).eq('host_id', ctx.userId).select('id').maybeSingle();
  if (error) return clubFailure(error, ctx);
  if (!data) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({closed: id}, ctx.traceId);
}
