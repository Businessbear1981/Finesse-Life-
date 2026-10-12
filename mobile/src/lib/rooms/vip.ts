// The VIP feed on the Penthouse floor — read exactly as src/app/(hotel)/vip/page.tsx reads it: vip_posts with the
// author's profile, newest first, 30. Row-level security shows them to VIP members only (vip_posts_vip_read), so
// the app never filters anything itself. Posting inserts the member's own row (vip_posts_vip_insert checks VIP).
import {supabase} from '../supabase';
import {asMember, ok, pgFail} from './db';

export type VipPost = {id: string; content: string | null; media_urls: string[] | null; likes_count: number; created_at: string;
  author: {display_name: string | null; username: string; avatar_url: string | null; vibe: string | null} | null};

export const readVipFeed = () => asMember<{posts: VipPost[]; me: string}>(async (uid) => {
  const {data, error} = await supabase.from('vip_posts')
    .select('id, content, media_urls, likes_count, created_at, author:profiles!vip_posts_author_id_fkey (display_name, username, avatar_url, vibe)')
    .order('created_at', {ascending: false}).limit(30);
  return error ? pgFail(error, 'Nothing was loaded.') : ok({posts: (data ?? []) as unknown as VipPost[], me: uid});
});

export const postVip = (content: string) => asMember<{ok?: boolean}>(async (uid) => {
  const {error} = await supabase.from('vip_posts').insert({author_id: uid, content: content.trim().slice(0, 1000)});
  return error ? pgFail(error, 'Nothing was posted.') : ok({ok: true}, 201);
});
