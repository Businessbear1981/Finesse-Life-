// The Vault — the Finesse card in Nano Black, Platinum or Rose Gold (member's choice of finish), tap-to-reveal balance and the
// ledger drawers (from the design). Live figures come from /api/vault/balance; when the ledger can't be
// read, a clearly labelled sample is shown instead of a guessed balance. The full card number is never
// rendered — only the last four. Funding stays paused until the card partner signs off.
//
// Continental restyle: a round steel vault door swings open on entry onto a lamp-lit safe; the card rests
// on an oxblood velvet tray, in a physically drawn finish (brushed metal, foil wordmark, EMV chip, edge
// highlight); finishes are chosen from three metal swatches; the balance is a brass counter; 12% is struck
// on a gold house marker; and the ledger drawers are numbered safe-deposit boxes.
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {Easing, FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText} from 'react-native-svg';
import {Link} from 'expo-router';
import {api} from '@/lib/api';
import {secureStorage} from '@/lib/secure-storage';
import {continental as Cn, deco, easeCine, fonts, metals, track, weighty, type Metal, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {BrassButton, Coin, DecoFrame, Divider, FoilSheen, Plate, Sigil, Surface, VaultDoor, rosettePaths, steppedRect, useCalm, useSvgId} from '@/components/continental';
import {brushed, rng, specks} from '@/components/continental/util';
import {SampleNote, s} from './shared';

type Tx = {id: string; merchant: string; amount_cents: number; cashback_cents: number; direction: string; created_at: string};
type Balance = {balance_cents: number; cashback_earned_cents: number; transactions: Tx[]};
// Finishes, not tiers: the founder's three card colours (keep in sync with web src/lib/card-finishes.ts).
type Tier = 'nano_black' | 'platinum' | 'rose_gold';
const TIERS: Record<Tier, {label: string; metal: Metal; ink: string; name: string; foil: Metal; engrave: string; hi: string}> = {
  nano_black: {label: 'NANO BLACK', metal: 'nanoBlack', ink: '#E8E6E0', name: 'NANO BLACK', foil: 'goldLeaf', engrave: '#C9C4B8', hi: 'rgba(0,0,0,0.9)'},
  platinum: {label: 'PLATINUM', metal: 'platinum', ink: '#1A1C20', name: 'PLATINUM', foil: 'gunmetal', engrave: '#2A2C31', hi: 'rgba(255,255,255,0.75)'},
  rose_gold: {label: 'ROSE GOLD', metal: 'roseGold', ink: '#2A1014', name: 'ROSE GOLD', foil: 'goldLeaf', engrave: '#4A1E24', hi: 'rgba(255,236,226,0.7)'},
};
const FINISH_KEY = 'finesse_card_finish';
const isTier = (v: unknown): v is Tier => v === 'nano_black' || v === 'platinum' || v === 'rose_gold';
type State = 'SETTLED' | 'PENDING' | 'HELD';
// Ink stamps on the ledger slip.
const STATE: Record<State, string> = {SETTLED: '#2E4A2A', PENDING: '#7A5414', HELD: '#7A1626'};
type Drawer = [string, string, Array<[string, string, State | null]>];
const SAMPLE: Drawer[] = [
  ['Rebates earned', '$318.40', [['Maison Aurel · evening bag', '+$96.00', 'SETTLED'], ['Scale · cashmere wrap', '+$42.40', 'PENDING'], ['Atelier Nuit · gown', '+$180.00', 'SETTLED']]],
  ['Purchases', '$4,120.00', [['Satin slingbacks', '$890.00', 'SETTLED'], ['Pearl drop earrings', '$1,430.00', 'SETTLED'], ['Weekly grocery order', '$186.40', 'PENDING']]],
  ['Held for you', '$2,150.00', [['Exchange · tote offer in escrow', '$2,150.00', 'HELD']]],
];
const money = (c: number) => `$${(c / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

/* ───────────────────────── the card ───────────────────────── */
function Card({tier, open, name, number, onPress, width}: {tier: Tier; open: boolean; name: string; number: string; onPress: () => void; width: number}) {
  const T = TIERS[tier];
  const W = width, H = W * 0.63;
  const id = useSvgId('card');
  const calm = useCalm();
  const tilt = useAnimatedStyle(() => ({transform: [{perspective: 800}, {rotateX: withTiming(open ? '0deg' : '8deg', {duration: calm ? 0 : 700, easing: easeCine})}, {scale: withTiming(open ? 1 : 0.97, {duration: calm ? 0 : 700})}]}));
  const sheen = useAnimatedStyle(() => ({transform: [{translateX: withTiming(open ? W * 1.2 : -W * 0.4, {duration: calm ? 0 : 1100, easing: easeCine})}, {rotate: '20deg'}]}));
  const art = useMemo(() => ({
    bands: brushed(W, H, 41, tier === 'nano_black' ? 1.6 : 0.8),
    sparkle: tier === 'nano_black' ? specks(W, H, 520, 9, 0.55) : '',
    sparkleHi: tier === 'nano_black' ? (() => { const r = rng(5); let d = ''; for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, sz = 0.8 + r() * 1.2; d += `M${(x - sz).toFixed(1)} ${y.toFixed(1)}H${(x + sz).toFixed(1)}M${x.toFixed(1)} ${(y - sz).toFixed(1)}V${(y + sz).toFixed(1)}`; } return d; })() : '',
    rosette: rosettePaths(W * 0.8, H * 0.52, H * 0.62, {lobes: 28, curves: 9, depth: 0.28, steps: 300}),
    rosette2: rosettePaths(W * 0.8, H * 0.52, H * 0.34, {lobes: 16, curves: 7, depth: 0.4, steps: 220}),
    frame: steppedRect(W * 0.035, W * 0.035, W - W * 0.035, H - W * 0.035, W * 0.012),
  }), [W, H, tier]);
  const cx = W * 0.085, cy = H * 0.37, cw = W * 0.135, ch = H * 0.165;
  const dark = tier === 'nano_black';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{expanded: open}} accessibilityLabel="Tap the card to reveal your balance" style={{alignSelf: 'center'}}>
      <Animated.View style={[{width: W, height: H, borderRadius: W * 0.045, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.75, shadowRadius: 16, shadowOffset: {width: 0, height: 10}, elevation: 14}, tilt]}>
        <Svg width={W} height={H} style={{position: 'absolute'}}>
          <Defs>
            <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0.75">
              {metals[T.metal].map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}
            </LinearGradient>
            {/* anisotropic highlight: brushed metal throws a horizontal band */}
            <LinearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFF" stopOpacity={0} /><Stop offset="0.3" stopColor="#FFF" stopOpacity={dark ? 0.05 : 0.22} /><Stop offset="0.38" stopColor="#FFF" stopOpacity={dark ? 0.01 : 0.04} /><Stop offset="0.7" stopColor="#000" stopOpacity={dark ? 0.2 : 0.08} /><Stop offset="1" stopColor="#000" stopOpacity={dark ? 0.4 : 0.18} />
            </LinearGradient>
            <LinearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFF" stopOpacity={0.85} /><Stop offset="0.35" stopColor="#FFF" stopOpacity={0.15} /><Stop offset="0.7" stopColor="#000" stopOpacity={0.2} /><Stop offset="1" stopColor="#000" stopOpacity={0.6} />
            </LinearGradient>
            <LinearGradient id={`${id}f`} x1="0" y1="0" x2="0.3" y2="1">
              {metals[T.foil].map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}
            </LinearGradient>
            <LinearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1">
              {metals.goldLeaf.map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}
            </LinearGradient>
            <RadialGradient id={`${id}v`} cx="0.25" cy="0.15" r="1.1"><Stop offset="0" stopColor="#FFF" stopOpacity={dark ? 0.06 : 0.1} /><Stop offset="1" stopColor="#000" stopOpacity={0} /></RadialGradient>
          </Defs>
          <Rect width={W} height={H} rx={W * 0.045} fill={`url(#${id}b)`} />
          <Path d={art.bands[0]} stroke="#FFF" strokeOpacity={dark ? 0.035 : 0.28} strokeWidth={0.45} />
          <Path d={art.bands[1]} stroke="#000" strokeOpacity={dark ? 0.25 : 0.1} strokeWidth={0.45} />
          <Path d={art.bands[2]} stroke="#FFF" strokeOpacity={dark ? 0.02 : 0.1} strokeWidth={0.7} />
          {dark ? <><Path d={art.sparkle} fill="#FFF" opacity={0.28} /><Path d={art.sparkleHi} stroke="#FFF8E8" strokeOpacity={0.5} strokeWidth={0.35} /></> : null}
          <Rect width={W} height={H} fill={`url(#${id}a)`} />
          <Rect width={W} height={H} fill={`url(#${id}v)`} />
          {/* engine-turned rosette, engraved tone-on-tone */}
          <G opacity={dark ? 0.22 : 0.16}>
            {art.rosette.map((d, i) => <Path key={i} d={d} fill="none" stroke={dark ? '#C9A961' : T.ink} strokeWidth={0.35} />)}
            {art.rosette2.map((d, i) => <Path key={`r${i}`} d={d} fill="none" stroke={dark ? '#C9A961' : T.ink} strokeWidth={0.35} />)}
          </G>
          <Path d={art.frame} fill="none" stroke={dark ? '#C9A961' : T.ink} strokeOpacity={dark ? 0.35 : 0.22} strokeWidth={0.6} />
          {/* foil wordmark */}
          <SvgText x={W * 0.075} y={H * 0.24 + 1} fontSize={W * 0.095} fontFamily={fonts.displayHeavy} fill="#000" fillOpacity={dark ? 0.8 : 0.25}>Finesse</SvgText>
          <SvgText x={W * 0.075} y={H * 0.24} fontSize={W * 0.095} fontFamily={fonts.displayHeavy} fill={`url(#${id}f)`}>Finesse</SvgText>
          {/* EMV chip */}
          <Rect x={cx} y={cy + 0.8} width={cw} height={ch} rx={cw * 0.14} fill="#000" opacity={0.35} />
          <Rect x={cx} y={cy} width={cw} height={ch} rx={cw * 0.14} fill={`url(#${id}c)`} />
          <G stroke="#5A3C0C" strokeOpacity={0.8} strokeWidth={0.6} fill="none">
            <Path d={`M${cx} ${cy + ch / 3} H${cx + cw * 0.32} M${cx} ${cy + (2 * ch) / 3} H${cx + cw * 0.32} M${cx + cw * 0.68} ${cy + ch / 3} H${cx + cw} M${cx + cw * 0.68} ${cy + (2 * ch) / 3} H${cx + cw}`} />
            <Path d={`M${cx + cw / 2} ${cy} V${cy + ch * 0.26} M${cx + cw / 2} ${cy + ch * 0.74} V${cy + ch}`} />
            <Rect x={cx + cw * 0.32} y={cy + ch * 0.26} width={cw * 0.36} height={ch * 0.48} rx={cw * 0.06} />
          </G>
          <Rect x={cx + 0.5} y={cy + 0.5} width={cw - 1} height={ch * 0.4} rx={cw * 0.12} fill="#FFF" opacity={0.18} />
          {/* contactless */}
          {[0, 1, 2, 3].map((i) => <Path key={i} d={`M${cx + cw + W * 0.035 + i * W * 0.016} ${cy + ch * 0.18 - i * 1.2} q${W * 0.012} ${ch * 0.32 + i * 1.2} 0 ${ch * 0.64 + i * 2.4}`} fill="none" stroke={dark ? '#C9C4B8' : T.ink} strokeOpacity={0.6} strokeWidth={0.9} strokeLinecap="round" />)}
          {/* edge: machined bevel catching the light */}
          <Rect x={0.6} y={0.6} width={W - 1.2} height={H - 1.2} rx={W * 0.045} fill="none" stroke={`url(#${id}e)`} strokeWidth={1.2} />
          <Rect x={2} y={2} width={W - 4} height={H - 4} rx={W * 0.04} fill="none" stroke="#FFF" strokeOpacity={dark ? 0.06 : 0.25} strokeWidth={0.5} />
        </Svg>
        <FoilSheen period={9000} delay={2500} intensity={dark ? 0.12 : 0.28} radius={W * 0.045} />
        <Animated.View pointerEvents="none" style={[{position: 'absolute', top: -H * 0.5, width: W * 0.18, height: H * 2, backgroundColor: 'rgba(255,255,255,0.16)'}, sheen]} />
        <View style={{flex: 1, paddingHorizontal: W * 0.075, paddingTop: H * 0.09, paddingBottom: H * 0.08, justifyContent: 'space-between'}}>
          <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: Math.max(7.5, W * 0.025), letterSpacing: 2.2, color: T.engrave, opacity: 0.9, marginTop: 4, textShadowColor: T.hi, textShadowOffset: {width: 0, height: 0.8}, textShadowRadius: 0}}>{T.name}</Text>
          </View>
          <View style={{gap: 3}}>
            <Text style={{fontFamily: fonts.mono, fontSize: W * 0.05, letterSpacing: W * 0.007, color: T.engrave, textShadowColor: T.hi, textShadowOffset: {width: 0, height: 0.8}, textShadowRadius: 0}}>{number}</Text>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end'}}>
              <View style={{gap: 1}}>
                <Text style={{fontFamily: fonts.label, fontSize: Math.max(6, W * 0.018), letterSpacing: 1.6, color: T.engrave, opacity: 0.7}}>MEMBER SINCE MMXXVI</Text>
                <Text style={{fontFamily: fonts.caps, fontSize: Math.max(8.5, W * 0.033), letterSpacing: 1.6, color: T.engrave, textShadowColor: T.hi, textShadowOffset: {width: 0, height: 0.8}, textShadowRadius: 0}}>{name}</Text>
              </View>
              <Sigil size={Math.max(18, W * 0.075)} color={dark ? '#C9A961' : T.engrave} opacity={0.7} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ───────────────────────── the safe ───────────────────────── */
