// The remaining rooms, built from the 31-Room Design Atlas: Carpe Diem (amber study, today's brief across
// movement, work, sport and a read-only portfolio), Market (partner market, disclosed offers, honest
// prices), and the Ballroom (compose an evening: proposal → hold → confirmed). Labelled samples.
import {useEffect, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {Easing, FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, GoldFrame, SampleNote, SectionHead, Segmented, s} from './shared';

const AMBER = deco.lamp;

/* ─────────────── Carpe Diem ─────────────── */
function Study() {
  const W = Math.min(useAvailableWidth(), 460), H = W * 0.46;
  return (
    <View style={{width: W, height: H, alignSelf: 'center', borderWidth: 2, borderColor: deco.brass, overflow: 'hidden'}}>
      <Svg width={W} height={H} viewBox="0 0 400 184">
        <Defs>
          <LinearGradient id="cd-w" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#1E1006" /><Stop offset="1" stopColor="#3A1E0A" /></LinearGradient>
          <RadialGradient id="cd-l" cx="200" cy="120" r="170" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#FFC88A" stopOpacity={0.45} /><Stop offset="1" stopColor="#000" stopOpacity={0} /></RadialGradient>
          <LinearGradient id="cd-b" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={deco.brassWhite} /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient>
        </Defs>
        <Rect width={400} height={184} fill="url(#cd-w)" />
        {/* trophy shelves */}
        {[40, 78].map((y) => <Rect key={y} x={20} y={y} width={360} height={4} fill="url(#cd-b)" />)}
        {[40, 90, 150, 250, 310, 350].map((x, i) => (
          <G key={x}>
            <Path d={`M${x - 8} 40 L${x - 6} ${26 - (i % 2) * 6} Q${x} ${18 - (i % 2) * 6} ${x + 6} ${26 - (i % 2) * 6} L${x + 8} 40 Z`} fill="url(#cd-b)" opacity={0.85} />
            <Rect x={x - 10} y={58 + (i % 3) * 3} width={20} height={20 - (i % 3) * 3} fill={['#5A2A0E', '#2A3A1E', '#3A1A0A'][i % 3]} />
          </G>
        ))}
        {/* performance table + banker's lamp */}
        <Rect x={60} y={132} width={280} height={10} fill="#140A04" stroke="url(#cd-b)" strokeWidth={1.5} />
        <Path d="M90 142 L84 184 M310 142 L316 184" stroke="url(#cd-b)" strokeWidth={3} />
        <Path d="M200 132 L200 112 M178 112 L222 112 L214 100 L186 100 Z" stroke="url(#cd-b)" strokeWidth={2} fill="#1F5A3A" />
        <Ellipse cx={200} cy={132} rx={120} ry={10} fill="#FFC88A" opacity={0.2} />
        <Rect width={400} height={184} fill="url(#cd-l)" />
      </Svg>
    </View>
  );
}

const BRIEF: Array<[string, string, string, string, number]> = [
  ['MOVEMENT', 'Gym · upper body, 45 min', 'dumbbell', '6:30 AM', 0],
  ['WORK', 'Two decisions due before noon', 'briefcase', '11:45 AM', 0],
  ['SPORT', 'Tee time Sunday, 07:50 · four-ball', 'trendingup', 'SUN', 0],
  ['PORTFOLIO', 'Read-only · paper account · no trades from the app', 'wallet', 'READ-ONLY', 0],
];

export function CarpeDiem({side}: {side: Side}) {
  const acc = side === 'him' ? AMBER : track[side].acc;
  const [done, setDone] = useState<string[]>([]);
  const pct = Math.round((done.length / 3) * 100);
  return (
    <View style={{gap: 12}}>
      <Study />
      <Text style={{fontFamily: fonts.script, fontSize: 19, color: deco.cream, textAlign: 'center'}}>Seize it. One decisive brief for the day.</Text>
      <GoldFrame pad={3}>
        <View style={{backgroundColor: '#160C06', padding: 14, gap: 12}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2.2, color: AMBER}}>TODAY’S BRIEF</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{new Date().toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'}).toUpperCase()}</Text>
          </View>
          {BRIEF.map(([k, line, icon, when], i) => {
            const isDone = done.includes(k), canTick = i < 3;
            return (
              <Pressable key={k} disabled={!canTick} onPress={() => setDone((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]))} accessibilityRole={canTick ? 'checkbox' : 'text'} accessibilityState={canTick ? {checked: isDone} : undefined}
                style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.2)'}}>
                <View style={{width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: isDone ? '#7AF5B8' : AMBER, alignItems: 'center', justifyContent: 'center', backgroundColor: isDone ? 'rgba(122,245,184,0.12)' : 'transparent'}}>
                  <Icon name={isDone ? 'sparkles' : icon} size={16} color={isDone ? '#7AF5B8' : AMBER} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{k} · {when}</Text>
                  <Text style={[s.body, {textDecorationLine: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1}]}>{line}</Text>
                </View>
              </Pressable>
            );
          })}
          <View style={{gap: 5}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.cream}}>CONFIRMED PROGRESS</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, color: AMBER}}>{pct}%</Text>
            </View>
            <View style={{height: 6, borderWidth: 1, borderColor: deco.brass}}><Animated.View layout={LinearTransition.duration(500)} style={{height: '100%', width: `${pct}%`, backgroundColor: AMBER}} /></View>
          </View>
        </View>
      </GoldFrame>
      <ActionBar color={acc} label={pct === 100 ? 'DAY SEIZED · SEE YOU TOMORROW' : 'OPEN TODAY’S BRIEF WITH NOVA'} />
      <SampleNote>SAMPLE BRIEF · THE INDICATOR RISES ONLY WITH WHAT YOU CONFIRM · PORTFOLIO IS READ-ONLY AND NEVER TRADES</SampleNote>
    </View>
  );
}

