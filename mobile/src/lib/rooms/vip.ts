// The VIP feed on the Penthouse floor — read exactly as src/app/(hotel)/vip/page.tsx reads it: vip_posts with the
// author's profile, newest first, 30. Row-level security shows them to VIP members only (vip_posts_vip_read) and
// drops moderation-hidden posts and blocked members (20261017_s1_moderation.sql), so the app filters nothing
// itself. Posting goes through POST /api/vip/posts (house rules, text filter; vip_posts_vip_insert checks VIP).
import {api} from '../api';
import {supabase} from '../supabase';
import {asMember, ok, pgFail} from './db';

export type VipPost = {id: string; author_id?: string | null; content: string | null; media_urls: string[] | null; likes_count: number; created_at: string;
  author: {display_name: string | null; username: string; avatar_url: string | null; vibe: string | null} | null};

export const readVipFeed = () => asMember<{posts: VipPost[]; me: string}>(async (uid) => {
  const {data, error} = await supabase.from('vip_posts')
    .select('id, author_id, content, media_urls, likes_count, created_at, author:profiles!vip_posts_author_id_fkey (display_name, username, avatar_url, vibe)')
    .order('created_at', {ascending: false}).limit(30);
  return error ? pgFail(error, 'Nothing was loaded.') : ok({posts: (data ?? []) as unknown as VipPost[], me: uid});
});

export const postVip = (content: string) =>
  api<{post?: Partial<VipPost>; error?: string; message?: string}>('/api/vip/posts', {method: 'POST', json: {content: content.trim().slice(0, 1000)}});
