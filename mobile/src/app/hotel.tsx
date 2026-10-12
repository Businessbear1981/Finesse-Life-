// The hotel, After Hours edition (mirrors web src/components/finesse-layout.tsx): a glass top bar with the
// profile circle, chrome wordmark and VIP crown; two quiet room rails; a glass dock with the rose-gold Nova
// orb; the room in the middle. Rooms without an interior yet say so.
import {useCallback, useEffect, useId, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, LinearGradient, RadialGradient, Stop, Text as SvgText} from 'react-native-svg';
import {Icon} from '@/lib/icons';
import {houseSession, useSide} from '@/lib/session';
import {supabase} from '@/lib/supabase';
import {liftToken} from '@/lib/api';
import {ContentWidth} from '@/lib/layout';
import {ah, ahFonts, chromeStops} from '@/lib/ah';
import {hotelId} from '@/lib/room-ids';
import type {Room} from '@/lib/registry';
import {LobbyRoom} from '@/components/scenes/DecoLobby';
import {AHCard, AHEyebrow, AHLiveDot, AHPill, AHTitle} from '@/components/ah';
import {INTERIORS, LIVE_ROOMS} from '@/components/rooms/interiors';

type RoomDef = {id: string; label: string; icon: string; wing: string; line: string; cta: string};
const RM = (id: string, label: string, icon: string, wing: string, line = '', cta = ''): RoomDef => ({id, label, icon, wing, line, cta});

// Rails exactly as the design lays them out (L_HER / L_HIM / R_HER / R_HIM / D_L / D_R).
const L_HER = [
  RM('lobby', 'Lobby', 'hotel', 'ARRIVAL'),
  RM('wardrobe', 'Wardrobe', 'shirt', 'PRIVATE LIFE', 'Moving rail, editorial look cards, missing-piece intelligence.', 'COMPOSE A LOOK'),
  RM('bag', 'Bag', 'briefcase', 'PUBLIC FLOOR', 'Honest price desk, source visibility, price history, partner handoff.', 'REVIEW PURCHASE'),
  RM('registry', 'Registry', 'gift', 'PUBLIC FLOOR', 'Occasion cards and an outing-linked wish list.', 'ADD A WISH'),
  RM('nightvision', 'NightVision', 'eye', 'ORCHESTRATOR', 'Observatory of taste and behavior, explainable signals.', 'REVIEW MY PROFILE'),
  RM('stylist', 'Stylist', 'scissors', 'PRIVATE LIFE', 'Dressing room with note on mirror, AI shortlist plus human edit.', 'REVIEW THE BOX'),
  RM('salon', 'Salon', 'sparkles', 'PUBLIC FLOOR', 'Appointment cards, soft lamp glow, ritual timeline.', 'CONFIRM APPOINTMENT'),
  RM('kitchen', 'Kitchen', 'chefhat', 'PRIVATE LIFE', 'Meal plan table, calorie ledger, one order.', 'CONFIRM THE ORDER'),
  RM('gym', 'Gym', 'dumbbell', 'PRIVATE LIFE', 'Private gym at dawn, set logging, rest timer, recovery light.', 'LOG THE SET'),
];
const L_HIM = [L_HER[0], L_HER[1], L_HER[2], RM('perdiem', 'Per Diem', 'wallet', 'PRIVATE LIFE', 'Date and event planner, built around your budget.', 'PLAN THE NIGHT'), L_HER[4],
  RM('market', 'Market', 'store', 'PUBLIC FLOOR', 'Partner market, disclosed offers, honest prices.', 'BROWSE'),
  RM('clubhouse', 'Game Room', 'gamepad2', 'PUBLIC FLOOR', 'Poker, Spades, Dominoes, Rummy and the Book.', 'TAKE A SEAT'), L_HER[5], L_HER[7], L_HER[8]];
