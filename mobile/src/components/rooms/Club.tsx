// The Club — the members' country club (replaces the Jazz Club). Panelled reading room energy:
//   THE WIRE   news on markets, money, cars and real estate
//   LOCKER ROOM a message board: shop talk, deals, cars, jokes — upvote what lands
//   TICKER     a watchlist and a paper portfolio (practice trades, no real money)
//   WHO'S IN   what members say they're investing in — shared voluntarily, never advice
//   GARAGE     members' cars and what's for sale
//   ESTATE     listings members are watching or selling
//   GAMES      tonight's tables, golf skins and the weekly pick'em
// Everything is labelled sample until the news feed, market data and board services are connected.
// Finesse never executes trades or gives investment advice; "trade" opens the member's own broker.
import {useMemo, useState} from 'react';
import {Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import Svg, {Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, GoldFrame, Monogram, SampleNote, s} from './shared';

const GREEN = '#1F4A32', UP = '#7AF5B8', DOWN = '#FF8FA9';
type Tab = 'wire' | 'locker' | 'ticker' | 'whosin' | 'garage' | 'estate' | 'games';
const TABS: Array<[Tab, string, string]> = [['wire', 'THE WIRE', 'briefcase'], ['locker', 'LOCKER ROOM', 'users'], ['ticker', 'TICKER', 'trendingup'], ['whosin', 'WHO’S IN', 'wallet'], ['garage', 'GARAGE', 'car'], ['estate', 'ESTATE', 'building2'], ['games', 'GAMES', 'gamepad2']];

/* ─────────── the room: panelled reading room, green leather, brass lamps, a ticker over the bar ─────────── */
function ReadingRoom() {
  const W = Math.min(useAvailableWidth(), 520), H = W * 0.5;
  return (
    <View style={{width: W, height: H, alignSelf: 'center', borderWidth: 2, borderColor: deco.brass, overflow: 'hidden'}}>
      <Svg width={W} height={H} viewBox="0 0 400 200">
        <Defs>
          <LinearGradient id="cl-w" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#24140A" /><Stop offset="1" stopColor="#3E2410" /></LinearGradient>
          <LinearGradient id="cl-b" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={deco.brassWhite} /><Stop offset="0.5" stopColor={deco.brass} /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient>
          <RadialGradient id="cl-l" cx="200" cy="130" r="190" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#FFD8A0" stopOpacity={0.35} /><Stop offset="1" stopColor="#000" stopOpacity={0} /></RadialGradient>
          <LinearGradient id="cl-f" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#3A1A0A" /><Stop offset="1" stopColor="#0E0604" /></LinearGradient>
        </Defs>
        <Rect width={400} height={200} fill="url(#cl-w)" />
        {/* walnut panelling */}
        {Array.from({length: 8}, (_, i) => <Rect key={i} x={10 + i * 50} y={50} width={40} height={84} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={2} />)}
        {/* stock ticker over the bar */}
        <Rect x={0} y={18} width={400} height={20} fill="#050302" stroke="url(#cl-b)" strokeWidth={1.2} />
        {['SPX ▲0.6', 'NDX ▲0.9', 'GOLD ▲0.3', 'OIL ▼0.4', 'BTC ▲1.8', '10Y 4.1%', 'EUR 1.09'].map((t, i) => <G key={t}><Rect x={8 + i * 56} y={25} width={4} height={6} fill={t.includes('▼') ? DOWN : UP} /></G>)}
        {/* bookcase */}
        {[60, 82, 104].map((y) => <Rect key={y} x={300} y={y} width={90} height={3} fill="url(#cl-b)" />)}
        {Array.from({length: 24}, (_, i) => <Rect key={i} x={302 + (i % 8) * 11} y={[46, 68, 90][Math.floor(i / 8)] + (i % 3)} width={8} height={14 - (i % 3)} fill={['#5A1A1A', '#1F3A28', '#3A2A10', '#6A4A1A'][i % 4]} />)}
        {/* framed classic car print + map */}
        <Rect x={22} y={56} width={70} height={46} fill="#140A04" stroke="url(#cl-b)" strokeWidth={2} />
        <Path d="M30 90 Q40 76 58 76 L72 80 Q82 82 84 90 Z" fill="#8A2A1A" /><Ellipse cx={40} cy={91} rx={5} ry={5} fill="#111" /><Ellipse cx={74} cy={91} rx={5} ry={5} fill="#111" />
        <Rect x={110} y={56} width={60} height={46} fill="#2A2414" stroke="url(#cl-b)" strokeWidth={2} />
        <Path d="M116 90 Q130 70 146 82 T166 66" stroke={deco.brassHighlight} strokeOpacity={0.6} fill="none" />
        {/* floor, green leather chesterfields, a card table */}
        <Rect x={0} y={134} width={400} height={66} fill="url(#cl-f)" />
        {[[70, 168], [330, 168]].map(([x, y]) => (
          <G key={x}>
            <Rect x={x - 42} y={y - 22} width={84} height={30} rx={8} fill={GREEN} />
            <Rect x={x - 48} y={y - 12} width={14} height={26} rx={6} fill={GREEN} /><Rect x={x + 34} y={y - 12} width={14} height={26} rx={6} fill={GREEN} />
            {Array.from({length: 6}, (_, i) => <Ellipse key={i} cx={x - 30 + i * 12} cy={y - 14} rx={1.2} ry={1.2} fill={deco.brassHighlight} />)}
          </G>
        ))}
        <Ellipse cx={200} cy={168} rx={44} ry={12} fill="#0F3A24" stroke="url(#cl-b)" strokeWidth={1.5} />
        {[-14, 0, 14].map((d) => <Rect key={d} x={196 + d} y={161} width={7} height={10} fill="#F2E8D2" transform={`rotate(${d} ${200 + d} 166)`} />)}
        <Path d="M200 156 L200 132 M186 132 L214 132 L208 122 L192 122 Z" stroke="url(#cl-b)" strokeWidth={1.5} fill="#1F5A3A" />
        <Rect width={400} height={200} fill="url(#cl-l)" />
      </Svg>
    </View>
  );
}

/* ─────────── shared bits ─────────── */
const head = {fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight} as const;
function Row({children, last}: {children: React.ReactNode; last?: boolean}) {
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderColor: 'rgba(201,169,97,0.22)'}}>{children}</View>;
}
const pct = (n: number) => `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(1)}%`;