/* ─────────────── Market ─────────────── */
const GOODS: Array<[string, string, string, string, number, string]> = [
  ['WATCHES', 'Steel dress watch, 38 mm', 'Partner boutique', 'Affiliate · Finesse earns 6%', 4200, 'briefcase'],
  ['GOLF', 'Forged irons, 5–PW', 'Brand site', 'Affiliate · Finesse earns 5%', 1450, 'trendingup'],
  ['TAILORING', 'Made-to-measure navy suit', 'Partner tailor', 'Referral fee disclosed at fitting', 1890, 'shirt'],
  ['SPIRITS', 'Single-cask bourbon, 750 ml', 'Licensed retailer · 21+', 'Affiliate · Finesse earns 4%', 180, 'martini'],
];
export function Market({side}: {side: Side}) {
  const acc = side === 'him' ? AMBER : track[side].acc;
  const [cat, setCat] = useState('All');
  const [flip, setFlip] = useState<string | null>(null);
  const list = GOODS.filter((g) => cat === 'All' || g[0] === cat.toUpperCase());
  return (
    <View style={{gap: 12}}>
      <Text style={[s.body, {textAlign: 'center'}]}>The honest price, the original source and what Finesse earns — before you leave the house.</Text>
      <Chips options={['All', 'Watches', 'Golf', 'Tailoring', 'Spirits']} value={cat} onChange={setCat} accent={acc} />
      {list.map(([c, name, src, fee, price, icon]) => {
        const open = flip === name;
        return (
          <Animated.View key={name} entering={FadeInDown.duration(300)} layout={LinearTransition}>
            <GoldFrame pad={2}>
              <View style={{backgroundColor: '#140C06', padding: 12, gap: 8}}>
                <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
                  <View style={{width: 54, height: 54, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} size={22} color={acc} /></View>
                  <View style={{flex: 1}}>
                    <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{c}</Text>
                    <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{name}</Text>
                    <Text style={s.small}>{src}</Text>
                  </View>
                  <Pressable onPress={() => setFlip(open ? null : name)} accessibilityRole="button" accessibilityLabel={`Price tag for ${name}`}
                    style={{paddingHorizontal: 8, paddingVertical: 6, backgroundColor: deco.cream, transform: [{rotate: open ? '0deg' : '-4deg'}]}}>
                    <Text style={{fontFamily: fonts.capsBold, fontSize: 13, color: '#1A120C'}}>${price.toLocaleString()}</Text>
                  </Pressable>
                </View>
                {open ? (
                  <Animated.View entering={FadeIn.duration(250)} style={{padding: 10, gap: 4, borderLeftWidth: 2, borderColor: deco.brassHighlight, backgroundColor: 'rgba(232,200,122,0.06)'}}>
                    <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brassHighlight}}>DISCLOSED · {fee.toUpperCase()}</Text>
                    <Text style={s.small}>The price is the partner’s own. You check out on their site; Finesse never marks it up.</Text>
                  </Animated.View>
                ) : null}
              </View>
            </GoldFrame>
          </Animated.View>
        );
      })}
      <SampleNote>SAMPLE GOODS · TAP A PRICE TAG FOR FEES AND SOURCE · OUTBOUND LINKS OPEN ONCE PARTNERS ARE CONTRACTED</SampleNote>
    </View>
  );
}

