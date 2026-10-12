'use client';

import {useState} from 'react';
import {motion} from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {CallingCard} from './calling-card';

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  vibe: string | null;
}

export interface Post {
  id: string;
  content: string;
  media_urls: string[] | null;
  like_count: number;
  created_at: string;
  profiles: Profile | null;
  liked_by_me: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const TILT = [0.5, -0.4, 0.7, -0.6];

/** A full calling card: letterpress name, the note, photographs in deckled mounts, a wax-red heart. */
export function PostCard({post, userId, index}: {post: Post; userId: string | null; index: number}) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [count, setCount] = useState(post.like_count);
  const [liking, setLiking] = useState(false);

  const profile = post.profiles;

  const toggleLike = async () => {
    if (!userId || liking) return;
    setLiking(true);
    const prev = liked;
    setLiked(!prev);
    setCount(c => prev ? c - 1 : c + 1);
    try {
      await fetch(`/api/posts/${post.id}/like`, {method: 'POST'});
    } catch {
      setLiked(prev);
      setCount(c => prev ? c + 1 : c - 1);
    } finally {
      setLiking(false);
    }
  };

  return (
    <motion.div
      initial={{opacity: 0, y: 16}}
      animate={{opacity: 1, y: 0}}
      transition={{delay: index * 0.05, duration: 0.6, ease: [0.22, 0.8, 0.18, 1]}}
    >
      <CallingCard
        name={profile?.display_name || 'A Member'}
        nameHref={profile?.username ? `/profile?u=${profile.username}` : undefined}
        vibe={profile?.vibe}
        time={timeAgo(post.created_at)}
        avatar={profile?.avatar_url}
        tilt={TILT[index % TILT.length]}
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLike}
              disabled={!userId}
              aria-pressed={liked}
              aria-label={liked ? 'Unlike' : 'Like'}
              className={`flex min-h-11 items-center gap-1.5 font-label text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 ${
                liked ? 'text-[var(--oxblood-600)]' : 'text-[var(--ivory-ink-soft)] hover:text-[var(--oxblood-600)]'
              } ${!userId ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-[18px] leading-none">{liked ? '♥' : '♡'}</span>
              <span>{count > 0 ? count : ''}</span>
            </button>
            {!userId && (
              <Link href="/signup" className="ml-auto inline-flex min-h-11 items-center font-label text-[9px] uppercase tracking-[0.2em] text-[var(--ivory-ink-soft)] transition-colors hover:text-[var(--ivory-ink)]">
                Join to like →
              </Link>
            )}
          </div>
        }
      >
        <p className="font-body text-[17px] italic leading-relaxed text-[var(--ivory-ink)]">{post.content}</p>

        {/* Media — photographs in mounts */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className={`mt-3 grid gap-2 ${post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.media_urls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden bg-[var(--ivory-2)] p-1.5 shadow-[0_2px_6px_rgb(0_0_0/0.35)]">
                <div className="relative h-full w-full overflow-hidden">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
                {i === 3 && post.media_urls!.length > 4 && (
                  <div className="absolute inset-1.5 flex items-center justify-center bg-[rgb(30_20_12/0.7)]">
                    <span className="font-display text-xl text-[var(--ivory)]">+{post.media_urls!.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CallingCard>
    </motion.div>
  );
}
