'use client';

// The Lobby view (After Hours). Presentational: data comes from page.tsx (or the design preview).
// The Lobby, After Hours edition. Everything shown is real member data or an honest empty
// state: the member's own profile, the next event on the live map, who's been in, and their
// Vault card. Nothing here is sample content.

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {PrivateLift} from '@/components/hotel/private-lift';
import {
  AHCard, AHChip, AHClock, AHDisplay, AHDock, AHEyebrow, AHIndex, AHMemberCard, AHPill, AHRing, AHRoom,
  AHSection, AHSkeleton, AHSmoke, AHTopBar, greetingFor,
} from '@/components/after-hours';
import type {CardFinish} from '@/lib/card-finishes';
import {RAILS, ROOM_COUNT, TRUTH_LABEL, railRooms, type Track} from '@/lib/rooms/registry';

export type Profile = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  is_vip?: boolean | null;
  vip_expires_at?: string | null;
  created_at?: string | null;
};
export type Guest = {id: string; display_name: string | null; username: string | null; avatar_url: string | null};
export type NextEvent = {title: string; venue: string | null; starts_at: string; ends_at: string};

export type LobbyState =
  | {phase: 'loading'}
  | {phase: 'signed_out'}
  | {phase: 'member'; profile: Profile; guests: Guest[]; event: NextEvent | null; balanceCents: number | null};

const fmtMoney = (cents: number) =>
  (cents / 100).toLocaleString('en-US', {style: 'currency', currency: 'USD'});

function whenLabel(e: NextEvent, now: number) {
  const s = Date.parse(e.starts_at);
  if (s <= now) return 'Happening now';
  const d = new Date(s);
  const sameDay = new Date(now).toDateString() === d.toDateString();
  const t = d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
  return sameDay ? `Tonight · ${t}` : `${d.toLocaleDateString('en-US', {weekday: 'short'})} · ${t}`;
}

export function vipActive(p: Profile) {
  return p.is_vip === true && (!p.vip_expires_at || Date.parse(p.vip_expires_at) > Date.now());
}