/* ─────────── THE WIRE ─────────── */
const WIRE: Array<[string, string, string, string]> = [
  ['MARKETS', 'Rate-cut bets cool as the long end climbs', 'What it means for the mortgage desk and the dividend crowd.', '6 MIN READ'],
  ['MONEY', 'The quiet return of the private credit fund', 'Why family offices are writing smaller, safer checks.', '8 MIN READ'],
  ['CARS', 'Air-cooled prices plateau; the 90s analog era takes off', 'Auction results from the weekend, by marque.', '5 MIN READ'],
  ['REAL ESTATE', 'Short-term rental rules tighten in three coastal markets', 'What owners should check before next season.', '7 MIN READ'],
  ['MONEY', 'Bonus season playbook: tax lots, lockups and patience', 'A checklist from members in finance.', '4 MIN READ'],
];
function Wire() {
  const [cat, setCat] = useState('All');
  const [saved, setSaved] = useState<string[]>([]);
  const list = WIRE.filter((w) => cat === 'All' || w[0] === cat.toUpperCase());
  const [lead, ...rest] = list;
  return (
    <View style={{gap: 12}}>
      <Chips options={['All', 'Markets', 'Money', 'Cars', 'Real Estate']} value={cat} onChange={setCat} />
      {lead ? (
        <GoldFrame pad={3}>
          <View style={{backgroundColor: '#F2E8D2', padding: 14, gap: 6}}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 2, color: '#6B1424'}}>THE WIRE · {lead[0]}</Text>
            <Text style={{fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 28, color: '#1A120C'}}>{lead[1]}</Text>
            <Text style={{fontFamily: fonts.script, fontSize: 17, lineHeight: 22, color: '#3A2A1A'}}>{lead[2]}</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 9, color: '#6B5028'}}>{lead[3]}</Text>
          </View>
        </GoldFrame>
      ) : null}
      {rest.map(([c, t, sub, len], i) => (
        <Row key={t} last={i === rest.length - 1}>
          <View style={{flex: 1, gap: 2}}>
            <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{c} · {len}</Text>
            <Text style={{fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 20, color: deco.cream}}>{t}</Text>
            <Text style={s.small}>{sub}</Text>
          </View>
          <Pressable onPress={() => setSaved((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]))} accessibilityRole="button" accessibilityLabel="Save for later" hitSlop={8}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 8.5, letterSpacing: 1, color: saved.includes(t) ? UP : deco.brassHighlight}}>{saved.includes(t) ? 'SAVED' : 'SAVE'}</Text>
          </Pressable>
        </Row>
      ))}
      <SampleNote>SAMPLE HEADLINES · THE WIRE FILLS FROM A LICENSED NEWS PROVIDER ONCE CONNECTED</SampleNote>
    </View>
  );
}

