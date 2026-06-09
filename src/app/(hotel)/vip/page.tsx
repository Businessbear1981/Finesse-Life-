import {redirect} from 'next/navigation';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {VipPostFeed} from './vip-post-feed';
import {VipPostFabClient} from './vip-post-fab';

const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'FinesseVIPBot';

interface VipPost {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  likes_count: number;
  created_at: string;
  author: {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
    vibe: string | null;
  } | null;
}

export default async function VipPage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify VIP — middleware handles redirect but double-check server-side
  const {data: profile} = await supabase
    .from('profiles')
    .select('is_vip, vip_expires_at, username')
    .eq('id', user.id)
    .single();

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
    <div
      className="min-h-screen relative overflow-hidden"
      style={{background: '#060203'}}
    >
      {/* Deep VIP ambient — richer glow than lobby */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(201,169,97,0.1) 0%, rgba(74,25,34,0.06) 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 140% 60% at 50% 100%, rgba(74,25,34,0.12) 0%, transparent 60%)',
          }}
        />
        {/* Vertical gold columns */}
        <div
          className="absolute left-[8%] top-0 bottom-0 w-px"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(201,169,97,0.12) 20%, rgba(201,169,97,0.06) 80%, transparent)',
          }}
        />
        <div
          className="absolute right-[8%] top-0 bottom-0 w-px"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(201,169,97,0.12) 20%, rgba(201,169,97,0.06) 80%, transparent)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-24">
        {/* ── HEADER ── */}
        <div className="text-center mb-10">
          {/* Ornament */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
              <div
                className="w-2 h-2 rotate-45 border"
                style={{
                  borderColor: 'rgba(201,169,97,0.5)',
                  boxShadow: '0 0 8px rgba(201,169,97,0.3)',
                }}
              />
              <span
                className="font-label text-[8px] tracking-[0.6em] uppercase"
                style={{color: 'rgba(201,169,97,0.35)'}}
              >
                private
              </span>
              <div
                className="w-2 h-2 rotate-45 border"
                style={{
                  borderColor: 'rgba(201,169,97,0.5)',
                  boxShadow: '0 0 8px rgba(201,169,97,0.3)',
                }}
              />
              <div className="w-8 h-px" style={{background: 'rgba(201,169,97,0.2)'}} />
            </div>
          </div>

          <h1
            className="font-display text-4xl italic tracking-[0.25em] mb-2"
            style={{
              color: '#E8C87A',
              textShadow:
                '0 0 40px rgba(201,169,97,0.25), 0 0 80px rgba(201,169,97,0.08)',
            }}
          >
            THE INNER ROOM
          </h1>

          {/* VIP badge */}
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 font-label text-[9px] tracking-[0.3em] uppercase"
            style={{
              background:
                'linear-gradient(135deg, rgba(201,169,97,0.15) 0%, rgba(74,25,34,0.1) 100%)',
              border: '1px solid rgba(201,169,97,0.35)',
              color: '#C9A961',
              boxShadow: '0 0 15px rgba(201,169,97,0.08)',
            }}
          >
            <span>◆</span>
            <span>VIP Member</span>
          </span>
        </div>

        {/* ── TELEGRAM SECTION ── */}
        <div
          className="p-6 mb-8 text-center"
          style={{
            border: '1px solid rgba(201,169,97,0.2)',
            background:
              'linear-gradient(135deg, rgba(74,25,34,0.12) 0%, rgba(6,2,3,0.9) 100%)',
            boxShadow:
              '0 0 40px rgba(201,169,97,0.04), inset 0 0 20px rgba(0,0,0,0.3)',
          }}
        >
          <p
            className="font-label text-[9px] tracking-[0.4em] uppercase mb-3"
            style={{color: 'rgba(201,169,97,0.3)'}}
          >
            Private Channel
          </p>
          <p
            className="font-body text-base italic mb-5"
            style={{color: 'rgba(244,232,208,0.5)'}}
          >
            Your private channel awaits.
          </p>

          <a
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 font-label text-[10px] tracking-[0.35em] uppercase transition-all duration-300 group"
            style={{
              background: 'linear-gradient(135deg, #C9A961, #E8C87A)',
              color: '#06020A',
              boxShadow: '0 0 20px rgba(201,169,97,0.2)',
            }}
          >
            <span>OPEN VIP CHANNEL</span>
            <span className="group-hover:translate-x-1 transition-transform duration-300">
              →
            </span>
          </a>

          <p
            className="font-body text-xs italic mt-4"
            style={{color: 'rgba(244,232,208,0.2)'}}
          >
            Text · Voice · Video · All encrypted
          </p>
        </div>

        {/* ── DIVIDER ── */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex-1 h-px"
            style={{background: 'rgba(201,169,97,0.08)'}}
          />
          <span
            className="font-label text-[8px] tracking-[0.4em] uppercase"
            style={{color: 'rgba(201,169,97,0.2)'}}
          >
            inner feed
          </span>
          <div
            className="flex-1 h-px"
            style={{background: 'rgba(201,169,97,0.08)'}}
          />
        </div>

        {/* ── VIP POST FEED ── */}
        <VipPostFeed initialPosts={posts} currentUserId={user.id} />

        {/* Lobby link */}
        <div className="text-center mt-10">
          <Link
            href="/lobby"
            className="font-body text-sm italic transition-colors"
            style={{color: 'rgba(244,232,208,0.15)'}}
          >
            return to the lobby
          </Link>
        </div>
      </div>

      {/* ── FAB: + Post ── */}
      <VipPostFabClient />
    </div>
  );
}
