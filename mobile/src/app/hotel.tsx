// The hotel: top bar, two brass room rails, the dock with Nova's power button, and the room in the
// middle — composed after the Finesse design (the "Payload shell"). Rooms without an interior yet say so.
import {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {BEZEL_STOPS, conicRing, deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {useSide} from '@/lib/session';
import {ContentWidth} from '@/lib/layout';
import {DecoLobby} from '@/components/scenes/DecoLobby';
import {Lounge} from '@/components/rooms/Lounge';
import {Concierge} from '@/components/rooms/Concierge';
import {Vault} from '@/components/rooms/Vault';
import {Wardrobe} from '@/components/rooms/Wardrobe';
import {Gym} from '@/components/rooms/Gym';
import {Calendar} from '@/components/rooms/Calendar';
import {Kitchen} from '@/components/rooms/Kitchen';
import {Salon} from '@/components/rooms/Salon';
import {Scrapbook} from '@/components/rooms/Scrapbook';
import {Stylist} from '@/components/rooms/Stylist';
import {Starmaker} from '@/components/rooms/Starmaker';
import {Depart} from '@/components/rooms/Depart';
import {Entourage} from '@/components/rooms/Entourage';
import {Scale, Exchange, Embassy} from '@/components/rooms/Market';
import {Bag, Registry, Lab, Switchboard} from '@/components/rooms/Social';
import {NightVision, GameRoom, PerDiem} from '@/components/rooms/Lifestyle';
import {Profile} from '@/components/rooms/Penthouse';
import {CarpeDiem, Market, Ballroom, JazzClub} from '@/components/rooms/House';

type RoomDef = {id: string; label: string; icon: string; wing: string; line: string; cta: string};
const RM = (id: string, label: string, icon: string, wing: string, line = '', cta = ''): RoomDef => ({id, label, icon, wing, line, cta});

// Rails exactly as the design lays them out (L_HER / L_HIM / R_HER / R_HIM / D_L / D_R).
const L_HER = [
  RM('lobby', 'Lobby', 'hotel', 'ARRIVAL'),
  RM('wardrobe', 'Wardrobe', 'shirt', 'PRIVATE LIFE', 'Moving rail, editorial look cards, missing-piece intelligence.', 'COMPOSE A LOOK'),
  RM('bag', 'Bag', 'briefcase', 'PUBLIC FLOOR', 'Honest price desk, source visibility, price history, partner handoff.', 'REVIEW PURCHASE'),
  RM('registry', 'Registry', 'gift', 'PUBLIC FLOOR', 'Gold-ruled registry, occasion cards, outing-linked wish list.', 'ADD A WISH'),
  RM('nightvision', 'NightVision', 'eye', 'ORCHESTRATOR', 'Observatory of taste and behavior, explainable signals.', 'REVIEW MY PROFILE'),
  RM('stylist', 'Stylist', 'scissors', 'PRIVATE LIFE', 'Dressing room with note on mirror, AI shortlist plus human edit.', 'REVIEW THE BOX'),
  RM('salon', 'Salon', 'sparkles', 'PUBLIC FLOOR', 'Gold-framed appointment cards, soft lamp glow, ritual timeline.', 'CONFIRM APPOINTMENT'),
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
  RM('departures', 'Depart', 'plane', 'ARRIVAL', 'Boarding pass in gold foil, composed itinerary, live weather.', 'COMPOSE A DEPARTURE'),
];
const R_HIM = [R_HER[0], R_HER[1], R_HER[2], R_HER[3], R_HER[4], R_HER[5], R_HER[6],
  RM('carpe-diem', 'Carpe Diem', 'trendingup', 'PRIVATE LIFE', 'Sharper amber track, performance brief, portfolio.', "OPEN TODAY'S BRIEF"), R_HER[8]];
const D_L = [RM('vault', 'Vault', 'lock', 'ORCHESTRATOR'), RM('scale', 'Scale', 'scale', 'PUBLIC FLOOR', 'Group buys: the price falls as people join.', 'JOIN A BUY')];
const D_R = [RM('exchange', 'Exchange', 'trendingup', 'PUBLIC FLOOR', 'Consign with provenance and offers.', 'CONSIGN A PIECE'), RM('embassy', 'Embassy', 'building2', 'ARRIVAL', 'Partner offers, fully disclosed.', 'SEE THE OFFERS')];
const PROFILE = RM('profile', 'This Is You', 'user', 'PRIVATE LIFE', 'Portrait room. Your stats, how others see you, your traffic.', 'EDIT WHAT OTHERS SEE');
const NOVA = RM('concierge', 'Nova', 'power', 'ORCHESTRATOR');
// Rooms off the rails, reached from the Lobby directory.
const HOUSE = [RM('ballroom', 'Ballroom', 'sparkles', 'PUBLIC FLOOR'), RM('jazzclub', 'Jazz Club', 'music', 'PUBLIC FLOOR')];
const BUILT: Record<string, (p: {side: Side}) => React.JSX.Element> = {lounge: Lounge, concierge: Concierge, vault: Vault, wardrobe: Wardrobe, gym: Gym, calendar: Calendar, kitchen: Kitchen, salon: Salon, archive: Scrapbook, stylist: Stylist, starmaker: Starmaker, departures: Depart, entourage: Entourage, scale: Scale, exchange: Exchange, embassy: Embassy, bag: Bag, registry: Registry, lab: Lab, switchboard: Switchboard, nightvision: NightVision, clubhouse: GameRoom, perdiem: PerDiem, profile: Profile, 'carpe-diem': CarpeDiem, market: Market, ballroom: Ballroom, jazzclub: JazzClub};
const RAIL = 58;

export default function HotelScreen() {
  const side = useSide();
  const her = side === 'her';
  const acc = track[side].acc;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const [room, setRoom] = useState('lobby');
  const left = her ? L_HER : L_HIM, right = her ? R_HER : R_HIM;
  const all = useMemo(() => [...left, ...right, ...D_L, ...D_R, PROFILE, NOVA, ...HOUSE], [left, right]);
  const current = all.find((r) => r.id === room) ?? L_HER[0];
  const contentW = width - RAIL * 2 - 24;
  const novaOn = room === 'concierge';
  const Built = BUILT[room];

  return (
    <View style={[styles.page, {paddingTop: insets.top}]}>
      <View style={styles.top}>
        <SquareButton label="This Is You" active={room === 'profile'} onPress={() => setRoom('profile')}><Icon name="user" size={18} /></SquareButton>
        <Pressable onPress={() => setRoom('lobby')} accessibilityRole="button" accessibilityLabel="Return to the Lobby" style={{alignItems: 'center'}}>
          <Text style={[styles.brand, {fontSize: her ? 24 : 18}]}>{her ? 'FINESSE' : 'CARPE DIEM'}</Text>
          <Text style={styles.est}>EST. MMXXVI</Text>
        </Pressable>
        <SquareButton label="VIP, the Private Lift" active={false} warm onPress={() => router.push('/penthouse')}><Icon name="crown" size={18} color={deco.lamp} /></SquareButton>
      </View>

      <View style={{flex: 1, flexDirection: 'row'}}>
        <Rail rooms={left} room={room} onPick={setRoom} edge="left" acc={acc} />
        <ContentWidth.Provider value={contentW}>
          <ScrollView key={room} style={{flex: 1}} contentContainerStyle={{paddingTop: room === 'lobby' ? 0 : 22, paddingBottom: 70}}>
            {room === 'lobby' ? <Lobby side={side} onPick={setRoom} /> : (
              <Animated.View entering={FadeIn.duration(450)} style={{paddingHorizontal: 12, gap: 12}}>
                <RoomOn wing={current.wing} />
                <Text style={styles.roomTitle}>{current.label}</Text>
                {Built ? <View style={{gap: 14}}><Built side={side} /></View> : <Interior room={current} acc={acc} />}
              </Animated.View>
            )}
          </ScrollView>
        </ContentWidth.Provider>
        <Rail rooms={right} room={room} onPick={setRoom} edge="right" acc={acc} />
      </View>

      <View style={[styles.dock, {paddingBottom: insets.bottom}]}>
        {D_L.map((d) => <DockButton key={d.id} r={d} active={room === d.id} onPress={() => setRoom(d.id)} />)}
        <View style={styles.novaWell}>
          <NovaButton on={novaOn} onPress={() => setRoom(novaOn ? 'lobby' : 'concierge')} />
          <Text style={[styles.novaLabel, {color: novaOn ? deco.brassLight : 'rgba(201,169,97,0.65)'}]}>{novaOn ? 'NOVA ON' : 'NOVA'}</Text>
        </View>
        {D_R.map((d) => <DockButton key={d.id} r={d} active={room === d.id} onPress={() => setRoom(d.id)} />)}
      </View>
    </View>
  );
}

function SquareButton({children, label, active, warm, onPress}: {children: React.ReactNode; label: string; active: boolean; warm?: boolean; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={[styles.square, {borderColor: active ? (warm ? deco.lamp : deco.brassHighlight) : 'rgba(201,169,97,0.35)', backgroundColor: warm ? 'rgba(255,169,107,0.08)' : 'rgba(10,4,6,0.6)'}]}>
      {children}
    </Pressable>
  );
}

function Rail({rooms, room, onPick, edge, acc}: {rooms: RoomDef[]; room: string; onPick: (id: string) => void; edge: 'left' | 'right'; acc: string}) {
  return (
    <View style={[styles.rail, edge === 'left' ? {borderRightWidth: 2} : {borderLeftWidth: 2}]}>
      {rooms.map((r, i) => {
        const on = r.id === room;
        const live = Boolean(BUILT[r.id]) || r.id === 'lobby';
        return (
          <Pressable key={`${r.id}${i}`} onPress={() => onPick(r.id)} accessibilityRole="button" accessibilityLabel={r.label} accessibilityState={{selected: on}}
            style={[styles.railItem, on && {backgroundColor: 'rgba(201,169,97,0.14)'}]}>
            <Icon name={r.icon} size={20} color={on ? acc : deco.brassHighlight} />
            <Text style={[styles.railLabel, {color: on ? deco.cream : 'rgba(232,200,122,0.8)'}]} numberOfLines={1} adjustsFontSizeToFit>{r.label}</Text>
            <View style={[styles.lamp, {backgroundColor: on ? acc : live ? deco.brassLight : 'rgba(201,169,97,0.25)', shadowColor: on ? acc : deco.brassLight, shadowOpacity: on || live ? 0.9 : 0}]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function DockButton({r, active, onPress}: {r: RoomDef; active: boolean; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={r.label} accessibilityState={{selected: active}}
      style={[styles.dockItem, {borderTopColor: active ? deco.brassHighlight : 'transparent', backgroundColor: active ? 'rgba(201,169,97,0.1)' : 'transparent'}]}>
      <Icon name={r.icon} size={20} color={active ? deco.brassLight : deco.brass} />
      <Text style={[styles.dockLabel, {color: active ? deco.brassLight : deco.brass}]}>{r.label}</Text>
    </Pressable>
  );
}

const NOVA_RING = conicRing(36, 36, 36, 29, BEZEL_STOPS, 200, 72);
function NovaButton({on, onPress}: {on: boolean; onPress: () => void}) {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = on ? withRepeat(withSequence(withTiming(1, {duration: 1400}), withTiming(0.55, {duration: 1400})), -1, true) : withTiming(0, {duration: 300});
  }, [on, glow]);
  const halo = useAnimatedStyle(() => ({opacity: glow.value}));
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{checked: on}} accessibilityLabel="Nova on or off" style={styles.novaBtn}>
      <Animated.View pointerEvents="none" style={[{position: 'absolute', left: -14, top: -14, width: 100, height: 100}, halo]}>
        <Svg width={100} height={100}><Defs><RadialGradient id="nh" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse"><Stop offset="0.5" stopColor={deco.brassLight} stopOpacity={0.55} /><Stop offset="1" stopColor={deco.brassLight} stopOpacity={0} /></RadialGradient></Defs><Circle cx={50} cy={50} r={50} fill="url(#nh)" /></Svg>
      </Animated.View>
      <Svg width={72} height={72} style={{position: 'absolute'}}>
        <Defs><RadialGradient id="nf" cx="36" cy="25" r="36" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#2A1C10" /><Stop offset="0.75" stopColor="#0A0807" /></RadialGradient></Defs>
        {NOVA_RING.map((w, i) => <Path key={i} d={w.d} fill={w.fill} />)}
        <Circle cx={36} cy={36} r={29} fill="url(#nf)" />
      </Svg>
      <View style={{position: 'absolute', left: 23, top: 23, zIndex: 2}}>
        <Icon name="power" size={26} color={on ? deco.brassWhite : deco.brassLight} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

function RoomOn({wing}: {wing: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
      <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF88', shadowColor: '#00FF88', shadowOpacity: 0.8, shadowRadius: 8}} />
      <Text style={{fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: '#7AF5B8'}}>ROOM ON · {wing}</Text>
    </View>
  );
}

function Interior({room, acc}: {room: RoomDef; acc: string}) {
  return (
    <View style={{gap: 12}}>
      <View style={{padding: 10}}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
          <Defs><LinearGradient id="frame" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={deco.brassLight} /><Stop offset="0.4" stopColor={deco.brassMid} /><Stop offset="0.6" stopColor="#F6E2A0" /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient></Defs>
          <Rect width="100%" height="100%" fill="url(#frame)" />
        </Svg>
        <View style={{height: 170, backgroundColor: '#140A0C', borderWidth: 2, borderColor: '#3A2610', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name={room.icon} size={44} color={deco.brass} strokeWidth={1.2} />
        </View>
      </View>
      <Text style={styles.roomLine}>{room.line}</Text>
      <View accessibilityRole="button" accessibilityState={{disabled: true}} style={[styles.cta, {backgroundColor: acc, opacity: 0.55}]}>
        <Text style={styles.ctaText}>{room.cta || 'ENTER'}</Text><Text style={[styles.ctaText, {letterSpacing: 0, fontSize: 16}]}>→</Text>
      </View>
      <Text style={{fontFamily: fonts.mono, fontSize: 10, color: 'rgba(244,232,208,0.45)'}}>THIS INTERIOR IS BEING PREPARED</Text>
    </View>
  );
}

function Lobby({side, onPick}: {side: Side; onPick: (id: string) => void}) {
  const her = side === 'her';
  const t = track[side];
  const hour = new Date().getHours();
  const greet1 = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';
  const time = new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}).toUpperCase();
  const recent = [
    {id: 'concierge', label: 'Nova', note: 'Your concierge, on the request line', icon: 'power'},
    {id: 'lounge', label: 'The Lounge', note: 'Who has chosen to be seen tonight', icon: 'martini'},
    {id: 'vault', label: 'The Vault', note: 'Balance and ledger', icon: 'lock'},
  ];
  return (
    <Animated.View entering={FadeIn.duration(600)}>
      <View style={{height: 220, overflow: 'hidden'}}>
        <DecoLobby side={side} />
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
          <Defs><LinearGradient id="lh" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0A0406" stopOpacity={0.2} /><Stop offset="0.65" stopColor="#0A0406" stopOpacity={0.6} /><Stop offset="1" stopColor="#0A0406" stopOpacity={1} /></LinearGradient></Defs>
          <Rect width="100%" height="100%" fill="url(#lh)" />
        </Svg>
        <View style={{position: 'absolute', left: 14, right: 14, bottom: 10}}>
          <Text style={{fontFamily: fonts.caps, fontSize: 9, letterSpacing: 2.7, color: deco.brassLight}}>THE LOBBY · {time}</Text>
          <Text style={{fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: deco.cream}}>{greet1}</Text>
          <Text style={{fontFamily: fonts.displayHeavy, fontSize: 38, lineHeight: 42, color: t.acc}}>{her ? 'darling.' : 'sir.'}</Text>
        </View>
      </View>
      <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.novaCard}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none"><Defs><LinearGradient id="nc" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#F2E8D2" /><Stop offset="1" stopColor="#E8DBBE" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#nc)" /></Svg>
        <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.8, color: '#6B1424'}}>NOVA · TONIGHT</Text>
        <Text style={{fontFamily: fonts.script, fontSize: 15, lineHeight: 20, color: '#1A120C'}}>Ring Nova from the request line and she will draft the evening for your approval.</Text>
      </Animated.View>
      <Text style={styles.section}>ALSO IN THE HOUSE</Text>
      <View style={{flexDirection: 'row', gap: 8, marginHorizontal: 12, marginTop: 10}}>
        {[{id: 'ballroom', label: 'The Ballroom', note: 'Compose an evening', icon: 'sparkles'}, {id: 'jazzclub', label: 'Jazz Club', note: 'Tonight’s room', icon: 'music'}].map((r) => (
          <Pressable key={r.id} onPress={() => onPick(r.id)} accessibilityRole="button" style={{flex: 1, minHeight: 74, padding: 10, gap: 4, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)', backgroundColor: 'rgba(20,12,10,0.7)'}}>
            <Icon name={r.icon} size={18} color={t.acc} />
            <Text style={{fontFamily: fonts.label, fontSize: 14, color: deco.cream}}>{r.label}</Text>
            <Text style={{fontFamily: fonts.body, fontSize: 10.5, color: 'rgba(244,232,208,0.6)'}}>{r.note}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.section}>PICK UP WHERE YOU LEFT</Text>
      <View style={{marginHorizontal: 12, marginBottom: 16}}>
        {recent.map((r) => (
          <Pressable key={r.id} onPress={() => onPick(r.id)} accessibilityRole="button" style={styles.recent}>
            <Icon name={r.icon} size={18} />
            <View style={{flex: 1, gap: 1}}>
              <Text style={{fontFamily: fonts.label, fontSize: 14, color: deco.cream}}>{r.label}</Text>
              <Text style={{fontFamily: fonts.body, fontSize: 11, color: 'rgba(244,232,208,0.6)'}}>{r.note}</Text>
            </View>
            <Text style={{color: deco.brass}}>→</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: deco.ink},
  top: {height: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderColor: deco.brass, backgroundColor: '#12080A'},
  square: {width: 40, height: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  brand: {fontFamily: fonts.display, letterSpacing: 3.4, color: deco.brassHighlight, textShadowColor: 'rgba(201,169,97,0.3)', textShadowRadius: 24},
  est: {fontFamily: fonts.caps, fontSize: 8, letterSpacing: 4, color: 'rgba(201,169,97,0.6)'},
  rail: {width: RAIL, backgroundColor: 'rgba(10,4,6,0.97)', borderColor: 'rgba(201,169,97,0.35)'},
  railItem: {flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 3, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.12)', paddingHorizontal: 2},
  railLabel: {fontFamily: fonts.label, fontSize: 8, letterSpacing: 0.3, textTransform: 'uppercase'},
  lamp: {width: 5, height: 5, borderRadius: 3, shadowRadius: 6},
  dock: {flexDirection: 'row', minHeight: 84, borderTopWidth: 2, borderColor: deco.brass, backgroundColor: '#0E0608'},
  dockItem: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 18, borderTopWidth: 3, marginTop: -2},
  dockLabel: {fontFamily: fonts.label, fontSize: 9, letterSpacing: 0.9, textTransform: 'uppercase'},
  novaWell: {width: 92, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(201,169,97,0.3)', alignItems: 'center'},
  novaBtn: {position: 'absolute', top: -30, width: 72, height: 72, alignItems: 'center', justifyContent: 'center'},
  novaLabel: {position: 'absolute', bottom: 20, fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.8},
  roomTitle: {fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 36, color: deco.cream},
  roomLine: {fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: 'rgba(244,232,208,0.82)'},
  cta: {minHeight: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  ctaText: {fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2.2, color: '#140508'},
  novaCard: {marginTop: 10, marginHorizontal: 12, padding: 12, gap: 4, overflow: 'hidden'},
  section: {marginTop: 16, marginHorizontal: 12, paddingBottom: 6, borderBottomWidth: 2, borderColor: deco.brass, fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2.4, color: deco.brassHighlight},
  recent: {flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.25)'},
});
