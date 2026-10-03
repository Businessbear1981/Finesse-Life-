// The Lounge — grand-salon restyle. A cinematic velvet room (arched moonlit windows, swagged curtains, a
// tiered chandelier, the back bar, brass screens and table lamps that wake one at a time), deco marquee,
// jewelled portrait rings, calling-card selections, note-card room chat, invitation-ticket outings, an
// After Dark arch portrait and a brass medallion for the Social Score.
// Data is sample unless noted; /api/posts feeds live notes into room chat when the API answers.
import {useEffect, useState} from 'react';
import {Pressable, ScrollView, Share, Text, TextInput, View} from 'react-native';
import Animated, {Easing, FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {BEZEL_STOPS, conicRing, deco, easeCine, fonts, track, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, SampleNote, s} from './shared';

type Post = {id: string; content: string; created_at: string; profiles?: {display_name?: string; username?: string} | null};

/* ───────────────────────── the room ───────────────────────── */
function LoungeScene({acc}: {acc: string}) {
  const W = Math.min(useAvailableWidth(), 520), H = W * 0.68;
  const tables = [0.16, 0.38, 0.62, 0.84];
  const shimmer = useSharedValue(0.7);
  useEffect(() => { shimmer.value = withRepeat(withSequence(withTiming(1, {duration: 2200, easing: Easing.inOut(Easing.quad)}), withTiming(0.7, {duration: 2200})), -1); }, [shimmer]);
  const chand = useAnimatedStyle(() => ({opacity: shimmer.value}));
  const k = W / 400;
  return (
    <View style={{width: W, height: H, alignSelf: 'center', overflow: 'hidden', borderWidth: 2, borderColor: deco.brass}}>
      <Svg width={W} height={H} viewBox="0 0 400 272" style={{position: 'absolute'}}>
        <Defs>
          <LinearGradient id="lg-wall" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#1A060C" /><Stop offset="0.6" stopColor="#4A0E1E" /><Stop offset="1" stopColor="#2A0810" /></LinearGradient>
          <LinearGradient id="lg-win" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0E1630" /><Stop offset="1" stopColor="#2A2A4A" /></LinearGradient>
          <LinearGradient id="lg-brass" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={deco.brassWhite} /><Stop offset="0.5" stopColor={deco.brass} /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient>
          <LinearGradient id="lg-curtain" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#3A0410" /><Stop offset="0.35" stopColor="#8A1630" /><Stop offset="0.6" stopColor="#4A0818" /><Stop offset="1" stopColor="#7A1228" /></LinearGradient>
          <LinearGradient id="lg-floor" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#2A0C10" /><Stop offset="1" stopColor="#0A0406" /></LinearGradient>
          <RadialGradient id="lg-glow" cx="200" cy="70" r="200" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#FFE6C8" stopOpacity={0.35} /><Stop offset="0.5" stopColor={acc} stopOpacity={0.08} /><Stop offset="1" stopColor="#000" stopOpacity={0} /></RadialGradient>
          <RadialGradient id="lg-moon" cx="0.5" cy="0.3" r="0.6"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.6} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width={400} height={272} fill="url(#lg-wall)" />
        {/* deco wall fluting */}
        {Array.from({length: 40}, (_, i) => <Path key={i} d={`M${i * 10 + 5} 0 L${i * 10 + 5} 168`} stroke="#000" strokeOpacity={0.18} />)}
        {/* three arched moonlit windows with deco mullions */}
        {[110, 200, 290].map((x, i) => (
          <G key={x}>
            <Path d={`M${x - 30} 150 L${x - 30} 58 Q${x} 18 ${x + 30} 58 L${x + 30} 150 Z`} fill="url(#lg-win)" stroke="url(#lg-brass)" strokeWidth={2.5} />
            <Path d={`M${x - 30} 150 L${x - 30} 58 Q${x} 18 ${x + 30} 58 L${x + 30} 150 Z`} fill="url(#lg-moon)" opacity={i === 1 ? 0.7 : 0.3} />
            <Path d={`M${x} 32 L${x} 150 M${x - 30} 90 L${x + 30} 90 M${x - 30} 120 L${x + 30} 120`} stroke={deco.brass} strokeOpacity={0.7} strokeWidth={1} />
            {Array.from({length: 5}, (_, j) => { const a = Math.PI + (j / 4) * Math.PI; return <Path key={j} d={`M${x} 58 L${x + Math.cos(a) * 26} ${58 + Math.sin(a) * 26}`} stroke={deco.brass} strokeOpacity={0.6} strokeWidth={0.8} />; })}
            {i === 1 ? <Circle cx={x + 10} cy={52} r={7} fill="#FFF6E0" opacity={0.85} /> : null}
          </G>
        ))}
        {/* swagged curtains */}
        <Path d="M0 0 L70 0 Q60 70 40 120 Q30 170 52 200 L0 200 Z" fill="url(#lg-curtain)" />
        <Path d="M400 0 L330 0 Q340 70 360 120 Q370 170 348 200 L400 200 Z" fill="url(#lg-curtain)" />
        <Path d="M0 0 Q200 40 400 0 L400 14 Q200 54 0 14 Z" fill="#6A1024" stroke="url(#lg-brass)" strokeWidth={1.5} />
        {Array.from({length: 21}, (_, i) => <Path key={i} d={`M${i * 20} ${14 + Math.sin((i / 20) * Math.PI) * 40} l0 10`} stroke={deco.brassHighlight} strokeWidth={1.2} />)}
        <Circle cx={46} cy={124} r={5} fill="url(#lg-brass)" />
        <Circle cx={354} cy={124} r={5} fill="url(#lg-brass)" />
        {/* back bar */}
        <Rect x={86} y={150} width={228} height={22} fill="#1A0A06" stroke="url(#lg-brass)" strokeWidth={1.5} />
        {Array.from({length: 18}, (_, i) => <Rect key={i} x={94 + i * 12} y={140 - (i % 3) * 3} width={4} height={10 + (i % 3) * 3} rx={1.5} fill={['#7A3A1A', '#2A5A3A', '#C9A961', '#6A1A2A'][i % 4]} opacity={0.85} />)}
        <Path d="M86 150 L314 150" stroke={deco.brassHighlight} strokeWidth={1} />
        {/* floor: deco fan tiles in perspective */}
        <Rect x={0} y={172} width={400} height={100} fill="url(#lg-floor)" />
        {Array.from({length: 9}, (_, i) => <Path key={i} d={`M200 172 L${-200 + i * 100} 272`} stroke={deco.brass} strokeOpacity={0.18} />)}
        {[190, 214, 244].map((y) => <Path key={y} d={`M0 ${y} L400 ${y}`} stroke={deco.brass} strokeOpacity={0.14} />)}
        {/* brass privacy screens */}
        {[0.27, 0.5, 0.73].map((x) => (
          <G key={x}>
            <Rect x={x * 400 - 9} y={178} width={18} height={50} fill="#140806" opacity={0.85} stroke="url(#lg-brass)" strokeWidth={1} />
            {[188, 200, 212].map((y) => <Path key={y} d={`M${x * 400 - 9} ${y} L${x * 400 + 9} ${y}`} stroke={deco.brass} strokeOpacity={0.6} strokeWidth={0.7} />)}
          </G>
        ))}
        {/* velvet banquettes around round tables */}
        {tables.map((x) => (
          <G key={x}>
            <Path d={`M${x * 400 - 40} 238 Q${x * 400} 206 ${x * 400 + 40} 238 L${x * 400 + 34} 248 Q${x * 400} 220 ${x * 400 - 34} 248 Z`} fill="#6A1428" />
            <Ellipse cx={x * 400} cy={246} rx={22} ry={6} fill="#1A0A0E" stroke="url(#lg-brass)" strokeWidth={1.2} />
            <Path d={`M${x * 400} 246 L${x * 400} 262`} stroke="url(#lg-brass)" strokeWidth={2} />
          </G>
        ))}
        <Rect width={400} height={272} fill="url(#lg-glow)" />
      </Svg>
      {/* chandelier with a slow shimmer */}
      <Animated.View pointerEvents="none" style={[{position: 'absolute', left: 150 * k, top: 0, width: 100 * k, height: 90 * k}, chand]}>
        <Svg width={100 * k} height={90 * k} viewBox="0 0 100 90">
          <Defs><RadialGradient id="lg-ch" cx="50" cy="52" r="48" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} /><Stop offset="0.4" stopColor="#FFE6C8" stopOpacity={0.45} /><Stop offset="1" stopColor="#FFE6C8" stopOpacity={0} /></RadialGradient></Defs>
          <Path d="M50 0 L50 24" stroke={deco.brass} />
          <Circle cx={50} cy={52} r={46} fill="url(#lg-ch)" />
          {[[34, 5, 30], [26, 4, 42], [16, 3, 54]].map(([rx, ry, cy], i) => <Ellipse key={i} cx={50} cy={cy} rx={rx} ry={ry} fill="none" stroke={deco.brassHighlight} strokeWidth={1.4} />)}
          {Array.from({length: 13}, (_, i) => <Path key={i} d={`M${20 + i * 5} 32 L${20 + i * 5} ${42 + (i % 3) * 5}`} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={0.8} />)}
          <Path d="M42 58 L50 70 L58 58" fill="#FFF1C2" />
        </Svg>
      </Animated.View>
      {tables.map((x, i) => <Lamp key={x} x={x} i={i} W={W} H={H} acc={acc} />)}
    </View>
  );
}

