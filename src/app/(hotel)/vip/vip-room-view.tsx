// The VIP Room ("The Inner Room"), After Hours. Presentational: page.tsx does the server-side VIP
// check and loads the feed; the design preview passes sample data. Nothing here decides access.

import Link from 'next/link';
import {AHCard, AHChip, AHDisplay, AHEyebrow, AHRoom, AHSection, AHTopBar} from '@/components/after-hours';
import {VipPostFeed, type VipPost} from './vip-post-feed';
import {VipPostFabClient} from './vip-post-fab';
import {VipLift} from './vip-lift';
import './vip-room.css';

export function VipRoomView({
  posts,
  currentUserId,
  telegramBot,
  telegramHandle,
}: {
  posts: VipPost[];
  currentUserId: string;
  telegramBot: string;
  telegramHandle: string | null;
}) {
  return (
    <AHRoom className="vip-room">
      <AHTopBar right={<AHChip><i className="ah-live-dot" />Key holder</AHChip>} />

      {/* ── Arrival ── */}
      <section>
        <AHEyebrow>Room 23 · Key holders only</AHEyebrow>
        <AHDisplay size="xl" style={{marginTop: 10}}>The Inner<br />Room.</AHDisplay>
        <p style={{margin: '16px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--ah-mute)', maxWidth: 340}}>
          By invitation. What&rsquo;s said in here stays upstairs.
        </p>
      </section>

      {/* ── The private line (Telegram) ── */}
      <AHSection title="The private line">
        <AHCard glass className="vip-line">
          <p className="ah-serif-i" style={{margin: 0, fontSize: 28, lineHeight: 1.05}}>Your private channel awaits.</p>
          <p style={{margin: '8px 0 18px', fontSize: 13, color: 'var(--ah-mute)'}}>Text · Voice · Video · All encrypted</p>
          <a
            href={`https://t.me/${telegramBot}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ah-pill ah-pill-rose ah-pill-block"
          >
            Open the VIP channel <span aria-hidden>→</span>
          </a>

          <div className="vip-line-foot">
            {telegramHandle ? (
              <span className="vip-linked"><i className="ah-live-dot" />@{telegramHandle} linked</span>
            ) : (
              <>
                <span style={{fontSize: 12, color: 'var(--ah-mute)'}}>Link your account for VIP notifications</span>
                <Link href="/vip/link-telegram" className="ah-pill ah-pill-ghost" style={{minHeight: 40, padding: '0 16px', fontSize: 13}}>
                  Connect Telegram
                </Link>
              </>
            )}
          </div>
        </AHCard>
      </AHSection>

      {/* ── The private lift ── */}
      <div id="private-lift" style={{marginTop: 40, scrollMarginTop: 32}}>
        <VipLift />
      </div>

      {/* ── Inner feed ── */}
      <AHSection
        title="Inner feed"
        action={<span className="ah-num" style={{fontSize: 12, color: 'var(--ah-faint)'}}>{posts.length > 0 ? `${posts.length} recent` : ''}</span>}
        style={{marginTop: 44}}
      >
        <VipPostFeed initialPosts={posts} currentUserId={currentUserId} />
      </AHSection>

      <p style={{margin: '36px 0 0', textAlign: 'center'}}>
        <Link href="/lobby" className="ah-focus" style={{display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 12px', fontSize: 13, color: 'var(--ah-mute)', textDecoration: 'none'}}>
          ← Back down to the Lobby
        </Link>
      </p>

      {/* ── FAB: + Post ── */}
      <VipPostFabClient />
    </AHRoom>
  );
}