/* ─────────── LOCKER ROOM ─────────── */
type Post = {id: string; who: string; board: string; t: string; votes: number; replies: number};
const BOARDS = ['All', 'Shop talk', 'Deals', 'Cars', 'Jokes'];
const POSTS: Post[] = [
  {id: 'p1', who: 'Dre', board: 'Jokes', t: 'My financial advisor said I should diversify. So now I lose money in six sectors instead of one.', votes: 41, replies: 12},
  {id: 'p2', who: 'Marcus', board: 'Shop talk', t: 'Anyone switched payroll providers mid-year? Worth the pain or wait until January?', votes: 18, replies: 9},
  {id: 'p3', who: 'Kofi', board: 'Cars', t: 'Test drove the new GT this weekend. The steering is sharper than my ex’s comebacks.', votes: 33, replies: 7},
  {id: 'p4', who: 'Theo', board: 'Deals', t: 'Looking for a partner on a small duplex in East Atlanta. Numbers in the thread for members only.', votes: 22, replies: 15},
  {id: 'p5', who: 'Julian', board: 'Jokes', t: 'Golf is the only sport where the more you play, the more expensive your excuses get.', votes: 37, replies: 5},
  {id: 'p6', who: 'Ravi', board: 'Shop talk', t: 'Best book you read this year that actually changed how you run your business?', votes: 26, replies: 21},
];
function Locker({acc}: {acc: string}) {
  const [board, setBoard] = useState('All');
  const [voted, setVoted] = useState<string[]>([]);
  const [mine, setMine] = useState<Post[]>([]);
  const [draft, setDraft] = useState('');
  const [sort, setSort] = useState<'HOT' | 'NEW'>('HOT');
  const list = useMemo(() => {
    const all = [...mine, ...POSTS].filter((p) => board === 'All' || p.board === board);
    return sort === 'HOT' ? [...all].sort((a, b) => b.votes + (voted.includes(b.id) ? 1 : 0) - (a.votes + (voted.includes(a.id) ? 1 : 0))) : all;
  }, [mine, board, sort, voted]);
  const post = () => {
    const t = draft.trim().slice(0, 280);
    if (!t) return;
    setMine((m) => [{id: `m${Date.now()}`, who: 'You', board: board === 'All' ? 'Shop talk' : board, t, votes: 0, replies: 0}, ...m]);
    setDraft('');
  };
  return (
    <View style={{gap: 12}}>
      <Chips options={BOARDS} value={board} onChange={setBoard} />
      <View style={{flexDirection: 'row', borderWidth: 1, borderColor: deco.brass, backgroundColor: '#140A06'}}>
        <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 280))} onSubmitEditing={post} placeholder={board === 'Jokes' ? 'Tell one. Keep it clubhouse.' : 'Start a thread…'} placeholderTextColor="rgba(244,232,208,0.4)" accessibilityLabel="New post"
          style={{flex: 1, minHeight: 46, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 13, color: deco.cream}} />
        <Pressable onPress={post} accessibilityRole="button" style={{paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: acc}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.4, color: '#140508'}}>POST</Text>
        </Pressable>
      </View>
      <View style={{flexDirection: 'row', gap: 14}}>
        {(['HOT', 'NEW'] as const).map((k) => (
          <Pressable key={k} onPress={() => setSort(k)} accessibilityRole="button"><Text style={{fontFamily: fonts.capsBold, fontSize: 9.5, letterSpacing: 1.6, color: sort === k ? acc : 'rgba(244,232,208,0.55)'}}>{k}</Text></Pressable>
        ))}
      </View>
      {list.map((p) => {
        const v = voted.includes(p.id), joke = p.board === 'Jokes';
        return (
          <Animated.View key={p.id} entering={FadeInDown.duration(250)} layout={LinearTransition} style={{flexDirection: 'row', gap: 10, padding: 12, borderWidth: 1, borderColor: joke ? 'rgba(232,200,122,0.5)' : 'rgba(201,169,97,0.3)', backgroundColor: joke ? 'rgba(232,200,122,0.05)' : 'rgba(20,12,8,0.7)'}}>
            <Pressable onPress={() => setVoted((l) => (v ? l.filter((x) => x !== p.id) : [...l, p.id]))} accessibilityRole="button" accessibilityLabel={joke ? 'This one landed' : 'Upvote'} style={{alignItems: 'center', width: 34}}>
              <Text style={{fontSize: 16, color: v ? acc : deco.brass}}>{joke ? '😂' : '▲'}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 10, color: v ? acc : deco.cream}}>{p.votes + (v ? 1 : 0)}</Text>
            </Pressable>
            <View style={{flex: 1, gap: 4}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Monogram name={p.who} size={22} />
                <Text style={{fontFamily: fonts.label, fontSize: 12, color: deco.cream}}>{p.who}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1, color: deco.brass}}>· {p.board.toUpperCase()}</Text>
              </View>
              <Text style={{fontFamily: joke ? fonts.script : fonts.body, fontSize: joke ? 17 : 13.5, lineHeight: joke ? 22 : 19, color: deco.cream}}>{p.t}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 8.5, color: 'rgba(244,232,208,0.5)'}}>{p.replies} REPLIES</Text>
            </View>
          </Animated.View>
        );
      })}
      <Text style={s.small}>What’s said in the locker room stays in the locker room — members only, real names, no screenshots shared outside. House rules: no harassment, no pitching securities, no doxxing.</Text>
      <SampleNote>SAMPLE THREADS · YOUR POSTS STAY ON THIS DEVICE UNTIL THE BOARD SERVICE GOES LIVE</SampleNote>
    </View>
  );
}

