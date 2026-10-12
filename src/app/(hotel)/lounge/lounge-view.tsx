'use client';

/**
 * The Lounge — presentational pieces (Continental skin). page.tsx owns data + auth; these
 * render from props so /design/continental can show them with sample data.
 */
import Image from 'next/image';
import Link from 'next/link';
import {motion} from 'framer-motion';
import type {ReactNode} from 'react';
import {
  BrassSurface,
  ChevronInlay,
  DecoFrame,
  Divider,
  EngravedHeading,
  Lamp,
  LacquerSurface,
  Nameplate,
  PaperSurface,
  Plate,
  Sigil,
  VelvetSurface,
} from '@/components/continental';
import {PostCard, type Post} from './post-card';
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

/* ─── Ambience: lamp pools on a dark room ───────────────────────────────── */
export function LoungeAmbience() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="ct-lamp-flicker absolute left-1/2 top-[-120px] h-[520px] w-[760px] -translate-x-1/2" style={{background: 'radial-gradient(closest-side, rgb(255 190 120 / 16%), rgb(255 169 107 / 5%) 55%, transparent)'}} />
      <div className="ct-lamp-flicker absolute left-[-160px] top-[38%] h-[520px] w-[520px]" style={{background: 'radial-gradient(closest-side, rgb(255 169 107 / 9%), transparent)', animationDelay: '2.4s'}} />
      <div className="ct-lamp-flicker absolute right-[-180px] top-[62%] h-[560px] w-[560px]" style={{background: 'radial-gradient(closest-side, rgb(255 169 107 / 8%), transparent)', animationDelay: '4.1s'}} />
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{background: 'linear-gradient(to top, rgb(60 0 20 / 22%), transparent)'}} />
    </div>
  );
}

/* ─── Header: velvet banquette, brass rail, a lamp at each end ──────────── */
export function LoungeHeader({floorCount}: {floorCount?: string}) {
  return (
    <header className="relative">
      <VelvetSurface channel className="relative px-4 pb-10 pt-10 sm:pt-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24" style={{background: 'linear-gradient(180deg, rgb(8 6 10 / 85%), transparent)'}} />
        <Lamp size={34} glow={1.2} className="absolute left-2 top-5 origin-top-left sm:left-10 sm:top-8 sm:scale-150" />
        <Lamp size={34} glow={1.2} className="absolute right-2 top-5 origin-top-right sm:right-10 sm:top-8 sm:scale-150" />
        <div className="relative mx-auto flex max-w-md flex-col items-center">
          <Plate number="02" label="Members only" size="sm" className="mb-5" />
          <EngravedHeading title="The Lounge" script="members on the floor" size="lg" />
          {floorCount && <p className="mt-3 font-label text-[9px] uppercase tracking-[0.4em] text-[var(--ct-text-soft)]">{floorCount}</p>}
        </div>
      </VelvetSurface>
      {/* brass rail + chevron inlay under the banquette */}
      <BrassSurface className="h-[7px]" />
      <div className="bg-[var(--lacquer)] py-1.5">
        <ChevronInlay className="mx-auto max-w-[90%]" />
      </div>
    </header>
  );
}

/* ─── House rules plaque ─────────────────────────────────────────────────── */
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
    <aside aria-labelledby="house-rules" className="relative mx-auto max-w-[420px]" style={{filter: 'drop-shadow(0 14px 18px rgb(0 0 0 / 70%))'}}>
      <BrassSurface
        className="px-6 pb-6 pt-6 sm:px-9"
        style={{clipPath: 'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)'}}
      >
        <div className="pointer-events-none absolute inset-[6px]" style={{boxShadow: 'inset 0 0 0 1px rgb(60 40 10 / 55%), inset 0 1px 0 1px rgb(255 240 200 / 25%)', clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)'}} />
        <div className="flex items-center justify-center gap-3">
          <Sigil size={20} tone="ink" style={{opacity: 0.8}} />
          <h2 id="house-rules" className="ct-engraved font-label text-[13px] font-bold uppercase tracking-[0.42em]">House Rules</h2>
          <Sigil size={20} tone="ink" style={{opacity: 0.8}} />
        </div>
        <div className="mx-auto mt-2 h-px max-w-[200px] bg-[rgb(44_31_11/0.5)] shadow-[0_1px_0_rgb(255_241_200/0.5)]" />
        <ol className="mt-4 space-y-2.5">
          {HOUSE_RULES.map((r, i) => (
            <li key={r} className="flex gap-3">
              <span className="ct-engraved w-7 shrink-0 text-right font-label text-[12px] font-bold">{NUMERALS[i]}.</span>
              <span className="ct-engraved font-body text-[16px] font-semibold leading-snug">{r}</span>
            </li>
          ))}
        </ol>
      </BrassSurface>
    </aside>
  );
}

