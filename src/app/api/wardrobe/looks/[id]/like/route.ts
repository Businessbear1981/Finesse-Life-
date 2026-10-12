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

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: existing } = await service
    .from('wardrobe_look_likes')
    .select('look_id')
    .eq('user_id', user.id)
    .eq('look_id', id)
    .maybeSingle();

  if (existing) {
    await service.from('wardrobe_look_likes').delete().eq('user_id', user.id).eq('look_id', id);
    const { data: look } = await service.from('wardrobe_looks').select('likes_count').eq('id', id).single();
    if (look) {
      await service.from('wardrobe_looks').update({ likes_count: Math.max(0, (look.likes_count ?? 1) - 1) }).eq('id', id);
    }
    return NextResponse.json({ liked: false });
  } else {
    await service.from('wardrobe_look_likes').insert({ user_id: user.id, look_id: id });
    const { data: look } = await service.from('wardrobe_looks').select('likes_count').eq('id', id).single();
    if (look) {
      await service.from('wardrobe_looks').update({ likes_count: (look.likes_count ?? 0) + 1 }).eq('id', id);
    }
    return NextResponse.json({ liked: true });
  }
}
