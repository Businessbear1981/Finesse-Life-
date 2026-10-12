// The Lounge — a candle-lit members' lounge inside the grand hotel. A channel-tufted oxblood banquette
// before smoked-mirror panels, deco sconces that breathe, candles on black marble tables; brass
// nameplates for who is in the room, calling cards on black lacquer for room chat, a fountain-pen
// notecard sealed in wax to write to the room, and the house rules on a brass plaque. Invitation-ticket
// outings, an After Dark arch portrait and a brass medallion for the Social Score.
// Data is sample unless noted; /api/posts feeds live notes into room chat when the API answers.
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {Pressable, ScrollView, Share, Text, TextInput, View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {Easing, FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {BEZEL_STOPS, conicRing, continental as Cn, deco, fonts, metals, track, weighty, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {Icon} from '@/lib/icons';
import {BrassButton, BrassToggles, DecoFrame, Divider, Plate, Seal, Surface, steppedRect, useCalm, useSvgId} from '@/components/continental';
import {SampleNote, s} from './shared';

type Post = {id: string; content: string; created_at: string; profiles?: {display_name?: string; username?: string} | null};

/* ───────────────────────── the room ───────────────────────── */
const SCONCES = [0.135, 0.38, 0.62, 0.865];
const CANDLES = [0.24, 0.5, 0.76];

function LoungeScene({acc}: {acc: string}) {
  const W = Math.min(useAvailableWidth(), 520), H = W * 0.66;
  const id = useSvgId('ls');
  const art = useMemo(() => {
    // banquette back: a shallow curve; channels follow it
    const top = (x: number) => 150 - Math.sin((x / 400) * Math.PI) * 18;
    let back = `M-10 ${top(-10)}`;
    for (let x = 0; x <= 410; x += 10) back += ` L${x} ${top(x).toFixed(1)}`;
    back += ' L410 214 L-10 214 Z';
    const channels: Array<{x: number; y: number}> = [];
    for (let x = 6; x < 400; x += 15) channels.push({x, y: top(x)});
    let rail = '';
    for (let x = -10; x <= 410; x += 10) rail += `${x === -10 ? 'M' : ' L'}${x} ${(top(x) - 2).toFixed(1)}`;
    const floor = Array.from({length: 22}, (_, i) => `M${i * 20 - 20} 260 L${i * 20} 238 L${i * 20 + 20} 260`).join(' ');
    return {back, channels, rail, floor};
  }, []);
  return (
    <View style={{width: W, height: H, alignSelf: 'center', overflow: 'hidden'}}>
      <Svg width={W} height={H} viewBox="0 0 400 264" preserveAspectRatio="xMidYMid slice" style={{position: 'absolute'}}>
        <Defs>
          <LinearGradient id={`${id}wall`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0C0507" /><Stop offset="0.5" stopColor="#1E070D" /><Stop offset="1" stopColor="#0A0305" /></LinearGradient>
          <LinearGradient id={`${id}mir`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#2E2822" /><Stop offset="0.5" stopColor="#14120F" /><Stop offset="1" stopColor="#0A0908" /></LinearGradient>
          <LinearGradient id={`${id}ref`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#FFE2B8" stopOpacity={0} /><Stop offset="0.5" stopColor="#FFE2B8" stopOpacity={0.14} /><Stop offset="1" stopColor="#FFE2B8" stopOpacity={0} /></LinearGradient>
          <LinearGradient id={`${id}br`} x1="0" y1="0" x2="1" y2="1">{metals.brass.map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}</LinearGradient>
          <LinearGradient id={`${id}vel`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#8A1E32" /><Stop offset="0.45" stopColor="#5A0E1E" /><Stop offset="1" stopColor="#24040C" /></LinearGradient>
          <LinearGradient id={`${id}ch`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#000" stopOpacity={0.5} /><Stop offset="0.25" stopColor="#000" stopOpacity={0} /><Stop offset="0.5" stopColor="#FFB4BE" stopOpacity={0.12} /><Stop offset="0.8" stopColor="#000" stopOpacity={0.05} /><Stop offset="1" stopColor="#000" stopOpacity={0.55} /></LinearGradient>
          <LinearGradient id={`${id}seat`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#9A2A3E" /><Stop offset="1" stopColor="#3A0812" /></LinearGradient>
          <RadialGradient id={`${id}mar`} cx="0.4" cy="0.3" r="0.8"><Stop offset="0" stopColor="#2A2828" /><Stop offset="1" stopColor="#050505" /></RadialGradient>
          <RadialGradient id={`${id}vig`} cx="200" cy="150" r="250" gradientUnits="userSpaceOnUse"><Stop offset="0.45" stopColor="#000" stopOpacity={0} /><Stop offset="1" stopColor="#000" stopOpacity={0.85} /></RadialGradient>
          <LinearGradient id={`${id}floor`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#120A08" /><Stop offset="1" stopColor="#030202" /></LinearGradient>
        </Defs>
        <Rect width={400} height={264} fill={`url(#${id}wall)`} />
        {/* cornice: stepped lacquer band with a brass fillet */}
        <Rect width={400} height={24} fill="#050304" />
        {Array.from({length: 26}, (_, i) => <Rect key={i} x={i * 16 + 3} y={10} width={10} height={i % 2 ? 6 : 10} fill="#0F0A0C" stroke={deco.brass} strokeOpacity={0.35} strokeWidth={0.5} />)}
        <Path d="M0 24 H400" stroke={`url(#${id}br)`} strokeWidth={1.6} />
        <Path d="M0 27.5 H400" stroke={deco.brass} strokeOpacity={0.35} strokeWidth={0.5} />
        {/* smoked mirror panels with stepped heads */}
        {[0, 1, 2, 3, 4].map((i) => {
          const x = 22 + i * 74, w = 60, y0 = 40, y1 = 150;
          const head = `M${x} ${y1} L${x} ${y0 + 14} L${x + 8} ${y0 + 14} L${x + 8} ${y0 + 6} L${x + 18} ${y0 + 6} L${x + 18} ${y0} L${x + w - 18} ${y0} L${x + w - 18} ${y0 + 6} L${x + w - 8} ${y0 + 6} L${x + w - 8} ${y0 + 14} L${x + w} ${y0 + 14} L${x + w} ${y1} Z`;
          return (
            <G key={i}>
              <Path d={head} fill={`url(#${id}mir)`} />
              <Path d={`M${x + 6} ${y1} L${x + 30} ${y0} L${x + 40} ${y0} L${x + 16} ${y1} Z`} fill={`url(#${id}ref)`} />
              {i === 2 ? Array.from({length: 11}, (_, k) => { const a = Math.PI + (k / 10) * Math.PI; return <Path key={k} d={`M${x + w / 2} 110 L${x + w / 2 + Math.cos(a) * 26} ${110 + Math.sin(a) * 26}`} stroke={deco.brassHighlight} strokeOpacity={0.3} strokeWidth={0.6} />; }) : null}
              <Path d={head} fill="none" stroke={`url(#${id}br)`} strokeWidth={1.4} />
              <Path d={`M${x + w / 2} ${y0} V${y1}`} stroke={deco.brass} strokeOpacity={0.4} strokeWidth={0.6} />
            </G>
          );
        })}
        {/* sconces: brass bracket + fan glass shade */}
        {SCONCES.map((f) => {
          const x = f * 400 + (f < 0.5 ? -10 : 10) * 0;
          return (
            <G key={f}>
              <Path d={`M${x} 98 V86`} stroke={`url(#${id}br)`} strokeWidth={2} />
              <Path d={`M${x - 11} 86 A11 11 0 0 1 ${x + 11} 86 Z`} fill="#FFE9C4" opacity={0.92} />
              {[-6, -2, 2, 6].map((d) => <Path key={d} d={`M${x} 86 L${x + d * 1.6} ${76 + Math.abs(d) * 0.6}`} stroke="#C9A961" strokeWidth={0.5} />)}
              <Path d={`M${x - 11} 86 H${x + 11}`} stroke={`url(#${id}br)`} strokeWidth={1.4} />
              <Rect x={x - 4} y={98} width={8} height={4} fill={`url(#${id}br)`} />
            </G>
          );
        })}
        {/* banquette: channel-tufted back, brass rail, seat */}
        <Path d={art.back} fill={`url(#${id}vel)`} />
        {art.channels.map((c, i) => <Rect key={i} x={c.x} y={c.y} width={15} height={214 - c.y} fill={`url(#${id}ch)`} />)}
        {art.channels.map((c, i) => <Circle key={`b${i}`} cx={c.x} cy={c.y + (214 - c.y) * 0.45} r={1} fill="#1A0206" opacity={0.7} />)}
        <Path d={art.rail} fill="none" stroke={`url(#${id}br)`} strokeWidth={2.4} />
        <Path d={art.rail} fill="none" stroke="#FFF1C2" strokeOpacity={0.5} strokeWidth={0.6} transform="translate(0 -0.8)" />
        <Rect x={-4} y={208} width={408} height={18} rx={6} fill={`url(#${id}seat)`} />
        <Path d="M0 209 H400" stroke="#FF9AAA" strokeOpacity={0.2} />
        {/* floor: chevron inlay */}
        <Rect x={0} y={226} width={400} height={38} fill={`url(#${id}floor)`} />
        <Path d={art.floor} fill="none" stroke={deco.brass} strokeOpacity={0.18} strokeWidth={0.6} />
        {/* black marble tables with a candle each */}
        {CANDLES.map((f) => {
          const x = f * 400;
          return (
            <G key={f}>
              <Path d={`M${x} 232 L${x - 5} 256 H${x + 5} Z`} fill={`url(#${id}br)`} />
              <Ellipse cx={x} cy={257} rx={14} ry={3} fill={`url(#${id}br)`} opacity={0.8} />
              <Ellipse cx={x} cy={231} rx={30} ry={7} fill={`url(#${id}mar)`} stroke={`url(#${id}br)`} strokeWidth={1.2} />
              <Path d={`M${x - 20} 229 Q${x - 4} 232 ${x + 14} 228`} stroke="#D9D2C3" strokeOpacity={0.25} strokeWidth={0.5} fill="none" />
              <Rect x={x - 4} y={214} width={8} height={15} rx={1.5} fill="#FFF6E4" opacity={0.25} stroke="#FFF" strokeOpacity={0.35} strokeWidth={0.5} />
              <Rect x={x - 2.4} y={218} width={4.8} height={10} fill="#F4E8D0" />
              <Path d={`M${x} 211 Q${x + 2.2} 214.5 ${x} 217.5 Q${x - 2.2} 214.5 ${x} 211 Z`} fill="#FFD27A" />
            </G>
          );
        })}
        {/* the banquette ends, framing the room */}
        {[-1, 1].map((sx) => {
          const x0 = sx < 0 ? 0 : 400;
          return (
            <G key={sx}>
              <Path d={`M${x0} 120 Q${x0 - sx * 34} 122 ${x0 - sx * 38} 160 L${x0 - sx * 40} 264 L${x0} 264 Z`} fill={`url(#${id}vel)`} />
              {[0, 1, 2].map((k) => <Path key={k} d={`M${x0 - sx * (10 + k * 10)} 130 L${x0 - sx * (12 + k * 10)} 262`} stroke="#000" strokeOpacity={0.4} strokeWidth={1.2} />)}
              <Path d={`M${x0} 120 Q${x0 - sx * 34} 122 ${x0 - sx * 38} 160 L${x0 - sx * 40} 264`} fill="none" stroke={`url(#${id}br)`} strokeWidth={1.6} />
            </G>
          );
        })}
        <Rect width={400} height={264} fill={`url(#${id}vig)`} />
        {/* deco keyline frame */}
        <Path d={steppedRect(3, 3, 397, 261, 5)} fill="none" stroke={`url(#${id}br)`} strokeWidth={1.4} />
        <Path d={steppedRect(8, 8, 392, 256, 4)} fill="none" stroke={deco.brass} strokeOpacity={0.4} strokeWidth={0.5} />
      </Svg>
      {SCONCES.map((f, i) => <Light key={`s${f}`} x={f} y={88 / 264} r={0.24} W={W} H={H} i={i} kind="sconce" acc={acc} />)}
      {CANDLES.map((f, i) => <Light key={`c${f}`} x={f} y={214 / 264} r={0.13} W={W} H={H} i={i} kind="candle" acc={acc} />)}
    </View>
  );
}

/** Warm light that breathes (sconces) or flickers (candles). Static with Reduce Motion. */
function Light({x, y, r, W, H, i, kind, acc}: {x: number; y: number; r: number; W: number; H: number; i: number; kind: 'sconce' | 'candle'; acc: string}) {
  const calm = useCalm();
  const id = useSvgId('lt');
  const o = useSharedValue(kind === 'sconce' ? 0.85 : 0.9);
  useEffect(() => {
    if (calm) return;
    if (kind === 'sconce') {
      o.value = withDelay(i * 900, withRepeat(withSequence(withTiming(1, {duration: weighty.lamp, easing: Easing.inOut(Easing.quad)}), withTiming(0.72, {duration: weighty.lamp, easing: Easing.inOut(Easing.quad)})), -1));
    } else {
      const f = (ms: number, v: number) => withTiming(v, {duration: ms, easing: Easing.inOut(Easing.quad)});
      o.value = withDelay(i * 300, withRepeat(withSequence(f(420, 1), f(260, 0.78), f(520, 0.95), f(300, 0.7), f(680, 1), f(400, 0.84)), -1));
    }
  }, [calm, kind, i, o]);
  const st = useAnimatedStyle(() => ({opacity: o.value}));
  const sz = W * r * 2;
  return (
    <Animated.View pointerEvents="none" style={[{position: 'absolute', left: x * W - sz / 2, top: y * H - sz / 2, width: sz, height: sz}, st]}>
      <Svg width={sz} height={sz}>
        <Defs>
          <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFF4DC" stopOpacity={kind === 'candle' ? 0.95 : 0.7} />
            <Stop offset="0.18" stopColor="#FFC27A" stopOpacity={0.45} />
            <Stop offset="0.55" stopColor={kind === 'candle' ? '#FF8A3A' : acc} stopOpacity={0.12} />
            <Stop offset="1" stopColor="#FF8A3A" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={sz / 2} cy={sz / 2} r={sz / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/* ───────────────────────── ornaments ───────────────────────── */
function DecoHead({children, color = deco.brassHighlight}: {children: string; color?: string}) {
  return <View style={{alignSelf: 'stretch', flex: 1}}><Divider label={children} color={color} /></View>;
}

const RING = conicRing(30, 30, 30, 26.5, BEZEL_STOPS, 210, 48);
function Portrait({name, size = 54, glow, dim}: {name: string; size?: number; glow?: string; dim?: boolean}) {
  return (
    <View style={{width: size, height: size, borderRadius: size / 2, shadowColor: glow ?? '#000', shadowOpacity: glow ? 0.9 : 0.6, shadowRadius: glow ? 10 : 4, shadowOffset: {width: 0, height: glow ? 0 : 2}, opacity: dim ? 0.7 : 1}}>
      <Svg width={size} height={size} viewBox="0 0 60 60" style={{position: 'absolute'}}>
        <Defs><RadialGradient id="pv" cx="30" cy="22" r="30" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#6A1A2A" /><Stop offset="1" stopColor="#1A060C" /></RadialGradient></Defs>
        {RING.map((w, i) => <Path key={i} d={w.d} fill={w.fill} />)}
        <Circle cx={30} cy={30} r={26.5} fill="url(#pv)" />
        <Circle cx={30} cy={30} r={23.5} fill="none" stroke={deco.brass} strokeOpacity={0.35} strokeWidth={0.5} />
        {glow ? <Circle cx={30} cy={30} r={29} fill="none" stroke={glow} strokeWidth={1.6} /> : null}
      </Svg>
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontFamily: fonts.displayHeavy, fontSize: size * 0.42, color: deco.brassWhite}}>{name[0]}</Text></View>
    </View>
  );
}

/** Oxblood velvet panel inside a stepped brass keyline. */
function Velvet({children, border, style, title}: {children: ReactNode; border?: string; style?: StyleProp<ViewStyle>; title?: string}) {
  return (
    <DecoFrame material="velvet" light={0.35} pad={14} step={5} title={title} titleColor={border} style={[{gap: 10}, style]}>
      {children}
    </DecoFrame>
  );
}

/** Ivory calling card (letterpress keylines), used for the selected member, notes and tickets. */
function Card({children, style, pad = 14}: {children: ReactNode; style?: StyleProp<ViewStyle>; pad?: number}) {
  return (
    <DecoFrame material="ivory" ink pad={pad} step={3} style={[{gap: 6}, style]}>
      {children}
    </DecoFrame>
  );
}

/** Black lacquer card with gilt type — the member's own notes. */
function BlackCard({children, style}: {children: ReactNode; style?: StyleProp<ViewStyle>}) {
  return (
    <DecoFrame material="lacquer" pad={11} step={3} light={0.25} style={[{gap: 3, paddingHorizontal: 14}, style]}>
      {children}
    </DecoFrame>
  );
}

/** Brass toggle for row actions (pass / interested / cheer). */
function Ghost({label, onPress, on, color}: {label: string; onPress: () => void; on?: boolean; color: string}) {
  return <BrassButton label={label} onPress={onPress} size="sm" variant="lacquer" selected={on} accent={color} />;
}

/** Full-width action: brass when it's the next step, oxblood lacquer on ivory cards. */
function Act({label, onPress, done, onCard}: {label: string; onPress?: () => void; done?: boolean; onCard?: boolean}) {
  return <BrassButton label={label} onPress={onPress} variant={done ? 'lacquer' : onCard ? 'oxblood' : 'brass'} selected={false} />;
}

/** A small brass nameplate under a portrait. */
function NamePlate({name, on}: {name: string; on?: boolean}) {
  return <Plate text={name} width={Math.max(52, name.length * 8 + 18)} height={20} screws={false} font="display" metal={on ? 'goldLeaf' : 'brass'} />;
}

/** The fountain-pen nib, drawn in gold. */
function Nib({size = 22}: {size?: number}) {
  const id = useSvgId('nib');
  return (
    <View style={{width: size, height: size}}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">{metals.goldLeaf.map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}</LinearGradient></Defs>
      <Path d="M12 2 L19 11 L14.5 21 L9.5 21 L5 11 Z" fill={`url(#${id})`} stroke="#5A3C0C" strokeWidth={0.6} />
      <Path d="M12 6 V15" stroke="#3A2606" strokeWidth={0.8} />
      <Circle cx={12} cy={15.5} r={1.4} fill="#3A2606" />
      <Path d="M7.5 12 Q12 10 16.5 12" stroke="#5A3C0C" strokeWidth={0.5} fill="none" />
    </Svg>
    </View>
  );
}

const RULES: Array<[string, string]> = [
  // Same five rules as the web Lounge plaque (src/app/(hotel)/lounge/lounge-view.tsx).
  ['I', 'Discretion is the house currency.'],
  ['II', 'No business on the floor — the Concierge keeps your affairs.'],
  ['III', 'What is said at the table stays at the table.'],
  ['IV', 'Every member is a guest of the house. Courtesy, without exception.'],
  ['V', "A member's word is their marker."],
];

/** The house rules, engraved on a brass plaque with four screws. */
function HouseRules() {
  return (
    <Surface kind="metal" metal="brass" radius={3} seed={21} style={{padding: 18, gap: 8, borderWidth: 1, borderColor: '#4A3416'}}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{position: 'absolute', left: i % 2 ? undefined : 7, right: i % 2 ? 7 : undefined, top: i < 2 ? 7 : undefined, bottom: i < 2 ? undefined : 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#8A6A2A', borderWidth: 0.6, borderColor: '#FFF1C2'}}>
          <View style={{position: 'absolute', left: 1, right: 1, top: 2.8, height: 1, backgroundColor: '#2A1C0E', transform: [{rotate: `${i * 50 - 30}deg`}]}} />
        </View>
      ))}
      <Text style={{textAlign: 'center', fontFamily: fonts.capsBold, fontSize: 12, letterSpacing: 4.5, color: Cn.engrave, textShadowColor: 'rgba(255,248,224,0.7)', textShadowOffset: {width: 0, height: 0.8}, textShadowRadius: 0}}>HOUSE RULES</Text>
      <Divider tone="ink" />
      {RULES.map(([n, t]) => (
        <View key={n} style={{flexDirection: 'row', gap: 10, alignItems: 'baseline'}}>
          <Text style={{width: 26, textAlign: 'right', fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1, color: Cn.engrave}}>{n}.</Text>
          <Text style={{flex: 1, fontFamily: fonts.displayBold, fontSize: 14, lineHeight: 19, color: Cn.engrave, textShadowColor: 'rgba(255,248,224,0.6)', textShadowOffset: {width: 0, height: 0.8}, textShadowRadius: 0}}>{t}</Text>
        </View>
      ))}
    </Surface>
  );
}


/* ───────────────────────── data ───────────────────────── */
type Mode = 'social' | 'outings' | 'dating' | 'score';
type Person = [string, number, string, string];
const CLUSTERS: Array<[string, string, string, Person[]]> = [
  ['YOUR CIRCLE', 'friends', '#7AF5B8', [['Maya', 92, '0.3 mi', 'Friends since 2024 · both at the Jazz Club tonight'], ['Theo', 88, '1.1 mi', 'Friends · saved you a seat in the Ballroom'], ['Sana', 85, '2 mi', 'Friends · arriving 9:30']]],
  ['LIKE-MINDED', 'same style + interests', deco.brassHighlight, [['Inès', 90, '0.8 mi', 'Both: Old Hollywood, gold hardware, jazz'], ['Kofi', 84, '1.4 mi', 'Both: vintage watches, first editions'], ['Lena', 81, '2.2 mi', 'Both: tailoring, gallery openings'], ['Ravi', 79, '3 mi', 'Both: travel, quiet luxury']]],
  ['YOU MIGHT BUMP INTO', 'nearby, not yet met', '#FF8FA9', [['Noor', 76, '0.2 mi', 'Two tables over at Lucian'], ['Elio', 72, '0.5 mi', 'At the bar downstairs'], ['Ada', 70, '0.9 mi', 'Leaving the gallery on Peachtree']]],
];
const GEO = {NEARBY: 'BUCKHEAD · 3 MI', CITY: 'ATLANTA', ANYWHERE: 'ALL HOUSES'} as const;
type Rad = keyof typeof GEO;
const CHAT: Array<[string, string, boolean]> = [['MAYA · 8:12 PM', 'Who’s at Lucian? The bar is perfect right now.', false], ['KOFI · 8:20 PM', 'Jazz Club late set starts 10:30. Worth it.', false], ['INÈS · 8:31 PM', 'Gallery on Peachtree has the after-party upstairs.', false]];
const PLACES = ['Lucian', 'Jazz Club', 'Gallery on Peachtree', 'Rooftop at Lumen'];
const VIS = ['Circle', 'Like-minded', 'Room'];
const OUTINGS: Array<[string, string, string, string, number, number, string]> = [
  ['FRI · 8:00 PM', 'Maya', 'Drinks before the late set', 'Bar Céleste → Jazz Club', 4, 8, 'GROUP RATE $45 PP AT 6+'],
  ['SAT · 11:00 AM', 'Inès', 'Gallery walk and brunch', 'Westside galleries, brunch at Nove', 5, 10, ''],
  ['SUN · 2:00 PM', 'Kofi', 'Vintage watch fair', 'The Exchange pop-up, Midtown', 3, 12, 'MEMBERS ENTER FREE'],
];
const DATES: Array<[string, number, string, string, string[], string, string[], boolean]> = [
  ['Inès', 31, '0.8 mi', 'Gallery director · Paris and Atlanta', ['VERIFIED', 'VIP'], '$250K+', ['Old Hollywood', 'Jazz', 'Travel'], true],
  ['Marcus', 34, '1.6 mi', 'Founder · fintech', ['VERIFIED'], '$500K+', ['Watches', 'Golf', 'Whiskey'], false],
  ['Camille', 29, '2.4 mi', 'Architect', ['VERIFIED', 'VIP'], '$150K+', ['Tailoring', 'Galleries', 'Quiet luxury'], true],
  ['Julian', 36, '3.1 mi', 'Surgeon', ['VERIFIED'], '$500K+', ['Travel', 'Wine', 'Jazz'], false],
];
const INC: Record<string, number> = {Any: 0, '$150K+': 150, '$250K+': 250, '$500K+': 500};
const MV: Array<[string, number, string, number]> = [['Maya', 3, 'Hosted the late set at the Jazz Club. Eleven came.', 6], ['Theo', -2, 'No-show at Saturday brunch. Second one this month.', 9], ['Sana', -1, 'Left a mutual match on read after the date.', 14], ['Kofi', 2, 'Two members vouched for him after the watch fair.', 3], ['Inès', 1, 'Returned every hello in the room last night.', 2]];
const PARTS: Array<[string, number, string]> = [['Showing up', 30, 'Outings and tables you said yes to, and attended.'], ['Warmth', 25, 'Replies, hellos returned, how conversations feel to the other side.'], ['Vouches', 20, 'Members who have met you in person and vouch for you.'], ['Hosting', 15, 'Outings you planned that people enjoyed.'], ['Verified profile', 10, 'ID, photo and any status you choose to verify.']];
const FAQ: Array<[string, string]> = [
  ['Is it about money or followers?', 'No. Income, purchases and follower counts are never part of it. Two members with very different means can hold the same score.'],
  ['Who sees my score?', 'Other members, next to your name in the Lounge and After Dark. Never you, and never brands or partners.'],
  ['What does it change?', 'Where you sit in the Lounge, who is suggested to you, and priority when an outing fills up.'],
  ['Can I reset it?', 'It moves on its own. Recent months count most, so a rough patch fades as you keep showing up.'],
];
const toggle = (l: string[], k: string) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]);
const MODES: Array<[Mode, string, string]> = [['social', 'LOUNGE', 'martini'], ['outings', 'OUTINGS', 'calendardays'], ['dating', 'AFTER DARK', 'sparkles'], ['score', 'SCORE', 'crown']];


/* ───────────────────────── the room interior ───────────────────────── */
export function Lounge({side}: {side: Side}) {
  const acc = track[side].acc;
  const [mode, setMode] = useState<Mode>('social');
  const [rad, setRad] = useState<Rad>('NEARBY');
  const [pick, setPick] = useState('Inès');
  const [hellos, setHellos] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [live, setLive] = useState<Array<[string, string, boolean]>>([]);
  const [place, setPlace] = useState('Jazz Club');
  const [vis, setVis] = useState('Circle');
  const [shared, setShared] = useState(false);
  const [mine, setMine] = useState(false);
  const [ins, setIns] = useState<string[]>([]);
  const [f, setF] = useState({status: 'Verified', income: 'Any', interest: 'Any'});
  const [seen, setSeen] = useState<string[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [spilled, setSpilled] = useState<string[]>([]);
  const [cheered, setCheered] = useState<string[]>([]);
  const [asked, setAsked] = useState(false);
  const [faq, setFaq] = useState<number | null>(null);

  useEffect(() => {
    api<{posts?: Post[]; data?: Post[]}>('/api/posts?page=1').then((r) => {
      if (!r.ok) return;
      setLive((r.body.posts ?? r.body.data ?? []).slice(0, 4).map((p) => [`${(p.profiles?.display_name ?? p.profiles?.username ?? 'A member').toUpperCase()} · LIVE`, p.content, false]));
    });
  }, []);

  const geo = GEO[rad];
  let sel: Person = CLUSTERS[1][3][0];
  CLUSTERS.forEach((c) => c[3].forEach((p) => { if (p[0] === pick) sel = p; }));
  const send = () => { const t = draft.trim().slice(0, 140); if (t) { setMsgs((m) => [...m, t]); setDraft(''); } };
  const pool = DATES.filter((d) => (f.status !== 'VIP' || d[4].includes('VIP')) && INC[d[5]] >= INC[f.income] && (f.interest === 'Any' || d[6].includes(f.interest)) && !seen.includes(d[0]));
  const D = pool[0];
  const isLiked = D ? liked.includes(D[0]) : false;
  const outings = [...(mine ? [['FRI · 9:30 PM', 'You', `Late table at ${place}`, `${place} · open to ${vis.toLowerCase()}`, 0, 6, ''] as (typeof OUTINGS)[number]] : []), ...OUTINGS];

  return (
    <View style={{gap: 14}}>
      <LoungeScene acc={acc} />

      {/* marquee: who is in the room tonight, on a lacquer strip with a brass plate */}
      <DecoFrame material="lacquer" light={0.4} pad={12} step={4} style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <Plate text="42" caption="Tonight" width={74} height={46} enamel />
        <View style={{flex: 1, gap: 3}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#00FF88', shadowColor: '#00FF88', shadowOpacity: 0.9, shadowRadius: 6}} />
            <Text style={{fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1.2, color: '#7AF5B8'}}>SAMPLE · {geo}</Text>
          </View>
          <Text style={{fontFamily: fonts.script, fontSize: 18, lineHeight: 21, color: deco.cream}}>in the room tonight · sample</Text>
        </View>
      </DecoFrame>

      {/* deco tabs */}
      <Surface kind="lacquer" style={{flexDirection: 'row', borderWidth: 1, borderColor: deco.brass}}>
        {MODES.map(([k, label, icon], i) => {
          const on = k === mode;
          return (
            <Pressable key={k} onPress={() => setMode(k)} accessibilityRole="tab" accessibilityState={{selected: on}}
              style={{flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4, borderLeftWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.35)', backgroundColor: on ? 'rgba(232,200,122,0.10)' : 'transparent'}}>
              <Icon name={icon} size={16} color={on ? acc : deco.brass} />
              <Text style={{fontFamily: fonts.capsBold, fontSize: 8, letterSpacing: 0.8, color: on ? deco.brassWhite : 'rgba(244,232,208,0.7)'}}>{label}</Text>
              {on ? <Animated.View entering={FadeIn.duration(250)} style={{position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: acc, shadowColor: acc, shadowOpacity: 0.9, shadowRadius: 6}} /> : null}
            </Pressable>
          );
        })}
      </Surface>

      {mode === 'social' ? (
        <Animated.View entering={FadeIn.duration(350)} style={{gap: 14}}>
          <BrassToggles options={Object.keys(GEO) as Rad[]} value={rad} onChange={setRad} />
          {CLUSTERS.map(([label, why, color, people], ci) => (
            <Animated.View key={label} entering={FadeInDown.delay(ci * 90).duration(400)}>
              <Velvet border={color} title={label}>
                <Text style={{fontFamily: fonts.script, fontSize: 15, color: 'rgba(244,232,208,0.8)', textAlign: 'center'}}>{why}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12, paddingVertical: 4}}>
                  {people.map(([name, score, dist]) => {
                    const on = name === pick;
                    return (
                      <Pressable key={name} onPress={() => setPick(name)} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{selected: on}} style={{alignItems: 'center', gap: 5, minWidth: 64}}>
                        <View>
                          <Portrait name={name} glow={on ? acc : undefined} />
                          <View style={{position: 'absolute', right: -4, bottom: -4, minWidth: 24, height: 18, paddingHorizontal: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: deco.ink, borderWidth: 1, borderColor: color}}>
                            <Text style={{fontFamily: fonts.mono, fontSize: 8.5, color}}>{score}</Text>
                          </View>
                        </View>
                        <NamePlate name={name} on={on} />
                        <Text style={{fontFamily: fonts.mono, fontSize: 7.5, color: 'rgba(244,232,208,0.5)'}}>{dist}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Velvet>
            </Animated.View>
          ))}

          <Animated.View key={sel[0]} entering={FadeInDown.duration(350)}>
            <Card>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <Portrait name={sel[0]} size={58} />
                <View style={{flex: 1}}>
                  <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 2.4, color: Cn.oxbloodInk}}>CALLING CARD · {sel[2]}</Text>
                  <Text style={{fontFamily: fonts.displayHeavy, fontSize: 24, color: '#1A120C'}}>{sel[0]}</Text>
                </View>
              </View>
              <Text style={{fontFamily: fonts.script, fontSize: 17, lineHeight: 22, color: '#2A1A0E'}}>{sel[3]}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: '#6B5028'}}>SOCIAL SCORE {sel[1]} · SHOWN TO OTHERS, NEVER TO THEMSELVES</Text>
              <Act label={hellos.includes(sel[0]) ? `HELLO SENT TO ${sel[0].toUpperCase()}` : 'SAY HELLO'} done={hellos.includes(sel[0])} onCard onPress={() => setHellos((h) => toggle(h, sel[0]))} />
            </Card>
          </Animated.View>

          <DecoHead>{`${geo} · ROOM CHAT`}</DecoHead>
          {/* calling cards laid on a black lacquer table under the lamp */}
          <DecoFrame material="lacquer" light={0.7} pad={12} step={5} style={{gap: 10}}>
            {[...live, ...CHAT, ...msgs.map((t) => ['YOU · NOW', t, true] as [string, string, boolean])].map(([who, t, me], i) => (
              <Animated.View key={i} entering={FadeInDown.duration(400)} style={{flexDirection: me ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8}}>
                {!me ? <Portrait name={who} size={30} /> : null}
                {me ? (
                  <BlackCard style={{maxWidth: '84%'}}>
                    <Text style={{fontFamily: fonts.capsBold, fontSize: 8, letterSpacing: 1.8, color: deco.brass}}>{who}</Text>
                    <Text style={{fontFamily: fonts.script, fontSize: 16, lineHeight: 20, color: deco.brassLight}}>{t}</Text>
                  </BlackCard>
                ) : (
                  <Card style={{maxWidth: '84%', flexShrink: 1, paddingHorizontal: 14}} pad={11}>
                    <Text style={{fontFamily: fonts.capsBold, fontSize: 8, letterSpacing: 1.8, color: Cn.oxbloodInk}}>{who}</Text>
                    <Text style={{fontFamily: fonts.script, fontSize: 16, lineHeight: 20, color: Cn.ink}}>{t}</Text>
                  </Card>
                )}
              </Animated.View>
            ))}
          </DecoFrame>
          {/* composer: a notecard, a fountain pen, sealed in wax to send */}
          <Surface kind="ivory" seed={33} style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: '#A47A34'}}>
            <Nib size={28} />
            <View style={{flex: 1}}>
              <Text style={{fontFamily: fonts.label, fontSize: 8, letterSpacing: 2.4, color: Cn.oxbloodInk}}>A NOTE TO THE ROOM</Text>
              <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 140))} onSubmitEditing={send} placeholder="Say something to the room" placeholderTextColor="rgba(42,28,14,0.45)" accessibilityLabel="Message"
                style={{minHeight: 34, paddingVertical: 4, fontFamily: fonts.script, fontSize: 17, color: Cn.ink, borderBottomWidth: 0.8, borderColor: 'rgba(107,80,40,0.5)'}} />
            </View>
            <Pressable onPress={send} accessibilityRole="button" accessibilityLabel="Send" style={({pressed}) => ({alignItems: 'center', opacity: pressed ? 0.8 : 1, transform: [{scale: pressed ? 0.94 : 1}]})}>
              <Seal size={46} glyph="F" seed={12} />
              <Text style={{fontFamily: fonts.capsBold, fontSize: 7, letterSpacing: 1.6, color: Cn.oxbloodInk, marginTop: -2}}>SEND</Text>
            </Pressable>
          </Surface>
          <HouseRules />
          <Text style={[s.small, {textAlign: 'center'}]}>Scores are shown to others, never to yourself. That keeps the room honest.</Text>
          <SampleNote>SAMPLE ROOM · PEOPLE AND CHAT ARE ILLUSTRATIVE · YOUR MESSAGES STAY ON THIS DEVICE UNTIL ROOM CHAT GOES LIVE</SampleNote>
        </Animated.View>
      ) : null}

      {mode === 'outings' ? (
        <Animated.View entering={FadeIn.duration(350)} style={{gap: 14}}>
          <Velvet>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>WHERE ARE YOU GOING?</Text>
            <BrassToggles options={PLACES} value={place} onChange={(v) => { setPlace(v); setShared(false); }} />
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>WHO CAN SEE</Text>
            <BrassToggles options={VIS} value={vis} onChange={(v) => { setVis(v); setShared(false); }} />
            <Act done={shared} label={shared ? `SHARED WITH ${vis.toUpperCase()} · ${place.toUpperCase()}` : `SHARE · I’M GOING TO ${place.toUpperCase()}`}
              onPress={() => { if (!shared) setMsgs((m) => [...m, `Heading to ${place} tonight.`]); setShared(!shared); }} />
          </Velvet>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <DecoHead>GROUP OUTINGS</DecoHead>
            <Pressable onPress={() => setMine(true)} accessibilityRole="button"><Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: acc}}>+ PLAN ONE</Text></Pressable>
          </View>
          {outings.map(([when, host, title, where, n, cap, deal], oi) => {
            const you = host === 'You', joined = you || ins.includes(title), cnt = n + (joined ? 1 : 0);
            return (
              <Animated.View key={title} entering={FadeInDown.delay(oi * 80).duration(400)} layout={LinearTransition}>
                {/* invitation ticket: cream body + perforated brass stub */}
                <View style={{flexDirection: 'row', borderWidth: joined ? 1.5 : 1, borderColor: joined ? deco.brassHighlight : 'rgba(201,169,97,0.5)', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: {width: 0, height: 4}}}>
                  <Card style={{flex: 1, gap: 4}}>
                    <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.6, color: '#6B1424'}}>{you ? 'HOSTED BY YOU' : `HOSTED BY ${host.toUpperCase()}`}</Text>
                    <Text style={{fontFamily: fonts.displayHeavy, fontSize: 19, lineHeight: 23, color: '#1A120C'}}>{title}</Text>
                    <Text style={{fontFamily: fonts.script, fontSize: 15, color: '#3A2A1A'}}>{where}</Text>
                    {deal ? <Text style={{alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#1A120C', fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1, color: deco.brassHighlight}}>{deal}</Text> : null}
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2}}>
                      <View style={{flexDirection: 'row'}}>
                        {Array.from({length: Math.min(4, cnt)}, (_, kk) => <View key={kk} style={{width: 20, height: 20, borderRadius: 10, marginLeft: kk ? -6 : 0, borderWidth: 1.5, borderColor: '#F2E8D2', backgroundColor: joined && kk === 0 ? acc : ['#6B5028', '#8A6A2A', '#5A4018', '#A47A34'][kk]}} />)}
                      </View>
                      <Text style={{fontFamily: fonts.mono, fontSize: 9, color: '#5A4630'}}>{cnt} GOING · {cap - cnt} LEFT</Text>
                    </View>
                    <View style={{height: 3, backgroundColor: 'rgba(26,18,12,0.15)'}}><View style={{height: 3, width: `${Math.round((cnt / cap) * 100)}%`, backgroundColor: '#6B1424'}} /></View>
                  </Card>
                  <Pressable onPress={() => { if (you) Share.share({message: `Join me: ${title} — finesselife.vip`}).catch(() => {}); else setIns((l) => toggle(l, title)); }} accessibilityRole="button"
                    style={{width: 86, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6, borderLeftWidth: 1.5, borderStyle: 'dashed', borderColor: deco.brass, backgroundColor: joined && !you ? deco.brassHighlight : Cn.lacquer}}>
                    <Text style={{fontFamily: fonts.mono, fontSize: 8.5, color: joined && !you ? '#140E08' : deco.brassHighlight, textAlign: 'center'}}>{when}</Text>
                    <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1, color: joined && !you ? '#140E08' : acc, textAlign: 'center'}}>{you ? 'INVITE MORE' : joined ? 'YOU’RE IN' : 'I’M IN'}</Text>
                  </Pressable>
                </View>
              </Animated.View>
            );
          })}
          <SampleNote>SAMPLE OUTINGS · JOINING HERE IS A PREVIEW UNTIL OUTINGS GO LIVE</SampleNote>
        </Animated.View>
      ) : null}

      {mode === 'dating' ? (
        <Animated.View entering={FadeIn.duration(350)} style={{gap: 14}}>
          <Velvet border="rgba(255,143,169,0.5)">
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}><Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: '#FF8FA9'}}>YOUR FILTERS</Text><Text style={s.small}>Only you see these</Text></View>
            <BrassToggles options={['Verified', 'VIP']} value={f.status} onChange={(v) => setF((x) => ({...x, status: v}))} accent="#FF8FA9" />
            <Text style={s.small}>INCOME · SELF-DECLARED, VERIFIED</Text>
            <BrassToggles options={['Any', '$150K+', '$250K+', '$500K+']} value={f.income} onChange={(v) => setF((x) => ({...x, income: v}))} accent="#FF8FA9" />
            <Text style={s.small}>INTERESTS</Text>
            <BrassToggles options={['Any', 'Jazz', 'Travel', 'Watches', 'Galleries']} value={f.interest} onChange={(v) => setF((x) => ({...x, interest: v}))} accent="#FF8FA9" />
          </Velvet>
          <DecoHead color="#FF8FA9">{`${pool.length} IN THE ROOM FOR YOU`}</DecoHead>
          {D ? (
            <Animated.View key={D[0]} entering={FadeInDown.duration(450)} style={{gap: 10}}>
              {/* arched deco portrait frame */}
              <View style={{height: 260, alignItems: 'center', justifyContent: 'center'}}>
                <Svg width="100%" height={260} viewBox="0 0 300 260" preserveAspectRatio="xMidYMid meet" style={{position: 'absolute'}}>
                  <Defs>
                    <LinearGradient id="ad-b" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={deco.brassWhite} /><Stop offset="0.5" stopColor={deco.brass} /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient>
                    <RadialGradient id="ad-v" cx="150" cy="110" r="150" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#5A1430" /><Stop offset="1" stopColor="#12040A" /></RadialGradient>
                  </Defs>
                  <Path d="M70 255 L70 100 Q150 0 230 100 L230 255 Z" fill="url(#ad-v)" stroke="url(#ad-b)" strokeWidth={4} />
                  <Path d="M82 255 L82 104 Q150 18 218 104 L218 255" fill="none" stroke={deco.brass} strokeOpacity={0.5} strokeWidth={1} />
                  {Array.from({length: 9}, (_, i) => { const a = Math.PI + (i / 8) * Math.PI; return <Path key={i} d={`M150 100 L${150 + Math.cos(a) * 64} ${100 + Math.sin(a) * 62}`} stroke={deco.brassHighlight} strokeOpacity={0.25} />; })}
                </Svg>
                <Portrait name={D[0]} size={104} glow={isLiked ? acc : undefined} />
                <View style={{position: 'absolute', top: 70, flexDirection: 'row', gap: 4}}>
                  {D[4].map((b) => <Text key={b} style={{paddingHorizontal: 6, paddingVertical: 2, backgroundColor: b === 'VIP' ? deco.lamp : deco.brassHighlight, fontFamily: fonts.mono, fontSize: 8, color: '#140E08'}}>{b}</Text>)}
                  <Text style={{paddingHorizontal: 6, paddingVertical: 2, backgroundColor: deco.ink, borderWidth: 1, borderColor: deco.brass, fontFamily: fonts.mono, fontSize: 8, color: deco.brassHighlight}}>{D[5]}</Text>
                </View>
              </View>
              <View style={{alignItems: 'center', gap: 2}}>
                <Text style={{fontFamily: fonts.displayHeavy, fontSize: 28, color: deco.cream}}>{D[0]}, {D[1]}</Text>
                <Text style={{fontFamily: fonts.script, fontSize: 17, color: 'rgba(244,232,208,0.8)'}}>{D[3]}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{D[2]}</Text>
              </View>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center'}}>{D[6].map((t) => <Text key={t} style={{paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,143,169,0.5)', fontFamily: fonts.label, fontSize: 11, color: deco.cream}}>{t}</Text>)}</View>
              {isLiked && D[7] ? <Animated.Text entering={FadeIn} style={{padding: 10, textAlign: 'center', backgroundColor: 'rgba(122,245,184,0.1)', fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: '#7AF5B8'}}>IT’S MUTUAL · NOVA CAN ARRANGE DRINKS</Animated.Text> : null}
              <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1}}><Ghost label="PASS" color={deco.brass} onPress={() => setSeen((l) => [...l, D[0]])} /></View>
                <View style={{flex: 2}}><Ghost label={isLiked ? (D[7] ? 'ASK NOVA TO ARRANGE' : 'INTERESTED · WAITING') : 'INTERESTED'} color={acc} on onPress={() => setLiked((l) => (l.includes(D[0]) ? l : [...l, D[0]]))} /></View>
              </View>
            </Animated.View>
          ) : <Text style={[s.body, {textAlign: 'center'}]}>No one else in the room tonight with those filters. Loosen one, or check back after nine.</Text>}
          <Text style={[s.small, {textAlign: 'center'}]}>Status and income show only when verified. Others see yours the same way. Your own score never shows to you.</Text>
          <SampleNote>SAMPLE PROFILES · AFTER DARK OPENS TO VERIFIED MEMBERS</SampleNote>
        </Animated.View>
      ) : null}

      {mode === 'score' ? (
        <Animated.View entering={FadeIn.duration(350)} style={{gap: 14}}>
          {/* brass medallion: the score stays hidden from you */}
          <View style={{alignItems: 'center', gap: 6}}>
            <View style={{width: 150, height: 150}}>
              <Svg width={150} height={150} viewBox="0 0 60 60" style={{position: 'absolute'}}>
                <Defs><RadialGradient id="md" cx="30" cy="24" r="30" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#3A1220" /><Stop offset="1" stopColor="#0E0408" /></RadialGradient></Defs>
                {RING.map((w, i) => <Path key={i} d={w.d} fill={w.fill} />)}
                <Circle cx={30} cy={30} r={26.5} fill="url(#md)" />
                {Array.from({length: 24}, (_, i) => { const a = (i / 24) * Math.PI * 2; return <Path key={i} d={`M${30 + Math.cos(a) * 22} ${30 + Math.sin(a) * 22} L${30 + Math.cos(a) * 25} ${30 + Math.sin(a) * 25}`} stroke={deco.brassHighlight} strokeOpacity={0.6} strokeWidth={0.5} />; })}
              </Svg>
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Text style={{fontFamily: fonts.displayHeavy, fontSize: 40, color: deco.brassWhite}}>—</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 7.5, letterSpacing: 1, color: deco.brass}}>HIDDEN FROM YOU</Text>
              </View>
            </View>
            <Text style={{fontFamily: fonts.displayHeavy, fontSize: 22, color: deco.cream, textAlign: 'center'}}>How you show up for each other.</Text>
            <Text style={[s.small, {textAlign: 'center'}]}>A number from 0 to 100 that other members see next to your name. It measures how you treat the community, not what you own.</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 18, paddingVertical: 8, paddingHorizontal: 6}} style={{flexGrow: 0, borderTopWidth: 1, borderBottomWidth: 1, borderColor: deco.brass, backgroundColor: '#100406'}}>
            {MV.map(([name, d]) => <Text key={name} style={{fontFamily: fonts.mono, fontSize: 11, color: deco.cream}}>{name.toUpperCase()} <Text style={{color: d > 0 ? '#7AF5B8' : '#FF8FA9'}}>{d > 0 ? '▲' : '▼'}{Math.abs(d)}</Text></Text>)}
          </ScrollView>
          <DecoHead>YOUR CIRCLE · LAST NIGHT</DecoHead>
          {MV.map(([name, d, why, n]) => {
            const sp = spilled.includes(name), ch = cheered.includes(name), up = d > 0, col = up ? '#7AF5B8' : '#FF8FA9';
            return (
              <Velvet key={name} border={col}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                  <Portrait name={name} size={40} />
                  <Text style={{flex: 1, fontFamily: fonts.displayBold, fontSize: 17, color: deco.cream}}>{name}</Text>
                  <Text style={{fontFamily: fonts.mono, fontSize: 13, color: col}}>{up ? '▲ ' : '▼ '}{Math.abs(d)}</Text>
                </View>
                <Text style={{fontFamily: fonts.script, fontSize: 16, lineHeight: 21, color: 'rgba(244,232,208,0.85)'}}>{why}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{n + (sp ? 1 : 0) + (ch ? 1 : 0)} IN YOUR CIRCLE TALKING</Text>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <Ghost label={sp ? 'ASKED' : up ? 'SPILL' : 'WHAT HAPPENED?'} color={acc} on={sp} onPress={() => setSpilled((l) => toggle(l, name))} />
                  <Ghost label={ch ? 'SENT' : up ? 'CHEER' : 'SEND LOVE'} color={deco.brassHighlight} on={ch} onPress={() => setCheered((l) => toggle(l, name))} />
                </View>
              </Velvet>
            );
          })}
          <Card>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: '#6B1424'}}>THEY’RE TALKING ABOUT YOU</Text>
            <Text style={{fontFamily: fonts.script, fontSize: 17, lineHeight: 22, color: '#1A120C'}}>Your score moved last night. Three people in your circle noticed. Your number stays hidden from you, so ask them.</Text>
            <Act done={asked} onCard label={asked ? 'MAYA REPLIED: “GIRL. TIM?”' : 'ASK MY CIRCLE'} onPress={() => setAsked(true)} />
          </Card>
          <DecoHead>WHAT IT’S MADE OF</DecoHead>
          {PARTS.map(([label, w, note]) => (
            <View key={label} style={{gap: 4}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}><Text style={{fontFamily: fonts.label, fontSize: 13, color: deco.cream}}>{label}</Text><Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brassHighlight}}>{w}%</Text></View>
              <View style={{height: 5, borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)'}}><View style={{height: '100%', width: `${Math.round((w / 30) * 100)}%`, backgroundColor: deco.brassHighlight}} /></View>
              <Text style={s.small}>{note}</Text>
            </View>
          ))}
          <View style={{flexDirection: 'row', gap: 10}}>
            <Velvet border="rgba(122,245,184,0.5)" style={{flex: 1}}><Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: '#7AF5B8'}}>RAISES IT</Text>{['Attending what you join', 'Hosting an outing', 'A member’s vouch', 'Answering hellos'].map((t) => <Text key={t} style={s.small}>+ {t}</Text>)}</Velvet>
            <Velvet border="rgba(255,143,169,0.5)" style={{flex: 1}}><Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: '#FF8FA9'}}>LOWERS IT</Text>{['No-shows', 'Ghosting a mutual match', 'Upheld reports', 'Spam in room chat'].map((t) => <Text key={t} style={s.small}>− {t}</Text>)}</Velvet>
          </View>
          <DecoHead>QUESTIONS</DecoHead>
          {FAQ.map(([q, a], i) => (
            <View key={q} style={{borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.25)'}}>
              <Pressable onPress={() => setFaq(faq === i ? null : i)} accessibilityRole="button" accessibilityState={{expanded: faq === i}} style={{minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Text style={{flex: 1, fontFamily: fonts.label, fontSize: 14, color: deco.cream}}>{q}</Text>
                <Text style={{fontFamily: fonts.body, fontSize: 18, color: deco.brassHighlight}}>{faq === i ? '−' : '+'}</Text>
              </Pressable>
              {faq === i ? <Animated.Text entering={FadeIn.duration(250)} style={[s.small, {paddingBottom: 10}]}>{a}</Animated.Text> : null}
            </View>
          ))}
          <SampleNote>SAMPLE CIRCLE · SCORES ARE ILLUSTRATIVE UNTIL THE SCORE SERVICE GOES LIVE</SampleNote>
        </Animated.View>
      ) : null}
    </View>
  );
}

export const btn = {minHeight: 52, borderWidth: 1, borderColor: deco.brass, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: 'rgba(58,18,27,0.6)'};
export const btnText = {fontFamily: fonts.label, fontSize: 11, letterSpacing: 4, color: deco.brassHighlight};
