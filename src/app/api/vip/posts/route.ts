import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {reply, sessionMember, unauthorized} from '@/app/api/billing/_member';
import {checkMediaUrls, screenText} from '@/lib/moderation';
import {contentRejected, postingGate} from '@/lib/moderation-server';
import {r2PublicBase} from '@/lib/r2';

export const dynamic = 'force-dynamic';

const body = z.object({
  content: z.string().max(4000),
  media_urls: z.array(z.unknown()).max(10).optional().nullable(),
});

// POST /api/vip/posts {content, media_urls?} — the VIP feed's only write path (web fab + app). Same
// safety as the Lounge: house rules accepted, text filter, own-storage media. Inserted as the member, so
// vip_posts_vip_insert still decides who is a VIP. → 201 {post}
export async function POST(req: Request) {
  const m = await sessionMember();
  if (!m) return unauthorized();
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const content = parsed.data.content.trim();
  if (!content) return reply({error: 'empty', message: 'Write something first.'}, 400);
  if (content.length > 1000) return reply({error: 'too_long', message: 'Keep it under 1,000 characters. Nothing was posted.'}, 400);

  const gate = await postingGate(m.supabase, m.userId);
  if (gate) return gate;
  const verdict = screenText(content, 'post');
  if (verdict.verdict === 'reject') return contentRejected(verdict);
  const media = checkMediaUrls(parsed.data.media_urls, r2PublicBase(), m.userId);
  if (!media.ok) return reply({error: 'bad_media', message: media.message}, 400);

  const {data, error} = await m.supabase.from('vip_posts')
    .insert({author_id: m.userId, content, media_urls: media.urls})
    .select('id, content, media_urls, likes_count, created_at')
    .single();
  if (error) {
    if (error.code === '42501') {
      // Either not an active VIP (vip_posts_vip_insert) or the terms policy; the gate already covered terms.
      return reply({error: 'not_vip', message: 'Only VIP key holders can post in the inner circle. Nothing was posted.'}, 403);
    }
    console.error('[vip/posts] insert failed', error.code);
    return reply({error: 'unavailable', message: 'Something went wrong on the house side. Nothing was posted.'}, 500);
  }
  return reply({post: data}, 201);
}