/* ─────────────── Ballroom ─────────────── */
type Stage = 'PROPOSAL' | 'HOLD REQUESTED' | 'CONFIRMED';
const STAGES: Stage[] = ['PROPOSAL', 'HOLD REQUESTED', 'CONFIRMED'];
const EVE: Array<[string, string, string, string]> = [
  ['7:00 PM', 'Salon touch-up', 'Partner salon · 30 min', 'sparkles'],
  ['8:30 PM', 'Dinner for two · Lucian', 'Venue hold requested', 'chefhat'],
  ['10:30 PM', 'Nightcap at the Club', 'Two chairs by the fire', 'martini'],
  ['12:15 AM', 'Car home', 'Finesse Black', 'car'],
];

function Chandeliers() {
  const W = Math.min(useAvailableWidth(), 460), H = W * 0.42;
  const glow = useSharedValue(0.6);
  useEffect(() => { glow.value = withRepeat(withSequence(withTiming(1, {duration: 2400, easing: Easing.inOut(Easing.quad)}), withTiming(0.6, {duration: 2400})), -1); }, [glow]);
  const st = useAnimatedStyle(() => ({opacity: glow.value}));
  return (
    <View style={{width: W, height: H, alignSelf: 'center', borderWidth: 2, borderColor: deco.brass, overflow: 'hidden', backgroundColor: '#12080A'}}>
      <Svg width={W} height={H} viewBox="0 0 400 168" style={{position: 'absolute'}}>
        <Defs><LinearGradient id="br-f" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#2A1014" /><Stop offset="1" stopColor="#0A0406" /></LinearGradient></Defs>
        <Rect width={400} height={168} fill="url(#br-f)" />
        {Array.from({length: 7}, (_, i) => <Path key={i} d={`M${30 + i * 57} 0 L${30 + i * 57} 168`} stroke={deco.brass} strokeOpacity={0.12} />)}
        {/* laid tables */}
        {[70, 160, 250, 340].map((x) => (
          <G key={x}>
            <Ellipse cx={x} cy={138} rx={30} ry={8} fill="#F2E8D2" opacity={0.85} />
            {[-18, -6, 6, 18].map((d) => <Circle key={d} cx={x + d} cy={136} r={2} fill={deco.brassHighlight} />)}
            <Path d={`M${x} 130 L${x} 118`} stroke={deco.brassHighlight} strokeWidth={1.5} />
            <Ellipse cx={x} cy={116} rx={3} ry={5} fill="#FFE6C8" />
          </G>
        ))}
      </Svg>
      <Animated.View style={[{position: 'absolute', inset: 0}, st]} pointerEvents="none">
        <Svg width={W} height={H} viewBox="0 0 400 168">
          <Defs><RadialGradient id="br-c" cx="0.5" cy="0.4" r="0.5"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} /><Stop offset="0.4" stopColor="#FFE6C8" stopOpacity={0.35} /><Stop offset="1" stopColor="#FFE6C8" stopOpacity={0} /></RadialGradient></Defs>
          {[[80, 30], [200, 22], [320, 30], [140, 56], [260, 56]].map(([x, y], i) => (
            <G key={i}>
              <Path d={`M${x} 0 L${x} ${y - 10}`} stroke={deco.brass} strokeWidth={0.8} />
              <Circle cx={x} cy={y} r={26} fill="url(#br-c)" />
              <Ellipse cx={x} cy={y - 4} rx={14} ry={3} fill="none" stroke={deco.brassHighlight} strokeWidth={1.2} />
              <Ellipse cx={x} cy={y + 3} rx={9} ry={2} fill="none" stroke={deco.brassHighlight} strokeWidth={1} />
              {Array.from({length: 5}, (_, j) => <Path key={j} d={`M${x - 10 + j * 5} ${y - 2} L${x - 10 + j * 5} ${y + 6}`} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={0.7} />)}
            </G>
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

export function Ballroom({side}: {side: Side}) {
  const acc = track[side].acc;
  const [stage, setStage] = useState(0);
  const [skip, setSkip] = useState<string[]>([]);
  const st = STAGES[stage];
  return (
    <View style={{gap: 12}}>
      <Chandeliers />
      <Text style={{fontFamily: fonts.script, fontSize: 19, color: deco.cream, textAlign: 'center'}}>Compose an evening. Nova holds each piece; you confirm the whole.</Text>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        {STAGES.map((x, i) => (
          <View key={x} style={{flex: 1, alignItems: 'center', gap: 4}}>
            <View style={{width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: deco.brassHighlight, backgroundColor: i <= stage ? (i === 2 ? '#7AF5B8' : deco.brassHighlight) : 'transparent'}} />
            <Text style={{fontFamily: fonts.mono, fontSize: 7.5, letterSpacing: 0.8, color: i <= stage ? deco.brassHighlight : 'rgba(244,232,208,0.5)', textAlign: 'center'}}>{x}</Text>
          </View>
        ))}
      </View>
      <GoldFrame pad={3}>
        <View style={{backgroundColor: '#140A0C', padding: 12}}>
          {EVE.map(([t, title, sub, icon], i) => {
            const off = skip.includes(title);
            return (
              <View key={title} style={{flexDirection: 'row', gap: 12}}>
                <View style={{alignItems: 'center', width: 30}}>
                  <View style={{width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: off ? 'rgba(201,169,97,0.3)' : acc, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} size={14} color={off ? deco.brass : acc} /></View>
                  {i < EVE.length - 1 ? <View style={{flex: 1, width: 1, backgroundColor: 'rgba(201,169,97,0.35)'}} /> : null}
                </View>
                <View style={{flex: 1, paddingBottom: 12, opacity: off ? 0.45 : 1}}>
                  <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{t}</Text>
                  <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{title}</Text>
                  <Text style={s.small}>{sub}</Text>
                </View>
                {stage === 0 ? (
                  <Pressable onPress={() => setSkip((l) => (l.includes(title) ? l.filter((x) => x !== title) : [...l, title]))} accessibilityRole="button" hitSlop={8} style={{paddingTop: 12}}>
                    <Text style={{fontFamily: fonts.capsBold, fontSize: 8.5, letterSpacing: 1.2, color: deco.brassHighlight}}>{off ? 'ADD' : 'SKIP'}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      </GoldFrame>
      <ActionBar color={stage === 2 ? deco.brass : acc} label={stage === 0 ? 'REQUEST THE HOLDS' : stage === 1 ? 'CONFIRM THE EVENING' : 'PREVIEW · NOT BOOKED OR SAVED'} onPress={() => setStage((x) => (x + 1) % 3)} />
      <SampleNote>{`PREVIEW · CURRENT STAGE: ${st} · HOLDS ARE REQUESTS TO VENUES · NOTHING IS PAID UNTIL YOU CONFIRM WITH EACH PARTNER`}</SampleNote>
    </View>
  );
}
