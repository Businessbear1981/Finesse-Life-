import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {TRIP_COLS} from '../_shared';

const when = z.string().datetime({offset: true}).nullable().optional();
const create = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  origin: z.string().trim().max(120).nullable().optional(),
  destination: z.string().trim().min(1).max(120),
  depart_at: when,
  return_at: when,
  party_size: z.number().int().min(1).max(40).default(1),
  brief: z.string().trim().max(600).nullable().optional(),
}).refine((t) => !t.depart_at || !t.return_at || new Date(t.return_at) >= new Date(t.depart_at), 'Return must be after departure');

// GET /api/departures/trips → {trips} — the member's trips, soonest departure first (undated last).
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {data, error} = await ctx.supabase.from('trips').select(TRIP_COLS).eq('member_id', ctx.userId)
    .order('depart_at', {ascending: true, nullsFirst: false}).order('created_at', {ascending: false}).limit(100);
  if (error) return dbFailure(error, ctx.traceId, 'departures');
  return json({trips: data ?? []}, ctx.traceId);
}

// POST /api/departures/trips — compose a trip (draft). Nova's plan is attached with PATCH {nova_request_id}.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, create);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase.from('trips').insert({
    member_id: ctx.userId, title: b.title || b.destination, origin: b.origin || null, destination: b.destination,
    depart_at: b.depart_at ?? null, return_at: b.return_at ?? null, party_size: b.party_size, brief: b.brief || null,
  }).select(TRIP_COLS).single();
  if (error) return dbFailure(error, ctx.traceId, 'departures');
  return json({trip: data}, ctx.traceId, 201);
}
