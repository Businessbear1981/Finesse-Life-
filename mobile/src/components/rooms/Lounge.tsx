import {useEffect, useState} from 'react';
import {Pressable, ScrollView, Share, Text, TextInput, View} from 'react-native';
import {useAvailableWidth} from '@/lib/layout';
import Animated, {FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Defs, Ellipse, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {deco, easeCine, fonts, track, type Side} from '@/lib/deco';
import {ActionBar, Chips, GoldFrame, Monogram, SampleNote, SectionHead, Segmented, s} from './shared';

type Post = {id: string; content: string; created_at: string; profiles?: {display_name?: string; username?: string} | null};

/** Velvet seating islands; presence lamps light one table at a time, never a feed cascade. */
function LoungeScene() {
  const W = Math.min(useAvailableWidth(), 480), H = W * 0.46;
  const tables = [0.12, 0.31, 0.5, 0.69, 0.88];
  return (
    <View style={{width: W, height: H, alignSelf: 'center'}}>
      <Svg width={W} height={H} viewBox="0 0 400 184" style={{position: 'absolute'}}>
        <Defs>
          <RadialGradient id="velvet" cx="200" cy="150" r="220" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#5A1A26" />
            <Stop offset="1" stopColor={deco.ink} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={400} height={184} fill="url(#velvet)" />
        {/* brass privacy screens */}
        {[0.215, 0.405, 0.595, 0.785].map((x) => (
          <Path key={x} d={`M${x * 400} 40 L${x * 400} 150 M${x * 400 - 6} 52 L${x * 400 + 6} 52 M${x * 400 - 6} 70 L${x * 400 + 6} 70`} stroke={deco.brass} strokeOpacity={0.55} />
        ))}
        {tables.map((x) => (
          <Ellipse key={x} cx={x * 400} cy={148} rx={30} ry={9} fill="#1A0A0E" stroke={deco.brassShadow} />
        ))}
        <Path d="M0 166 L400 166" stroke={deco.brass} strokeOpacity={0.35} />
      </Svg>
      {tables.map((x, i) => <Lamp key={x} x={x} i={i} W={W} H={H} />)}
    </View>
  );
}

function Lamp({x, i, W, H}: {x: number; i: number; W: number; H: number}) {
  const o = useSharedValue(0.15);
  useEffect(() => {
    o.value = withDelay(400 + i * 650, withRepeat(withSequence(withTiming(1, {duration: 900, easing: easeCine}), withTiming(0.55, {duration: 2600})), -1, true));
  }, [i, o]);
  const s = useAnimatedStyle(() => ({opacity: o.value}));
  const k = W / 400;
  return (
    <Animated.View pointerEvents="none" style={[{position: 'absolute', left: x * W - 26 * k, top: 96 * k, width: 52 * k, height: 52 * k}, s]}>
      <Svg width={52 * k} height={52 * k} viewBox="0 0 52 52">
        <Defs>
          <RadialGradient id={`lamp${i}`} cx="26" cy="26" r="26" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={deco.cream} stopOpacity={0.95} />
            <Stop offset="0.3" stopColor={deco.pink} stopOpacity={0.5} />
            <Stop offset="1" stopColor={deco.pink} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={26} cy={26} rx={26} ry={26} fill={`url(#lamp${i})`} />
        <Path d="M22 34 L26 18 L30 34 Z" fill={deco.brassHighlight} />
      </Svg>
    </Animated.View>
  );
}

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
const lbl = {fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight} as const;
const card = {gap: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)', backgroundColor: 'rgba(20,12,10,0.75)'} as const;
function Small({label, onPress, on, color}: {label: string; onPress: () => void; on?: boolean; color: string}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{minHeight: 34, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: color, backgroundColor: on ? color : 'transparent'}}>
      <Text style={{fontFamily: fonts.capsBold, fontSize: 9.5, letterSpacing: 1.3, color: on ? '#140508' : color}}>{label}</Text>
    </Pressable>
  );
}

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
    <View style={{gap: 12}}>
      <LoungeScene />
      <Text style={{fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: '#7AF5B8', textAlign: 'center'}}>LIVE · {geo} · 42 HERE</Text>
      <Segmented options={[['social', 'LOUNGE'], ['outings', 'OUTINGS'], ['dating', 'AFTER DARK'], ['score', 'SCORE']]} value={mode} onChange={setMode} />

      {mode === 'social' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <Chips options={Object.keys(GEO) as Rad[]} value={rad} onChange={setRad} />
          {CLUSTERS.map(([label, why, color, people], ci) => (
            <View key={label} style={[card, {borderColor: ci === 0 ? 'rgba(122,245,184,0.5)' : ci === 1 ? 'rgba(232,200,122,0.5)' : 'rgba(255,143,169,0.45)'}]}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={[lbl, {color}]}>{label}</Text><Text style={s.small}>{why}</Text>
              </View>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
                {people.map(([name, score]) => {
                  const on = name === pick;
                  return (
                    <Pressable key={name} onPress={() => setPick(name)} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{selected: on}} style={{alignItems: 'center', gap: 4}}>
                      <View>
                        <Monogram name={name} size={48} ring={on ? acc : color} />
                        <View style={{position: 'absolute', right: -6, bottom: -4, paddingHorizontal: 4, backgroundColor: deco.ink, borderWidth: 1, borderColor: color}}>
                          <Text style={{fontFamily: fonts.mono, fontSize: 8.5, color}}>{score}</Text>
                        </View>
                      </View>
                      <Text style={{fontFamily: fonts.label, fontSize: 10, color: on ? deco.brassLight : deco.cream}}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={[card, {borderColor: deco.brassHighlight}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.displayBold, fontSize: 20, color: deco.cream}}>{sel[0]}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brass}}>{sel[2]}</Text>
            </View>
            <Text style={s.body}>{sel[3]}</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: deco.brassHighlight}}>SOCIAL SCORE {sel[1]} · SHOWN TO OTHERS, NEVER TO THEMSELVES</Text>
            <ActionBar label={hellos.includes(sel[0]) ? `HELLO SENT TO ${sel[0].toUpperCase()}` : 'SAY HELLO'} color={hellos.includes(sel[0]) ? '#5A4630' : '#6B1424'} onPress={() => setHellos((h) => toggle(h, sel[0]))} />
          </View>
          <Text style={[s.small, {textAlign: 'center'}]}>Scores are shown to others, never to yourself. That keeps the room honest.</Text>
          <SectionHead>{geo} · ROOM CHAT</SectionHead>
          {[...live, ...CHAT, ...msgs.map((t) => ['YOU · NOW', t, true] as [string, string, boolean])].map(([who, t, me], i) => (
            <View key={i} style={{alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '86%', padding: 10, gap: 3, backgroundColor: me ? acc : 'rgba(244,232,208,0.08)'}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: me ? '#140508' : deco.brass}}>{who}</Text>
              <Text style={{fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: me ? '#140508' : deco.cream}}>{t}</Text>
            </View>
          ))}
          <View style={{flexDirection: 'row', borderWidth: 1, borderColor: deco.brass}}>
            <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 140))} onSubmitEditing={send} placeholder="Say something to the room" placeholderTextColor="rgba(244,232,208,0.4)" accessibilityLabel="Message"
              style={{flex: 1, minHeight: 46, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 13, color: deco.cream}} />
            <Pressable onPress={send} accessibilityRole="button" accessibilityLabel="Send" style={{width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: acc}}>
              <Text style={{fontSize: 18, color: '#140508'}}>→</Text>
            </Pressable>
          </View>
          <SampleNote>SAMPLE ROOM · PEOPLE AND CHAT ARE ILLUSTRATIVE · YOUR MESSAGES STAY ON THIS DEVICE UNTIL ROOM CHAT GOES LIVE</SampleNote>
        </Animated.View>
      ) : null}

      {mode === 'outings' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <View style={card}>
            <Text style={lbl}>WHERE ARE YOU GOING?</Text>
            <Chips options={PLACES} value={place} onChange={(v) => { setPlace(v); setShared(false); }} />
            <Text style={lbl}>WHO CAN SEE</Text>
            <Chips options={VIS} value={vis} onChange={(v) => { setVis(v); setShared(false); }} />
            <ActionBar color={shared ? deco.brass : acc} label={shared ? `SHARED WITH ${vis.toUpperCase()} · ${place.toUpperCase()}` : `SHARE · I’M GOING TO ${place.toUpperCase()}`}
              onPress={() => { if (!shared) setMsgs((m) => [...m, `Heading to ${place} tonight.`]); setShared(!shared); }} />
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderColor: deco.brass, paddingBottom: 6}}>
            <Text style={lbl}>GROUP OUTINGS</Text>
            <Pressable onPress={() => setMine(true)} accessibilityRole="button"><Text style={[lbl, {color: acc}]}>+ PLAN ONE</Text></Pressable>
          </View>
          {outings.map(([when, host, title, where, n, cap, deal]) => {
            const you = host === 'You', joined = you || ins.includes(title), cnt = n + (joined ? 1 : 0);
            return (
              <Animated.View key={title} entering={FadeInDown.duration(350)} style={[card, {borderColor: joined ? deco.brassHighlight : 'rgba(201,169,97,0.3)'}]}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.cream}}>{when}</Text>
                  <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: you ? acc : deco.brass}}>{you ? 'HOSTED BY YOU' : `HOSTED BY ${host.toUpperCase()}`}</Text>
                </View>
                <Text style={{fontFamily: fonts.displayBold, fontSize: 18, color: deco.cream}}>{title}</Text>
                <Text style={s.small}>{where}</Text>
                {deal ? <Text style={{alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(232,200,122,0.15)', fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brassHighlight}}>{deal}</Text> : null}
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <View style={{flexDirection: 'row'}}>
                    {Array.from({length: Math.min(4, cnt)}, (_, k) => <View key={k} style={{width: 20, height: 20, borderRadius: 10, marginLeft: k ? -6 : 0, borderWidth: 1, borderColor: deco.ink, backgroundColor: joined && k === 0 ? acc : ['#6B5028', '#8A6A2A', '#5A4018', '#A47A34'][k]}} />)}
                  </View>
                  <Text style={s.small}>{cnt} going · {cap - cnt} spots left</Text>
                </View>
                <View style={{height: 3, backgroundColor: 'rgba(201,169,97,0.15)'}}><View style={{height: 3, width: `${Math.round((cnt / cap) * 100)}%`, backgroundColor: deco.brassHighlight}} /></View>
                <ActionBar color={joined && !you ? deco.brass : acc} label={you ? 'INVITE MORE' : joined ? 'YOU’RE IN · LEAVE' : 'I’M IN'}
                  onPress={() => { if (you) Share.share({message: `Join me: ${title} — finesselife.vip`}).catch(() => {}); else setIns((l) => toggle(l, title)); }} />
              </Animated.View>
            );
          })}
          <SampleNote>SAMPLE OUTINGS · JOINING HERE IS A PREVIEW UNTIL OUTINGS GO LIVE</SampleNote>
        </Animated.View>
      ) : null}

      {mode === 'dating' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <View style={card}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}><Text style={lbl}>YOUR FILTERS</Text><Text style={s.small}>ONLY YOU SEE THESE</Text></View>
            <Text style={s.small}>STATUS</Text>
            <Chips options={['Verified', 'VIP']} value={f.status} onChange={(v) => setF((x) => ({...x, status: v}))} />
            <Text style={s.small}>INCOME · SELF-DECLARED, VERIFIED</Text>
            <Chips options={['Any', '$150K+', '$250K+', '$500K+']} value={f.income} onChange={(v) => setF((x) => ({...x, income: v}))} />
            <Text style={s.small}>INTERESTS</Text>
            <Chips options={['Any', 'Jazz', 'Travel', 'Watches', 'Galleries']} value={f.interest} onChange={(v) => setF((x) => ({...x, interest: v}))} />
          </View>
          <Text style={lbl}>{pool.length} IN THE ROOM FOR YOU</Text>
          {D ? (
            <Animated.View key={D[0]} entering={FadeInDown.duration(400)} style={{gap: 10}}>
              <GoldFrame pad={isLiked ? 4 : 2}>
                <View style={{height: 220, backgroundColor: '#1A0E10', alignItems: 'center', justifyContent: 'center'}}>
                  <Monogram name={D[0]} size={96} ring={isLiked ? acc : deco.brass} />
                  <View style={{position: 'absolute', left: 8, top: 8, flexDirection: 'row', gap: 4}}>
                    {D[4].map((b) => <Text key={b} style={{paddingHorizontal: 6, paddingVertical: 2, backgroundColor: b === 'VIP' ? deco.lamp : deco.brassHighlight, fontFamily: fonts.mono, fontSize: 8.5, color: '#140E08'}}>{b}</Text>)}
                    <Text style={{paddingHorizontal: 6, paddingVertical: 2, backgroundColor: deco.ink, fontFamily: fonts.mono, fontSize: 8.5, color: deco.brassHighlight}}>{D[5]}</Text>
                  </View>
                </View>
              </GoldFrame>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
                <Text style={{fontFamily: fonts.displayBold, fontSize: 22, color: deco.cream}}>{D[0]}, {D[1]}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brass}}>{D[2]}</Text>
              </View>
              <Text style={s.body}>{D[3]}</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>{D[6].map((t) => <Text key={t} style={{paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)', fontFamily: fonts.label, fontSize: 10, color: deco.cream}}>{t}</Text>)}</View>
              {isLiked && D[7] ? <Text style={{padding: 10, textAlign: 'center', backgroundColor: 'rgba(122,245,184,0.1)', fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: '#7AF5B8'}}>IT’S MUTUAL · NOVA CAN ARRANGE DRINKS</Text> : null}
              <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1}}><Small label="PASS" color={deco.brass} onPress={() => setSeen((l) => [...l, D[0]])} /></View>
                <View style={{flex: 2}}><Small label={isLiked ? (D[7] ? 'ASK NOVA TO ARRANGE' : 'INTERESTED · WAITING') : 'INTERESTED'} color={acc} on onPress={() => setLiked((l) => (l.includes(D[0]) ? l : [...l, D[0]]))} /></View>
              </View>
            </Animated.View>
          ) : <Text style={s.body}>No one else in the room tonight with those filters. Loosen one, or check back after nine.</Text>}
          <Text style={s.small}>Status and income show only when verified. Others see yours the same way. Your own score never shows to you.</Text>
          <SampleNote>SAMPLE PROFILES · AFTER DARK OPENS TO VERIFIED MEMBERS</SampleNote>
        </Animated.View>
      ) : null}

      {mode === 'score' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <View style={card}>
            <Text style={lbl}>HOUSE RULES · THE SOCIAL SCORE</Text>
            <Text style={{fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 25, color: deco.cream}}>How you show up for each other.</Text>
            <Text style={s.small}>A number from 0 to 100 that other members see next to your name. It measures how you treat the community, not what you own.</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 16, paddingVertical: 8, paddingHorizontal: 4}} style={{borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.35)'}}>
            {MV.map(([name, d]) => <Text key={name} style={{fontFamily: fonts.mono, fontSize: 11, color: deco.cream}}>{name} <Text style={{color: d > 0 ? '#7AF5B8' : '#FF8FA9'}}>{d > 0 ? '▲' : '▼'}{Math.abs(d)}</Text></Text>)}
          </ScrollView>
          <SectionHead>YOUR CIRCLE · LAST NIGHT</SectionHead>
          {MV.map(([name, d, why, n]) => {
            const sp = spilled.includes(name), ch = cheered.includes(name), up = d > 0, col = up ? '#7AF5B8' : '#FF8FA9';
            return (
              <View key={name} style={card}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{fontFamily: fonts.displayBold, fontSize: 17, color: deco.cream}}>{name}</Text>
                  <Text style={{fontFamily: fonts.mono, fontSize: 12, color: col}}>{up ? '▲ ' : '▼ '}{Math.abs(d)}</Text>
                </View>
                <Text style={s.small}>{why}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{n + (sp ? 1 : 0) + (ch ? 1 : 0)} IN YOUR CIRCLE TALKING</Text>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <Small label={sp ? 'ASKED' : up ? 'SPILL' : 'WHAT HAPPENED?'} color={acc} on={sp} onPress={() => setSpilled((l) => toggle(l, name))} />
                  <Small label={ch ? 'SENT' : up ? 'CHEER' : 'SEND LOVE'} color={deco.brassHighlight} on={ch} onPress={() => setCheered((l) => toggle(l, name))} />
                </View>
              </View>
            );
          })}
          <View style={[card, {borderColor: acc}]}>
            <Text style={[lbl, {color: acc}]}>THEY’RE TALKING ABOUT YOU</Text>
            <Text style={s.small}>Your score moved last night. 3 people in your circle noticed. Your number stays hidden from you, so ask them.</Text>
            <ActionBar color={asked ? deco.brass : acc} label={asked ? 'MAYA REPLIED: “GIRL. TIM?”' : 'ASK MY CIRCLE'} onPress={() => setAsked(true)} />
          </View>
          <Text style={[s.small, {textAlign: 'center'}]}>Your own score is never shown to you. Nobody can chase it, and nobody can perform for it.</Text>
          <SectionHead>WHAT IT’S MADE OF</SectionHead>
          {PARTS.map(([label, w, note]) => (
            <View key={label} style={{gap: 4}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}><Text style={{fontFamily: fonts.label, fontSize: 12, color: deco.cream}}>{label}</Text><Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brassHighlight}}>{w}%</Text></View>
              <View style={{height: 4, backgroundColor: 'rgba(201,169,97,0.15)'}}><View style={{height: 4, width: `${Math.round((w / 30) * 100)}%`, backgroundColor: deco.brassHighlight}} /></View>
              <Text style={s.small}>{note}</Text>
            </View>
          ))}
          <View style={{flexDirection: 'row', gap: 10}}>
            <View style={[card, {flex: 1}]}><Text style={[lbl, {color: '#7AF5B8'}]}>RAISES IT</Text>{['Attending what you join', 'Hosting an outing', 'A member’s vouch', 'Answering hellos'].map((t) => <Text key={t} style={s.small}>+ {t}</Text>)}</View>
            <View style={[card, {flex: 1}]}><Text style={[lbl, {color: '#FF8FA9'}]}>LOWERS IT</Text>{['No-shows', 'Ghosting a mutual match', 'Upheld reports', 'Spam in room chat'].map((t) => <Text key={t} style={s.small}>− {t}</Text>)}</View>
          </View>
          <SectionHead>QUESTIONS</SectionHead>
          {FAQ.map(([q, a], i) => (
            <View key={q} style={{borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.25)'}}>
              <Pressable onPress={() => setFaq(faq === i ? null : i)} accessibilityRole="button" accessibilityState={{expanded: faq === i}} style={{minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Text style={{flex: 1, fontFamily: fonts.label, fontSize: 13, color: deco.cream}}>{q}</Text>
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