function Lamp({x, i, W, H, acc}: {x: number; i: number; W: number; H: number; acc: string}) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(500 + i * 700, withRepeat(withSequence(withTiming(1, {duration: 1000, easing: easeCine}), withTiming(0.6, {duration: 2600})), -1, true));
  }, [i, o]);
  const st = useAnimatedStyle(() => ({opacity: o.value}));
  const k = W / 400, sz = 60 * k;
  return (
    <Animated.View pointerEvents="none" style={[{position: 'absolute', left: x * W - sz / 2, top: (236 / 272) * H - sz / 2 - 6 * k, width: sz, height: sz}, st]}>
      <Svg width={sz} height={sz} viewBox="0 0 60 60">
        <Defs><RadialGradient id={`ll${i}`} cx="30" cy="30" r="30" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#FFF6E0" stopOpacity={0.95} /><Stop offset="0.3" stopColor={acc} stopOpacity={0.55} /><Stop offset="1" stopColor={acc} stopOpacity={0} /></RadialGradient></Defs>
        <Circle cx={30} cy={30} r={30} fill={`url(#ll${i})`} />
        <Path d="M24 32 Q30 20 36 32 Z" fill={deco.brassHighlight} />
      </Svg>
    </Animated.View>
  );
}

/* ───────────────────────── ornaments ───────────────────────── */
function Fan({flip}: {flip?: boolean}) {
  return (
    <Svg width={34} height={18} viewBox="0 0 34 18" style={{transform: [{scaleX: flip ? -1 : 1}]}}>
      {Array.from({length: 6}, (_, i) => { const a = Math.PI + (i / 5) * (Math.PI / 2); return <Path key={i} d={`M34 17 L${34 + Math.cos(a) * 32} ${17 + Math.sin(a) * 16}`} stroke={deco.brassHighlight} strokeWidth={1} />; })}
      <Path d="M2 17 L34 17" stroke={deco.brassHighlight} strokeWidth={1.4} />
    </Svg>
  );
}