function SafeWall({w, h}: {w: number; h: number}) {
  const id = useSvgId('sw');
  const cols = Math.max(5, Math.round(w / 44));
  const bw = w / cols, bh = bw * 0.62;
  const rows = Math.ceil(h / bh);
  return (
    <Svg width={w} height={h} style={{position: 'absolute'}}>
      <Defs>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">{metals.gunmetal.map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}</LinearGradient>
        <LinearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#000" stopOpacity={0.25} /><Stop offset="0.55" stopColor="#000" stopOpacity={0.55} /><Stop offset="1" stopColor="#000" stopOpacity={0.92} /></LinearGradient>
        <LinearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">{metals.brass.map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}</LinearGradient>
      </Defs>
      <Rect width={w} height={h} fill="#050506" />
      {Array.from({length: rows * cols}, (_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const x = c * bw + 1.5, y = r * bh + 1.5, bw2 = bw - 3, bh2 = bh - 3;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={bw2} height={bh2} fill={`url(#${id}b)`} opacity={0.55} />
            <Rect x={x + 2} y={y + 2} width={bw2 - 4} height={bh2 - 4} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={0.6} />
            <Rect x={x + bw2 / 2 - 5} y={y + 4} width={10} height={4} fill={`url(#${id}p)`} opacity={0.7} />
            <Circle cx={x + bw2 - 7} cy={y + bh2 / 2 + 2} r={1.6} fill="#000" opacity={0.8} />
          </G>
        );
      })}
      <Rect width={w} height={h} fill={`url(#${id}d)`} />
    </Svg>
  );
}

