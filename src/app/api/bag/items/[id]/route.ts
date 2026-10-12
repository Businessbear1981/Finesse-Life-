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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  if ('note' in body) allowed.note = body.note;
  if ('value_est_cents' in body) allowed.value_est_cents = body.value_est_cents;
  if ('photo_url' in body) allowed.photo_url = body.photo_url;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await service
    .from('bag_items')
    .update(allowed)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { error } = await service
    .from('bag_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