const R_HER = [
  RM('archive', 'Scrapbook', 'clapperboard', 'PRIVATE LIFE', 'Seasons and chapters of your life.', 'OPEN THE SCRAPBOOK'),
  RM('lounge', 'Lounge', 'martini', 'PUBLIC FLOOR'),
  RM('entourage', 'Entourage', 'users', 'PRIVATE LIFE', 'Dossiers on the people you love.', 'OPEN A DOSSIER'),
  RM('lab', 'Lab', 'flaskconical', 'ORCHESTRATOR', 'Nova drafts posts; you approve.', 'REVIEW DRAFTS'),
  RM('starmaker', 'Starmaker', 'mic', 'PUBLIC FLOOR'),
  RM('switchboard', 'Switchboard', 'phone', 'ARRIVAL', 'Connected accounts and consent.', 'CONNECT AN ACCOUNT'),
  RM('calendar', 'Calendar', 'calendardays', 'PRIVATE LIFE', 'Nova finds time and moves things.', 'OPEN THE DAY'),
  RM('clubhouse', 'Game Room', 'gamepad2', 'PUBLIC FLOOR', 'Poker, Spades, Dominoes, Rummy and the Book.', 'TAKE A SEAT'),
  RM('departures', 'Depart', 'plane', 'ARRIVAL', 'Boarding pass, composed itinerary, live weather.', 'COMPOSE A DEPARTURE'),
];
const R_HIM = [R_HER[0], R_HER[1], R_HER[2], R_HER[3], R_HER[4], R_HER[5], R_HER[6],
  RM('carpe-diem', 'Carpe Diem', 'trendingup', 'PRIVATE LIFE', 'Performance brief and portfolio, on a sharper track.', "OPEN TODAY'S BRIEF"), R_HER[8]];
const D_L = [RM('vault', 'Vault', 'lock', 'ORCHESTRATOR'), RM('scale', 'Scale', 'scale', 'PUBLIC FLOOR', 'Group buys: the price falls as people join.', 'JOIN A BUY')];
const D_R = [RM('exchange', 'Exchange', 'trendingup', 'PUBLIC FLOOR', 'Consign with provenance and offers.', 'CONSIGN A PIECE'), RM('embassy', 'Embassy', 'building2', 'ARRIVAL', 'Partner offers, fully disclosed.', 'SEE THE OFFERS')];
const PROFILE = RM('profile', 'This Is You', 'user', 'PRIVATE LIFE', 'Portrait room. Your stats, how others see you, your traffic.', 'EDIT WHAT OTHERS SEE');
const NOVA = RM('concierge', 'Nova', 'power', 'ORCHESTRATOR');
// Rooms off the rails, reached from the Lobby directory.
const HOUSE = [RM('ballroom', 'Ballroom', 'sparkles', 'PUBLIC FLOOR'), RM('club', 'The Club', 'briefcase', 'PUBLIC FLOOR'),
  RM('closet', 'The Closet', 'shirt', 'PRIVATE LIFE'), RM('diary', 'The Diary', 'bookopen', 'PRIVATE LIFE'), RM('camera', 'The Camera', 'camera', 'ORCHESTRATOR'), RM('jazz-club', 'Jazz Club', 'music', 'PUBLIC FLOOR')];
// Interiors (and which of them are live) are registered in components/rooms/interiors.ts, shared with /room/[id].
const BUILT = INTERIORS;
const TOP = 60;

/** "COMPOSE A LOOK" → "Compose a look". */
const sentence = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const WING: Record<string, string> = {'ARRIVAL': 'Arrival', 'PRIVATE LIFE': 'Private life', 'PUBLIC FLOOR': 'Public floor', 'ORCHESTRATOR': 'Orchestrator'};

