// NightVision (a pre-meet brief), the Game Room (tables between members) and Per Diem (plan the night
// around a budget) — from the design.
//
// NightVision is deliberately consent-based: briefs are built only from what members have chosen to share
// inside Finesse (their profile, mutual connections, vouches). It does not pull or cross-reference other
// people's outside social accounts, and it never surfaces "hidden" or private activity.
// The Game Room plays for no real money until the house is licensed where the member lives.
import {useMemo, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import Svg, {Circle, Line} from 'react-native-svg';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {ActionBar, Chips, SampleNote, SectionHead, Segmented, s} from './shared';

/* ─────────────── NightVision ─────────────── */
type Kind = 'center' | 'mutual' | 'work' | 'close' | 'public';
const COL: Record<Kind, string> = {center: deco.brassHighlight, mutual: '#7AF5B8', work: '#8FB8FF', close: '#FF8FA9', public: 'rgba(244,232,208,0.45)'};
type Brief = {label: string; title: string; summary: string; shared: string[]; conf: string; signals: Array<[string, string, string]>; talk: string[]; nodes: Array<[string, number, number, Kind, string?]>};
const NV: Record<string, Brief> = {
  marcus: {label: 'Marcus · After Dark', title: 'Marcus, 34', summary: 'Founder in fintech, Atlanta. On his Finesse profile: golf, jazz and a close college crew.', shared: ['HIS PROFILE', 'VERIFIED ID', 'MUTUALS'], conf: 'MEMBER-SHARED',
    signals: [['#7AF5B8', 'VERIFIED', 'ID and photo verified by the house.'], ['#7AF5B8', 'VOUCHED', 'Kofi, in your circle, has met him twice and vouches.'], ['#F0D88A', 'SHOWS UP', 'Attended 9 of the 10 outings he said yes to.']],
    talk: ['He listed the Savannah golf trip as a yearly ritual', 'You both save the late set at the Jazz Club', 'Ask about the company he founded — it’s on his profile'],
    nodes: [['Marcus', 0, 0, 'center'], ['Kofi', 40, 60, 'mutual', 'In your circle. Has met Marcus twice; vouches.'], ['College crew', 100, 95, 'close', 'Six friends he lists on his profile.'], ['Golf club', 220, 60, 'public', 'Member since 2021, on his profile.'], ['Co-founders', 300, 95, 'work', 'His company, as he describes it.']]},
  group: {label: 'New group · Inès’s friends', title: 'Inès’s friends, Saturday brunch', summary: 'Four members you haven’t met. Gallery and design crowd, mostly Westside. Two are couples.', shared: ['MEMBER PROFILES', 'INÈS’S NOTE'], conf: '4 MEMBERS',
    signals: [['#7AF5B8', 'COMMON GROUND', 'Three of the four list the same galleries you do.'], ['#F0D88A', 'GOOD TO KNOW', 'Léa and Sam shared their engagement on Finesse — congratulate them.'], ['#7AF5B8', 'HOSTED BY A FRIEND', 'Inès invited you personally.']],
    talk: ['The Westside gallery walk most of them joined', 'Léa and Sam’s engagement', 'Your Amalfi season — two of them went last summer'],
    nodes: [['The table', 0, 0, 'center'], ['Inès', 30, 60, 'mutual', 'Your friend and the host.'], ['Léa', 120, 70, 'close', 'Engaged to Sam; architect.'], ['Sam', 200, 70, 'close', 'Engaged to Léa; chef.'], ['Noor', 290, 90, 'public', 'Gallery assistant; new member.']]},
};

function NetMap({b, sel, onPick}: {b: Brief; sel: number; onPick: (i: number) => void}) {
  const W = Math.min(useAvailableWidth(), 400), H = W * 0.78, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.38;
  const pts = b.nodes.map(([, deg, len, kind], i) => (i === 0 ? {x: cx, y: cy, kind} : {x: cx + Math.cos((deg * Math.PI) / 180) * (len / 100) * R, y: cy + Math.sin((deg * Math.PI) / 180) * (len / 100) * R, kind}));
  return (
    <View style={{width: W, height: H, alignSelf: 'center', backgroundColor: '#05040A', borderWidth: 1, borderColor: 'rgba(201,169,97,0.3)'}}>
      <Svg width={W} height={H} style={{position: 'absolute'}}>
        {[0.35, 0.7, 1].map((k) => <Circle key={k} cx={cx} cy={cy} r={R * k} stroke="rgba(201,169,97,0.12)" fill="none" />)}
        {pts.slice(1).map((p, i) => <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={COL[p.kind]} strokeOpacity={0.6} />)}
      </Svg>
      {pts.map((p, i) => {
        const c = i === 0, on = i === sel, size = c ? 30 : 16;
        return (
          <Pressable key={i} disabled={c} onPress={() => onPick(i)} accessibilityRole="button" accessibilityLabel={b.nodes[i][0]} hitSlop={10}
            style={{position: 'absolute', left: p.x - size / 2, top: p.y - size / 2, alignItems: 'center'}}>
            <View style={{width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: COL[p.kind], backgroundColor: c ? COL.center : on ? COL[p.kind] : '#05040A', shadowColor: COL[p.kind], shadowOpacity: on || c ? 0.9 : 0, shadowRadius: 8}} />
            <Text style={{position: 'absolute', top: size + 3, width: 90, textAlign: 'center', fontFamily: fonts.mono, fontSize: 8.5, color: on ? deco.brassWhite : 'rgba(244,232,208,0.7)'}}>{b.nodes[i][0]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NightVision({side}: {side: Side}) {
  const acc = track[side].acc;
  const [key, setKey] = useState('marcus');
  const [tab, setTab] = useState<'map' | 'dossier'>('map');
  const [sel, setSel] = useState(1);
  const b = NV[key];
  const node = b.nodes[sel] ?? b.nodes[1];
  return (
    <View style={{gap: 12}}>
      <Text style={[s.body, {textAlign: 'center'}]}>Your quiet analyst. A low-key brief on members you’re about to meet: a date, a new group, a meeting, a lunch.</Text>
      <Chips options={Object.values(NV).map((v) => v.label)} value={b.label} onChange={(l) => { setKey(Object.keys(NV).find((k) => NV[k].label === l)!); setSel(1); }} />
      <Segmented options={[['map', 'THE MAP'], ['dossier', 'DOSSIER']]} value={tab} onChange={setTab} />
      {tab === 'map' ? (
        <Animated.View key={key} entering={FadeIn.duration(350)} style={{gap: 10}}>
          <NetMap b={b} sel={sel} onPick={setSel} />
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center'}}>
            {(['mutual', 'work', 'close', 'public'] as Kind[]).map((k) => <Text key={k} style={{fontFamily: fonts.mono, fontSize: 8.5, color: COL[k]}}>● {k.toUpperCase()}</Text>)}
          </View>
          <View style={{padding: 12, gap: 3, borderWidth: 1, borderColor: COL[node[3]]}}>
            <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: COL[node[3]]}}>{node[3].toUpperCase()}</Text>
            <Text style={{fontFamily: fonts.displayBold, fontSize: 17, color: deco.cream}}>{node[0]}</Text>
            <Text style={s.small}>{node[4] ?? ''}</Text>
          </View>
        </Animated.View>
      ) : (
        <Animated.View key={key + 'd'} entering={FadeIn.duration(350)} style={{gap: 10}}>
          <View style={{padding: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)', backgroundColor: '#07060C'}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>ANALYST BRIEF</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, color: '#7AF5B8'}}>{b.conf}</Text>
            </View>
            <Text style={{fontFamily: fonts.displayBold, fontSize: 20, color: deco.cream}}>{b.title}</Text>
            <Text style={s.body}>{b.summary}</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>{b.shared.map((x) => <Text key={x} style={{paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)', fontFamily: fonts.mono, fontSize: 8, color: deco.brass}}>{x}</Text>)}</View>
          </View>
          <SectionHead>SIGNALS</SectionHead>
          {b.signals.map(([c, label, t]) => (
            <View key={label} style={{flexDirection: 'row', gap: 10}}>
              <View style={{width: 8, height: 8, borderRadius: 4, marginTop: 5, backgroundColor: c}} />
              <View style={{flex: 1}}><Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: c}}>{label}</Text><Text style={s.small}>{t}</Text></View>
            </View>
          ))}
          <SectionHead>BEFORE YOU MEET</SectionHead>
          {b.talk.map((t) => <Text key={t} style={s.body}><Text style={{color: acc}}>◆ </Text>{t}</Text>)}
          <ActionBar label="ASK NOVA A QUESTION" color={acc} />
        </Animated.View>
      )}
      <Text style={s.small}>Built only from what members choose to share in Finesse — their profile, verification, mutual connections and vouches. No outside accounts are pulled, nothing private is surfaced, and members can see that a brief was opened on them.</Text>
      <SampleNote>SAMPLE BRIEFS · ILLUSTRATIVE MEMBERS</SampleNote>
    </View>
  );
}

/* ─────────────── Game Room ─────────────── */
const TABLES: Array<[string, string, string, number, boolean, number]> = [
  ['I', 'Poker · Texas Hold’em', 'Dealer’s choice at midnight', 5, true, 6],
  ['II', 'Spades', 'Partners · books to 500 · trash talk welcome', 3, true, 6],
  ['III', 'Fantasy Football', 'House league · week 5 waivers close Tue', 9, false, 12],
  ['IV', 'Dominoes', 'Bones to 150 · slam the table', 2, true, 4],
  ['V', 'Rummy', 'Gin rummy · best of three', 1, false, 2],
  ['VI', 'The Book', 'Members’ sports book · tonight’s lines', 12, true, 40],
];

export function GameRoom({side}: {side: Side}) {
  const acc = track[side].acc;
  const [joined, setJoined] = useState<number | null>(null);
  return (
    <View style={{gap: 12}}>
      <Text style={s.small}>The Book opens only where members’ sports betting is legal, with age and ID checks. Poker, Spades, Dominoes and Rummy are played for points between members — no real money changes hands in the app.</Text>
      {TABLES.map(([n, name, topic, filled, live, cap], i) => {
        const me = joined === i, f = filled + (me ? 1 : 0), lit = Math.min(6, Math.round((f / cap) * 6));
        const book = i === 5;
        return (
          <Animated.View key={n} layout={LinearTransition} style={{padding: 12, gap: 8, borderWidth: 1, borderColor: me ? deco.brassHighlight : 'rgba(201,169,97,0.35)', backgroundColor: 'rgba(12,30,20,0.35)'}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <View style={{flex: 1}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>TABLE {n}</Text>
                <Text style={{fontFamily: fonts.displayBold, fontSize: 17, color: deco.cream}}>{name}</Text>
                <Text style={s.small}>{topic}</Text>
              </View>
              {live ? <Text style={{alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(122,245,184,0.15)', fontFamily: fonts.mono, fontSize: 8.5, color: '#7AF5B8'}}>LIVE</Text> : null}
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
              {Array.from({length: Math.min(6, cap)}, (_, k) => <View key={k} style={{width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: deco.brassHighlight, backgroundColor: k < lit ? (me && k === lit - 1 ? acc : deco.brassHighlight) : 'transparent'}} />)}
              <Text style={[s.small, {marginLeft: 6}]}>{f} / {cap}</Text>
            </View>
            <Pressable onPress={() => setJoined(me ? null : i)} accessibilityRole="button" disabled={book}
              style={{minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: book ? 'transparent' : me ? deco.brass : deco.brassHighlight, borderWidth: book ? 1 : 0, borderColor: deco.brass}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: book ? deco.brassHighlight : '#140E08'}}>
                {book ? 'OPENS WHERE LICENSED · ID CHECK' : me ? (i === 2 ? 'YOU’RE IN THE LEAGUE · LEAVE' : 'YOU’RE SEATED · LEAVE') : i === 2 ? 'JOIN THE LEAGUE' : live ? 'TAKE A SEAT' : 'RESERVE'}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
      <SampleNote>SAMPLE TABLES · POINTS ONLY · THE BOOK STAYS CLOSED UNTIL A LICENSED PARTNER AND AGE/LOCATION CHECKS ARE LIVE</SampleNote>
    </View>
  );
}

/* ─────────────── Per Diem ─────────────── */
type V = [string, string, number];
const PD: Record<'drinks' | 'dinner' | 'after', V[]> = {
  drinks: [['Bar Céleste', 'Rooftop, two martinis each', 90], ['The Library Bar', 'Leather booths, old whisky', 140], ['Hotel Lumen lounge', 'Champagne, live piano', 260], ['Corner wine bar', 'Two glasses, quiet table', 50]],
  dinner: [['Lucian', 'Tasting menu for two', 420], ['Ember & Oak', 'Dry-aged steak, sides to share', 260], ['Maison Aurel dining room', 'Chef’s counter, wine pairing', 980], ['Trattoria Nove', 'Fresh pasta, bottle of Barolo', 160]],
  after: [['Jazz Club, late set', 'Reserved table, cover included', 120], ['Private car home', 'Black car, 45 min', 95], ['Cigar lounge', 'Two cigars, a nightcap', 180], ['Gelato walk', 'The long way back', 20]],
};
const KEYS = ['drinks', 'dinner', 'after'] as const;
const OCCS = ['Date night', 'Anniversary', 'Client dinner', 'Night out'];

function plan(budget: number, occ: string, swaps: Record<string, number>) {
  const share = occ === 'Client dinner' ? [0.15, 0.7, 0.15] : occ === 'Night out' ? [0.35, 0.35, 0.3] : [0.2, 0.6, 0.2];
  const cost = (ix: number[]) => ix.reduce((t, j, i) => t + PD[KEYS[i]][j][2], 0);
  let best: number[] | null = null, bestScore = -Infinity, cheapIx = [0, 0, 0], cheap = Infinity;
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) {
    const ix = [x, y, z], t = cost(ix);
    if (t < cheap) { cheap = t; cheapIx = ix; }
    if (t > budget) continue;
    const score = t - 0.5 * ix.reduce((p, j, i) => p + Math.abs(PD[KEYS[i]][j][2] - share[i] * budget), 0);
    if (score > bestScore) { bestScore = score; best = ix; }
  }
  const fits = !!best;
  const ix = (best ?? cheapIx).slice();
  KEYS.forEach((key, i) => {
    const k = swaps[key] ?? 0;
    if (!k) return;
    const others = cost(ix) - PD[key][ix[i]][2];
    const alts = PD[key].map((_, j) => j).filter((j) => j !== ix[i] && (!fits || others + PD[key][j][2] <= budget));
    if (alts.length) ix[i] = alts[(k - 1) % alts.length];
  });
  return {ix, total: cost(ix)};
}

export function PerDiem() {
  const amber = deco.lamp;
  const [occ, setOcc] = useState('Date night');
  const [budget, setBudget] = useState(600);
  const [swaps, setSwaps] = useState<Record<string, number>>({});
  const [booked, setBooked] = useState(false);
  const {ix, total} = useMemo(() => plan(budget, occ, swaps), [budget, occ, swaps]);
  const over = total > budget;
  const tier = budget < 400 ? 'EASY' : budget < 900 ? 'POLISHED' : budget < 1800 ? 'MEMORABLE' : 'NO CEILING';
  const nudge = (d: number) => { setBudget((b) => Math.max(150, Math.min(3000, b + d))); setSwaps({}); setBooked(false); };
  return (
    <View style={{gap: 12}}>
      <Text style={[s.body, {textAlign: 'center'}]}>Set the number. The house plans the night around it.</Text>
      <Chips options={OCCS} value={occ} onChange={(v) => { setOcc(v); setBooked(false); }} accent={amber} />
      <View style={{padding: 12, gap: 10, borderWidth: 1, borderColor: 'rgba(255,169,107,0.45)'}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: amber}}>BUDGET · FOR TWO</Text>
          <Text style={{fontFamily: fonts.displayHeavy, fontSize: 30, color: deco.brassWhite}}>${budget.toLocaleString()}</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 8}}>
          {[-100, -50, 50, 100].map((d) => (
            <Pressable key={d} onPress={() => nudge(d)} accessibilityRole="button" accessibilityLabel={`${d > 0 ? 'Raise' : 'Lower'} budget by ${Math.abs(d)}`} style={{flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,169,107,0.5)'}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 11, color: deco.cream}}>{d > 0 ? '+' : '−'}{Math.abs(d)}</Text>
            </Pressable>
          ))}
        </View>
        <Chips options={['$250', '$600', '$1.2K', '$2.5K']} value={{250: '$250', 600: '$600', 1200: '$1.2K', 2500: '$2.5K'}[budget] ?? ''} accent={amber}
          onChange={(v) => { setBudget({$250: 250, $600: 600, '$1.2K': 1200, '$2.5K': 2500}[v] ?? 600); setSwaps({}); setBooked(false); }} />
      </View>
      <SectionHead>THE NIGHT · {tier}</SectionHead>
      {(['7:00 PM', '8:15 PM', '10:30 PM'] as const).map((time, i) => {
        const key = KEYS[i], v = PD[key][ix[i]];
        return (
          <Animated.View key={key + v[0]} entering={FadeInDown.duration(300)} style={{flexDirection: 'row', gap: 12}}>
            <View style={{alignItems: 'center', width: 12}}>
              <View style={{width: 10, height: 10, borderRadius: 5, marginTop: 4, backgroundColor: amber}} />
              {i < 2 ? <View style={{flex: 1, width: 1, backgroundColor: 'rgba(255,169,107,0.4)'}} /> : null}
            </View>
            <View style={{flex: 1, gap: 2, paddingBottom: 12}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: deco.brass}}>{time} · {key.toUpperCase()}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brassHighlight}}>${v[2]}</Text>
              </View>
              <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{v[0]}</Text>
              <Text style={s.small}>{v[1]}</Text>
              <Pressable onPress={() => { setSwaps((m) => ({...m, [key]: (m[key] ?? 0) + 1})); setBooked(false); }} accessibilityRole="button" style={{alignSelf: 'flex-start', marginTop: 4}}>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.4, color: amber}}>SWAP ↻</Text>
              </Pressable>
            </View>
          </Animated.View>
        );
      })}
      <View style={{gap: 5}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.cream}}>PLANNED ${total.toLocaleString()}</Text>
          <Text style={{fontFamily: fonts.mono, fontSize: 10, color: over ? '#FF8FA9' : '#7AF5B8'}}>{over ? `$${(total - budget).toLocaleString()} OVER` : `$${(budget - total).toLocaleString()} TO SPARE`}</Text>
        </View>
        <View style={{height: 5, backgroundColor: 'rgba(255,169,107,0.15)'}}><Animated.View layout={LinearTransition} style={{height: 5, width: `${Math.min(100, Math.round((total / budget) * 100))}%`, backgroundColor: over ? '#FF8FA9' : '#7AF5B8'}} /></View>
      </View>
      <ActionBar color={booked ? deco.brass : amber} label={booked ? 'PREVIEW · NOT HELD OR SAVED' : `HOLD THE NIGHT · $${total.toLocaleString()}`} onPress={() => setBooked((b) => !b)} />
      <SampleNote>SAMPLE VENUES · HOLDING ADDS IT TO YOUR DIARY · NOVA ASKS BEFORE BOOKING OR PAYING ANYTHING</SampleNote>
    </View>
  );
}
