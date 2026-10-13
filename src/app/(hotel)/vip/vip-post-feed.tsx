'use client';

import {useState} from 'react';
import {motion, useReducedMotion} from 'framer-motion';
import {ModerationMenu} from '@/components/moderation';

export interface VipPost {
  id: string;
  author_id?: string | null;
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

interface Props {
  initialPosts: VipPost[];
  currentUserId: string;
}

function timeAgo(dateStr: string, now: number): string {
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function VipPostFeed({initialPosts, currentUserId}: Props) {
  const [posts, setPosts] = useState<VipPost[]>(initialPosts);
  // Blocked from the "…" menu: their posts leave the feed now (RLS keeps them out on the next load).
  const dropAuthor = (id: string) => setPosts((p) => p.filter((x) => x.author_id !== id));
  const [now] = useState(() => Date.now());
  const reduce = useReducedMotion();

  if (posts.length === 0) {
    return (
      <div className="vip-empty">
        <p className="ah-serif-i" style={{margin: 0, fontSize: 26, lineHeight: 1.1, color: 'var(--ah-text)'}}>
          The Inner Room is quiet tonight.
        </p>
        <p style={{margin: '8px 0 0', fontSize: 13, color: 'var(--ah-mute)'}}>Be the first to post.</p>
      </div>
    );
  }

  return (
    <div className="vip-feed">
      {posts.map((post, i) => {
        const name = post.author?.display_name ?? post.author?.username ?? 'Member';
        return (
          <motion.article
            key={post.id}
            initial={reduce ? false : {opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: i * 0.06, duration: 0.4}}
            className="vip-post"
          >
            {/* Author row */}
            <div className="vip-post-head">
              <span className="vip-avatar">
                {post.author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.author.avatar_url} alt={post.author.display_name ?? post.author.username} />
                ) : (
                  <span aria-hidden>{(post.author?.display_name ?? post.author?.username ?? '?')[0].toUpperCase()}</span>
                )}
              </span>
              <div style={{flex: 1, minWidth: 0}}>
                <p className="vip-post-name">{name}</p>
                {post.author?.vibe && <p className="vip-post-vibe">{post.author.vibe}</p>}
              </div>
              <time className="vip-post-time ah-num" dateTime={post.created_at} suppressHydrationWarning>{timeAgo(post.created_at, now)}</time>
              <ModerationMenu kind="vip_post" targetId={post.id} memberId={post.author_id} name={post.author?.display_name ?? post.author?.username}
                own={post.author_id === currentUserId} onBlocked={() => { if (post.author_id) dropAuthor(post.author_id); }} />
            </div>

            {/* Media */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="vip-post-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.media_urls[0]} alt="post media" />
              </div>
            )}

            {/* Content */}
            {post.content && <p className="vip-post-body">{post.content}</p>}

            {/* Footer */}
            <div className="vip-post-foot">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
              </svg>
              <span className="ah-num">
                {post.likes_count}
                <span className="sr-only"> likes</span>
              </span>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