// Rooms that open with their own hero title; the shell shows only the status line above them.
const SELF_HEADED = new Set(['vault', 'lounge', 'concierge']);
export default function HotelScreen() {
  const side = useSide();
  const her = side === 'her';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const [room, setRoom] = useState('lobby');
  const left = her ? L_HER : L_HIM, right = her ? R_HER : R_HIM;
  const all = useMemo(() => [...left, ...right, ...D_L, ...D_R, PROFILE, NOVA, ...HOUSE], [left, right]);
  const current = all.find((r) => r.id === room) ?? L_HER[0];
  // Phones get a narrow rail (icon + tiny label) so the room in the middle has the width.
  const rail = width < 480 ? 52 : 72;
  const contentW = width - rail * 2;
  const novaOn = room === 'concierge';
  const Built = BUILT[room];
  const live = LIVE_ROOMS.has(current.id);

  // A room from the house index: open it here when the hotel has it, otherwise on its own page.
  const openManifest = useCallback((r: Room) => {
    const id = hotelId(r.id);
    if (r.id === 'vip-room') router.push('/penthouse');
    else if (all.some((x) => x.id === id)) setRoom(id);
    else router.push({pathname: '/room/[id]', params: {id: r.id}});
  }, [all, router]);

  return (
    <View style={styles.page}>
      <View style={[styles.top, {paddingTop: insets.top, height: TOP + insets.top}]}>
        <RoundButton label="This Is You, your profile" active={room === 'profile'} onPress={() => setRoom('profile')}>
          <Icon name="user" size={16} color={room === 'profile' ? ah.white : ah.mute} />
        </RoundButton>
        <Pressable onPress={() => setRoom('lobby')} accessibilityRole="button" accessibilityLabel={`${her ? 'Finesse' : 'Carpe Diem'}, return to the Lobby`} style={styles.markHit}>
          <ChromeMark label={her ? 'FINESSE' : 'CARPE DIEM'} />
        </Pressable>
        <RoundButton label="VIP, the Private Lift" active={false} vip onPress={() => router.push('/penthouse')}>
          <Icon name="crown" size={16} color={ah.rose} />
        </RoundButton>
      </View>

      <View style={{flex: 1, flexDirection: 'row'}}>
        <Rail rooms={left} room={room} onPick={setRoom} edge="left" width={rail} />
        <ContentWidth.Provider value={contentW - 24}>
          <ScrollView key={room} style={{flex: 1}} contentContainerStyle={{paddingBottom: 48}} showsVerticalScrollIndicator={false}>
            {room === 'lobby' ? <LobbyRoom side={side} onPick={setRoom} onManifest={openManifest} width={contentW} /> : (
              <Animated.View entering={FadeIn.duration(400)} style={{paddingHorizontal: 12, paddingTop: 22, gap: 14}}>
                <View style={{gap: 8}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    {live ? <AHLiveDot color={ah.ok} /> : <View style={{width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: ah.faint}} />}
                    <AHEyebrow style={{fontSize: 10, letterSpacing: 1.6}} color={live ? ah.ok : ah.mute}>{live ? 'Room on' : 'Sample room'} · {WING[current.wing] ?? current.wing}</AHEyebrow>
                  </View>
                  {!SELF_HEADED.has(room) && <AHTitle size={38}>{current.label}</AHTitle>}
                  {!SELF_HEADED.has(room) && current.line ? <Text style={styles.roomLine}>{current.line}</Text> : null}
                </View>
                {Built ? <View style={{gap: 14}}><Built side={side} /></View> : <Interior room={current} />}
                {room === 'profile' ? <AccountDesk /> : null}
              </Animated.View>
            )}
          </ScrollView>
        </ContentWidth.Provider>
        <Rail rooms={right} room={room} onPick={setRoom} edge="right" width={rail} />
      </View>

      <View style={[styles.dock, {paddingBottom: insets.bottom, height: 70 + insets.bottom}]}>
        {D_L.map((d) => <DockButton key={d.id} r={d} active={room === d.id} onPress={() => setRoom(d.id)} />)}
        <NovaButton on={novaOn} onPress={() => setRoom(novaOn ? 'lobby' : 'concierge')} />
        {D_R.map((d) => <DockButton key={d.id} r={d} active={room === d.id} onPress={() => setRoom(d.id)} />)}
      </View>
    </View>
  );
}

/** The wordmark in chrome (gradient text). */
function ChromeMark({label}: {label: string}) {
  const id = `cm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const size = 12, ls = size * 0.42;
  const w = Math.ceil(label.length * (size * 0.68 + ls)) + 8;
  return (
    <Svg width={w} height={22}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {chromeStops.map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />)}
        </LinearGradient>
      </Defs>
      <SvgText x={w / 2 + ls / 2} y={16} textAnchor="middle" fill={`url(#${id})`} fontFamily={ahFonts.sansBold} fontSize={size} letterSpacing={ls}>{label}</SvgText>
    </Svg>
  );
}

function RoundButton({children, label, active, vip, onPress}: {children: React.ReactNode; label: string; active: boolean; vip?: boolean; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected: active}} hitSlop={6} style={styles.roundHit}>
      <View style={[styles.round, vip
        ? {borderColor: 'rgba(232,180,160,0.35)', backgroundColor: 'rgba(232,180,160,0.06)'}
        : {borderColor: active ? 'rgba(255,255,255,0.35)' : ah.line2}]}>
        {children}
      </View>
    </Pressable>
  );
}

