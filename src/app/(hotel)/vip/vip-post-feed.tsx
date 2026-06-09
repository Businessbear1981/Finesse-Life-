'use client';

import {useState} from 'react';
import {motion} from 'framer-motion';

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

interface Props {
  initialPosts: VipPost[];
  currentUserId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function VipPostFeed({initialPosts}: Props) {
  const [posts] = useState<VipPost[]>(initialPosts);

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p
          className="font-body text-sm italic mb-2"
          style={{color: 'rgba(244,232,208,0.2)'}}
        >
          the inner room is quiet tonight
        </p>
        <p
          className="font-label text-[8px] tracking-[0.3em] uppercase"
          style={{color: 'rgba(201,169,97,0.15)'}}
        >
          be the first to post
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{opacity: 0, y: 12}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: i * 0.06, duration: 0.4}}
          className="group"
          style={{
            border: '1px solid rgba(201,169,97,0.1)',
            background:
              'linear-gradient(135deg, rgba(74,25,34,0.08) 0%, rgba(6,2,3,0.85) 100%)',
          }}
        >
          {/* Author row */}
          <div
            className="flex items-center gap-3 px-4 pt-4 pb-3"
            style={{borderBottom: '1px solid rgba(201,169,97,0.06)'}}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
              style={{
                border: '1px solid rgba(201,169,97,0.25)',
                background: 'rgba(20,10,12,0.9)',
              }}
            >
              {post.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatar_url}
                  alt={post.author.display_name ?? post.author.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="font-label text-[10px]"
                  style={{color: 'rgba(201,169,97,0.6)'}}
                >
                  {(post.author?.display_name ?? post.author?.username ?? '?')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-display text-sm tracking-wide truncate"
                style={{color: '#E8C87A'}}
              >
                {post.author?.display_name ?? post.author?.username ?? 'Member'}
              </p>
              {post.author?.vibe && (
                <p
                  className="font-label text-[8px] tracking-[0.25em] uppercase"
                  style={{color: 'rgba(201,169,97,0.3)'}}
                >
                  {post.author.vibe}
                </p>
              )}
            </div>
            <span
              className="font-mono text-[9px] shrink-0"
              style={{color: 'rgba(244,232,208,0.15)'}}
            >
              {timeAgo(post.created_at)}
            </span>
          </div>

          {/* Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="relative w-full aspect-video overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.media_urls[0]}
                alt="post media"
                className="w-full h-full object-cover opacity-85 group-hover:opacity-95 transition-opacity duration-500"
              />
            </div>
          )}

          {/* Content */}
          {post.content && (
            <div className="px-4 py-3">
              <p
                className="font-body text-sm leading-relaxed"
                style={{color: 'rgba(244,232,208,0.65)'}}
              >
                {post.content}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 pb-4 pt-1">
            <div className="flex items-center gap-1.5">
              <span
                className="font-label text-[9px] tracking-wider"
                style={{color: 'rgba(201,169,97,0.3)'}}
              >
                ♥
              </span>
              <span
                className="font-mono text-[9px]"
                style={{color: 'rgba(244,232,208,0.2)'}}
              >
                {post.likes_count}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