/** The architrave the door is set into: black lacquer, stepped rings and rays radiating into the corners. */
function DoorWall({w, h, r}: {w: number; h: number; r: number}) {
  const id = useSvgId('dw');
  const cx = w / 2, cy = h / 2;
  const R = Math.hypot(w, h);
  const rays = Array.from({length: 40}, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return `M${(cx + Math.cos(a) * (r + 12)).toFixed(1)} ${(cy + Math.sin(a) * (r + 12)).toFixed(1)} L${(cx + Math.cos(a) * R).toFixed(1)} ${(cy + Math.sin(a) * R).toFixed(1)}`;
  }).join(' ');
  return (
    <Svg width={w} height={h} style={{position: 'absolute'}}>
      <Defs>
        <RadialGradient id={`${id}b`} cx={cx} cy={cy} r={R / 2} gradientUnits="userSpaceOnUse"><Stop offset="0.4" stopColor="#1A1714" /><Stop offset="1" stopColor="#050405" /></RadialGradient>
        <LinearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">{metals.brass.map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}</LinearGradient>
      </Defs>
      <Path fillRule="evenodd" d={`M0 0 H${w} V${h} H0 Z M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`} fill={`url(#${id}b)`} />
      <Path d={rays} stroke={deco.brass} strokeOpacity={0.14} strokeWidth={0.6} />
      {[5, 9].map((d) => <Circle key={d} cx={cx} cy={cy} r={r + d} fill="none" stroke={`url(#${id}m)`} strokeOpacity={d === 5 ? 0.9 : 0.4} strokeWidth={d === 5 ? 1.2 : 0.6} />)}
      <Path d={steppedRect(6, 6, w - 6, h - 6, 7)} fill="none" stroke={`url(#${id}m)`} strokeWidth={1.2} />
      <Path d={steppedRect(11, 11, w - 11, h - 11, 6)} fill="none" stroke={deco.brass} strokeOpacity={0.35} strokeWidth={0.6} />
    </Svg>
  );
}

