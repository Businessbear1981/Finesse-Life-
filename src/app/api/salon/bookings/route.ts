import { NextResponse } from 'next/server';
import {FINESSE_API, MEMBER_ROLE, SERVICE_ROLE, createServerClient} from '@/lib/data/compat';
import {createClient} from '@/lib/data/compat';
import { cookies } from 'next/headers';

const service = createClient(
  FINESSE_API,
  SERVICE_ROLE,
);

async function getUser() {
  const cookieStore = await cookies();
  const dbc = createServerClient(
    FINESSE_API,
    MEMBER_ROLE,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await dbc.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await service
    .from('salon_bookings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { service_id, service_name, price_cents, duration, category, edition, requested_date, requested_time, notes } = body;

  if (!service_name || !requested_date || !requested_time) {
    return NextResponse.json({ error: 'service_name, requested_date, requested_time required' }, { status: 400 });
  }

  const { data, error } = await service
    .from('salon_bookings')
    .insert({
      user_id: user.id,
      service_id: service_id ?? 'custom',
      service_name,
      price_cents: price_cents ?? 0,
      duration,
      category,
      edition: edition ?? 'finesse',
      requested_date,
      requested_time,
      notes: notes ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ booking: data }, { status: 201 });
}