export function LobbyView({state, track, finish, now}: {state: LobbyState; track: Track; finish: CardFinish; now: number}) {
  const [rail, setRail] = useState(RAILS[0].id);
  const roomItems = useMemo(() => railRooms(rail).map((room) => ({
    href: room.route,
    number: room.number,
    name: room.name,
    sub: room.primaryAction,
    tag: room.id === 'vip-room' || room.truthState === 'gated' ? 'Key' : TRUTH_LABEL[room.truthState],
    tagTone: room.id === 'vip-room' || room.truthState === 'gated' ? 'key' as const : room.truthState === 'wired' ? 'live' as const : undefined,
  })), [rail]);

  const member = state.phase === 'member' ? state : null;
  const name = member?.profile.display_name || member?.profile.username || 'Member';
  const firstName = name.split(/\s+/)[0];
  const isVip = member ? vipActive(member.profile) : false;
  const since = member?.profile.created_at ? `’${String(new Date(member.profile.created_at).getFullYear()).slice(2)}` : null;
  const houseName = track === 'carpe_diem' ? 'Carpe Diem' : 'Finesse';

  return (
    <AHRoom>
      <AHTopBar
        right={
          <>
            <AHClock />
            {member && (
              <Link href="/this-is-you" aria-label="Your profile" className="ah-focus" style={{borderRadius: '50%'}}>
                <span style={{width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#F2C9B8,#B76E79)', color: '#2a1014'}}>
                  {firstName[0]?.toUpperCase()}
                </span>
              </Link>
            )}
          </>
        }
      />

      {/* ── Greeting ── */}
      {state.phase === 'loading' && (
        <div aria-busy="true">
          <AHSkeleton h={14} w={110} />
          <AHSkeleton h={72} w="70%" style={{marginTop: 12}} />
          <AHSkeleton h={12} w={200} style={{marginTop: 14}} />
        </div>
      )}

      {state.phase === 'signed_out' && (
        <section>
          <AHEyebrow>{houseName} · By invitation</AHEyebrow>
          <AHDisplay size="xl" style={{marginTop: 10}}>Welcome.</AHDisplay>
          <p style={{margin: '16px 0 26px', fontSize: 15, lineHeight: 1.5, color: 'var(--ah-mute)', maxWidth: 360}}>
            A private house for the night: guest lists, the Vault, the Concierge and the people worth knowing. Members only.
          </p>
          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
            <AHPill href="/login">Sign in</AHPill>
            <AHPill href="/signup" variant="ghost">Request an invitation</AHPill>
          </div>
        </section>
      )}

      {member && (
        <section>
          <p style={{margin: 0, fontSize: 14, color: 'var(--ah-mute)'}}>{greetingFor(new Date(now))}</p>
          <AHDisplay size="xl">{firstName}.</AHDisplay>
          <p style={{display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 0', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ah-mute)'}}>
            <i className="ah-live-dot" />
            {isVip ? 'VIP · Key holder' : `${houseName} member`}
            {since && <> · since {since}</>}
          </p>
        </section>
      )}

      {/* ── Who's been in ── */}
      {member && member.guests.length > 0 && (
        <AHSection title="Who’s been in" action={<Link href="/lounge" className="ah-mute" style={{fontSize: 12, textDecoration: 'none'}}>The Lounge →</Link>}>
          <div style={{display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 4px', scrollbarWidth: 'none'}}>
            {member.guests.map((g) => {
              const n = g.display_name || g.username || 'Member';
              return <AHRing key={g.id} name={n.split(/\s+/)[0]} src={g.avatar_url} href={g.username ? `/entourage?u=${g.username}` : '/entourage'} />;
            })}
          </div>
        </AHSection>
      )}

      {/* ── Tonight ── */}
      {member && (
        <AHSection title="Tonight">
          {member.event ? (
            <Link href="/lounge/map" style={{textDecoration: 'none', color: 'inherit', display: 'block'}} className="ah-focus">
              <AHSmoke top={<AHChip live>{whenLabel(member.event, now)}</AHChip>}>
                <h2 className="ah-serif" style={{margin: 0, fontSize: 'clamp(40px, 12vw, 54px)', lineHeight: 0.95}}>{member.event.title}</h2>
                <p style={{margin: '10px 0 16px', fontSize: 14, color: 'rgba(255,255,255,.72)'}}>{member.event.venue ?? 'On the map'}</p>
                <span className="ah-pill ah-pill-solid">See it on the map</span>
              </AHSmoke>
            </Link>
          ) : (
            <Link href="/lounge/map" style={{textDecoration: 'none', color: 'inherit', display: 'block'}} className="ah-focus">
              <AHSmoke tone="city" aspect="4 / 2.6" top={<AHChip live>Live</AHChip>}>
                <h2 className="ah-serif-i" style={{margin: 0, fontSize: 38, lineHeight: 1}}>The city, tonight.</h2>
                <p style={{margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,.7)'}}>Nothing on the books yet. See who’s out on the live map.</p>
              </AHSmoke>
            </Link>
          )}
        </AHSection>
      )}

      {/* ── The card ── */}
      {member && (
        <AHSection title="Your card" action={<Link href="/vault" className="ah-mute" style={{fontSize: 12, textDecoration: 'none'}}>The Vault →</Link>}>
          <Link href="/vault" style={{display: 'block', textDecoration: 'none', padding: '10px 4px 18px'}} className="ah-focus">
            <AHMemberCard
              finish={finish}
              big={member.balanceCents !== null ? fmtMoney(member.balanceCents) : isVip ? 'The Vault' : 'Key holders'}
              right="12% back"
            />
          </Link>
          {!isVip && (
            <p style={{margin: 0, fontSize: 13, color: 'var(--ah-mute)'}}>The Vault opens with a key. <Link href="/subscribe" style={{color: 'var(--ah-rose)'}}>Become a key holder</Link>.</p>
          )}
        </AHSection>
      )}

      {/* ── Concierge ── */}
      {member && (
        <AHSection title="The Concierge">
          <Link href="/concierge" style={{textDecoration: 'none', color: 'inherit', display: 'block'}} className="ah-focus">
            <AHCard glass>
              <p className="ah-serif-i" style={{margin: 0, fontSize: 26, lineHeight: 1.1}}>Nova, on call.</p>
              <p style={{margin: '6px 0 14px', fontSize: 13, color: 'var(--ah-mute)'}}>Tables, looks, routes, the whole evening.</p>
              <span className="ah-input" style={{display: 'block', color: 'var(--ah-faint)'}}>Get us a table for four…</span>
            </AHCard>
          </Link>
        </AHSection>
      )}

      {/* ── The private lift (VIP / Penthouse KeyLock) ── */}
      {member && (
        <div id="private-lift" style={{marginTop: 34, scrollMarginTop: 32}}>
          <PrivateLift track={track} />
        </div>
      )}

      {/* ── The house: all 31 rooms ── */}
      <AHSection title={`The house · ${ROOM_COUNT} rooms`}>
        <div role="tablist" aria-label="Floors" style={{display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -20px 6px', padding: '0 20px 6px', scrollbarWidth: 'none'}}>
          {RAILS.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={rail === r.id}
              onClick={() => setRail(r.id)}
              className="ah-pill ah-focus"
              style={{
                minHeight: 38, padding: '0 16px', fontSize: 13, flex: 'none',
                background: rail === r.id ? '#fff' : 'transparent',
                color: rail === r.id ? '#000' : 'var(--ah-text)',
                borderColor: rail === r.id ? '#fff' : 'var(--ah-line-2)',
              }}
            >
              {r.title}
            </button>
          ))}
        </div>
        <AHIndex items={roomItems} />
        <p style={{margin: '14px 0 0', fontSize: 12, color: 'var(--ah-faint)'}}>
          The Penthouse is reached by the private lift inside the VIP Room.
        </p>
      </AHSection>

      <AHDock>
        <AHPill href="/lounge" block>Enter the Lounge</AHPill>
      </AHDock>
    </AHRoom>
  );
}