function Chamber({children, width, height}: {children: ReactNode; width: number; height: number}) {
  const calm = useCalm();
  const id = useSvgId('ch');
  const [doorOpen, setDoorOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const veil = useSharedValue(1);
  const lamp = useSharedValue(0.8);
  useEffect(() => {
    if (calm) { setEntered(true); return; }
    const t = setTimeout(() => setDoorOpen(true), 500);
    lamp.value = withRepeat(withSequence(withTiming(1, {duration: weighty.lamp, easing: Easing.inOut(Easing.quad)}), withTiming(0.78, {duration: weighty.lamp, easing: Easing.inOut(Easing.quad)})), -1);
    return () => clearTimeout(t);
  }, [calm, lamp]);
  const veilSt = useAnimatedStyle(() => ({opacity: veil.value}));
  const lampSt = useAnimatedStyle(() => ({opacity: lamp.value}));
  const D = Math.min(width - 12, height - 12);
  return (
    <View style={{width, height, alignSelf: 'center', overflow: 'hidden', backgroundColor: '#050506'}}>
      <SafeWall w={width} h={height} />
      <Animated.View pointerEvents="none" style={[{position: 'absolute', left: 0, top: 0, width, height}, lampSt]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id={id} cx={width / 2} cy={-height * 0.05} r={height * 1.05} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFD9A0" stopOpacity={0.5} /><Stop offset="0.35" stopColor="#FF9A5A" stopOpacity={0.16} /><Stop offset="1" stopColor="#000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
      {children}
      {!entered ? (
        <Animated.View pointerEvents="none" style={[{position: 'absolute', left: 0, top: 0, width, height}, veilSt]}>
          <DoorWall w={width} h={height} r={(D / 2) * (147 / 150)} />
          <View style={{position: 'absolute', left: (width - D) / 2, top: (height - D) / 2}}>
            <VaultDoor size={D} open={doorOpen} calm={calm} onOpened={() => { veil.value = withTiming(0, {duration: 900, easing: easeCine}); setTimeout(() => setEntered(true), 950); }} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ───────────────────────── finish swatches ───────────────────────── */
function Swatch({tier, on, onPress, w}: {tier: Tier; on: boolean; onPress: () => void; w: number}) {
  const T = TIERS[tier];
  const id = useSvgId('fsw');
  const h = 46;
  const art = useMemo(() => ({bands: brushed(w - 12, h - 12, 3, tier === 'nano_black' ? 1.4 : 0.8), spark: tier === 'nano_black' ? specks(w - 12, h - 12, 90, 4, 0.5) : ''}), [w, tier]);
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{selected: on}} accessibilityLabel={`${T.label} finish`} style={{width: w, alignItems: 'center', gap: 6}}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="0.8">{metals[T.metal].map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}</LinearGradient>
          <LinearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">{metals.brass.map(([o, c], i) => <Stop key={i} offset={o} stopColor={c} />)}</LinearGradient>
        </Defs>
        <Path d={steppedRect(1, 1, w - 1, h - 1, 3.5)} fill="none" stroke={on ? `url(#${id}r)` : deco.brass} strokeOpacity={on ? 1 : 0.3} strokeWidth={on ? 1.6 : 0.8} />
        <Rect x={6} y={7} width={w - 12} height={h - 12} rx={4} fill="#000" opacity={0.6} />
        <G transform="translate(6 6)">
          <Rect width={w - 12} height={h - 12} rx={4} fill={`url(#${id}m)`} />
          <Path d={art.bands[0]} stroke="#FFF" strokeOpacity={tier === 'nano_black' ? 0.04 : 0.3} strokeWidth={0.45} />
          <Path d={art.bands[1]} stroke="#000" strokeOpacity={0.12} strokeWidth={0.45} />
          {art.spark ? <Path d={art.spark} fill="#FFF" opacity={0.35} /> : null}
          <Rect x={0.5} y={0.5} width={w - 13} height={h - 13} rx={4} fill="none" stroke="#FFF" strokeOpacity={0.35} strokeWidth={0.6} />
        </G>
      </Svg>
      <Text style={{fontFamily: fonts.capsBold, fontSize: 8, letterSpacing: 1.8, color: on ? deco.brassLight : 'rgba(244,232,208,0.55)'}}>{T.label}</Text>
      <View style={{width: 6, height: 6, transform: [{rotate: '45deg'}], backgroundColor: on ? deco.brassHighlight : 'transparent', borderWidth: on ? 0 : 0.8, borderColor: 'rgba(201,169,97,0.4)'}} />
    </Pressable>
  );
}

/* ───────────────────────── brass counter ───────────────────────── */
function Counter({value, open, label, w}: {value: string; open: boolean; label: string; w: number}) {
  const id = useSvgId('drum');
  const chars = open ? value.split('') : '$•••.••'.split('');
  const isDigit = (c: string) => /[0-9•]/.test(c);
  const digits = chars.filter(isDigit).length, marks = chars.length - digits;
  const cell = Math.min(30, (w - 52 - marks * 9 - digits * 2) / Math.max(1, digits));
  const ch = cell * 1.45;
  return (
    <Surface kind="metal" metal="brass" radius={4} style={{paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', gap: 8}} seed={11}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{position: 'absolute', left: i % 2 ? undefined : 7, right: i % 2 ? 7 : undefined, top: i < 2 ? 7 : undefined, bottom: i < 2 ? undefined : 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#7A5A24', borderWidth: 0.6, borderColor: '#FFF1C2'}}>
          <View style={{position: 'absolute', left: 1, right: 1, top: 2.4, height: 1, backgroundColor: '#2A1C0E', transform: [{rotate: `${i * 40 - 20}deg`}]}} />
        </View>
      ))}
      <Text style={{fontFamily: fonts.capsBold, fontSize: 9.5, letterSpacing: 2.6, color: Cn.engrave, textShadowColor: 'rgba(255,248,224,0.7)', textShadowOffset: {width: 0, height: 0.8}, textShadowRadius: 0}}>{label}</Text>
      <View style={{flexDirection: 'row', alignItems: 'flex-end', padding: 4, backgroundColor: '#2A1C0E', borderRadius: 3, borderWidth: 1, borderColor: '#4A3416', borderTopColor: '#1A1006', borderBottomColor: '#E8C87A'}}
        accessible accessibilityLabel={open ? `Balance ${value}` : 'Balance hidden'}>
        {chars.map((c, i) => isDigit(c) ? (
          <View key={`${open}${i}`} style={{width: cell, height: ch, marginHorizontal: 1, overflow: 'hidden', borderRadius: 2}}>
            <Svg width={cell} height={ch} style={{position: 'absolute'}}>
              <Defs>
                <LinearGradient id={`${id}${i}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#000" /><Stop offset="0.22" stopColor="#14110E" /><Stop offset="0.5" stopColor="#2A251F" /><Stop offset="0.78" stopColor="#14110E" /><Stop offset="1" stopColor="#000" /></LinearGradient>
              </Defs>
              <Rect width={cell} height={ch} fill={`url(#${id}${i})`} />
            </Svg>
            <Animated.Text entering={open ? FadeInUp.delay(i * 70).duration(500) : undefined}
              style={{textAlign: 'center', lineHeight: ch, fontFamily: fonts.displayBold, fontSize: cell * 0.86, color: open ? Cn.ivory : 'rgba(243,234,214,0.35)'}}>{c}</Animated.Text>
            <View pointerEvents="none" style={{position: 'absolute', left: 0, right: 0, top: ch / 2 - 0.5, height: 1, backgroundColor: 'rgba(0,0,0,0.35)'}} />
          </View>
        ) : (
          <Text key={i} style={{width: 9, textAlign: 'center', fontFamily: fonts.displayHeavy, fontSize: cell * 0.7, lineHeight: ch, color: deco.brassLight}}>{c}</Text>
        ))}
      </View>
    </Surface>
  );
}

/* ───────────────────────── safe-deposit box ───────────────────────── */
function DepositBox({no, label, total, open, expanded, rows, onPress}: {no: number; label: string; total: string; open: boolean; expanded: boolean; rows: Array<[string, string, State | null]>; onPress: () => void}) {
  return (
    <View>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={`Box ${no}, ${label}${open ? `, ${total}` : ''}`}>
        {({pressed}) => (
          <Surface kind="metal" metal="gunmetal" radius={3} seed={no} style={{minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10, paddingRight: 12, opacity: pressed ? 0.9 : 1, borderWidth: expanded ? 1 : 0, borderColor: deco.brassHighlight}}>
            <Plate text={`No. ${no}`} width={58} height={30} screws={false} />
            <View style={{flex: 1, gap: 3}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10.5, letterSpacing: 1.8, color: Cn.ivory, textShadowColor: '#000', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 0}}>{label.toUpperCase()}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 11, color: open ? deco.brassLight : 'rgba(232,200,122,0.5)'}}>{open ? total : '— — —'}</Text>
            </View>
            {/* two keyholes and a pull */}
            <View style={{alignItems: 'center', gap: 5}}>
              <View style={{flexDirection: 'row', gap: 5}}>
                {[0, 1].map((k) => (
                  <View key={k} style={{width: 11, height: 11, borderRadius: 6, backgroundColor: '#C9A961', borderWidth: 0.8, borderColor: '#FFF1C2', alignItems: 'center', justifyContent: 'center'}}>
                    <View style={{width: 2.4, height: 5, borderRadius: 1.2, backgroundColor: '#140E08'}} />
                  </View>
                ))}
              </View>
              <View style={{width: 30, height: 5, borderRadius: 3, backgroundColor: deco.brass, borderTopWidth: 1, borderTopColor: deco.brassWhite, borderBottomWidth: 1, borderBottomColor: deco.brassShadow}} />
            </View>
          </Surface>
        )}
      </Pressable>
      {expanded ? (
        <Animated.View entering={FadeInDown.duration(450)} style={{marginHorizontal: 8}}>
          <Surface kind="ivory" seed={no + 20} style={{paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8}}>
            {rows.length === 0 ? <Text style={{fontFamily: fonts.script, fontSize: 15, color: Cn.ink, paddingVertical: 8}}>No entries yet.</Text> : null}
            {rows.map(([t, amt, st], k) => (
              <View key={`${t}${k}`} style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: k < rows.length - 1 ? 0.6 : 0, borderColor: 'rgba(107,80,40,0.35)'}}>
                <View style={{flex: 1, gap: 3}}>
                  <Text style={{fontFamily: fonts.body, fontSize: 12.5, color: Cn.ink}}>{t}</Text>
                  {st ? <Text style={{alignSelf: 'flex-start', paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: STATE[st], fontFamily: fonts.capsBold, fontSize: 7.5, letterSpacing: 1.4, color: STATE[st], transform: [{rotate: '-2deg'}], opacity: 0.85}}>{st}</Text> : null}
                </View>
                <Text style={{fontFamily: fonts.mono, fontSize: 11, color: Cn.ink}}>{amt}</Text>
              </View>
            ))}
          </Surface>
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ───────────────────────── the room ───────────────────────── */
export function Vault({side}: {side: Side}) {
  const acc = track[side].acc;
  const [tier, setTierState] = useState<Tier>('nano_black');
  useEffect(() => {
    secureStorage.getItem(FINISH_KEY).then((v) => { if (isTier(v)) setTierState(v); }).catch(() => {});
  }, []);
  const setTier = (t: Tier) => {
    setTierState(t);
    secureStorage.setItem(FINISH_KEY, t).catch(() => {});
  };
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState<number | null>(null);
  const [live, setLive] = useState<{kind: 'loading' | 'signed_out' | 'offline' | 'error'} | {kind: 'ok'; data: Balance}>({kind: 'loading'});
  useEffect(() => {
    api<Balance>('/api/vault/balance').then((r) => {
      if (r.ok) setLive({kind: 'ok', data: r.body});
      else setLive({kind: r.status === 401 ? 'signed_out' : r.status === 0 ? 'offline' : 'error'});
    });
  }, []);
  const isLive = live.kind === 'ok';
  const drawers: Drawer[] = isLive ? [
    ['Rebates earned', money(live.data.cashback_earned_cents), live.data.transactions.filter((t) => t.cashback_cents > 0).map((t) => [t.merchant, `+${money(t.cashback_cents)}`, null])],
    ['Ledger', money(live.data.balance_cents), live.data.transactions.map((t) => [t.merchant, `${t.direction === 'credit' ? '+' : '−'}${money(Math.abs(t.amount_cents))}`, null])],
  ] : SAMPLE;
  const balance = isLive ? money(live.data.balance_cents) : '$318.40';

  const W = Math.min(useAvailableWidth(), 440);
  const cardW = Math.min(W - 36, 360);
  const trayH = cardW * 0.63 + 40;
  const chamberH = trayH + 74;
  const swW = (W - 16) / 3;

  return (
    <View style={{gap: 14}}>
      {/* the safe: the door swings open onto the card on its velvet tray */}
      <Chamber width={W} height={chamberH}>
        <View style={{position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center'}}>
          <Plate text="No. 01" caption="Private safe" width={104} height={40} enamel />
        </View>
        <View style={{position: 'absolute', left: (W - cardW - 20) / 2, top: 62, width: cardW + 20, height: trayH}}>
          <DecoFrame material="tufted" light={0.6} pad={10} step={5} style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            {/* Sample names/number only in the sample; a live card never shows invented details. */}
            <Card tier={tier} width={cardW - 6} open={open} name={isLive ? 'MEMBER' : side === 'her' ? 'AMARA · SAMPLE' : 'JULIAN · SAMPLE'} number={isLive ? '•••• •••• •••• ••••' : '•••• •••• •••• 0000'} onPress={() => setOpen((o) => !o)} />
          </DecoFrame>
        </View>
      </Chamber>
      <Text style={{textAlign: 'center', fontFamily: fonts.capsBold, fontSize: 9.5, letterSpacing: 2.4, color: open ? '#7AF5B8' : deco.brassHighlight}}>
        {open ? 'UNLOCKED' : 'TAP THE CARD TO REVEAL'}
      </Text>

      <Divider label="CHOOSE YOUR FINISH" />
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}} accessibilityRole="tablist">
        {(Object.keys(TIERS) as Tier[]).map((k) => <Swatch key={k} tier={k} w={swW} on={k === tier} onPress={() => setTier(k)} />)}
      </View>

      <Counter value={balance} open={open} w={W} label={isLive ? 'BALANCE' : 'REBATE BALANCE · SAMPLE'} />
      <Text style={[s.small, {textAlign: 'center', marginTop: -4}]}>{open ? (isLive ? 'Read from the ledger just now.' : '$42.40 pending · settles when Scale closes Sunday') : 'Open the safe to see your balance'}</Text>

      {/* the house rate, struck on a marker */}
      <Animated.View entering={FadeIn.duration(600)}>
        <DecoFrame material="lacquer" pad={14} light={0.3} style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
          <Coin size={Math.min(92, W * 0.27)} value="12%" caption="Cashback" a11y="Twelve percent cashback" />
          <View style={{flex: 1, gap: 4}}>
            <Text style={{fontFamily: fonts.label, fontSize: 9, letterSpacing: 3, color: deco.brass}}>THE HOUSE RATE</Text>
            <Text style={{fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 26, color: deco.brassLight}}>12% back</Text>
            <Text style={[s.small, {color: 'rgba(244,232,208,0.75)'}]}>On Finesse purchases, credited to your Vault as rebates once our card partner is live.</Text>
          </View>
        </DecoFrame>
      </Animated.View>

      <Divider label="SAFE-DEPOSIT BOXES" />
      <View style={{gap: 10}}>
        {drawers.map(([label, total, rows], i) => (
          <DepositBox key={label} no={101 + i} label={label} total={total} rows={rows} open={open} expanded={open && drawer === i}
            onPress={() => { setOpen(true); setDrawer(drawer === i ? null : i); }} />
        ))}
      </View>

      <BrassButton label="FUND THE VAULT" disabled accent={acc} />
      <Text style={s.small}>Adding funds opens once our card partner signs off. Finesse never holds member money itself.</Text>
      {live.kind === 'signed_out' ? <Link href="/sign-in" style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2, color: deco.brassHighlight, textAlign: 'center', paddingVertical: 8}}>SIGN IN FOR YOUR REAL LEDGER</Link> : null}
      {!isLive ? <SampleNote>{live.kind === 'loading' ? 'OPENING THE LEDGER…' : 'SAMPLE LEDGER · YOUR REAL BALANCE SHOWS WHEN THE LEDGER CAN BE READ · CHOOSE YOUR FINISH · CARD ISSUED ONCE THE PARTNER IS LIVE'}</SampleNote> : null}
    </View>
  );
}
