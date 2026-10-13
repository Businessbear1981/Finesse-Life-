'use client';

/**
 * The Lounge — presentational pieces (After Hours skin). page.tsx owns data + auth; these
 * render from props so the design previews can show them with sample data.
 */
import Image from 'next/image';
import Link from 'next/link';
import {motion} from 'framer-motion';
import type {ReactNode} from 'react';
import {AHChip, AHDisplay, AHEyebrow, AHRoom, AHSkeleton, AHSmoke, AHTopBar} from '@/components/after-hours';
import {ModerationMenu} from '@/components/moderation';
import {PostCard, PostMenu, type Post} from './post-card';
import {CallingCard, VIBE_COLORS, initials} from './calling-card';

export {CallingCard, VIBE_COLORS, initials};
import {PostComposer} from './post-composer';

export interface Member {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  vibe: string | null;
  city: string | null;
  interests: string[] | null;
  check_in: string | null;
}

export interface ScoredMember extends Member {
  score: number;
  borderOpacity: number;
  glowStrength: 'strong' | 'medium' | 'subtle';
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function emitSignal(kind: string, payload: Record<string, unknown>) {
  void fetch('/api/intelligence/signal', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({kind, payload}),
  }).catch(() => {});
}

/* ─── Ambience: soft rose light at the top of the room ───────────────────── */
export function LoungeAmbience() {
  return <div aria-hidden className="ah-room-glow" />;
}

/* ─── Header ─────────────────────────────────────────────────────────────── */
export function LoungeHeader({floorCount}: {floorCount?: string}) {
  return (
    <header>
      <AHTopBar right={<AHChip>Members only</AHChip>} />
      <AHEyebrow>The Lounge</AHEyebrow>
      <AHDisplay size="l" style={{marginTop: 8}}>Who’s out.</AHDisplay>
      {floorCount && (
        <p style={{display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 0', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ah-mute)'}}>
          <i className="ah-live-dot ah-live-dot-pulse" /> {floorCount}
        </p>
      )}
    </header>
  );
}

/* ─── House rules ────────────────────────────────────────────────────────── */
export const HOUSE_RULES = [
  'Discretion is the house currency.',
  'No business on the floor — the Concierge keeps your affairs.',
  'What is said at the table stays at the table.',
  'Every member is a guest of the house. Courtesy, without exception.',
  "A member's word is their marker.",
];
const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

