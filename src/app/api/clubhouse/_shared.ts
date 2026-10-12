import {z} from 'zod';
import type {MemberCtx} from '@/lib/api/room';
import {json, dbFailure} from '@/lib/api/room';
import {clubErrorCode, clubErrorText} from '@/lib/clubhouse';

export const isUuid = (s: string) => z.string().uuid().safeParse(s).success;

/** Trigger errors (table full, closed, host limit…) → 409/404 with member copy; anything else → dbFailure. */
export function clubFailure(error: {code?: string; message?: string}, ctx: MemberCtx) {
  const code = clubErrorCode(error.message);
  if (code) return json({error: code, message: clubErrorText(code)}, ctx.traceId, code === 'not_found' ? 404 : code === 'bad_start' ? 400 : 409);
  if (error.code === '23503') return json({error: 'not_found', message: clubErrorText('not_found')}, ctx.traceId, 404);
  return dbFailure(error, ctx.traceId, 'clubhouse');
}

/** One row of the board for a table id (club_board() is the only read path for non-hosts). */
export async function boardRow(ctx: MemberCtx, id: string) {
  const {data, error} = await ctx.supabase.rpc('club_board');
  if (error) return {error};
  return {row: ((data ?? []) as Array<{id: string}>).find((t) => t.id === id) ?? null};
}
