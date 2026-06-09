'use client';

import {useState} from 'react';
import {motion} from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

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

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const VIBE_COLORS: Record<string, string> = {
  electric: '#FF4D7D',
  warm: '#FFA96B',
  magical: '#C9A961',
  peaceful: '#7DC9A9',
  wild: '#E8C87A',
  chill: '#69C9D0',
};

export function PostCard({post, userId, index}: {post: Post; userId: string | null; index: number}) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [count, setCount] = useState(post.like_count);
  const [liking, setLiking] = useState(false);

  const profile = post.profiles;
  const vibeColor = VIBE_COLORS[profile?.vibe || ''] || '#C9A961';

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
      transition={{delay: index * 0.05, duration: 0.4}}
      className="border border-cream/6 bg-ink/60 backdrop-blur-sm hover:border-brass/20 transition-all duration-500"
    >
      <div className="p-5">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <Link href={profile?.username ? `/profile?u=${profile.username}` : '#'}>
            {profile?.avatar_url ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border border-brass/20">
                <Image src={profile.avatar_url} alt="" width={40} height={40} className="object-cover w-full h-full" />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center border"
                style={{borderColor: `${vibeColor}40`, color: vibeColor, boxShadow: `0 0 12px ${vibeColor}10`}}
              >
                <span className="font-label text-[10px] tracking-wider">{initials(profile?.display_name)}</span>
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm text-cream/80 truncate">
              {profile?.display_name || 'A Member'}
            </p>
            {profile?.vibe && (
              <p className="font-label text-[8px] tracking-[0.3em] uppercase" style={{color: `${vibeColor}80`}}>
                {profile.vibe}
              </p>
            )}
          </div>
          <span className="font-mono text-[10px] text-cream/15 shrink-0">{timeAgo(post.created_at)}</span>
        </div>

        {/* Content */}
        <p className="font-body text-sm text-cream/70 leading-relaxed mb-4 italic">
          {post.content}
        </p>

        {/* Media grid */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className={`grid gap-1.5 mb-4 ${post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.media_urls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden bg-ink border border-brass/10">
                <Image src={url} alt="" fill className="object-cover" />
                {i === 3 && post.media_urls!.length > 4 && (
                  <div className="absolute inset-0 bg-ink/70 flex items-center justify-center">
                    <span className="font-display text-xl text-cream/60">+{post.media_urls!.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Like row */}
        <div className="flex items-center gap-2 pt-3 border-t border-cream/5">
          <button
            onClick={toggleLike}
            disabled={!userId}
            className={`flex items-center gap-1.5 font-label text-[10px] tracking-[0.2em] uppercase transition-all duration-300 ${
              liked ? 'text-neon-pink' : 'text-cream/20 hover:text-cream/40'
            } ${!userId ? 'cursor-default' : 'cursor-pointer'}`}
            style={liked ? {textShadow: '0 0 8px rgba(255,77,125,0.5)'} : {}}
          >
            <span className="text-sm">{liked ? '♥' : '♡'}</span>
            <span>{count > 0 ? count : ''}</span>
          </button>
          {!userId && (
            <Link href="/signup" className="font-label text-[9px] tracking-[0.2em] text-brass/20 hover:text-brass/50 uppercase transition-colors ml-auto">
              Join to like →
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