export function HouseRules() {
  return (
    <aside aria-labelledby="house-rules" className="ah-card">
      <h2 id="house-rules" className="ah-eyebrow" style={{marginBottom: 12}}>House rules</h2>
      <ol style={{listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10}}>
        {HOUSE_RULES.map((r, i) => (
          <li key={r} style={{display: 'grid', gridTemplateColumns: '30px 1fr', alignItems: 'baseline'}}>
            <span className="ah-serif-i" style={{fontSize: 15, color: 'var(--ah-rose)'}}>{NUMERALS[i]}</span>
            <span className="ah-serif" style={{fontSize: 19, lineHeight: 1.25}}>{r}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/* ─── Section heading ────────────────────────────────────────────────────── */
export function LoungeSectionTitle({children}: {children: string}) {
  return (
    <div role="heading" aria-level={2} className="ah-eyebrow" style={{marginBottom: 14}}>
      {children}
    </div>
  );
}

/* ─── The floor: members ─────────────────────────────────────────────────── */
export function MemberPlate({member, index, userId, onBlocked}: {member: ScoredMember; index: number; userId?: string | null; onBlocked?: (memberId: string) => void}) {
  const vibeColor = VIBE_COLORS[member.vibe || ''] || 'var(--ah-rose)';
  const ring = member.glowStrength === 'strong'
    ? 'conic-gradient(from 200deg,#f4f4f2,#b76e79,#e8b4a0,#8e9298,#f4f4f2)'
    : member.glowStrength === 'medium' ? 'linear-gradient(135deg,#8e9298,#3a3a40)' : '#26262b';
  return (
    <motion.div initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1 + index * 0.05, duration: 0.5}} style={{position: 'relative'}}>
      {userId && userId !== member.id && (
        <div style={{position: 'absolute', top: 8, right: 14, zIndex: 2}}>
          <ModerationMenu kind="profile" targetId={member.id} memberId={member.id} name={member.display_name || 'this member'} onBlocked={() => onBlocked?.(member.id)} />
        </div>
      )}
      <Link
        href={member.username ? `/entourage?u=${member.username}` : '/entourage'}
        className="ah-card ah-focus"
        style={{display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 12px 16px', color: 'inherit', textDecoration: 'none'}}
        onClick={() => emitSignal('view_item', {type: 'member_profile'})}
      >
        <span style={{width: 64, height: 64, borderRadius: '50%', padding: 2, background: ring, boxShadow: member.glowStrength === 'strong' ? '0 0 24px rgba(183,110,121,.35)' : undefined}}>
          <span style={{display: 'grid', placeItems: 'center', width: '100%', height: '100%', borderRadius: '50%', border: '3px solid var(--ah-ink-2)', background: '#1b1b1f', overflow: 'hidden', fontWeight: 700, fontSize: 16}}>
            {member.avatar_url
              ? <Image src={member.avatar_url} alt={member.display_name || ''} width={58} height={58} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              : initials(member.display_name)}
          </span>
        </span>
        <span className="ah-serif" style={{marginTop: 12, fontSize: 21, lineHeight: 1.05, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
          {member.display_name || 'A Member'}
        </span>
        {member.username && <span style={{marginTop: 3, fontSize: 12, color: 'var(--ah-mute)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis'}}>@{member.username}</span>}
        {member.vibe && (
          <span style={{marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ah-text)', textTransform: 'capitalize'}}>
            <span aria-hidden style={{width: 6, height: 6, borderRadius: '50%', background: vibeColor, boxShadow: `0 0 8px ${vibeColor}`}} />
            {member.vibe}
          </span>
        )}
        <span style={{marginTop: 12, width: '100%', height: 3, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden'}}>
          <motion.span
            initial={{width: 0}}
            animate={{width: `${member.score}%`}}
            transition={{delay: 0.3 + index * 0.05, duration: 1, ease: 'easeOut'}}
            style={{display: 'block', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#b76e79,#f2c9b8)'}}
          />
        </span>
        <span className="ah-num" style={{marginTop: 6, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', color: 'var(--ah-rose)'}}>{member.score}% match</span>
      </Link>
    </motion.div>
  );
}

export function FloorSkeleton() {
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12}} role="status" aria-label="Loading members">
      {Array.from({length: 6}).map((_, i) => <AHSkeleton key={i} h={196} r={24} />)}
    </div>
  );
}

/* ─── Moments ────────────────────────────────────────────────────────────── */
export function MomentCard({post, index, userId, onBlocked}: {post: Post; index: number; userId?: string | null; onBlocked?: (memberId: string) => void}) {
  const profile = post.profiles;
  return (
    <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1 + index * 0.05, duration: 0.5}}>
      <CallingCard name={profile?.display_name || 'A Member'} vibe={profile?.vibe} time={timeAgo(post.created_at)} avatar={profile?.avatar_url}
        menu={userId ? <PostMenu post={post} userId={userId} onBlocked={onBlocked} /> : undefined}>
        <p className="line-clamp-4" style={{margin: 0, fontSize: 15, lineHeight: 1.5}}>{post.content}</p>
      </CallingCard>
    </motion.div>
  );
}

/** The surface the feed sits on (kept for API compatibility; After Hours is flat). */
export function LacquerTable({children}: {children: ReactNode}) {
  return <div>{children}</div>;
}

export function MomentsSkeleton() {
  return (
    <div style={{display: 'grid', gap: 12}} role="status" aria-label="Loading moments">
      {Array.from({length: 3}).map((_, i) => <AHSkeleton key={i} h={112} r={24} />)}
    </div>
  );
}

export function LoungeEmpty({children, cta}: {children: ReactNode; cta?: {href: string; label: string}}) {
  return (
    <div className="ah-card" style={{textAlign: 'center', padding: '30px 20px'}}>
      <p className="ah-serif-i" style={{margin: 0, fontSize: 24}}>{children}</p>
      {cta && (
        <Link href={cta.href} className="ah-pill ah-pill-ghost" style={{marginTop: 16}}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function LoungeFooter() {
  return (
    <footer style={{marginTop: 48, textAlign: 'center'}}>
      <p className="ah-serif-i" style={{margin: 0, fontSize: 18, color: 'var(--ah-mute)'}}>The music is low. The company is right.</p>
      <Link href="/lobby" style={{display: 'inline-block', marginTop: 8, padding: '12px 0', fontSize: 14, color: 'var(--ah-faint)', textDecoration: 'none'}}>
        Back to the Lobby
      </Link>
    </footer>
  );
}

/* ─── The whole room (used by page.tsx and the design previews) ──────────── */
export function LoungeRoom({
  members,
  membersLoading,
  posts,
  postsLoading,
  userId,
  onNewPost,
  onBlocked,
  composerOpen = false,
}: {
  members: ScoredMember[];
  membersLoading: boolean;
  posts: Post[];
  postsLoading: boolean;
  userId: string | null;
  onNewPost: (post: Post) => void;
  /** A member was blocked from a "…" menu — drop their plate and posts straight away. */
  onBlocked?: (memberId: string) => void;
  composerOpen?: boolean;
}) {
  const floorLabel = membersLoading ? 'Checking the floor…' : members.length > 0 ? `${members.length} on the floor` : 'The floor is quiet';
  return (
    <AHRoom>
      <LoungeHeader floorCount={floorLabel} />

      {/* The live city map */}
      <Link href="/lounge/map" className="ah-focus" style={{display: 'block', marginTop: 26, textDecoration: 'none', color: 'inherit', borderRadius: 28}}>
        <AHSmoke tone="city" aspect="4 / 2.1" top={<AHChip live>Live map</AHChip>}>
          <p className="ah-serif-i" style={{margin: 0, fontSize: 34, lineHeight: 1}}>The city, tonight.</p>
          <p style={{margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,.72)'}}>Who’s out, and where the night is.</p>
        </AHSmoke>
      </Link>

      {/* The floor */}
      <section style={{marginTop: 34}}>
        <LoungeSectionTitle>On the floor</LoungeSectionTitle>
        {membersLoading ? (
          <FloorSkeleton />
        ) : members.length > 0 ? (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12}}>
            {members.map((member, i) => <MemberPlate key={member.id} member={member} index={i} userId={userId} onBlocked={onBlocked} />)}
          </div>
        ) : (
          <LoungeEmpty cta={!userId ? {href: '/signup', label: 'Request an invitation'} : undefined}>No one on the floor yet.</LoungeEmpty>
        )}
      </section>

      {/* House rules */}
      <section style={{marginTop: 34}}>
        <HouseRules />
      </section>

      {/* Moments */}
      <section style={{marginTop: 34}}>
        <LoungeSectionTitle>Moments</LoungeSectionTitle>
        {userId && <PostComposer userId={userId} onPost={onNewPost} defaultOpen={composerOpen} />}
        {postsLoading ? (
          <MomentsSkeleton />
        ) : posts.length > 0 ? (
          <div style={{display: 'grid', gap: 12}}>
            {posts.slice(0, 8).map((post, i) => <MomentCard key={post.id} post={post} index={i} userId={userId} onBlocked={onBlocked} />)}
            {posts.slice(8).map((post, i) => <PostCard key={post.id} post={post} userId={userId} index={i} onBlocked={onBlocked} />)}
          </div>
        ) : (
          <LoungeEmpty cta={!userId ? {href: '/signup', label: 'Join to post'} : undefined}>No moments yet. Be the first.</LoungeEmpty>
        )}
      </section>

      <LoungeFooter />
    </AHRoom>
  );
}
