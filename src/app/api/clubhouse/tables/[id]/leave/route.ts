import {NextRequest} from 'next/server';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {boardRow, isUuid} from '../../../_shared';

// POST /api/clubhouse/tables/:id/leave → {table} — give up your seat (no-op if you weren't seated).
export async function POST(_req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {id} = await params;
  if (!isUuid(id)) return json({error: 'bad_request'}, ctx.traceId, 400);
  const {error} = await ctx.supabase.from('club_seats').delete().eq('table_id', id).eq('member_id', ctx.userId);
  if (error) return dbFailure(error, ctx.traceId, 'clubhouse');
  const row = await boardRow(ctx, id);
  if ('error' in row && row.error) return dbFailure(row.error, ctx.traceId, 'clubhouse');
  return json({table: row.row}, ctx.traceId);
}
