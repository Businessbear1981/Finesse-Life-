'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimationFrame } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PostCard, type Post } from './post-card';
import { PostComposer } from './post-composer';

// ─── Constants ────────────────────────────────────────────────────────────────

const VIBE_COLORS: Record<string, string> = {
  magical: '#C9A961',
  warm: '#FFA96B',
  electric: '#FF4D7D',
  peaceful: '#7DC9A9',
  wild: '#E8C87A',
  chill: '#69C9D0',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  vibe: string | null;
  city: string | null;
  interests: string[] | null;
  check_in: string | null;
}

interface ScoredMember extends Member {
  score: number;
  borderOpacity: number;
  glowStrength: 'strong' | 'medium' | 'subtle';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function compatScore(member: Member, myVibe: string | null, myCity?: string | null, myInterests?: string[]): number {
  // Deterministic base from member ID (no random — scores stay stable across renders)
  const idHash = member.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let score = 42 + (idHash % 20); // stable 42-61 per member

  if (member.vibe && member.vibe === myVibe) score += 22; // vibe match
  if (member.vibe) score += 5;                            // has any vibe
  if (myCity && member.city && member.city === myCity) score += 10; // same city
  if (myInterests?.length && member.interests?.length) {
    const overlap = myInterests.filter(i => member.interests?.includes(i)).length;
    score += Math.min(overlap * 4, 12); // up to +12 for shared interests
  }
  if (member.check_in) score += 3; // active check-in = engaged member

  return Math.min(score, 99);
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Chandelier pulse (animated radial) ───────────────────────────────────────

function ChandelierSpot() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useRef(0);

  useAnimationFrame((time) => {
    t.current = time;
    if (!ref.current) return;
    const pulse = 0.5 + 0.5 * Math.sin(time / 2200);
    const opacity = 0.04 + pulse * 0.04;
    ref.current.style.opacity = String(opacity);
  });

  return (
    <div
      ref={ref}
      className="absolute"
      style={{
        top: '-60px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '500px',
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(201,169,97,0.55) 0%, rgba(255,169,107,0.2) 30%, transparent 70%)',
        pointerEvents: 'none',
      }}
    />
  );
}

// ─── Ambient background spotlights ────────────────────────────────────────────

