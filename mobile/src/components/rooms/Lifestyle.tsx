// NightVision (a pre-meet brief), the Game Room (tables between members) and Per Diem (plan the night
// around a budget) — After Hours skin.
//
// NightVision is deliberately consent-based: briefs are built only from what members have chosen to share
// inside Finesse (their profile, mutual connections, vouches). It does not pull or cross-reference other
// people's outside social accounts, and it never surfaces "hidden" or private activity.
// The Game Room plays for no real money until the house is licensed where the member lives.
import {useMemo, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import Svg, {Circle, Line} from 'react-native-svg';
import {deco, track, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {AHCard, AHChip, AHEyebrow, AHSmoke, AHTitle} from '@/components/ah';
import {radius} from '@/lib/ah';
import {ActionBar, Chips, SampleNote, Segmented} from './shared';
import {Fine, Head, Meter, Num, Pick, Row, Step, Tag, TextBtn, ah, ahFonts, t} from './RoomKit';

/* ─────────────── NightVision ─────────────── */
type Kind = 'center' | 'mutual' | 'work' | 'close' | 'public';
const COL: Record<Kind, string> = {center: ah.white, mutual: ah.ok, work: '#8FB8FF', close: ah.rose, public: ah.faint};
const SIG: Record<string, string> = {ok: ah.ok, note: ah.warn};
type Brief = {label: string; title: string; summary: string; shared: string[]; conf: string; signals: Array<[string, string, string]>; talk: string[]; nodes: Array<[string, number, number, Kind, string?]>};
const NV: Record<string, Brief> = {
  marcus: {label: 'Marcus · After Dark', title: 'Marcus, 34', summary: 'Founder in fintech, Atlanta. On his Finesse profile: golf, jazz and a close college crew.', shared: ['HIS PROFILE', 'VERIFIED ID', 'MUTUALS'], conf: 'MEMBER-SHARED',
    signals: [['ok', 'VERIFIED', 'ID and photo verified by the house.'], ['ok', 'VOUCHED', 'Kofi, in your circle, has met him twice and vouches.'], ['note', 'SHOWS UP', 'Attended 9 of the 10 outings he said yes to.']],
    talk: ['He listed the Savannah golf trip as a yearly ritual', 'You both save the late set at the Jazz Club', 'Ask about the company he founded — it’s on his profile'],
    nodes: [['Marcus', 0, 0, 'center'], ['Kofi', 40, 60, 'mutual', 'In your circle. Has met Marcus twice; vouches.'], ['College crew', 100, 95, 'close', 'Six friends he lists on his profile.'], ['Golf club', 220, 60, 'public', 'Member since 2021, on his profile.'], ['Co-founders', 300, 95, 'work', 'His company, as he describes it.']]},
  group: {label: 'New group · Inès’s friends', title: 'Inès’s friends, Saturday brunch', summary: 'Four members you haven’t met. Gallery and design crowd, mostly Westside. Two are couples.', shared: ['MEMBER PROFILES', 'INÈS’S NOTE'], conf: '4 MEMBERS',
    signals: [['ok', 'COMMON GROUND', 'Three of the four list the same galleries you do.'], ['note', 'GOOD TO KNOW', 'Léa and Sam shared their engagement on Finesse — congratulate them.'], ['ok', 'HOSTED BY A FRIEND', 'Inès invited you personally.']],
    talk: ['The Westside gallery walk most of them joined', 'Léa and Sam’s engagement', 'Your Amalfi season — two of them went last summer'],
    nodes: [['The table', 0, 0, 'center'], ['Inès', 30, 60, 'mutual', 'Your friend and the host.'], ['Léa', 120, 70, 'close', 'Engaged to Sam; architect.'], ['Sam', 200, 70, 'close', 'Engaged to Léa; chef.'], ['Noor', 290, 90, 'public', 'Gallery assistant; new member.']]},
};

function NetMap({b, sel, onPick}: {b: Brief; sel: number; onPick: (i: number) => void}) {
  const W = Math.min(useAvailableWidth(), 400), H = W * 0.78, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.38;
  const pts = b.nodes.map(([, deg, len, kind], i) => (i === 0 ? {x: cx, y: cy, kind} : {x: cx + Math.cos((deg * Math.PI) / 180) * (len / 100) * R, y: cy + Math.sin((deg * Math.PI) / 180) * (len / 100) * R, kind}));
  return (
    <View style={{width: W, height: H, alignSelf: 'center', backgroundColor: ah.ink2, borderRadius: radius.card, borderWidth: 1, borderColor: ah.line, overflow: 'hidden'}}>
      <Svg width={W} height={H} style={{position: 'absolute'}}>
        {[0.35, 0.7, 1].map((k) => <Circle key={k} cx={cx} cy={cy} r={R * k} stroke="rgba(255,255,255,0.07)" fill="none" />)}
        {pts.slice(1).map((p, i) => <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={COL[p.kind]} strokeOpacity={0.55} />)}
      </Svg>
      {pts.map((p, i) => {
        const c = i === 0, on = i === sel, size = c ? 30 : 18;
        return (
          <Pressable key={i} disabled={c} onPress={() => onPick(i)} accessibilityRole="button" accessibilityLabel={b.nodes[i][0]} accessibilityState={{selected: on}} hitSlop={14}
            style={{position: 'absolute', left: p.x - size / 2, top: p.y - size / 2, alignItems: 'center'}}>
            <View style={{width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: COL[p.kind], backgroundColor: c ? COL.center : on ? COL[p.kind] : ah.ink2, shadowColor: COL[p.kind], shadowOpacity: on || c ? 0.9 : 0, shadowRadius: 8}} />
            <Text style={{position: 'absolute', top: size + 4, width: 90, textAlign: 'center', fontFamily: ahFonts.sansMedium, fontSize: 10.5, color: on ? ah.white : ah.mute}}>{b.nodes[i][0]}</Text>
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
    <View style={{gap: 14}}>
      <View style={{gap: 6}}>
        <AHTitle size={30}>Your quiet analyst.</AHTitle>
        <Fine>A low-key brief on members you’re about to meet: a date, a new group, a meeting, a lunch.</Fine>
      </View>
      <Chips options={Object.values(NV).map((v) => v.label)} value={b.label} onChange={(l) => { setKey(Object.keys(NV).find((k) => NV[k].label === l)!); setSel(1); }} />
      <Segmented options={[['map', 'The map'], ['dossier', 'Dossier']]} value={tab} onChange={setTab} />
      {tab === 'map' ? (
        <Animated.View key={key} entering={FadeIn.duration(350)} style={{gap: 12}}>
          <NetMap b={b} sel={sel} onPick={setSel} />
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center'}}>
            {(['mutual', 'work', 'close', 'public'] as Kind[]).map((k) => (
              <View key={k} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: COL[k]}} />
                <Text style={t.meta}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
              </View>
            ))}
          </View>
          <AHCard pad={18} style={{borderColor: COL[node[3]] + '55'}}>
            <Tag tone={COL[node[3]]}>{node[3]}</Tag>
            <Text style={[t.title, {fontSize: 26, lineHeight: 28, marginTop: 10}]}>{node[0]}</Text>
            <Text style={[t.small, {marginTop: 4}]}>{node[4] ?? ''}</Text>
          </AHCard>
        </Animated.View>
      ) : (
        <Animated.View key={key + 'd'} entering={FadeIn.duration(350)} style={{gap: 14}}>
          <AHCard pad={20} style={{backgroundColor: ah.ink3}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
              <AHEyebrow>Analyst brief</AHEyebrow>
              <Tag tone={ah.ok}>{b.conf}</Tag>
            </View>
            <AHTitle size={30} italic={false} style={{marginTop: 10}}>{b.title}</AHTitle>
            <Text style={[t.body, {color: ah.mute, marginTop: 8}]}>{b.summary}</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14}}>{b.shared.map((x) => <AHChip key={x} label={x} tone="outline" />)}</View>
          </AHCard>
          <Head>Signals</Head>
          <View>
            {b.signals.map(([c, label, x], i) => (
              <Row key={label} last={i === b.signals.length - 1} style={{alignItems: 'flex-start'}}>
                <View style={{width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: SIG[c]}} />
                <View style={{flex: 1, gap: 2}}><Text style={[t.eyebrow, {color: SIG[c]}]}>{label}</Text><Text style={t.body}>{x}</Text></View>
              </Row>
            ))}
          </View>
          <Head>Before you meet</Head>
          <View>
            {b.talk.map((x, i) => (
              <Row key={x} last={i === b.talk.length - 1}>
                <Num n={i + 1} />
                <Text style={[t.title, {flex: 1, fontSize: 20, lineHeight: 24}]}>{x}</Text>
              </Row>
            ))}
          </View>
          <ActionBar label="Ask Nova a question" color={acc} />
        </Animated.View>
      )}
      <Fine>Built only from what members choose to share in Finesse — their profile, verification, mutual connections and vouches. No outside accounts are pulled, nothing private is surfaced, and members can see that a brief was opened on them.</Fine>
      <SampleNote>Sample briefs · Illustrative members</SampleNote>
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
  const rose = acc === deco.pink;
  const [joined, setJoined] = useState<number | null>(null);
  return (
    <View style={{gap: 14}}>
      <View style={{gap: 6}}>
        <AHTitle size={30}>Pull up a chair.</AHTitle>
      </View>
      <Fine>The Book opens only where members’ sports betting is legal, with age and ID checks. Poker, Spades, Dominoes and Rummy are played for points between members — no real money changes hands in the app.</Fine>
      {TABLES.map(([, name, topic, filled, live, cap], i) => {
        const me = joined === i, f = filled + (me ? 1 : 0), lit = Math.min(6, Math.round((f / cap) * 6));
        const book = i === 5;
        return (
          <Animated.View key={name} layout={LinearTransition}>
            <AHCard pad={18} style={me ? {borderColor: 'rgba(255,255,255,0.4)'} : undefined}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10}}>
                <View style={{flex: 1, gap: 3}}>
                  <Text style={t.eyebrow}>Table {String(i + 1).padStart(2, '0')}</Text>
                  <Text style={[t.title, {fontSize: 24, lineHeight: 27}]}>{name}</Text>
                  <Text style={t.small}>{topic}</Text>
                </View>
                {live ? <AHChip label="Live" live /> : null}
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14}}>
                {Array.from({length: Math.min(6, cap)}, (_, k) => <View key={k} style={{width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: k < lit ? 'transparent' : ah.line2, backgroundColor: k < lit ? (me && k === lit - 1 ? ah.rose : ah.white) : 'transparent'}} />)}
                <Text style={[t.meta, {marginLeft: 6}]}>{f} / {cap} seated</Text>
              </View>
              <Pick style={{marginTop: 14}} disabled={book} on={me} rose={rose}
                label={book ? 'Opens where licensed · ID check' : me ? (i === 2 ? 'You’re in the league · leave' : 'You’re seated · leave') : i === 2 ? 'Join the league' : live ? 'Take a seat' : 'Reserve'}
                onPress={() => setJoined(me ? null : i)} />
            </AHCard>
          </Animated.View>
        );
      })}
      <SampleNote>Sample tables · Points only · The Book stays closed until a licensed partner and age/location checks are live</SampleNote>
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
  const cost = (ix: number[]) => ix.reduce((tot, j, i) => tot + PD[KEYS[i]][j][2], 0);
  let best: number[] | null = null, bestScore = -Infinity, cheapIx = [0, 0, 0], cheap = Infinity;
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) {
    const ix = [x, y, z], tot = cost(ix);
    if (tot < cheap) { cheap = tot; cheapIx = ix; }
    if (tot > budget) continue;
    const score = tot - 0.5 * ix.reduce((p, j, i) => p + Math.abs(PD[KEYS[i]][j][2] - share[i] * budget), 0);
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
  const [occ, setOcc] = useState('Date night');
  const [budget, setBudget] = useState(600);
  const [swaps, setSwaps] = useState<Record<string, number>>({});
  const [booked, setBooked] = useState(false);
  const {ix, total} = useMemo(() => plan(budget, occ, swaps), [budget, occ, swaps]);
  const over = total > budget;
  const tier = budget < 400 ? 'EASY' : budget < 900 ? 'POLISHED' : budget < 1800 ? 'MEMORABLE' : 'NO CEILING';
  const nudge = (d: number) => { setBudget((b) => Math.max(150, Math.min(3000, b + d))); setSwaps({}); setBooked(false); };
  return (
    <View style={{gap: 16}}>
      <AHSmoke aspect={1.15} top={<AHChip label={`For two · ${occ.toLowerCase()}`} />}>
        <AHEyebrow color={ah.blush}>Per Diem · budget</AHEyebrow>
        <Text style={{fontFamily: ahFonts.serif, fontSize: 76, lineHeight: 80, color: ah.white, letterSpacing: -2, marginTop: 4}} accessibilityLabel={`Budget ${budget} dollars for two`}>${budget.toLocaleString()}</Text>
        <Text style={[t.body, {color: 'rgba(255,255,255,0.75)'}]}>Set the number. The house plans the night around it.</Text>
      </AHSmoke>
      <View style={{flexDirection: 'row', gap: 8}}>
        {[-100, -50, 50, 100].map((d) => <Pick key={d} flex label={`${d > 0 ? '+' : '−'}${Math.abs(d)}`} a11y={`${d > 0 ? 'Raise' : 'Lower'} budget by ${Math.abs(d)}`} onPress={() => nudge(d)} />)}
      </View>
      <Chips options={['$250', '$600', '$1.2K', '$2.5K']} value={{250: '$250', 600: '$600', 1200: '$1.2K', 2500: '$2.5K'}[budget] ?? ''}
        onChange={(v) => { setBudget({$250: 250, $600: 600, '$1.2K': 1200, '$2.5K': 2500}[v] ?? 600); setSwaps({}); setBooked(false); }} />
      <Head>The occasion</Head>
      <Chips options={OCCS} value={occ} onChange={(v) => { setOcc(v); setBooked(false); }} accent={ah.rose} />
      <Head right={tier.charAt(0) + tier.slice(1).toLowerCase()}>The night</Head>
      <View>
        {(['7:00 PM', '8:15 PM', '10:30 PM'] as const).map((time, i) => {
          const key = KEYS[i], v = PD[key][ix[i]];
          return (
            <Animated.View key={key + v[0]} entering={FadeInDown.duration(300)}>
              <Step last={i === 2}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
                  <Text style={t.eyebrow}>{time} · {key}</Text>
                  <Text style={t.num}>${v[2]}</Text>
                </View>
                <Text style={[t.title, {fontSize: 24, lineHeight: 27, marginTop: 4}]}>{v[0]}</Text>
                <Text style={t.small}>{v[1]}</Text>
                <View style={{alignItems: 'flex-start', marginLeft: -4}}>
                  <TextBtn label="Swap ↻" tone={ah.rose} a11y={`Swap ${key}`} onPress={() => { setSwaps((m) => ({...m, [key]: (m[key] ?? 0) + 1})); setBooked(false); }} />
                </View>
              </Step>
            </Animated.View>
          );
        })}
      </View>
      <View style={{gap: 8}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text style={t.num}>Planned ${total.toLocaleString()}</Text>
          <Text style={[t.num, {color: over ? ah.danger : ah.ok}]}>{over ? `$${(total - budget).toLocaleString()} over` : `$${(budget - total).toLocaleString()} to spare`}</Text>
        </View>
        <Meter pct={Math.min(100, Math.round((total / budget) * 100))} tone={over ? ah.danger : ah.ok} />
      </View>
      <ActionBar color={booked ? ah.white : ah.rose} label={booked ? 'Preview · not held or saved' : `Hold the night · $${total.toLocaleString()}`} onPress={() => setBooked((b) => !b)} />
      <SampleNote>Sample venues · Holding adds it to your Diary · Nova asks before booking or paying anything</SampleNote>
    </View>
  );
}
