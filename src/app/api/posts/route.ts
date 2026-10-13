import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {parseBody} from '@/lib/api/validate';
import {checkMediaUrls, screenText} from '@/lib/moderation';
import {TERMS_REQUIRED_MESSAGE, contentRejected, myBlockedIds, postingGate} from '@/lib/moderation-server';
import {r2PublicBase} from '@/lib/r2';

// The Lounge feed. Reads run as the member, so row-level security (20261017_s1_moderation.sql) already
// drops moderation-hidden posts and posts by members blocked in either direction; the route filters
// the member's own block list again so a stale policy never shows a blocked author.

const POST_COLS = `
      id, author_id, content, media_urls, likes_count, created_at,
      profiles!author_id(id, display_name, username, avatar_url, vibe)
    `;

type Row = {id: string; author_id?: string | null};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {searchParams} = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = 20;
  const from = (page - 1) * limit;

  const {data, error} = await supabase
    .from('posts')
    .select(POST_COLS)
    .order('created_at', {ascending: false})
    .range(from, from + limit - 1);

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  const {data: {user}} = await supabase.auth.getUser();
  const blocked = user ? await myBlockedIds(supabase, user.id) : new Set<string>();
  const visible = ((data || []) as Row[]).filter((p) => !(p.author_id && blocked.has(p.author_id)));

  // If user is authenticated, get their likes for this page
  let likedIds: string[] = [];
  if (user && visible.length) {
    const {data: likes} = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', visible.map((p) => p.id));
    likedIds = ((likes || []) as Array<{post_id: string}>).map((l) => l.post_id);
  }

  const posts = visible.map((p) => ({...p, liked_by_me: likedIds.includes(p.id)}));
  return NextResponse.json({posts, user_id: user?.id || null});
}

const createPost = z.object({
  content: z.string().max(2000),
  media_urls: z.array(z.unknown()).max(10).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const parsed = await parseBody(request, createPost);
  if (parsed.error) return parsed.error;
  const content = parsed.data.content.trim();

  if (!content) {
    return NextResponse.json({error: 'Content required'}, {status: 400});
  }
  if (content.length > 500) {
    return NextResponse.json({error: 'Max 500 characters'}, {status: 400});
  }

  // House rules accepted and not suspended — checked before anything is saved.
  const gate = await postingGate(supabase, user.id);
  if (gate) return gate;

  const verdict = screenText(content, 'post');
  if (verdict.verdict === 'reject') return contentRejected(verdict);

  // Photos must be the member's own uploads on our storage; anything else is refused, not stripped.
  const media = checkMediaUrls(parsed.data.media_urls, r2PublicBase(), user.id);
  if (!media.ok) return NextResponse.json({error: 'bad_media', message: media.message}, {status: 400});

  const {data, error} = await supabase
    .from('posts')
    .insert({author_id: user.id, content, media_urls: media.urls})
    .select(POST_COLS)
    .single();

  if (error) {
    // posts_terms_required (RLS) — the gate above normally answers first.
    if (error.code === '42501') return NextResponse.json({error: 'terms_required', message: TERMS_REQUIRED_MESSAGE}, {status: 403});
    return NextResponse.json({error: error.message}, {status: 500});
  }

  return NextResponse.json({post: {...data, liked_by_me: false}});
}