/* ─────────── TICKER (watchlist + paper portfolio) ─────────── */
const WATCH: Array<[string, string, number, number]> = [['SPX', 'S&P 500 index', 5712.4, 0.6], ['NDX', 'Nasdaq 100 index', 20140.2, 0.9], ['GLD', 'Gold', 2398.1, 0.3], ['CL', 'Crude oil', 76.8, -0.4], ['BTC', 'Bitcoin', 64210, 1.8], ['TNX', '10-year yield', 4.12, -0.2]];
function Ticker({acc}: {acc: string}) {
  const [paper, setPaper] = useState<Record<string, number>>({SPX: 2});
  const [sel, setSel] = useState('SPX');
  const cash = 100000 - Object.entries(paper).reduce((t, [k, q]) => t + (WATCH.find((w) => w[0] === k)![2] * q), 0);
  const value = Object.entries(paper).reduce((t, [k, q]) => { const w = WATCH.find((x) => x[0] === k)!; return t + w[2] * q * (1 + w[3] / 100); }, 0) + cash;
  const S = WATCH.find((w) => w[0] === sel)!;
  const spark = Array.from({length: 24}, (_, i) => 50 + Math.sin(i / 2.4 + S[2] % 7) * 14 + (S[3] >= 0 ? i : -i) * 0.8);
  return (
    <View style={{gap: 12}}>
      <View style={{borderWidth: 1, borderColor: deco.brass}}>
        {WATCH.map(([sym, name, px, ch], i) => (
          <Pressable key={sym} onPress={() => setSel(sym)} accessibilityRole="button" accessibilityState={{selected: sel === sym}}
            style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, minHeight: 46, borderTopWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.2)', backgroundColor: sel === sym ? 'rgba(232,200,122,0.08)' : 'transparent'}}>
            <Text style={{width: 44, fontFamily: fonts.capsBold, fontSize: 12, color: deco.brassWhite}}>{sym}</Text>
            <Text style={[s.small, {flex: 1}]}>{name}</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 11, color: deco.cream}}>{px.toLocaleString()}</Text>
            <Text style={{width: 64, textAlign: 'right', fontFamily: fonts.mono, fontSize: 10, color: ch >= 0 ? UP : DOWN}}>{pct(ch)}</Text>
          </Pressable>
        ))}
      </View>
      <GoldFrame pad={2}>
        <View style={{backgroundColor: '#0C0806', padding: 12, gap: 8}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={head}>{S[1].toUpperCase()}</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 10, color: S[3] >= 0 ? UP : DOWN}}>{pct(S[3])}</Text>
          </View>
          <Svg width="100%" height={70} viewBox="0 0 230 100" preserveAspectRatio="none">
            <Path d={spark.map((y, i) => `${i ? 'L' : 'M'}${i * 10} ${100 - y}`).join(' ')} stroke={S[3] >= 0 ? UP : DOWN} strokeWidth={2} fill="none" />
          </Svg>
          <View style={{flexDirection: 'row', gap: 8}}>
            <View style={{flex: 1}}><ActionBar color={acc} label="PAPER BUY 1" onPress={() => setPaper((p) => ({...p, [sel]: (p[sel] ?? 0) + 1}))} /></View>
            <Pressable onPress={() => setPaper((p) => ({...p, [sel]: Math.max(0, (p[sel] ?? 0) - 1)}))} accessibilityRole="button" style={{flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: deco.brass}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: deco.brassHighlight}}>PAPER SELL 1</Text>
            </Pressable>
          </View>
        </View>
      </GoldFrame>
      <View style={{flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.35)'}}>
        {[['PAPER VALUE', `$${Math.round(value).toLocaleString()}`], ['CASH', `$${Math.round(cash).toLocaleString()}`], ['POSITIONS', String(Object.values(paper).filter((q) => q > 0).length)]].map(([k, v], i) => (
          <View key={k} style={{flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.35)'}}>
            <Text style={{fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1, color: deco.brass}}>{k}</Text>
            <Text style={{fontFamily: fonts.displayHeavy, fontSize: 17, color: deco.brassWhite}}>{v}</Text>
          </View>
        ))}
      </View>
      <Text style={s.small}>The paper portfolio is practice with pretend money. To trade for real, open your own brokerage — Finesse doesn’t place trades, hold assets or give investment advice.</Text>
      <SampleNote>SAMPLE PRICES · NOT LIVE · LIVE QUOTES ARRIVE WITH A LICENSED MARKET-DATA FEED</SampleNote>
    </View>
  );
}