/* ─── Section heading ────────────────────────────────────────────────────── */
export function LoungeSectionTitle({children}: {children: string}) {
  return (
    <div className="mb-6" role="heading" aria-level={2}>
      <Divider label={children} />
    </div>
  );
}

/* ─── The floor: members as brass nameplates on velvet ─────────────────── */
function Cameo({src, name, vibeColor, size = 56, ring = 'medium'}: {src: string | null; name: string | null; vibeColor: string; size?: number; ring?: ScoredMember['glowStrength']}) {
  return (
    <div
      className="relative shrink-0 rounded-full p-[3px]"
      style={{
        width: size,
        height: size,
        background: 'conic-gradient(from 20deg, #8a6a2e, #f2d99a 12%, #9c7a39 26%, #e6c785 44%, #7a5a26 60%, #f7e3ab 76%, #a1803f 90%, #8a6a2e)',
        boxShadow: `0 4px 10px rgb(0 0 0 / 70%)${ring === 'strong' ? `, 0 0 18px ${vibeColor}55` : ''}`,
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full" style={{background: 'radial-gradient(circle at 40% 35%, #2a1a1e, #0c0709)', boxShadow: 'inset 0 2px 4px rgb(0 0 0 / 80%)'}}>
        {src ? (
          <Image src={src} alt={name || ''} width={size} height={size} className="h-full w-full object-cover" />
        ) : (
          <span className="ct-gilt flex h-full w-full items-center justify-center font-label font-semibold" style={{fontSize: size * 0.3, letterSpacing: '0.08em'}}>
            {initials(name)}
          </span>
        )}
      </div>
    </div>
  );
}

export function MemberPlate({member, index}: {member: ScoredMember; index: number}) {
  const vibeColor = VIBE_COLORS[member.vibe || ''] || '#C9A961';
  return (
    <motion.div initial={{opacity: 0, y: 14}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2 + index * 0.06, duration: 0.7, ease: [0.22, 0.8, 0.18, 1]}}>
      <Link
        href={member.username ? `/entourage?u=${member.username}` : '/entourage'}
        className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-200)]"
        onClick={() => emitSignal('view_item', {type: 'member_profile'})}
      >
        <VelvetSurface
          channel
          className="flex flex-col items-center px-2.5 pb-4 pt-5 text-center transition-[filter] duration-500 group-hover:brightness-125"
          style={{boxShadow: `inset 0 0 0 1px rgb(201 169 97 / ${0.18 + member.borderOpacity * 0.6}), inset 0 0 0 4px rgb(10 4 6 / 55%), 0 10px 20px -8px rgb(0 0 0 / 90%)`}}
        >
          <Cameo src={member.avatar_url} name={member.display_name} vibeColor={vibeColor} ring={member.glowStrength} />
          <Nameplate name={member.display_name || 'A Member'} className="mt-3" />
          {member.username && <p className="mt-1.5 max-w-full truncate font-body text-[13px] italic text-[var(--ct-text-soft)]">@{member.username}</p>}
          {member.vibe && (
            <p className="mt-2 flex items-center gap-1.5 font-label text-[9px] uppercase tracking-[0.3em] text-[var(--ct-text)]">
              <span aria-hidden className="h-1.5 w-1.5 rotate-45" style={{background: vibeColor, boxShadow: `0 0 6px ${vibeColor}`}} />
              {member.vibe}
            </p>
          )}
          {/* compatibility: a gilt gauge */}
          <div className="mt-3 w-full px-1">
            <div className="h-[3px] w-full" style={{background: 'rgb(0 0 0 / 55%)', boxShadow: 'inset 0 0 0 0.5px rgb(201 169 97 / 30%)'}}>
              <motion.div
                initial={{width: 0}}
                animate={{width: `${member.score}%`}}
                transition={{delay: 0.4 + index * 0.06, duration: 1.1, ease: 'easeOut'}}
                className="h-full"
                style={{background: 'linear-gradient(90deg, #8a6a2e, #f2d99a)'}}
              />
            </div>
            <p className="mt-1.5 font-label text-[9px] uppercase tracking-[0.24em] text-[var(--brass-100)]">{member.score}% match</p>
          </div>
        </VelvetSurface>
      </Link>
    </motion.div>
  );
}

export function FloorSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" role="status" aria-label="Loading members">
      {Array.from({length: 6}).map((_, i) => (
        <VelvetSurface key={i} className="h-[196px] animate-pulse opacity-60" />
      ))}
    </div>
  );
}

/* ─── Moments: calling cards on a lacquer table ─────────────────────────── */
const TILT = [-0.8, 0.6, -0.3, 0.9, -0.6, 0.35, -0.9, 0.5];