function AmbientLights() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Ceiling chandelier — animated */}
      <ChandelierSpot />

      {/* Top-left warm fill */}
      <div
        className="absolute"
        style={{
          top: '-40px',
          left: '-80px',
          width: '420px',
          height: '420px',
          background:
            'radial-gradient(circle at 30% 20%, rgba(255,169,107,0.06) 0%, transparent 65%)',
        }}
      />

      {/* Top-right pink */}
      <div
        className="absolute"
        style={{
          top: '-20px',
          right: '-60px',
          width: '380px',
          height: '380px',
          background:
            'radial-gradient(circle at 70% 20%, rgba(255,77,125,0.04) 0%, transparent 60%)',
        }}
      />

      {/* Mid-floor brass wash */}
      <div
        className="absolute"
        style={{
          top: '38%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '300px',
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(201,169,97,0.03) 0%, transparent 70%)',
        }}
      />

      {/* Bottom-center deep maroon vignette */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/2"
        style={{
          background:
            'linear-gradient(to top, rgba(60,0,20,0.18) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}

// ─── Member card ──────────────────────────────────────────────────────────────

function MemberCard({
  member,
  index,
}: {
  member: ScoredMember;
  index: number;
}) {
  const vibeColor = VIBE_COLORS[member.vibe || ''] || '#C9A961';

  // Glow shadow based on strength
  const glowMap = {
    strong: `0 0 22px ${vibeColor}55, 0 0 8px ${vibeColor}33`,
    medium: `0 0 14px ${vibeColor}33, 0 0 4px ${vibeColor}22`,
    subtle: `0 0 8px ${vibeColor}18`,
  };

  // Background saturation: higher score = slightly warmer
  const bgSaturation =
    member.score > 80
      ? 'rgba(30,10,16,0.75)'
      : member.score > 60
      ? 'rgba(20,8,12,0.65)'
      : 'rgba(10,4,6,0.55)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + index * 0.07, duration: 0.45, ease: 'easeOut' }}
    >
      <Link
        href={member.username ? `/entourage?u=${member.username}` : '/entourage'}
        className="block group"
      >
        <div
          className="relative overflow-hidden transition-all duration-500"
          style={{
            background: bgSaturation,
            backdropFilter: 'blur(12px)',
            border: `1px solid rgba(201,169,97,${member.borderOpacity})`,
            boxShadow:
              member.score > 70
                ? `0 0 30px rgba(201,169,97,${member.borderOpacity * 0.6}), inset 0 1px 0 rgba(232,200,122,0.06)`
                : `inset 0 1px 0 rgba(232,200,122,0.04)`,
          }}
        >
          {/* Top-corner score pip */}
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <Zap
              size={8}
              style={{ color: vibeColor, opacity: member.score > 75 ? 0.9 : 0.4 }}
            />
            <span
              className="font-mono text-[9px]"
              style={{ color: `${vibeColor}${member.score > 75 ? 'cc' : '55'}` }}
            >
              {member.score}%
            </span>
          </div>

          <div className="p-5">
            {/* Avatar */}
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0">
                {member.avatar_url ? (
                  <div
                    className="w-13 h-13 rounded-full overflow-hidden"
                    style={{
                      boxShadow: glowMap[member.glowStrength],
                      border: `2px solid ${vibeColor}${
                        member.glowStrength === 'strong'
                          ? '88'
                          : member.glowStrength === 'medium'
                          ? '55'
                          : '30'
                      }`,
                      width: '52px',
                      height: '52px',
                    }}
                  >
                    <Image
                      src={member.avatar_url}
                      alt={member.display_name || ''}
                      width={52}
                      height={52}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center rounded-full font-label tracking-wider"
                    style={{
                      width: '52px',
                      height: '52px',
                      border: `2px solid ${vibeColor}${
                        member.glowStrength === 'strong'
                          ? '88'
                          : member.glowStrength === 'medium'
                          ? '55'
                          : '30'
                      }`,
                      color: vibeColor,
                      fontSize: '13px',
                      boxShadow: glowMap[member.glowStrength],
                      background: `radial-gradient(circle at center, ${vibeColor}10 0%, transparent 70%)`,
                    }}
                  >
                    {initials(member.display_name)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <p className="font-display text-base text-cream/85 truncate leading-tight group-hover:text-cream transition-colors duration-300">
                  {member.display_name || 'A Member'}
                </p>
                {member.username && (
                  <p className="font-mono text-[10px] text-cream/30 truncate mt-0.5">
                    @{member.username}
                  </p>
                )}
              </div>
            </div>

            {/* Vibe badge */}
            {member.vibe && (
              <div className="mb-4">
                <span
                  className="inline-block px-2 py-0.5 font-label text-[8px] tracking-[0.35em] uppercase rounded-sm"
                  style={{
                    background: `${vibeColor}18`,
                    color: vibeColor,
                    border: `1px solid ${vibeColor}30`,
                  }}
                >
                  {member.vibe}
                </span>
              </div>
            )}

            {/* Compatibility bar */}
            <div>
              <div
                className="w-full h-0.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(201,169,97,0.1)' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${member.score}%` }}
                  transition={{ delay: 0.4 + index * 0.07, duration: 0.7, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${vibeColor}88, ${vibeColor})`,
                    boxShadow: `0 0 6px ${vibeColor}55`,
                  }}
                />
              </div>
              <p
                className="font-mono text-[9px] mt-1.5"
                style={{ color: `${vibeColor}80` }}
              >
                {member.score}% match
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Activity feed post row (lightweight, not full PostCard) ──────────────────

function MomentRow({ post, index }: { post: Post; index: number }) {
  const profile = post.profiles;
  const vibeColor = VIBE_COLORS[profile?.vibe || ''] || '#C9A961';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + index * 0.06, duration: 0.4 }}
      className="flex gap-3 py-4 border-b last:border-0"
      style={{ borderColor: 'rgba(201,169,97,0.07)' }}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {profile?.avatar_url ? (
          <div
            className="w-9 h-9 rounded-full overflow-hidden border"
            style={{ borderColor: `${vibeColor}30` }}
          >
            <Image
              src={profile.avatar_url}
              alt={profile.display_name || ''}
              width={36}
              height={36}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center border font-label"
            style={{
              borderColor: `${vibeColor}30`,
              color: vibeColor,
              fontSize: '9px',
              letterSpacing: '0.1em',
            }}
          >
            {initials(profile?.display_name)}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-display text-xs text-cream/75 truncate">
            {profile?.display_name || 'A Member'}
          </span>
          {profile?.vibe && (
            <span
              className="font-label text-[8px] tracking-[0.25em] uppercase shrink-0"
              style={{ color: `${vibeColor}70` }}
            >
              {profile.vibe}
            </span>
          )}
          <span className="font-mono text-[9px] text-cream/20 shrink-0 ml-auto">
            {timeAgo(post.created_at)}
          </span>
        </div>
        <p className="font-body text-sm text-cream/55 leading-relaxed italic line-clamp-3">
          {post.content}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoungePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [myVibe,      setMyVibe]      = useState<string | null>(null);
  const [myCity,      setMyCity]      = useState<string | null>(null);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [members, setMembers]         = useState<ScoredMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [posts, setPosts]             = useState<Post[]>([]);
  const [postsLoading, setPostsLoading]     = useState(true);

  // ── Auth + my profile
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id || null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('vibe, city, interests')
          .eq('id', uid)
          .single();
        setMyVibe(profile?.vibe || null);
        setMyCity(profile?.city || null);
        setMyInterests(profile?.interests || []);
      }
    });
  }, []);

  // ── Fetch members
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, vibe, city, interests, check_in')
        .limit(20);

      if (!data) return;

      // Filter current user out, score + sort by deterministic compat score
      const scored: ScoredMember[] = (data as Member[])
        .filter((m) => m.id !== userId)
        .map((m) => {
          const score = compatScore(m, myVibe, myCity, myInterests);
          const borderOpacity = 0.05 + (score / 100) * 0.35;
          const glowStrength: ScoredMember['glowStrength'] =
            score > 80 ? 'strong' : score > 60 ? 'medium' : 'subtle';
          return { ...m, score, borderOpacity, glowStrength };
        })
        .sort((a, b) => b.score - a.score);

      setMembers(scored);
    } finally {
      setMembersLoading(false);
    }
  }, [userId, myVibe, myCity, myInterests]);

  // ── Fetch posts
  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const res = await fetch('/api/posts?page=1');
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchPosts();
  }, [fetchMembers, fetchPosts]);

  const handleNewPost = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: '#0A0406' }}
    >
      {/* ── Ambient lights */}
      <AmbientLights />

      {/* ── Header */}
      <header className="relative z-10 pt-14 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          {/* Spotlight halo behind title */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-6 pointer-events-none"
            style={{
              width: '320px',
              height: '160px',
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(201,169,97,0.12) 0%, transparent 70%)',
            }}
          />

          <h1
            className="font-display text-5xl md:text-6xl tracking-[0.3em] uppercase relative"
            style={{
              color: '#E8C87A',
              textShadow:
                '0 0 40px rgba(201,169,97,0.35), 0 0 80px rgba(201,169,97,0.12)',
            }}
          >
            The Lounge
          </h1>

          <div className="flex items-center justify-center gap-2 mt-3">
            <Users size={10} className="opacity-30" style={{ color: '#C9A961' }} />
            <p
              className="font-label text-[9px] tracking-[0.55em] uppercase"
              style={{ color: 'rgba(201,169,97,0.35)' }}
            >
              members on the floor
            </p>
          </div>

          {/* Divider line */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div
              className="h-px w-16"
              style={{
                background:
                  'linear-gradient(to right, transparent, rgba(201,169,97,0.25))',
              }}
            />
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: 'rgba(201,169,97,0.4)' }}
            />
            <div
              className="h-px w-16"
              style={{
                background:
                  'linear-gradient(to left, transparent, rgba(201,169,97,0.25))',
              }}
            />
          </div>
        </motion.div>
      </header>

      {/* ── Main content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-20">

        {/* ═══ THE FLOOR ═══════════════════════════════════════════════════════ */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-7">
            <div
              className="h-px flex-1"
              style={{ background: 'rgba(201,169,97,0.12)' }}
            />
            <h2
              className="font-label text-[9px] tracking-[0.5em] uppercase"
              style={{ color: 'rgba(201,169,97,0.4)' }}
            >
              {membersLoading
                ? 'scanning the floor…'
                : members.length > 0
                ? `${members.length} on the floor`
                : 'the floor is empty'}
            </h2>
            <div
              className="h-px flex-1"
              style={{ background: 'rgba(201,169,97,0.12)' }}
            />
          </div>

          {membersLoading ? (
            // Skeleton
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    background: 'rgba(20,8,12,0.6)',
                    border: '1px solid rgba(201,169,97,0.08)',
                    height: '148px',
                  }}
                />
              ))}
            </div>
          ) : members.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {members.map((member, i) => (
                <MemberCard key={member.id} member={member} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p
                className="font-body text-sm italic"
                style={{ color: 'rgba(244,232,208,0.2)' }}
              >
                No one on the floor yet.
              </p>
              {!userId && (
                <Link
                  href="/signup"
                  className="mt-4 inline-block font-label text-[10px] tracking-[0.35em] uppercase transition-colors"
                  style={{ color: 'rgba(201,169,97,0.35)' }}
                >
                  Join Finesse →
                </Link>
              )}
            </div>
          )}
        </section>

        {/* ═══ MOMENTS FEED ════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-7">
            <div
              className="h-px flex-1"
              style={{ background: 'rgba(201,169,97,0.12)' }}
            />
            <h2
              className="font-label text-[9px] tracking-[0.5em] uppercase"
              style={{ color: 'rgba(201,169,97,0.4)' }}
            >
              Moments
            </h2>
            <div
              className="h-px flex-1"
              style={{ background: 'rgba(201,169,97,0.12)' }}
            />
          </div>

          {/* Composer (auth only) */}
          {userId && (
            <div className="mb-6">
              <PostComposer userId={userId} onPost={handleNewPost} />
            </div>
          )}

          {postsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 py-4 border-b animate-pulse"
                  style={{ borderColor: 'rgba(201,169,97,0.07)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full shrink-0"
                    style={{ background: 'rgba(201,169,97,0.08)' }}
                  />
                  <div className="flex-1 space-y-2 pt-1">
                    <div
                      className="h-2.5 w-24 rounded"
                      style={{ background: 'rgba(244,232,208,0.05)' }}
                    />
                    <div
                      className="h-2 w-full rounded"
                      style={{ background: 'rgba(244,232,208,0.04)' }}
                    />
                    <div
                      className="h-2 w-3/4 rounded"
                      style={{ background: 'rgba(244,232,208,0.04)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <AnimatePresence>
              <div>
                {/* Lightweight moment rows for atmosphere */}
                {posts.slice(0, 8).map((post, i) => (
                  <MomentRow key={post.id} post={post} index={i} />
                ))}

                {/* Full PostCards for the rest */}
                {posts.length > 8 && (
                  <div className="space-y-4 mt-6">
                    {posts.slice(8).map((post, i) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        userId={userId}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>
            </AnimatePresence>
          ) : (
            <div className="text-center py-16">
              <p
                className="font-body text-sm italic"
                style={{ color: 'rgba(244,232,208,0.2)' }}
              >
                No moments yet. Be the first.
              </p>
              {!userId && (
                <Link
                  href="/signup"
                  className="mt-4 inline-block font-label text-[10px] tracking-[0.35em] uppercase transition-colors"
                  style={{ color: 'rgba(201,169,97,0.35)' }}
                >
                  Join to post →
                </Link>
              )}
            </div>
          )}
        </section>

        {/* ── Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-16 font-body text-xs italic"
          style={{ color: 'rgba(244,232,208,0.12)' }}
        >
          the music is low. the company is right.
        </motion.p>

        <div className="text-center mt-6">
          <Link
            href="/lobby"
            className="font-body text-sm transition-colors"
            style={{ color: 'rgba(244,232,208,0.2)' }}
          >
            return to the lobby
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
