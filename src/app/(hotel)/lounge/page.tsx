'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Post } from './post-card';
import { LoungeRoom, type Member, type ScoredMember } from './lounge-view';

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
    // Defer to the next tick so the loading state set inside the fetchers isn't a synchronous effect update.
    const id = setTimeout(() => {
      void fetchMembers();
      void fetchPosts();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchMembers, fetchPosts]);

  const handleNewPost = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  // Blocked from a "…" menu: drop their plate and moments now (the server already hides them on reload).
  const handleBlocked = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setPosts((prev) => prev.filter((p) => (p.author_id ?? p.profiles?.id) !== memberId));
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <LoungeRoom
      members={members}
      membersLoading={membersLoading}
      posts={posts}
      postsLoading={postsLoading}
      userId={userId}
      onNewPost={handleNewPost}
      onBlocked={handleBlocked}
    />
  );
}
