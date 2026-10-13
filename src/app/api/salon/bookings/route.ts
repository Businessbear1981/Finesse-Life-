import {NextRequest} from 'next/server';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {bookingRequest} from '@/lib/salon';

// The member's own session client (RLS: 20261016_w3_salon.sql) — no service role. Members read their requests,
// create 'pending' ones and cancel their own pending ones; only a salon partner can confirm.
const COLS = 'id, service_name, category, duration, edition, requested_date, requested_time, notes, price_cents, status, created_at';

// GET /api/salon/bookings → {bookings} (own, newest first)
export async function GET() {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const {data, error} = await ctx.supabase.from('salon_bookings').select(COLS).eq('user_id', ctx.userId).order('created_at', {ascending: false}).limit(100);
  if (error) return dbFailure(error, ctx.traceId, 'salon');
  return json({bookings: data ?? []}, ctx.traceId);
}

// POST /api/salon/bookings {service_name, requested_date, requested_time, notes?, category?, duration?, edition?}
// → 201 {booking} with status 'pending'. Price is unknown until a salon quotes it (0 = not quoted).
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, bookingRequest);
  if (parsed.error) return parsed.error;
  const b = parsed.data;
  const {data, error} = await ctx.supabase.from('salon_bookings').insert({
    user_id: ctx.userId, service_id: 'custom', service_name: b.service_name, price_cents: 0,
    duration: b.duration ?? null, category: b.category ?? null, edition: b.edition,
    requested_date: b.requested_date, requested_time: b.requested_time, notes: b.notes || null, status: 'pending',
  }).select(COLS).single();
  if (error) return dbFailure(error, ctx.traceId, 'salon');
  return json({booking: data, message: 'Requested. No salon has confirmed it yet — nothing is booked until they do.'}, ctx.traceId, 201);
}
