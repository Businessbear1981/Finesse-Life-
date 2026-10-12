import { NextResponse } from 'next/server';
import {createClient as createSessionClient} from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getUser() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
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