function DecoHead({children, color = deco.brassHighlight}: {children: string; color?: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4}}>
      <Fan />
      <Text style={{fontFamily: fonts.capsBold, fontSize: 10.5, letterSpacing: 2.6, color, textAlign: 'center'}}>{children}</Text>
      <Fan flip />
    </View>
  );
}

const RING = conicRing(30, 30, 30, 26.5, BEZEL_STOPS, 210, 48);
function Portrait({name, size = 54, glow, dim}: {name: string; size?: number; glow?: string; dim?: boolean}) {
  return (
    <View style={{width: size, height: size, borderRadius: size / 2, shadowColor: glow ?? '#000', shadowOpacity: glow ? 0.9 : 0, shadowRadius: 10, opacity: dim ? 0.7 : 1}}>
      <Svg width={size} height={size} viewBox="0 0 60 60" style={{position: 'absolute'}}>
        <Defs><RadialGradient id="pv" cx="30" cy="22" r="30" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#6A1A2A" /><Stop offset="1" stopColor="#1A060C" /></RadialGradient></Defs>
        {RING.map((w, i) => <Path key={i} d={w.d} fill={w.fill} />)}
        <Circle cx={30} cy={30} r={26.5} fill="url(#pv)" />
        {glow ? <Circle cx={30} cy={30} r={29} fill="none" stroke={glow} strokeWidth={1.6} /> : null}
      </Svg>
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontFamily: fonts.displayHeavy, fontSize: size * 0.42, color: deco.brassWhite}}>{name[0]}</Text></View>
    </View>
  );
}

