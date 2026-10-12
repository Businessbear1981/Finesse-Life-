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

/** A full post: the note, photos, and a heart (After Hours). */
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
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLike}
              disabled={!userId}
              aria-pressed={liked}
              aria-label={liked ? 'Unlike' : 'Like'}
              className="ah-focus"
              style={{display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 4px', border: 0, background: 'none', fontSize: 14, fontWeight: 600, color: liked ? '#ff5c8a' : 'var(--ah-mute)', cursor: userId ? 'pointer' : 'default'}}
            >
              <span style={{fontSize: 20, lineHeight: 1}}>{liked ? '♥' : '♡'}</span>
              <span className="ah-num">{count > 0 ? count : ''}</span>
            </button>
            {!userId && (
              <Link href="/signup" style={{marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 13, color: 'var(--ah-rose)', textDecoration: 'none'}}>
                Join to like →
              </Link>
            )}
          </div>
        }
      >
        <p style={{margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--ah-text)'}}>{post.content}</p>

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div style={{marginTop: 12, display: 'grid', gap: 6, gridTemplateColumns: post.media_urls.length === 1 ? '1fr' : '1fr 1fr'}}>
            {post.media_urls.slice(0, 4).map((url, i) => (
              <div key={i} style={{position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 14, background: 'var(--ah-ink-3)'}}>
                <Image src={url} alt="" fill className="object-cover" />
                {i === 3 && post.media_urls!.length > 4 && (
                  <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.6)'}}>
                    <span style={{fontSize: 22, fontWeight: 700}}>+{post.media_urls!.length - 4}</span>
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