/* ─────────── WHO'S IN ─────────── */
const IN: Array<[string, string, string, string, number]> = [
  ['Joe', 'Index funds and a small multifamily', 'REAL ESTATE · LONG TERM', 'Bought a fourplex with two friends. Boring on purpose.', 28],
  ['Marcus', 'His own company, mostly', 'PRIVATE · FOUNDER', 'Every spare dollar goes back into payroll right now.', 19],
  ['Kofi', 'Vintage watches', 'COLLECTIBLES', 'Steel sports models from the 70s. Holding, not flipping.', 24],
  ['Dre', 'Treasuries while he waits', 'CASH & BONDS', 'Sitting on short-term bills until a deal makes sense.', 15],
  ['Ravi', 'A laundromat', 'SMALL BUSINESS', 'Cash flow first. Quarters add up.', 31],
];
function WhosIn({acc}: {acc: string}) {
  const [follow, setFollow] = useState<string[]>([]);
  return (
    <View style={{gap: 12}}>
      <Text style={{fontFamily: fonts.script, fontSize: 18, color: deco.cream, textAlign: 'center'}}>What is Joe investing in? Ask him — he chose to share.</Text>
      {IN.map(([who, what, tag, why, nods]) => {
        const f = follow.includes(who);
        return (
          <View key={who} style={{padding: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(201,169,97,0.35)', backgroundColor: 'rgba(20,12,8,0.7)'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              <Monogram name={who} size={38} ring={acc} />
              <View style={{flex: 1}}>
                <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{who} is in <Text style={{color: deco.brassHighlight}}>{what.toLowerCase()}</Text></Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{tag}</Text>
              </View>
            </View>
            <Text style={{fontFamily: fonts.script, fontSize: 16, lineHeight: 21, color: 'rgba(244,232,208,0.85)'}}>“{why}”</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 8.5, color: 'rgba(244,232,208,0.5)'}}>{nods + (f ? 1 : 0)} MEMBERS WANT TO TALK</Text>
              <Pressable onPress={() => setFollow((l) => (f ? l.filter((x) => x !== who) : [...l, who]))} accessibilityRole="button" style={{paddingHorizontal: 10, minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: acc, backgroundColor: f ? acc : 'transparent'}}>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.2, color: f ? '#140508' : acc}}>{f ? 'ASKED FOR COFFEE' : 'BUY HIM A COFFEE'}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <Text style={s.small}>Shared voluntarily by members as conversation, not recommendations. No one here is your adviser; do your own homework before you put money anywhere.</Text>
      <SampleNote>SAMPLE MEMBERS · SHARING IS OPT-IN AND CAN BE TURNED OFF ANY TIME</SampleNote>
    </View>
  );
}

/* ─────────── GARAGE ─────────── */
const CARS: Array<[string, string, string, string]> = [
  ['Kofi', '1989 coupe, guards red', 'IN THE GARAGE', 'Weekend car. Cars & coffee Sundays.'],
  ['Marcus', 'Electric GT, 2026', 'DAILY', 'Commutes in silence, which he says is the point.'],
  ['Julian', '1967 roadster, British racing green', 'FOR SALE · $68,000', 'Matching numbers, restored in 2021. Members first.'],
  ['Theo', 'Off-road wagon, sand', 'BUILD IN PROGRESS', 'New suspension this month.'],
];
function Garage({acc}: {acc: string}) {
  const [f, setF] = useState('All');
  const list = CARS.filter((c) => f === 'All' || (f === 'For sale' ? c[2].startsWith('FOR SALE') : !c[2].startsWith('FOR SALE')));
  return (
    <View style={{gap: 12}}>
      <Chips options={['All', 'In garages', 'For sale']} value={f} onChange={setF} />
      {list.map(([who, car, state, note]) => (
        <GoldFrame key={car} pad={2}>
          <View style={{backgroundColor: '#100A06', padding: 12, gap: 6}}>
            <View style={{height: 90, borderWidth: 1, borderColor: 'rgba(201,169,97,0.35)', alignItems: 'center', justifyContent: 'center'}}><Icon name="car" size={34} color={deco.brass} strokeWidth={1.1} /></View>
            <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: state.startsWith('FOR SALE') ? acc : deco.brass}}>{state}</Text>
            <Text style={{fontFamily: fonts.displayBold, fontSize: 17, color: deco.cream}}>{car}</Text>
            <Text style={s.small}>{who} · {note}</Text>
          </View>
        </GoldFrame>
      ))}
      <SampleNote>SAMPLE GARAGE · MEMBER SALES ARE BETWEEN MEMBERS; FINESSE DOESN’T HOLD FUNDS OR TITLES</SampleNote>
    </View>
  );
}

