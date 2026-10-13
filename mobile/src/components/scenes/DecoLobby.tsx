// The Lobby, After Hours edition.
// - DecoLobby: the backdrop scene (used behind the side picker and the KeyLock): a noir room after dark,
//   rose smoke (Finesse) or cool platinum light (Carpe Diem), a chrome-ruled floor running to a lit bar.
//   Same props as before so every caller keeps working.
// - LobbyRoom: the Lobby inside the hotel (mirrors web lobby-view.tsx). Everything shown is real member data
//   or an honest empty state: who is signed in, their name from the identity endpoint, who has posted in the
//   Lounge, and their Vault balance. Nothing is invented when a call fails. Store builds leave out every room
//   lib/release.ts hides (the Vault card, the private lift, Backstage) — no link leads to a dead end.
// - HouseIndex: the 31-room manifest as a numbered index with floor tabs (shared with /lobby).
import {useEffect, useId, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Svg, {Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import Animated, {FadeIn, FadeInDown, useReducedMotion} from 'react-native-reanimated';
import type {Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {api} from '@/lib/api';
import {useMember} from '@/lib/member';
import {secureStorage} from '@/lib/secure-storage';
import {rooms, roomById, type Room} from '@/lib/registry';
import {Icon} from '@/lib/icons';
import {IS_STORE_BUILD, RELEASE, isRoomVisible} from '@/lib/release';
import {
  AHCard, AHChip, AHClock, AHDisplay, AHEyebrow, AHIndex, AHLiveDot, AHMemberCard, AHPill, AHRing, AHSection, AHSkeleton, AHSmoke,
  greetingFor, isFinish, type AHIndexItem, type Finish,
} from '@/components/ah';

/* ───────────────────────── backdrop scene ───────────────────────── */

const W = 400, H = 265, VX = 200, VY = 128; // vanishing point

const PAL: Record<Side, {a: string; b: string; c: string; slit: string}> = {
  her: {a: '#B76E79', b: '#8E4B55', c: '#F2C9B8', slit: '#F2C9B8'},
  him: {a: '#6D7076', b: '#3A3D44', c: '#E3E4E7', slit: '#E6E7E9'},
};

export function DecoLobby({side, style, dim = 0}: {side: Side; style?: object; dim?: number}) {
  const p = PAL[side];
  const id = `dl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const floorY = [0.1, 0.24, 0.42, 0.66, 1];
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#050505" /><Stop offset="0.5" stopColor="#0B0708" /><Stop offset="1" stopColor="#050505" /></LinearGradient>
          <RadialGradient id={`${id}s1`} cx={VX + 70} cy={VY - 50} r="170" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor={p.a} stopOpacity={0.55} /><Stop offset="1" stopColor={p.a} stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`${id}s2`} cx={VX - 110} cy={VY + 10} r="150" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor={p.b} stopOpacity={0.6} /><Stop offset="1" stopColor={p.b} stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`${id}pool`} cx={VX} cy={VY + 6} r="120" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor={p.c} stopOpacity={0.35} /><Stop offset="1" stopColor={p.c} stopOpacity={0} /></RadialGradient>
          <LinearGradient id={`${id}slit`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={p.slit} stopOpacity={0} /><Stop offset="0.5" stopColor={p.slit} stopOpacity={0.95} /><Stop offset="1" stopColor={p.slit} stopOpacity={0} /></LinearGradient>
          <RadialGradient id={`${id}vig`} cx={VX} cy={VY} r="260" gradientUnits="userSpaceOnUse"><Stop offset="0.4" stopColor="#000" stopOpacity={0} /><Stop offset="1" stopColor="#000" stopOpacity={0.9} /></RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill={`url(#${id}g)`} />
        <Rect x={0} y={0} width={W} height={H} fill={`url(#${id}s1)`} />
        <Rect x={0} y={0} width={W} height={H} fill={`url(#${id}s2)`} />
        {/* the bar: a long slit of light on the far wall */}
        <Rect x={VX - 130} y={VY - 2} width={260} height={2.5} fill={`url(#${id}slit)`} />
        <Ellipse cx={VX} cy={VY + 4} rx={150} ry={46} fill={`url(#${id}pool)`} />
        {/* chrome-ruled floor in one-point perspective */}
        {Array.from({length: 13}, (_, i) => {
          const x = -160 + i * 60;
          return <Path key={i} d={`M${VX + (x - VX) * 0.08} ${VY + 6} L${x} ${H}`} stroke="#FFFFFF" strokeOpacity={0.07} strokeWidth={0.7} />;
        })}
        {floorY.map((t) => {
          const y = VY + 6 + (H - VY - 6) * t;
          return <Path key={t} d={`M0 ${y} L${W} ${y}`} stroke="#FFFFFF" strokeOpacity={0.04 + t * 0.05} strokeWidth={0.7} />;
        })}
        {/* out-of-focus lights */}
        {[[62, 58, 9, 0.18], [318, 44, 13, 0.14], [348, 92, 6, 0.22], [104, 104, 5, 0.2], [262, 86, 7, 0.16], [30, 132, 11, 0.1]].map(([x, y, r, o], i) => (
          <Circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? p.c : '#FFFFFF'} opacity={o} />
        ))}
        <Rect x={0} y={0} width={W} height={H} fill={`url(#${id}vig)`} />
        {dim > 0 ? <Rect x={0} y={0} width={W} height={H} fill="#000" opacity={dim} /> : null}
      </Svg>
    </View>
  );
}

/* ───────────────────────── the house index ───────────────────────── */

// Floors, as on the web (src/lib/rooms/registry.ts RAILS).
export const FLOORS: {id: string; title: string; roomIds: string[]}[] = [
  {id: 'dock', title: 'The Dock', roomIds: ['lobby', 'bag', 'scale', 'vault', 'exchange', 'embassy']},
  {id: 'public', title: 'Public Rail', roomIds: ['lounge', 'entourage', 'clubhouse', 'jazz-club', 'stylist', 'salon', 'gym', 'kitchen', 'departures', 'ballroom']},
  {id: 'private', title: 'Private Rail', roomIds: ['this-is-you', 'closet', 'diary', 'camera', 'lab', 'archive', 'registry']},
  {id: 'system', title: 'Orchestrator Floor', roomIds: ['concierge', 'wardrobe', 'backstage', 'switchboard', 'nightvision', 'per-diem', 'carpe-diem', 'vip-room']},
];

const TRUTH: Record<Room['truthState'], string> = {wired: 'Live', preview: 'Preview', specified: 'In preparation', gated: 'Key'};

/** Numbered index of the 31 rooms, one floor at a time. `onPick` receives the manifest room. */
export function HouseIndex({onPick, bleed = 0}: {onPick: (room: Room) => void; bleed?: number}) {
  const [floor, setFloor] = useState(FLOORS[0].id);
  const items: AHIndexItem[] = useMemo(() => (FLOORS.find((f) => f.id === floor)?.roomIds ?? [])
    .filter(isRoomVisible)
    .map((rid) => roomById(rid)).filter((r): r is Room => Boolean(r))
    .map((r) => {
      const key = r.id === 'vip-room' || r.truthState === 'gated';
      return {key: r.id, number: r.number, name: r.name, sub: r.primaryAction, tag: key ? 'Key' : IS_STORE_BUILD && r.truthState !== 'wired' ? undefined : TRUTH[r.truthState], tagTone: key ? 'key' as const : r.truthState === 'wired' ? 'live' as const : undefined, onPress: () => onPick(r)};
    }), [floor, onPick]);
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" style={{marginHorizontal: -bleed, marginBottom: 6}} contentContainerStyle={{gap: 8, paddingHorizontal: bleed, paddingBottom: 6}}>
        {FLOORS.map((f) => {
          const on = f.id === floor;
          return (
            <Pressable key={f.id} onPress={() => setFloor(f.id)} accessibilityRole="tab" accessibilityState={{selected: on}} accessibilityLabel={f.title}
              style={{minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: on ? ah.white : ah.line2, backgroundColor: on ? ah.white : 'transparent'}}>
              <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 13, color: on ? '#000' : ah.text}}>{f.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <AHIndex items={items} />
      {RELEASE.vip ? (
        <Text style={{marginTop: 14, fontFamily: ahFonts.sans, fontSize: 12, lineHeight: 17, color: ah.faint}}>
          The Penthouse is reached by the private lift inside the VIP Room.
        </Text>
      ) : null}
    </View>
  );
}

/* ───────────────────────── the Lobby room ───────────────────────── */

type Post = {id: string; profiles?: {display_name?: string; username?: string} | null};
type Balance = {balance_cents: number};
const FINISH_KEY = 'finesse_card_finish'; // read only; the Vault owns this choice
const money = (c: number) => (c / 100).toLocaleString('en-US', {style: 'currency', currency: 'USD'});

// Rooms reached from the Lobby that are off the rails (hotel ids).
const ALSO_ALL = [
  {id: 'ballroom', label: 'The Ballroom', note: 'Compose an evening'},
  {id: 'club', label: 'The Club', note: 'News · money · cars · locker room'},
  {id: 'closet', label: 'The Closet', note: 'The week, from pieces you own'},
  {id: 'diary', label: 'The Diary', note: 'The day on one page'},
  {id: 'camera', label: 'The Camera', note: 'Private intake, with consent'},
  {id: 'jazz-club', label: 'Jazz Club', note: 'Down the back stair'},
];
const ALSO = ALSO_ALL.filter((r) => isRoomVisible(r.id));
/** Rooms the directory can open in this build (the count shown on the Lobby). */
export const visibleRoomCount = rooms.filter((r) => isRoomVisible(r.id)).length;

const firstWord = (s: string) => s.trim().split(/\s+/)[0] ?? s;

function Link2({label, onPress}: {label: string; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={14}>
      <Text style={{fontFamily: ahFonts.sans, fontSize: 12, color: ah.mute}}>{label} →</Text>
    </Pressable>
  );
}

/** The Lobby inside the hotel. `onPick` opens a hotel room by hotel id; `onManifest` opens a manifest room. */
export function LobbyRoom({side, onPick, onManifest, width}: {side: Side; onPick: (id: string) => void; onManifest: (room: Room) => void; width: number}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const member = useMember();
  const houseName = side === 'her' ? 'Finesse' : 'Carpe Diem';
  const [name, setName] = useState<string | null | undefined>(undefined);
  const [guests, setGuests] = useState<string[]>([]);
  const [balance, setBalance] = useState<number | null | undefined>(undefined);
  const [finish, setFinish] = useState<Finish>('nano_black');
  const signedIn = Boolean(member);

  useEffect(() => {
    secureStorage.getItem(FINISH_KEY).then((v) => { if (isFinish(v)) setFinish(v); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!signedIn) { setName(undefined); setBalance(undefined); return; }
    let alive = true;
    api<{self?: {display_name?: string | null; username?: string | null}}>('/api/identity/context').then((r) => {
      if (!alive) return;
      const n = r.ok ? (r.body.self?.display_name || r.body.self?.username || null) : null;
      setName(n ? firstWord(n) : null);
    });
    if (RELEASE.vault) {
      api<Balance>('/api/vault/balance').then((r) => {
        if (alive) setBalance(r.ok && typeof r.body.balance_cents === 'number' ? r.body.balance_cents : null);
      });
    }
    return () => { alive = false; };
  }, [signedIn]);

  useEffect(() => {
    let alive = true;
    api<{posts?: Post[]; data?: Post[]}>('/api/posts?page=1').then((r) => {
      if (!alive || !r.ok) return;
      const seen = new Set<string>();
      for (const p of r.body.posts ?? r.body.data ?? []) {
        const n = p.profiles?.display_name || p.profiles?.username;
        if (n) seen.add(firstWord(n));
        if (seen.size >= 8) break;
      }
      setGuests([...seen]);
    });
    return () => { alive = false; };
  }, []);

  const pad = 16;
  const inner = width - pad * 2;
  const enter = (d: number) => (reduce ? undefined : FadeInDown.duration(500).delay(d));
  const display = `${name ?? (side === 'her' ? 'darling' : 'sir')}.`;
  const displaySize = Math.round(Math.min(58, inner / (display.length * 0.42)));

  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(500)} style={{paddingHorizontal: pad, paddingTop: 22}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18}}>
        <AHEyebrow>The Lobby</AHEyebrow>
        <AHClock />
      </View>

      {/* greeting */}
      {member === undefined || (member && name === undefined) ? (
        <View accessibilityLabel="Loading" accessibilityState={{busy: true}}>
          <AHSkeleton h={14} w={110} />
          <AHSkeleton h={54} w="70%" style={{marginTop: 12}} />
          <AHSkeleton h={12} w={160} style={{marginTop: 14}} />
        </View>
      ) : member ? (
        <View>
          <Text style={{fontFamily: ahFonts.sans, fontSize: 14, color: ah.mute}}>{greetingFor(new Date())}</Text>
          <AHDisplay size={displaySize}>{display}</AHDisplay>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8}}>
            <AHLiveDot />
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: ah.mute}}>{houseName} member</Text>
          </View>
        </View>
      ) : (
        <View>
          <AHEyebrow>{houseName} · By invitation</AHEyebrow>
          <AHDisplay size={Math.min(56, Math.round(inner / 3.6))} style={{marginTop: 8}}>Welcome.</AHDisplay>
          <Text style={{marginTop: 10, marginBottom: 20, fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.mute}}>
            {RELEASE.vault
              ? 'A private house for the night: guest lists, the Vault, Nova and the people worth knowing. Members only.'
              : 'A private house for the night: guest lists, Nova and the people worth knowing. Members only.'}
          </Text>
          <AHPill label="Sign in" onPress={() => router.push('/sign-in')} />
        </View>
      )}

      {/* who's been in: real Lounge posters only; hidden when there are none */}
      {guests.length > 0 && (
        <Animated.View entering={enter(100)}>
          <AHSection title="Who’s been in" action={<Link2 label="The Lounge" onPress={() => onPick('lounge')} />}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal: -pad}} contentContainerStyle={{gap: 12, paddingHorizontal: pad}}>
              {guests.map((g) => <AHRing key={g} name={g} size={58} onPress={() => onPick('entourage')} />)}
            </ScrollView>
          </AHSection>
        </Animated.View>
      )}

      {/* tonight: the app has no events feed yet, so this is an honest empty state that hands off to Nova */}
      <Animated.View entering={enter(160)}>
        <AHSection title="Tonight">
          <Pressable onPress={() => onPick('concierge')} accessibilityRole="button" accessibilityLabel="Tonight. Nothing on the books yet. Plan the night with Nova.">
            <AHSmoke tone={side === 'her' ? 'rose' : 'city'} aspect={1 / 1.18} top={<AHChip label="Your evening" />}>
              <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 34, lineHeight: 36, color: ah.white}}>The city, tonight.</Text>
              <Text style={{marginTop: 8, marginBottom: 14, fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.72)'}}>Nothing on the books yet. Ring Nova and she will draft the evening for your approval.</Text>
              <View style={{alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 18, borderRadius: 999, backgroundColor: ah.white, justifyContent: 'center'}}>
                <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: '#000'}}>Plan the night</Text>
              </View>
            </AHSmoke>
          </Pressable>
        </AHSection>
      </Animated.View>

      {/* the card: real balance when the Vault answers */}
      {member && RELEASE.vault ? (
        <Animated.View entering={enter(220)}>
          <AHSection title="Your card" action={<Link2 label="The Vault" onPress={() => onPick('vault')} />}>
            <Pressable onPress={() => onPick('vault')} accessibilityRole="button" accessibilityLabel={`Your card. ${typeof balance === 'number' ? money(balance) : 'Open the Vault'}`} style={{paddingBottom: 14}}>
              {balance === undefined ? <AHSkeleton h={Math.round(inner / 1.586)} r={20} /> : (
                <AHMemberCard finish={finish} big={typeof balance === 'number' ? money(balance) : 'The Vault'} right="12% back" />
              )}
            </Pressable>
            {balance === null ? <Text style={{fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 19, color: ah.mute}}>The Vault opens with a key. Your balance shows here once it answers.</Text> : null}
          </AHSection>
        </Animated.View>
      ) : null}

      {/* the concierge */}
      <Animated.View entering={enter(280)}>
        <AHSection title="The Concierge">
          <Pressable onPress={() => onPick('concierge')} accessibilityRole="button" accessibilityLabel="Nova, on call. Open the Concierge">
            <AHCard glass>
              <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 26, lineHeight: 28, color: ah.text}}>Nova, on call.</Text>
              <Text style={{marginTop: 6, marginBottom: 14, fontFamily: ahFonts.sans, fontSize: 13, color: ah.mute}}>Tables, looks, routes, the whole evening.</Text>
              <View style={{minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: ah.line2, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 14, justifyContent: 'center'}}>
                <Text numberOfLines={1} style={{fontFamily: ahFonts.sans, fontSize: 14, color: ah.faint}}>Get us a table for four…</Text>
              </View>
            </AHCard>
          </Pressable>
        </AHSection>
      </Animated.View>

      {/* the private lift */}
      {RELEASE.vip ? <Animated.View entering={enter(320)}>
        <Pressable onPress={() => router.push('/penthouse')} accessibilityRole="button" accessibilityLabel="The private lift to the Penthouse. By invitation."
          style={({pressed}) => ({marginTop: 28, opacity: pressed ? 0.8 : 1})}>
          <AHCard style={{flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: 'rgba(232,180,160,0.28)'}} pad={16}>
            <View style={{width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(232,180,160,0.4)', backgroundColor: 'rgba(232,180,160,0.08)'}}>
              <Icon name="crown" size={18} color={ah.rose} />
            </View>
            <View style={{flex: 1}}>
              <AHEyebrow color={ah.rose} style={{fontSize: 11}}>By invitation</AHEyebrow>
              <Text style={{marginTop: 4, fontFamily: ahFonts.serif, fontSize: 24, lineHeight: 26, color: ah.text}}>The private lift</Text>
            </View>
            <Text style={{color: ah.mute, fontSize: 16}}>→</Text>
          </AHCard>
        </Pressable>
      </Animated.View> : null}

      {/* off the rails */}
      <AHSection title="Also in the house">
        <AHIndex items={ALSO.map((r, i) => ({key: r.id, number: i + 1, name: r.label, sub: r.note, onPress: () => onPick(r.id)}))} />
      </AHSection>

      <AHSection title={`The house · ${visibleRoomCount} rooms`}>
        <HouseIndex onPick={onManifest} bleed={pad} />
      </AHSection>
    </Animated.View>
  );
}