/** Velvet card with brass hairline and deco corner brackets. */
function Velvet({children, border = 'rgba(201,169,97,0.55)', style}: {children: React.ReactNode; border?: string; style?: object}) {
  const corner = (pos: object, rot: string) => <View style={[{position: 'absolute', width: 12, height: 12, borderTopWidth: 2, borderLeftWidth: 2, borderColor: deco.brassHighlight, transform: [{rotate: rot}]}, pos]} />;
  return (
    <View style={[{padding: 14, gap: 10, borderWidth: 1, borderColor: border, overflow: 'hidden'}, style]}>
      <Svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} preserveAspectRatio="none">
        <Defs><LinearGradient id="vv" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#2A0A12" /><Stop offset="1" stopColor="#12060A" /></LinearGradient></Defs>
        <Rect width="100%" height="100%" fill="url(#vv)" />
      </Svg>
      {corner({left: 4, top: 4}, '0deg')}{corner({right: 4, top: 4}, '90deg')}{corner({right: 4, bottom: 4}, '180deg')}{corner({left: 4, bottom: 4}, '270deg')}
      {children}
    </View>
  );
}

/** Cream calling card (paper), used for the selected member and chat notes. */
function Card({children, style}: {children: React.ReactNode; style?: object}) {
  return (
    <View style={[{overflow: 'hidden', padding: 14, gap: 6}, style]}>
      <Svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} preserveAspectRatio="none">
        <Defs><LinearGradient id="cc" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F6EDD8" /><Stop offset="1" stopColor="#E6D6B4" /></LinearGradient></Defs>
        <Rect width="100%" height="100%" fill="url(#cc)" />
        <Rect x="5" y="5" width="97%" height="92%" fill="none" stroke="#A47A34" strokeWidth={1} />
      </Svg>
      {children}
    </View>
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

function Ghost({label, onPress, on, color}: {label: string; onPress: () => void; on?: boolean; color: string}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{minHeight: 36, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: color, backgroundColor: on ? color : 'transparent'}}>
      <Text style={{fontFamily: fonts.capsBold, fontSize: 9.5, letterSpacing: 1.3, color: on ? '#140508' : color}}>{label}</Text>
    </Pressable>
  );
}

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

      {/* marquee */}
      <View style={{alignItems: 'center', gap: 4, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.5)'}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: '#00FF88', shadowColor: '#00FF88', shadowOpacity: 0.9, shadowRadius: 6}} />
          <Text style={{fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4, color: '#7AF5B8'}}>LIVE · {geo}</Text>
        </View>
        <Text style={{fontFamily: fonts.displayHeavy, fontSize: 26, color: deco.brassWhite}}>42 <Text style={{fontFamily: fonts.script, fontSize: 18, color: deco.cream}}>in the room tonight</Text></Text>
      </View>

      {/* deco tabs */}
      <View style={{flexDirection: 'row', borderWidth: 1, borderColor: deco.brass, backgroundColor: '#120608'}}>
        {MODES.map(([k, label, icon], i) => {
          const on = k === mode;
          return (
            <Pressable key={k} onPress={() => setMode(k)} accessibilityRole="tab" accessibilityState={{selected: on}}
              style={{flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4, borderLeftWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.35)', backgroundColor: on ? 'rgba(232,200,122,0.12)' : 'transparent'}}>
              <Icon name={icon} size={16} color={on ? acc : deco.brass} />
              <Text style={{fontFamily: fonts.capsBold, fontSize: 8, letterSpacing: 0.8, color: on ? deco.brassWhite : 'rgba(244,232,208,0.7)'}}>{label}</Text>
              {on ? <Animated.View entering={FadeIn.duration(250)} style={{position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: acc, shadowColor: acc, shadowOpacity: 0.9, shadowRadius: 6}} /> : null}
            </Pressable>
          );
        })}
      </View>

      {mode === 'social' ? (
        <Animated.View entering={FadeIn.duration(350)} style={{gap: 14}}>
          <Chips options={Object.keys(GEO) as Rad[]} value={rad} onChange={setRad} />
          {CLUSTERS.map(([label, why, color, people], ci) => (
            <Animated.View key={label} entering={FadeInDown.delay(ci * 90).duration(400)}>
              <Velvet border={color}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
                  <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color}}>{label}</Text>
                  <Text style={{fontFamily: fonts.script, fontSize: 14, color: 'rgba(244,232,208,0.75)'}}>{why}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 14, paddingVertical: 4}}>
                  {people.map(([name, score, dist]) => {
                    const on = name === pick;
                    return (
                      <Pressable key={name} onPress={() => setPick(name)} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{selected: on}} style={{alignItems: 'center', gap: 4, width: 64}}>
                        <View>
                          <Portrait name={name} glow={on ? acc : undefined} />
                          <View style={{position: 'absolute', right: -4, bottom: -4, minWidth: 24, height: 18, paddingHorizontal: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: deco.ink, borderWidth: 1, borderColor: color}}>
                            <Text style={{fontFamily: fonts.mono, fontSize: 8.5, color}}>{score}</Text>
                          </View>
                        </View>
                        <Text style={{fontFamily: fonts.label, fontSize: 11, color: on ? deco.brassWhite : deco.cream}}>{name}</Text>
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
                  <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.8, color: '#6B1424'}}>CALLING CARD · {sel[2]}</Text>
                  <Text style={{fontFamily: fonts.displayHeavy, fontSize: 24, color: '#1A120C'}}>{sel[0]}</Text>
                </View>
              </View>
              <Text style={{fontFamily: fonts.script, fontSize: 17, lineHeight: 22, color: '#2A1A0E'}}>{sel[3]}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: '#6B5028'}}>SOCIAL SCORE {sel[1]} · SHOWN TO OTHERS, NEVER TO THEMSELVES</Text>
              <ActionBar label={hellos.includes(sel[0]) ? `HELLO SENT TO ${sel[0].toUpperCase()}` : 'SAY HELLO'} color={hellos.includes(sel[0]) ? deco.brass : '#6B1424'} onPress={() => setHellos((h) => toggle(h, sel[0]))} />
            </Card>
          </Animated.View>

          <DecoHead>{`${geo} · ROOM CHAT`}</DecoHead>
          {[...live, ...CHAT, ...msgs.map((t) => ['YOU · NOW', t, true] as [string, string, boolean])].map(([who, t, me], i) => (
            <Animated.View key={i} entering={FadeInDown.duration(300)} style={{flexDirection: me ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8}}>
              {!me ? <Portrait name={who} size={30} /> : null}
              {me ? (
                <View style={{maxWidth: '80%', padding: 10, gap: 3, backgroundColor: acc, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 14}}>
                  <Text style={{fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1, color: '#140508'}}>{who}</Text>
                  <Text style={{fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: '#140508'}}>{t}</Text>
                </View>
              ) : (
                <Card style={{maxWidth: '80%', padding: 10, gap: 3}}>
                  <Text style={{fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1, color: '#6B1424'}}>{who}</Text>
                  <Text style={{fontFamily: fonts.script, fontSize: 16, lineHeight: 20, color: '#1A120C'}}>{t}</Text>
                </Card>
              )}
            </Animated.View>
          ))}
          <View style={{flexDirection: 'row', borderWidth: 1, borderColor: deco.brassHighlight, backgroundColor: '#140608'}}>
            <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 140))} onSubmitEditing={send} placeholder="Say something to the room" placeholderTextColor="rgba(244,232,208,0.4)" accessibilityLabel="Message"
              style={{flex: 1, minHeight: 48, paddingHorizontal: 12, fontFamily: fonts.script, fontSize: 16, color: deco.cream}} />
            <Pressable onPress={send} accessibilityRole="button" accessibilityLabel="Send" style={{width: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: acc}}>
              <Text style={{fontSize: 18, color: '#140508'}}>→</Text>
            </Pressable>
          </View>
          <Text style={[s.small, {textAlign: 'center'}]}>Scores are shown to others, never to yourself. That keeps the room honest.</Text>
          <SampleNote>SAMPLE ROOM · PEOPLE AND CHAT ARE ILLUSTRATIVE · YOUR MESSAGES STAY ON THIS DEVICE UNTIL ROOM CHAT GOES LIVE</SampleNote>
        </Animated.View>
      ) : null}

      {mode === 'outings' ? (
        <Animated.View entering={FadeIn.duration(350)} style={{gap: 14}}>
          <Velvet>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>WHERE ARE YOU GOING?</Text>
            <Chips options={PLACES} value={place} onChange={(v) => { setPlace(v); setShared(false); }} />
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>WHO CAN SEE</Text>
            <Chips options={VIS} value={vis} onChange={(v) => { setVis(v); setShared(false); }} />
            <ActionBar color={shared ? deco.brass : acc} label={shared ? `SHARED WITH ${vis.toUpperCase()} · ${place.toUpperCase()}` : `SHARE · I’M GOING TO ${place.toUpperCase()}`}
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
                <View style={{flexDirection: 'row', borderWidth: joined ? 2 : 1, borderColor: joined ? deco.brassHighlight : 'rgba(201,169,97,0.5)'}}>
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
                    style={{width: 86, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: deco.brass, backgroundColor: joined && !you ? deco.brass : '#1A0A0E'}}>
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
            <Chips options={['Verified', 'VIP']} value={f.status} onChange={(v) => setF((x) => ({...x, status: v}))} accent="#FF8FA9" />
            <Text style={s.small}>INCOME · SELF-DECLARED, VERIFIED</Text>
            <Chips options={['Any', '$150K+', '$250K+', '$500K+']} value={f.income} onChange={(v) => setF((x) => ({...x, income: v}))} accent="#FF8FA9" />
            <Text style={s.small}>INTERESTS</Text>
            <Chips options={['Any', 'Jazz', 'Travel', 'Watches', 'Galleries']} value={f.interest} onChange={(v) => setF((x) => ({...x, interest: v}))} accent="#FF8FA9" />
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 18, paddingVertical: 8, paddingHorizontal: 6}} style={{borderTopWidth: 1, borderBottomWidth: 1, borderColor: deco.brass, backgroundColor: '#100406'}}>
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
            <ActionBar color={asked ? deco.brass : '#6B1424'} label={asked ? 'MAYA REPLIED: “GIRL. TIM?”' : 'ASK MY CIRCLE'} onPress={() => setAsked(true)} />
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