/** Soft rose light behind the active rail tile. */
function RoseGlow({size}: {size: number}) {
  const id = `rg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg pointerEvents="none" width={size} height={size} style={{position: 'absolute'}}>
      <Defs><RadialGradient id={id} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={ah.rose2} stopOpacity={0.34} /><Stop offset="1" stopColor={ah.rose2} stopOpacity={0} /></RadialGradient></Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

function Rail({rooms, room, onPick, edge, width}: {rooms: RoomDef[]; room: string; onPick: (id: string) => void; edge: 'left' | 'right'; width: number}) {
  const narrow = width < 60;
  return (
    <View style={[styles.rail, {width}, edge === 'left' ? {borderRightWidth: 1} : {borderLeftWidth: 1}]}>
      {rooms.map((r, i) => {
        const on = r.id === room;
        return (
          <Pressable key={`${r.id}${i}`} onPress={() => onPick(r.id)} accessibilityRole="button" accessibilityLabel={r.label} accessibilityState={{selected: on}}
            style={({pressed}) => [styles.railItem, {opacity: pressed ? 0.6 : 1}]}>
            {on ? <RoseGlow size={width - 6} /> : null}
            <Icon name={r.icon} size={19} color={on ? ah.white : ah.mute} strokeWidth={on ? 2 : 1.5} />
            <Text style={[styles.railLabel, {fontSize: narrow ? 8 : 9, color: on ? ah.white : ah.faint}]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{r.label}</Text>
            <View style={[styles.dot, on && {backgroundColor: ah.rose, shadowColor: ah.rose, shadowOpacity: 0.9}]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function DockButton({r, active, onPress}: {r: RoomDef; active: boolean; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={r.label} accessibilityState={{selected: active}}
      style={({pressed}) => [styles.dockItem, {opacity: pressed ? 0.6 : 1}]}>
      <Icon name={r.icon} size={20} color={active ? ah.white : ah.mute} strokeWidth={active ? 2 : 1.5} />
      <Text style={[styles.dockLabel, {color: active ? ah.rose : ah.faint}]}>{r.label}</Text>
    </Pressable>
  );
}

/** Nova: the rose-gold orb in the middle of the dock. Same switch as before: on opens the Concierge. */
function NovaButton({on, onPress}: {on: boolean; onPress: () => void}) {
  const reduce = useReducedMotion();
  const id = `no${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const glow = useSharedValue(0.45);
  useEffect(() => {
    if (on && !reduce) glow.value = withRepeat(withSequence(withTiming(1, {duration: 1400}), withTiming(0.6, {duration: 1400})), -1, true);
    else glow.value = withTiming(on ? 1 : 0.45, {duration: 300});
  }, [on, reduce, glow]);
  const halo = useAnimatedStyle(() => ({opacity: glow.value}));
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{checked: on}} accessibilityLabel="Nova on or off" style={styles.nova}>
      <View style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}>
        <Animated.View pointerEvents="none" style={[{position: 'absolute', left: -14, top: -14, width: 72, height: 72}, halo]}>
          <Svg width={72} height={72}><Defs><RadialGradient id={`${id}h`} cx="50%" cy="50%" r="50%"><Stop offset="0.4" stopColor={ah.rose2} stopOpacity={0.6} /><Stop offset="1" stopColor={ah.rose2} stopOpacity={0} /></RadialGradient></Defs><Circle cx={36} cy={36} r={36} fill={`url(#${id}h)`} /></Svg>
        </Animated.View>
        <Svg width={40} height={40} style={{position: 'absolute', left: 2, top: 2}}>
          <Defs><LinearGradient id={`${id}o`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={ah.blush} /><Stop offset="1" stopColor={ah.rose2} /></LinearGradient></Defs>
          {on ? <Circle cx={20} cy={20} r={19.5} fill="none" stroke={ah.blush} strokeWidth={1} /> : null}
          <Circle cx={20} cy={20} r={on ? 16.5 : 18} fill={`url(#${id}o)`} />
        </Svg>
        <View style={{position: 'relative', zIndex: 2}}><Icon name="bell" size={17} color="#2A1014" strokeWidth={1.9} /></View>
      </View>
      <Text style={[styles.dockLabel, {color: on ? ah.rose : ah.text}]}>{on ? 'Nova on' : 'Nova'}</Text>
    </Pressable>
  );
}

