import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function POST(request: NextRequest, {params}: {params: {id: string}}) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const postId = params.id;

  // Check existing like
  const {data: existing} = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase.from('post_likes').delete().eq('id', existing.id);
    await supabase.rpc('decrement_post_likes', {post_id: postId}).catch(() =>
      supabase.from('posts').update({like_count: supabase.rpc('greatest', {a: 0}) as any}).eq('id', postId)
    );
    // Simple decrement
    const {data: post} = await supabase.from('posts').select('like_count').eq('id', postId).single();
    await supabase.from('posts').update({like_count: Math.max(0, (post?.like_count || 1) - 1)}).eq('id', postId);
    return NextResponse.json({liked: false});
  } else {
    // Like
    await supabase.from('post_likes').insert({post_id: postId, user_id: user.id});
    const {data: post} = await supabase.from('posts').select('like_count').eq('id', postId).single();
    await supabase.from('posts').update({like_count: (post?.like_count || 0) + 1}).eq('id', postId);
    return NextResponse.json({liked: true});
  }
}
