import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import type {VipPost} from './vip-post-feed';
import {VipRoomView} from './vip-room-view';

const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'FinesseVIPBot';

export default async function VipPage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify VIP — middleware handles redirect but double-check server-side.
  // Own row via the SECURITY DEFINER helper (is_vip/vip_expires_at/telegram_handle are not
  // SELECT-granted to members, 20261020_s4).
  const {data: rows} = await supabase.rpc('get_own_profile');
  const profile = (rows?.[0] ?? null) as {
    is_vip?: boolean | null;
    vip_expires_at?: string | null;
    username?: string | null;
    telegram_handle?: string | null;
  } | null;

  if (
    !profile?.is_vip ||
    (profile.vip_expires_at && new Date(profile.vip_expires_at) < new Date())
  ) {
    redirect('/profile?upgrade=true');
  }

  const {data: rawPosts} = await supabase
    .from('vip_posts')
    .select(
      `
      id,
      author_id,
      content,
      media_urls,
      likes_count,
      created_at,
      author:profiles!vip_posts_author_id_fkey (
        display_name,
        username,
        avatar_url,
        vibe
      )
    `,
    )
    .order('created_at', {ascending: false})
    .limit(30);

  const posts = (rawPosts ?? []) as unknown as VipPost[];

  return (
    <VipRoomView
      posts={posts}
      currentUserId={user.id}
      telegramBot={TELEGRAM_BOT_USERNAME}
      telegramHandle={profile?.telegram_handle ?? null}
    />
  );
}
