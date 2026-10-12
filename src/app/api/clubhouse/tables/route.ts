import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {GAME_INFO, GAMES} from '@/lib/clubhouse';
import {boardRow, clubFailure} from '../_shared';

const create = z.object({
  game: z.enum(GAMES),
  title: z.string().trim().min(1).max(80),
  note: z.string().trim().max(200).nullable().optional(),
  starts_at: z.string().datetime({offset: true}),
  seats: z.number().int().min(2).max(40).optional(),
}).refine((t) => !t.seats || t.seats <= GAME_INFO[t.game].maxSeats, {message: 'Too many seats for that game', path: ['seats']});

// GET /api/clubhouse/tables → {tables} — every open table (from 6 hours ago on), seat counts only.
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {data, error} = await ctx.supabase.rpc('club_board');
  if (error) return dbFailure(error, ctx.traceId, 'clubhouse');
  return json({tables: data ?? []}, ctx.traceId);
}

// POST /api/clubhouse/tables — host a table. The host is seated automatically. Points only.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, create);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase.from('club_tables').insert({
    host_id: ctx.userId, game: b.game, title: b.title, note: b.note || null, starts_at: b.starts_at, seats: b.seats ?? GAME_INFO[b.game].defaultSeats,
  }).select('id').single();
  if (error) return clubFailure(error, ctx);
  const row = await boardRow(ctx, data.id);
  if ('error' in row && row.error) return dbFailure(row.error, ctx.traceId, 'clubhouse');
  return json({table: row.row}, ctx.traceId, 201);
}
