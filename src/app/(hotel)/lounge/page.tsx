'use client';

import {useState, useEffect, useCallback} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';
import {PostCard, type Post} from './post-card';
import {PostComposer} from './post-composer';

const MOOD_COLORS: Record<string, string> = {
  magical: '#C9A961',
  warm: '#FFA96B',
  electric: '#FF4D7D',
  peaceful: '#7DC9A9',
  wild: '#E8C87A',
  chill: '#69C9D0',
};

interface Member {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  vibe: string | null;
  username: string | null;
  last_posted: string;
}

export default function LoungePage() {
  const [tab, setTab] = useState<'floor' | 'feed'>('floor');
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({data}) => setUserId(data.user?.id || null));
  }, []);

  // Fetch posts for activity feed
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

  // Fetch recent members for floor ("who's here")
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const supabase = createClient();
      // Get distinct recent posters (last 48h), joined with profiles
      const {data} = await supabase
        .from('posts')
        .select('author_id, created_at, profiles!author_id(id, display_name, username, avatar_url, vibe)')
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order('created_at', {ascending: false})
        .limit(50);

      if (!data) return;

      // Deduplicate by author_id, keep most recent post time
      const seen = new Set<string>();
      const unique: Member[] = [];
      for (const row of data as any[]) {
        if (!row.author_id || seen.has(row.author_id)) continue;
        seen.add(row.author_id);
        const p = row.profiles;
        unique.push({
          id: row.author_id,
          display_name: p?.display_name || null,
          avatar_url: p?.avatar_url || null,
          vibe: p?.vibe || null,
          username: p?.username || null,
          last_posted: row.created_at,
        });
        if (unique.length >= 8) break;
      }
      setMembers(unique);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchMembers();
  }, [fetchPosts, fetchMembers]);

  const handleNewPost = (post: Post) => {
    setPosts(prev => [post, ...prev]);
    // Refresh members too since this user is now "here"
    fetchMembers();
  };

  function initials(name: string | null | undefined) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.6}}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Jazz club ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[300px] h-[300px]"
          style={{background: 'radial-gradient(circle, rgba(255,169,107,0.08) 0%, transparent 60%)'}} />
        <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px]"
          style={{background: 'radial-gradient(circle, rgba(255,77,125,0.05) 0%, transparent 60%)'}} />
        <div className="absolute bottom-1/4 left-1/3 w-[200px] h-[200px]"
          style={{background: 'radial-gradient(circle, rgba(201,169,97,0.06) 0%, transparent 60%)', animation: 'chandelier-pulse 4s ease-in-out infinite'}} />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-6 relative z-10">
        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <span className="text-4xl mb-4 inline-block">🎷</span>
          <h1 className="font-display text-4xl text-lamp tracking-[0.2em]">the lounge</h1>
          <p className="font-label text-[10px] tracking-[0.5em] text-cream/20 uppercase mt-2">social</p>
        </motion.div>
      </header>

      <div className="max-w-3xl mx-auto px-4 relative z-10">
        {/* Tab toggle */}
        <div className="flex justify-center gap-4 mb-10">
          {(['floor', 'feed'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 font-label text-[10px] tracking-[0.3em] uppercase transition-all duration-300 ${
                tab === t ? 'text-ink bg-lamp' : 'text-cream/30 border border-cream/8 hover:border-lamp/30'
              }`}
            >
              {t === 'floor' ? "who's here" : 'moments'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'floor' ? (
            <motion.div key="floor" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}} transition={{duration: 0.3}}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-lamp/15" />
                <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/40 uppercase">
                  {membersLoading ? 'scanning the floor...' : members.length > 0 ? `recent — ${members.length} here` : 'the lounge is quiet'}
                </h2>
                <div className="h-px flex-1 bg-lamp/15" />
              </div>

              {membersLoading ? (
                <div className="grid grid-cols-2 gap-5">
                  {Array.from({length: 4}).map((_, i) => (
                    <div key={i} className="brass-border p-6 bg-ink/30 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brass/10" />
                        <div className="space-y-2">
                          <div className="w-20 h-3 bg-cream/5 rounded" />
                          <div className="w-12 h-2 bg-cream/5 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : members.length > 0 ? (
                <div className="grid grid-cols-2 gap-5">
                  {members.map((member, i) => {
                    const vibeColor = MOOD_COLORS[member.vibe || ''] || '#C9A961';
                    return (
                      <motion.div key={member.id}
                        initial={{opacity: 0, y: 15}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3 + i * 0.08}}
                        className="brass-border p-6 bg-ink/50 backdrop-blur-sm hover:bg-oxblood/15 transition-all duration-500"
                      >
                        <Link href={member.username ? `/profile?u=${member.username}` : '#'} className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center border text-sm font-label tracking-wider"
                            style={{borderColor: `${vibeColor}60`, color: vibeColor, boxShadow: `0 0 20px ${vibeColor}15`}}
                          >
                            {initials(member.display_name)}
                          </div>
                          <div>
                            <p className="font-display text-lg text-cream/80 tracking-wide">{member.display_name || 'A Member'}</p>
                            {member.vibe && (
                              <p className="font-label text-[9px] tracking-[0.3em] uppercase" style={{color: `${vibeColor}80`}}>
                                {member.vibe}
                              </p>
                            )}
                          </div>
                        </Link>
                        <p className="font-mono text-[10px] text-cream/15 mt-3">{timeAgo(member.last_posted)}</p>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="font-body text-sm text-cream/20 italic">Be the first to post a moment.</p>
                  {!userId && (
                    <Link href="/signup" className="mt-4 inline-block font-label text-[10px] tracking-[0.3em] uppercase text-brass/40 hover:text-brass transition-colors">
                      Join Finesse →
                    </Link>
                  )}
                </div>
              )}

              <motion.p initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.8}}
                className="text-center mt-10 font-body text-xs text-cream/15 italic"
              >
                the music is low. the company is right.
              </motion.p>
            </motion.div>
          ) : (
            <motion.div key="feed" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}} transition={{duration: 0.3}}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-lamp/15" />
                <h2 className="font-label text-[10px] tracking-[0.4em] text-lamp/40 uppercase">moments</h2>
                <div className="h-px flex-1 bg-lamp/15" />
              </div>

              {/* Post composer — authenticated users only */}
              {userId && <PostComposer userId={userId} onPost={handleNewPost} />}

              {/* Feed */}
              {postsLoading ? (
                <div className="space-y-4">
                  {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="border border-cream/5 bg-ink/40 p-5 animate-pulse">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-brass/10" />
                        <div className="space-y-2">
                          <div className="w-24 h-3 bg-cream/5 rounded" />
                          <div className="w-16 h-2 bg-cream/5 rounded" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-3 bg-cream/5 rounded" />
                        <div className="w-3/4 h-3 bg-cream/5 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post, i) => (
                    <PostCard key={post.id} post={post} userId={userId} index={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="font-body text-sm text-cream/20 italic">No moments yet. Be the first.</p>
                  {!userId && (
                    <Link href="/signup" className="mt-4 inline-block font-label text-[10px] tracking-[0.3em] uppercase text-brass/40 hover:text-brass transition-colors">
                      Join to post →
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center py-12 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">
          return to the lobby
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-oxblood/10 to-transparent pointer-events-none" />

      <style jsx>{`
        @keyframes chandelier-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
