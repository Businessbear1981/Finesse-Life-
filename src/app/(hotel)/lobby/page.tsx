'use client';

// The Lobby: loads the member's real data and hands it to LobbyView (After Hours).

import {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {useLocalPref} from '@/components/after-hours';
import {DEFAULT_CARD_FINISH, isCardFinish, type CardFinish} from '@/lib/card-finishes';
import {trackFromGender, type Track} from '@/lib/rooms/registry';
import {LobbyView, vipActive, type Guest, type LobbyState, type NextEvent, type Profile} from './lobby-view';

export default function LobbyPage() {
  const [state, setState] = useState<LobbyState>({phase: 'loading'});
  const track = useLocalPref<Track>('finesse_gender', trackFromGender, 'finesse');
  const finish = useLocalPref<CardFinish>('finesse_card_finish', (v) => (isCardFinish(v) ? v : DEFAULT_CARD_FINISH), DEFAULT_CARD_FINISH);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {data: {user}} = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setState({phase: 'signed_out'});
        return;
      }
      const [profileRes, guestsRes, eventRes] = await Promise.all([
        // Own row via the SECURITY DEFINER helper (private/VIP columns are not SELECT-granted, 20261020_s4).
        supabase.rpc('get_own_profile'),
        supabase.from('profiles').select('id, display_name, username, avatar_url, check_in')
          .neq('id', user.id).order('check_in', {ascending: false, nullsFirst: false}).limit(10),
        supabase.from('map_events').select('title, venue, starts_at, ends_at')
          .gt('ends_at', new Date().toISOString()).order('starts_at').limit(1),
      ]);
      const profile = ((profileRes.data ?? [])[0] ?? {}) as Profile;
      let balanceCents: number | null = null;
      if (vipActive(profile)) {
        try {
          const res = await fetch('/api/vault/balance');
          if (res.ok) balanceCents = ((await res.json()) as {balance_cents: number}).balance_cents;
        } catch { /* show the card without a balance */ }
      }
      if (cancelled) return;
      setState({
        phase: 'member',
        profile,
        guests: (guestsRes.data ?? []) as Guest[],
        // map_events may not exist before the live-map migration; that reads as "nothing booked".
        event: ((eventRes.data ?? [])[0] as NextEvent | undefined) ?? null,
        balanceCents,
      });
    })().catch(() => !cancelled && setState({phase: 'signed_out'}));
    return () => {
      cancelled = true;
    };
  }, []);

  return <LobbyView state={state} track={track} finish={finish} now={now} />;
}