/** Account controls under This Is You: who is signed in, change side of the house, sign out. */
function AccountDesk() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setEmail(data.session?.user.email ?? null)).catch(() => setEmail(null));
    const {data: sub} = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const signOut = async () => {
    setBusy(true);
    await liftToken.clear().catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    setBusy(false);
  };
  const other = houseSession.getSide() === 'her' ? 'Carpe Diem' : 'Finesse';
  return (
    <AHCard style={{marginTop: 6, gap: 12}} pad={16}>
      <AHEyebrow>Your key</AHEyebrow>
      <Text style={styles.roomLine}>{email === undefined ? 'Checking…' : email ? `Signed in as ${email}` : 'You are not signed in on this device.'}</Text>
      {email ? (
        <AHPill label={busy ? 'One moment…' : 'Sign out'} variant="ghost" block disabled={busy} onPress={signOut} />
      ) : email === null ? (
        <AHPill label="Sign in" block onPress={() => router.push('/sign-in')} />
      ) : null}
      <AHPill label="Change side of the house" variant="ghost" block accessibilityLabel={`Change side of the house to ${other}`} onPress={() => router.replace('/side')} />
      {email ? (
        <Pressable onPress={() => router.push('/delete-account')} accessibilityRole="button" accessibilityLabel="Delete account" style={styles.danger}>
          <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: ah.danger}}>Delete account</Text>
        </Pressable>
      ) : null}
    </AHCard>
  );
}

function Interior({room}: {room: RoomDef}) {
  return (
    <View style={{gap: 14}}>
      <AHCard pad={0} style={{height: 170, alignItems: 'center', justifyContent: 'center'}}>
        <RoseGlow size={170} />
        <Icon name={room.icon} size={40} color={ah.rose} strokeWidth={1.2} />
      </AHCard>
      <AHPill label={sentence(room.cta) || 'Enter'} block disabled />
      <Text style={styles.note}>This interior is being prepared.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: ah.ink},
  top: {paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: ah.line, backgroundColor: 'rgba(5,5,5,0.92)'},
  markHit: {minHeight: 44, minWidth: 120, alignItems: 'center', justifyContent: 'center'},
  roundHit: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  round: {width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)'},
  rail: {backgroundColor: 'rgba(5,5,5,0.9)', borderColor: ah.line, paddingVertical: 4},
  railItem: {flex: 1, minHeight: 46, maxHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2},
  railLabel: {fontFamily: ahFonts.sansSemi, letterSpacing: 0.2, textAlign: 'center', maxWidth: '100%'},
  dot: {width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent', shadowRadius: 6, shadowOffset: {width: 0, height: 0}, shadowOpacity: 0},
  dock: {flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderColor: ah.line, backgroundColor: 'rgba(5,5,5,0.94)'},
  dockItem: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56},
  dockLabel: {fontFamily: ahFonts.sansSemi, fontSize: 10, letterSpacing: 0.6},
  nova: {flex: 1.1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 56},
  roomLine: {fontFamily: ahFonts.sans, fontSize: 14, lineHeight: 20, color: ah.mute},
  note: {fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.faint, textAlign: 'center'},
  danger: {minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,138,160,0.4)', alignItems: 'center', justifyContent: 'center'},
});
