import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/data/server';

export async function POST(request: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id: postId} = await context.params;
  const dbc = await createClient();
  const {data: {user}} = await dbc.auth.getUser();

  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  // Check existing like
  const {data: existing} = await dbc
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    await dbc.from('post_likes').delete().eq('id', existing.id);
    const {data: post} = await dbc.from('posts').select('likes_count').eq('id', postId).single();
    await dbc.from('posts').update({likes_count: Math.max(0, (post?.likes_count || 1) - 1)}).eq('id', postId);
    return NextResponse.json({liked: false});
  } else {
    // Like
    await dbc.from('post_likes').insert({post_id: postId, user_id: user.id});
    const {data: post} = await dbc.from('posts').select('likes_count').eq('id', postId).single();
    await dbc.from('posts').update({likes_count: (post?.likes_count || 0) + 1}).eq('id', postId);
    return NextResponse.json({liked: true});
  }
}