export function MomentCard({post, index}: {post: Post; index: number}) {
  const profile = post.profiles;
  return (
    <motion.div initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}} transition={{delay: 0.15 + index * 0.06, duration: 0.7, ease: [0.22, 0.8, 0.18, 1]}}>
      <CallingCard name={profile?.display_name || 'A Member'} vibe={profile?.vibe} time={timeAgo(post.created_at)} avatar={profile?.avatar_url} tilt={TILT[index % TILT.length]}>
        <p className="line-clamp-4 font-body text-[17px] italic leading-relaxed text-[var(--ivory-ink)]">{post.content}</p>
      </CallingCard>
    </motion.div>
  );
}

/** The lacquer table the cards are laid on. */
export function LacquerTable({children}: {children: ReactNode}) {
  return (
    <DecoFrame tone="dim" corners={false} className="overflow-hidden">
      <LacquerSurface sparkle className="px-3 py-6 sm:px-6 sm:py-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{background: 'radial-gradient(60% 100% at 50% 0%, rgb(255 190 120 / 10%), transparent)'}} />
        <div className="relative">{children}</div>
      </LacquerSurface>
    </DecoFrame>
  );
}

export function MomentsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading moments">
      {Array.from({length: 3}).map((_, i) => (
        <PaperSurface key={i} className="h-28 animate-pulse opacity-40" />
      ))}
    </div>
  );
}

export function LoungeEmpty({children, cta}: {children: ReactNode; cta?: {href: string; label: string}}) {
  return (
    <div className="py-12 text-center">
      <p className="font-body text-[17px] italic text-[var(--ct-text-soft)]">{children}</p>
      {cta && (
        <Link href={cta.href} className="mt-4 inline-block min-h-11 py-3 font-label text-[10px] uppercase tracking-[0.35em] text-[var(--brass-200)] transition-colors hover:text-[var(--brass-50)]">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function LoungeFooter() {
  return (
    <footer className="mt-16 text-center">
      <p className="font-display text-[16px] italic text-[var(--ct-text-mute)]">the music is low. the company is right.</p>
      <Link href="/lobby" className="mt-4 inline-block min-h-11 py-3 font-body text-[15px] italic text-[var(--ct-text-mute)] transition-colors hover:text-[var(--brass-200)]">
        return to the lobby
      </Link>
    </footer>
  );
}

/* ─── The whole room (used by page.tsx and the design showcase) ─────────── */
export function LoungeRoom({
  members,
  membersLoading,
  posts,
  postsLoading,
  userId,
  onNewPost,
  composerOpen = false,
}: {
  members: ScoredMember[];
  membersLoading: boolean;
  posts: Post[];
  postsLoading: boolean;
  userId: string | null;
  onNewPost: (post: Post) => void;
  composerOpen?: boolean;
}) {
  const floorLabel = membersLoading ? 'scanning the floor…' : members.length > 0 ? `${members.length} on the floor` : 'the floor is empty';
  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.7}}
      className="relative min-h-screen overflow-x-hidden"
      style={{background: 'var(--lacquer)'}}
    >
      <LoungeAmbience />

      <div className="relative z-10">
        <LoungeHeader />

        <div className="mx-auto max-w-2xl px-4 pb-20">
          {/* House rules */}
          <div className="mt-10">
            <HouseRules />
          </div>

          {/* The floor */}
          <section className="mt-14">
            <LoungeSectionTitle>{floorLabel}</LoungeSectionTitle>
            {membersLoading ? (
              <FloorSkeleton />
            ) : members.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {members.map((member, i) => (
                  <MemberPlate key={member.id} member={member} index={i} />
                ))}
              </div>
            ) : (
              <LoungeEmpty cta={!userId ? {href: '/signup', label: 'Join Finesse →'} : undefined}>No one on the floor yet.</LoungeEmpty>
            )}
          </section>

          {/* Moments */}
          <section className="mt-14">
            <LoungeSectionTitle>Moments</LoungeSectionTitle>
            <LacquerTable>
              {/* Composer (auth only) */}
              {userId && <PostComposer userId={userId} onPost={onNewPost} defaultOpen={composerOpen} />}

              {postsLoading ? (
                <MomentsSkeleton />
              ) : posts.length > 0 ? (
                <div className="space-y-5">
                    {/* Calling cards for the first eight */}
                    {posts.slice(0, 8).map((post, i) => (
                      <MomentCard key={post.id} post={post} index={i} />
                    ))}
                    {/* Full cards (media + likes) for the rest */}
                    {posts.slice(8).map((post, i) => (
                      <PostCard key={post.id} post={post} userId={userId} index={i} />
                    ))}
                </div>
              ) : (
                <LoungeEmpty cta={!userId ? {href: '/signup', label: 'Join to post →'} : undefined}>No moments yet. Be the first.</LoungeEmpty>
              )}
            </LacquerTable>
          </section>

          <LoungeFooter />
        </div>
      </div>
    </motion.div>
  );
}
