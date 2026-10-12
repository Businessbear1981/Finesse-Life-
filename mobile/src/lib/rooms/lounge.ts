// The Lounge — the same sources as src/app/(hotel)/lounge/page.tsx: members from profiles (same select, same
// deterministic compat score), posts from GET /api/posts (with liked_by_me), the composer POST /api/posts and
// likes POST /api/posts/:id/like. Outings are the open ones members host (outings, read-all policy).
import {api} from '../api';
import {supabase} from '../supabase';
import {asMember, ok, pgFail} from './db';
import {rankMembers, type LoungeMember, type Me} from './logic';

export type Post = {id: string; content: string; media_urls?: string[] | null; likes_count: number; created_at: string; liked_by_me?: boolean;
  profiles?: {id?: string; display_name?: string | null; username?: string | null; avatar_url?: string | null; vibe?: string | null} | null};
export type LoungeOuting = {id: string; host_id: string; title: string; partner: string | null; occasion_type: string | null; date_at: string | null; note: string | null; status: string};
export type LoungeData = {me: string; members: Array<LoungeMember & {score: number}>; posts: Post[]; postsError: string | null};

export const readLounge = () => asMember<LoungeData>(async (uid) => {
  const [mine, people, posts] = await Promise.all([
    supabase.from('profiles').select('vibe, city, interests').eq('id', uid).maybeSingle(),
    supabase.from('profiles').select('id, display_name, username, avatar_url, vibe, city, interests, check_in').limit(20),
    api<{posts?: Post[]; error?: string}>('/api/posts?page=1'),
  ]);
  if (people.error) return pgFail(people.error, 'Nothing was loaded.');
  const p = (mine.data ?? {}) as {vibe?: string | null; city?: string | null; interests?: string[] | null};
  const me: Me = {vibe: p.vibe ?? null, city: p.city ?? null, interests: p.interests ?? []};
  return ok({
    me: uid,
    members: rankMembers((people.data ?? []) as LoungeMember[], me, uid),
    posts: posts.ok && Array.isArray(posts.body.posts) ? posts.body.posts : [],
    postsError: posts.ok ? null : posts.status === 0 ? 'The house line is down — moments couldn’t load.' : 'Moments couldn’t load just now.',
  });
});

export function postMoment(content: string) {
  return api<{post?: Post; error?: string}>('/api/posts', {method: 'POST', json: {content: content.trim().slice(0, 500)}});
}

export function likePost(id: string) {
  return api<{liked?: boolean; error?: string}>(`/api/posts/${id}/like`, {method: 'POST'});
}

export const readOpenOutings = () => asMember<{outings: LoungeOuting[]}>(async () => {
  const {data, error} = await supabase.from('outings').select('id, host_id, title, partner, occasion_type, date_at, note, status')
    .eq('status', 'open').order('created_at', {ascending: false}).limit(20);
  return error ? pgFail(error, 'Nothing was loaded.') : ok({outings: (data ?? []) as LoungeOuting[]});
});
