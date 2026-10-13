'use client';

import {useState} from 'react';
import {LobbyView, type LobbyState} from '@/app/(hotel)/lobby/lobby-view';
import {isCardFinish, type CardFinish} from '@/lib/card-finishes';
import {VaultLocked, VaultRoom, type VaultTransaction} from '@/app/(hotel)/vault/vault-view';
import {LoungeRoom, type ScoredMember} from '@/app/(hotel)/lounge/lounge-view';
import type {Post} from '@/app/(hotel)/lounge/post-card';

const NAMES = ['Jade Okafor', 'Marcus Kim', 'Sofia Ortiz', 'Theo Adams', 'Lena Ruiz', 'Nia Vance', 'Dev Patel', 'Ama Boateng'];

function lobbyState(kind: string, now: number): LobbyState {
  if (kind === 'signed_out') return {phase: 'signed_out'};
  if (kind === 'loading') return {phase: 'loading'};
  const base = {
    phase: 'member' as const,
    profile: {display_name: 'Amara Cole', is_vip: kind !== 'empty', created_at: '2025-03-02T00:00:00Z'},
    guests: kind === 'empty' ? [] : NAMES.map((n, i) => ({id: String(i), display_name: n, username: null, avatar_url: null})),
  };
  return {
    ...base,
    event: kind === 'empty' ? null : {title: 'Rooftop Session', venue: 'The Penthouse · 2nd St', starts_at: new Date(now + 2 * 3600e3).toISOString(), ends_at: new Date(now + 6 * 3600e3).toISOString()},
    balanceCents: kind === 'empty' ? null : 124000,
  };
}

const TX: VaultTransaction[] = [
  {id: '1', merchant: 'Rainey Street Social', amount_cents: -18600, cashback_cents: 2232, category: 'dining', direction: 'debit', created_at: '2026-10-11T23:40:00Z'},
  {id: '2', merchant: 'Vault deposit', amount_cents: 50000, cashback_cents: 0, category: 'funding', direction: 'credit', created_at: '2026-10-10T18:00:00Z'},
  {id: '3', merchant: 'Uber Black', amount_cents: -4250, cashback_cents: 510, category: 'transport', direction: 'debit', created_at: '2026-10-09T02:10:00Z'},
  {id: '4', merchant: 'Drybar South Congress', amount_cents: -6500, cashback_cents: 780, category: 'beauty', direction: 'debit', created_at: '2026-10-08T16:20:00Z'},
];

function VaultPreview({state, finish}: {state: string; finish: CardFinish}) {
  const [f, setF] = useState<CardFinish>(finish);
  const [flipped, setFlipped] = useState(false);
  const [fund, setFund] = useState(state === 'fund');
  if (state === 'locked') return <VaultLocked reason="not_vip" />;
  const empty = state === 'empty';
  return (
    <VaultRoom
      toast={null} finish={f} onFinish={setF} flipped={flipped} onFlip={() => setFlipped((x) => !x)}
      brand="FINESSE" holder="AMARA COLE" accent="#FF4D7D" loading={state === 'loading'}
      balanceCents={empty ? 0 : 124000} cashbackCents={empty ? 0 : 3522} transactions={empty ? [] : TX}
      fundOpen={fund} onFundOpen={setFund} fundLoading={false} onFundConfirm={() => setFund(false)}
    />
  );
}

const VIBES = ['electric', 'warm', 'chill', 'magical', 'wild', 'peaceful'];
const MEMBERS: ScoredMember[] = NAMES.slice(0, 6).map((n, i) => ({
  id: `m${i}`, display_name: n, username: n.split(' ')[0].toLowerCase(), avatar_url: null, vibe: VIBES[i], city: 'Austin',
  interests: [], check_in: null, score: [94, 88, 81, 72, 64, 58][i], borderOpacity: 0.3, glowStrength: i < 2 ? 'strong' : i < 4 ? 'medium' : 'subtle',
}));
const POSTS: Post[] = [
  'Rainey is electric tonight. Table by the fire pit if anyone wants in.',
  'Rooftop Session lineup just dropped. 11pm, don’t be late.',
  'Best espresso martini in Austin is still at the hotel bar. Fight me.',
].map((content, i) => ({
  id: `p${i}`, content, media_urls: null, like_count: [24, 11, 7][i], created_at: '2026-10-12T22:00:00Z', liked_by_me: false,
  profiles: {id: `m${i}`, display_name: NAMES[i], username: null, avatar_url: null, vibe: VIBES[i]},
}));

export function Preview({room, state, finish}: {room: string; state: string; finish?: string}) {
  const [now] = useState(() => Date.now());
  if (room === 'lounge') {
    const empty = state === 'empty';
    return <LoungeRoom members={empty ? [] : MEMBERS} membersLoading={state === 'loading'} posts={empty ? [] : POSTS} postsLoading={state === 'loading'} userId="me" onNewPost={() => {}} />;
  }
  if (room === 'vault') return <VaultPreview state={state} finish={isCardFinish(finish) ? finish : 'nano_black'} />;
  if (room === 'lobby') {
    return <LobbyView state={lobbyState(state, now)} track="finesse" finish={isCardFinish(finish) ? finish : 'nano_black'} now={now} />;
  }
  return <p style={{padding: 40}}>Unknown room.</p>;
}
