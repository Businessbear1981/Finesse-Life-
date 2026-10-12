import {NextRequest} from 'next/server';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {boardRow, clubFailure, isUuid} from '../../../_shared';

// POST /api/clubhouse/tables/:id/join → {table} — take a seat. The seat cap is enforced by the database;
// a full or closed table answers 409 with nothing changed. Joining twice is a no-op.
export async function POST(_req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const {error} = await ctx.supabase.from('club_seats').insert({table_id: id, member_id: ctx.userId});
  if (error && error.code !== '23505') return clubFailure(error, ctx);
  const row = await boardRow(ctx, id);
  if ('error' in row && row.error) return dbFailure(row.error, ctx.traceId, 'clubhouse');
  if (!row.row) return json({error: 'not_found'}, ctx.traceId, 404);
  return json({table: row.row}, ctx.traceId);
}
