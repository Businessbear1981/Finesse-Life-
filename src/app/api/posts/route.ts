import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {searchParams} = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const from = (page - 1) * limit;

  const {data, error} = await supabase
    .from('posts')
    .select(`
      id, content, media_urls, like_count, created_at,
      profiles!author_id(id, display_name, username, avatar_url, vibe)
    `)
    .order('created_at', {ascending: false})
    .range(from, from + limit - 1);

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  // If user is authenticated, get their likes for this page
  const {data: {user}} = await supabase.auth.getUser();
  let likedIds: string[] = [];
  if (user && data?.length) {
    const postIds = data.map((p: any) => p.id);
    const {data: likes} = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);
    likedIds = (likes || []).map((l: any) => l.post_id);
  }

  const posts = (data || []).map((p: any) => ({
    ...p,
    liked_by_me: likedIds.includes(p.id),
  }));

  return NextResponse.json({posts, user_id: user?.id || null});
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const body = await request.json();
  const {content, media_urls} = body;

  if (!content?.trim()) {
    return NextResponse.json({error: 'Content required'}, {status: 400});
  }
  if (content.length > 500) {
    return NextResponse.json({error: 'Max 500 characters'}, {status: 400});
  }

  const {data, error} = await supabase
    .from('posts')
    .insert({author_id: user.id, content: content.trim(), media_urls: media_urls || []})
    .select(`
      id, content, media_urls, like_count, created_at,
      profiles!author_id(id, display_name, username, avatar_url, vibe)
    `)
    .single();

  if (error) return NextResponse.json({error: error.message}, {status: 500});

  return NextResponse.json({post: {...data, liked_by_me: false}});
}