/* ─────────── ESTATE ─────────── */
const HOMES: Array<[string, string, string, string, string]> = [
  ['Buckhead, Atlanta', '5 bd · 6 ba · 6,200 sq ft', '$3.4M', 'Member selling · off-market preview', 'Ravi'],
  ['Lake Oconee, GA', 'Lake house · dock · 4 bd', '$2.1M', 'Watching · 3 members', ''],
  ['Midtown, Atlanta', 'Fourplex · fully leased', '$1.25M', 'Member partnership forming', 'Theo'],
  ['Highlands, NC', 'Mountain cabin · 3 bd', '$980K', 'Watching · 5 members', ''],
];
function Estate({acc}: {acc: string}) {
  const [watch, setWatch] = useState<string[]>([]);
  return (
    <View style={{gap: 12}}>
      {HOMES.map(([where, spec, price, state, who]) => {
        const w = watch.includes(where);
        return (
          <View key={where} style={{flexDirection: 'row', gap: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.35)', backgroundColor: 'rgba(20,12,8,0.7)'}}>
            <View style={{width: 70, height: 70, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center'}}><Icon name="building2" size={26} color={deco.brass} strokeWidth={1.2} /></View>
            <View style={{flex: 1, gap: 2}}>
              <Text style={{fontFamily: fonts.displayBold, fontSize: 15, color: deco.cream}}>{where}</Text>
              <Text style={s.small}>{spec}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 0.8, color: deco.brass}}>{state.toUpperCase()}{who ? ` · ${who.toUpperCase()}` : ''}</Text>
            </View>
            <View style={{alignItems: 'flex-end', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.displayHeavy, fontSize: 17, color: deco.brassWhite}}>{price}</Text>
              <Pressable onPress={() => setWatch((l) => (w ? l.filter((x) => x !== where) : [...l, where]))} accessibilityRole="button" hitSlop={8}>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 8.5, letterSpacing: 1.2, color: w ? acc : deco.brassHighlight}}>{w ? 'WATCHING' : 'WATCH'}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <Text style={s.small}>Listings and partnerships shown here are member conversations, not offers. Work with a licensed agent and attorney before you buy, sell or partner.</Text>
      <SampleNote>SAMPLE LISTINGS</SampleNote>
    </View>
  );
}

/* ─────────── GAMES ─────────── */
const SKINS: Array<[string, number, string]> = [['Julian', 4, '−2 thru 18'], ['Dre', 3, 'E thru 18'], ['Marcus', 2, '+3 thru 18'], ['Kofi', 1, '+5 thru 18']];
const PICKS: Array<[string, string]> = [['Falcons', 'Saints'], ['Hawks', 'Celtics'], ['Bulldogs', 'Tigers']];
function Games({acc}: {acc: string}) {
  const [picks, setPicks] = useState<Record<number, string>>({});
  return (
    <View style={{gap: 12}}>
      <Text style={head}>TONIGHT’S TABLES</Text>
      {[['Poker · Hold’em', '5 / 6 seated'], ['Spades', '3 / 4 seated'], ['Dominoes', '2 / 4 seated'], ['Chess · by the fire', '1 / 2 seated']].map(([g, n]) => (
        <Row key={g}><Icon name="gamepad2" size={16} /><Text style={[s.body, {flex: 1}]}>{g}</Text><Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{n}</Text></Row>
      ))}
      <Text style={head}>SUNDAY SKINS · LEADERBOARD</Text>
      {SKINS.map(([who, skins, score], i) => (
        <Row key={who} last={i === SKINS.length - 1}>
          <Text style={{width: 20, fontFamily: fonts.displayHeavy, fontSize: 16, color: i === 0 ? deco.brassWhite : deco.brass}}>{i + 1}</Text>
          <Monogram name={who} size={28} />
          <Text style={[s.body, {flex: 1}]}>{who}</Text>
          <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{score}</Text>
          <Text style={{width: 54, textAlign: 'right', fontFamily: fonts.capsBold, fontSize: 11, color: deco.brassHighlight}}>{skins} SKINS</Text>
        </Row>
      ))}
      <Text style={head}>WEEKLY PICK’EM · BRAGGING RIGHTS</Text>
      {PICKS.map(([a, b], i) => (
        <View key={a} style={{flexDirection: 'row', gap: 8}}>
          {[a, b].map((t) => (
            <Pressable key={t} onPress={() => setPicks((p) => ({...p, [i]: t}))} accessibilityRole="button" accessibilityState={{selected: picks[i] === t}}
              style={{flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: picks[i] === t ? acc : 'rgba(201,169,97,0.45)', backgroundColor: picks[i] === t ? acc : 'transparent'}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10.5, letterSpacing: 1, color: picks[i] === t ? '#140508' : deco.cream}}>{t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      <Text style={s.small}>{Object.keys(picks).length} of {PICKS.length} picked. Pick’em and skins are for points and bragging rights — no money changes hands in the app.</Text>
      <SampleNote>SAMPLE BOARD</SampleNote>
    </View>
  );
}

/* ─────────── the room ─────────── */
export function Club({side}: {side: Side}) {
  const acc = side === 'him' ? deco.lamp : track[side].acc;
  const [tab, setTab] = useState<Tab>('wire');
  return (
    <View style={{gap: 12}}>
      <ReadingRoom />
      <Text style={{fontFamily: fonts.script, fontSize: 19, color: deco.cream, textAlign: 'center'}}>The members’ club. Read the wire, talk shop, check the board, settle the bets.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6}}>
        {TABS.map(([k, label, icon]) => {
          const on = k === tab;
          return (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{selected: on}}
              style={{flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: on ? deco.brassHighlight : 'rgba(201,169,97,0.4)', backgroundColor: on ? deco.brassHighlight : '#120A06'}}>
              <Icon name={icon} size={14} color={on ? '#140E08' : deco.brass} />
              <Text style={{fontFamily: fonts.capsBold, fontSize: 9.5, letterSpacing: 1.2, color: on ? '#140E08' : deco.cream}}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Animated.View key={tab} entering={FadeIn.duration(300)}>
        {tab === 'wire' ? <Wire /> : tab === 'locker' ? <Locker acc={acc} /> : tab === 'ticker' ? <Ticker acc={acc} /> : tab === 'whosin' ? <WhosIn acc={acc} /> : tab === 'garage' ? <Garage acc={acc} /> : tab === 'estate' ? <Estate acc={acc} /> : <Games acc={acc} />}
      </Animated.View>
    </View>
  );
}
