// The Club — the members' country club (replaces the Jazz Club). After Hours skin:
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
import {Pressable, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {deco, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {AHCard, AHChip, AHEyebrow, AHSmoke, AHTitle} from '@/components/ah';
import {radius} from '@/lib/ah';
import {ActionBar, Chips, Monogram, SampleNote} from './shared';
import {Fine, Head, Num, Pick, Row, TabStrip, Tag, TextBtn, Tile, ah, ahFonts, t} from './RoomKit';

const UP = ah.ok, DOWN = ah.danger;
type Tab = 'wire' | 'locker' | 'ticker' | 'whosin' | 'garage' | 'estate' | 'games';
const TABS: Array<[Tab, string, string]> = [['wire', 'The Wire', 'briefcase'], ['locker', 'Locker room', 'users'], ['ticker', 'Ticker', 'trendingup'], ['whosin', 'Who’s in', 'wallet'], ['garage', 'Garage', 'car'], ['estate', 'Estate', 'building2'], ['games', 'Games', 'gamepad2']];

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
  const toggle = (title: string) => setSaved((l) => (l.includes(title) ? l.filter((x) => x !== title) : [...l, title]));
  return (
    <View style={{gap: 14}}>
      <Chips options={['All', 'Markets', 'Money', 'Cars', 'Real Estate']} value={cat} onChange={setCat} />
      {lead ? (
        <AHCard pad={22} style={{backgroundColor: ah.ink3}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <AHChip label={`The Wire · ${lead[0].toLowerCase()}`} tone="rose" />
            <TextBtn label={saved.includes(lead[1]) ? 'Saved' : 'Save'} on={saved.includes(lead[1])} a11y="Save for later" onPress={() => toggle(lead[1])} />
          </View>
          <AHTitle size={30} italic={false} style={{marginTop: 14}}>{lead[1]}</AHTitle>
          <Text style={[t.voice, {fontSize: 19, lineHeight: 24, color: ah.mute, marginTop: 10}]}>{lead[2]}</Text>
          <Text style={[t.meta, {marginTop: 14}]}>{lead[3].toLowerCase().replace(/^./, (c) => c.toUpperCase())}</Text>
        </AHCard>
      ) : null}
      <View>
        {rest.map(([c, title, sub, len], i) => (
          <Row key={title} last={i === rest.length - 1} style={{alignItems: 'flex-start'}}>
            <Num n={i + 2} />
            <View style={{flex: 1, gap: 4}}>
              <Text style={t.eyebrow}>{c} · {len}</Text>
              <Text style={t.title}>{title}</Text>
              <Text style={t.small}>{sub}</Text>
            </View>
            <TextBtn label={saved.includes(title) ? 'Saved' : 'Save'} on={saved.includes(title)} a11y="Save for later" onPress={() => toggle(title)} />
          </Row>
        ))}
      </View>
      <SampleNote>Sample headlines · The Wire fills from a licensed news provider once connected</SampleNote>
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
    const tx = draft.trim().slice(0, 280);
    if (!tx) return;
    setMine((m) => [{id: `m${Date.now()}`, who: 'You', board: board === 'All' ? 'Shop talk' : board, t: tx, votes: 0, replies: 0}, ...m]);
    setDraft('');
  };
  return (
    <View style={{gap: 14}}>
      <Chips options={BOARDS} value={board} onChange={setBoard} />
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, padding: 5, paddingLeft: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: ah.line2, backgroundColor: ah.ink2}}>
        <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 280))} onSubmitEditing={post} placeholder={board === 'Jokes' ? 'Tell one. Keep it clubhouse.' : 'Start a thread…'} placeholderTextColor={ah.faint} selectionColor={ah.rose} accessibilityLabel="New post"
          style={{flex: 1, minWidth: 0, minHeight: 44, fontFamily: ahFonts.sans, fontSize: 15, color: ah.text}} />
        <Pressable onPress={post} accessibilityRole="button" accessibilityLabel="Post" disabled={!draft.trim()}
          style={({pressed}) => ({minHeight: 40, paddingHorizontal: 18, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: acc === deco.pink ? ah.rose : ah.white, opacity: !draft.trim() ? 0.4 : pressed ? 0.85 : 1})}>
          <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: '#000'}}>Post</Text>
        </Pressable>
      </View>
      <View style={{flexDirection: 'row', gap: 8}}>
        {(['HOT', 'NEW'] as const).map((k) => <Pick key={k} label={k === 'HOT' ? 'Hot' : 'New'} on={sort === k} onPress={() => setSort(k)} />)}
      </View>
      {list.map((p) => {
        const v = voted.includes(p.id), joke = p.board === 'Jokes';
        return (
          <Animated.View key={p.id} entering={FadeInDown.duration(250)} layout={LinearTransition}>
            <AHCard pad={16} style={joke ? {backgroundColor: '#120C0E', borderColor: 'rgba(232,180,160,0.18)'} : undefined}>
              <View style={{flexDirection: 'row', gap: 12}}>
                <View style={{flex: 1, gap: 8}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <Monogram name={p.who} size={28} />
                    <Text style={t.name}>{p.who}</Text>
                    <Text style={t.meta}>· {p.board}</Text>
                  </View>
                  <Text style={joke ? [t.voice, {fontSize: 21, lineHeight: 26}] : t.body}>{p.t}</Text>
                  <Text style={t.meta}>{p.replies} replies</Text>
                </View>
                <Pressable onPress={() => setVoted((l) => (v ? l.filter((x) => x !== p.id) : [...l, p.id]))} accessibilityRole="button" accessibilityLabel={joke ? 'This one landed' : 'Upvote'} accessibilityState={{selected: v}}
                  style={{alignItems: 'center', justifyContent: 'center', width: 48, minHeight: 60, borderRadius: 24, borderWidth: 1, borderColor: v ? ah.rose : ah.line2, backgroundColor: v ? 'rgba(232,180,160,0.14)' : 'transparent', alignSelf: 'flex-start'}}>
                  <Text style={{fontFamily: joke ? ahFonts.serifItalic : ahFonts.sansSemi, fontSize: joke ? 16 : 13, color: v ? ah.rose : ah.text}}>{joke ? 'Ha' : '▲'}</Text>
                  <Text style={[t.num, {fontSize: 13, color: v ? ah.rose : ah.text}]}>{p.votes + (v ? 1 : 0)}</Text>
                </Pressable>
              </View>
            </AHCard>
          </Animated.View>
        );
      })}
      <Fine>What’s said in the locker room stays in the locker room — members only, real names, no screenshots shared outside. House rules: no harassment, no pitching securities, no doxxing.</Fine>
      <SampleNote>Sample threads · Your posts stay on this device until the board service goes live</SampleNote>
    </View>
  );
}

/* ─────────── TICKER (watchlist + paper portfolio) ─────────── */
const WATCH: Array<[string, string, number, number]> = [['SPX', 'S&P 500 index', 5712.4, 0.6], ['NDX', 'Nasdaq 100 index', 20140.2, 0.9], ['GLD', 'Gold', 2398.1, 0.3], ['CL', 'Crude oil', 76.8, -0.4], ['BTC', 'Bitcoin', 64210, 1.8], ['TNX', '10-year yield', 4.12, -0.2]];
function Ticker({acc}: {acc: string}) {
  const [paper, setPaper] = useState<Record<string, number>>({SPX: 2});
  const [sel, setSel] = useState('SPX');
  const cash = 100000 - Object.entries(paper).reduce((tot, [k, q]) => tot + (WATCH.find((w) => w[0] === k)![2] * q), 0);
  const value = Object.entries(paper).reduce((tot, [k, q]) => { const w = WATCH.find((x) => x[0] === k)!; return tot + w[2] * q * (1 + w[3] / 100); }, 0) + cash;
  const S = WATCH.find((w) => w[0] === sel)!;
  const spark = Array.from({length: 24}, (_, i) => 50 + Math.sin(i / 2.4 + S[2] % 7) * 14 + (S[3] >= 0 ? i : -i) * 0.8);
  const tone = S[3] >= 0 ? UP : DOWN;
  return (
    <View style={{gap: 14}}>
      <AHCard pad={20} style={{backgroundColor: ah.ink3}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <AHEyebrow>{S[1]}</AHEyebrow>
          <Text style={[t.num, {fontSize: 13, color: tone}]}>{pct(S[3])}</Text>
        </View>
        <Text style={[t.big, {marginTop: 6}]}>{S[2].toLocaleString()}</Text>
        <Svg width="100%" height={80} viewBox="0 0 230 100" preserveAspectRatio="none" style={{marginTop: 8}}>
          <Path d={spark.map((y, i) => `${i ? 'L' : 'M'}${i * 10} ${100 - y}`).join(' ')} stroke={tone} strokeWidth={2} fill="none" />
        </Svg>
        <View style={{gap: 10, marginTop: 12}}>
          <ActionBar color={acc} label="Paper buy 1" onPress={() => setPaper((p) => ({...p, [sel]: (p[sel] ?? 0) + 1}))} />
          <Pick label="Paper sell 1" style={{minHeight: 52}} onPress={() => setPaper((p) => ({...p, [sel]: Math.max(0, (p[sel] ?? 0) - 1)}))} />
        </View>
      </AHCard>
      <AHCard pad={4} style={{paddingHorizontal: 18}}>
        {([['Paper value', `$${Math.round(value).toLocaleString()}`], ['Cash', `$${Math.round(cash).toLocaleString()}`], ['Positions', String(Object.values(paper).filter((q) => q > 0).length)]] as Array<[string, string]>).map(([k, v], i) => (
          <Row key={k} last={i === 2} style={{minHeight: 52, paddingVertical: 8}}>
            <Text style={[t.eyebrow, {flex: 1}]}>{k}</Text>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 24, color: ah.text}}>{v}</Text>
          </Row>
        ))}
      </AHCard>
      <Head>Watchlist</Head>
      <View>
        {WATCH.map(([sym, name, px, ch], i) => {
          const on = sel === sym;
          return (
            <Pressable key={sym} onPress={() => setSel(sym)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${name}, ${px}, ${pct(ch)}`}
              style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, borderRadius: 16, backgroundColor: on ? 'rgba(255,255,255,0.07)' : 'transparent', opacity: pressed ? 0.8 : 1, borderBottomWidth: on || i === WATCH.length - 1 ? 0 : 1, borderColor: ah.line})}>
              <View style={{flex: 1, gap: 1}}>
                <Text style={t.name}>{sym}</Text>
                <Text style={[t.meta, {fontSize: 11.5}]} numberOfLines={1}>{name}</Text>
              </View>
              <View style={{alignItems: 'flex-end', gap: 1}}>
                <Text style={[t.num, {fontSize: 14}]}>{px.toLocaleString()}</Text>
                <Text style={[t.num, {fontSize: 12, color: ch >= 0 ? UP : DOWN}]}>{pct(ch)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Fine>The paper portfolio is practice with pretend money. To trade for real, open your own brokerage — Finesse doesn’t place trades, hold assets or give investment advice.</Fine>
      <SampleNote>Sample prices · Not live · Live quotes arrive with a licensed market-data feed</SampleNote>
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
  const rose = acc === deco.pink;
  return (
    <View style={{gap: 14}}>
      <AHTitle size={28}>What is Joe investing in? Ask him — he chose to share.</AHTitle>
      {IN.map(([who, what, tag, why, nods]) => {
        const f = follow.includes(who);
        return (
          <AHCard key={who} pad={18}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <Monogram name={who} size={44} ring={acc} />
              <View style={{flex: 1, gap: 3}}>
                <Text style={t.title}>{who} is in <Text style={{fontFamily: ahFonts.serifItalic, color: ah.blush}}>{what.toLowerCase()}</Text></Text>
                <Text style={t.eyebrow}>{tag}</Text>
              </View>
            </View>
            <Text style={[t.voice, {fontSize: 19, lineHeight: 25, color: ah.mute, marginTop: 12}]}>“{why}”</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14}}>
              <Text style={[t.meta, {flex: 1}]}>{nods + (f ? 1 : 0)} members want to talk</Text>
              <Pick label={f ? 'Asked for coffee' : 'Buy him a coffee'} on={f} rose={rose} onPress={() => setFollow((l) => (f ? l.filter((x) => x !== who) : [...l, who]))} />
            </View>
          </AHCard>
        );
      })}
      <Fine>Shared voluntarily by members as conversation, not recommendations. No one here is your adviser; do your own homework before you put money anywhere.</Fine>
      <SampleNote>Sample members · Sharing is opt-in and can be turned off any time</SampleNote>
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
function Garage() {
  const [f, setF] = useState('All');
  const list = CARS.filter((c) => f === 'All' || (f === 'For sale' ? c[2].startsWith('FOR SALE') : !c[2].startsWith('FOR SALE')));
  return (
    <View style={{gap: 14}}>
      <Chips options={['All', 'In garages', 'For sale']} value={f} onChange={setF} />
      {list.map(([who, car, state, note]) => {
        const sale = state.startsWith('FOR SALE');
        return (
          <AHCard key={car} pad={0}>
            <View style={{height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: ah.ink3, borderBottomWidth: 1, borderColor: ah.line}}>
              <Icon name="car" size={40} color={ah.faint} strokeWidth={1.1} />
            </View>
            <View style={{padding: 18, gap: 8}}>
              <Tag tone={sale ? ah.rose : ah.mute}>{state}</Tag>
              <Text style={[t.title, {fontSize: 24, lineHeight: 27}]}>{car}</Text>
              <Text style={t.small}>{who} · {note}</Text>
            </View>
          </AHCard>
        );
      })}
      <SampleNote>Sample garage · Member sales are between members; Finesse doesn’t hold funds or titles</SampleNote>
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
function Estate() {
  const [watch, setWatch] = useState<string[]>([]);
  return (
    <View style={{gap: 14}}>
      <View>
        {HOMES.map(([where, spec, price, state, who], i) => {
          const w = watch.includes(where);
          return (
            <Row key={where} last={i === HOMES.length - 1} style={{alignItems: 'flex-start', paddingVertical: 16}}>
              <Tile icon="building2" size={60} tone={ah.mute} />
              <View style={{flex: 1, gap: 3}}>
                <Text style={t.title}>{where}</Text>
                <Text style={t.small}>{spec}</Text>
                <Text style={[t.meta, {color: ah.faint}]}>{state}{who ? ` · ${who}` : ''}</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Text style={[t.num, {fontSize: 17}]}>{price}</Text>
                <TextBtn label={w ? 'Watching' : 'Watch'} on={w} onPress={() => setWatch((l) => (w ? l.filter((x) => x !== where) : [...l, where]))} />
              </View>
            </Row>
          );
        })}
      </View>
      <Fine>Listings and partnerships shown here are member conversations, not offers. Work with a licensed agent and attorney before you buy, sell or partner.</Fine>
      <SampleNote>Sample listings</SampleNote>
    </View>
  );
}

/* ─────────── GAMES ─────────── */
const SKINS: Array<[string, number, string]> = [['Julian', 4, '−2 thru 18'], ['Dre', 3, 'E thru 18'], ['Marcus', 2, '+3 thru 18'], ['Kofi', 1, '+5 thru 18']];
const PICKS: Array<[string, string]> = [['Falcons', 'Saints'], ['Hawks', 'Celtics'], ['Bulldogs', 'Tigers']];
function Games({acc}: {acc: string}) {
  const [picks, setPicks] = useState<Record<number, string>>({});
  const rose = acc === deco.pink;
  return (
    <View style={{gap: 14}}>
      <Head>Tonight’s tables</Head>
      <AHCard pad={6} style={{paddingHorizontal: 16}}>
        {[['Poker · Hold’em', '5 / 6 seated'], ['Spades', '3 / 4 seated'], ['Dominoes', '2 / 4 seated'], ['Chess · by the fire', '1 / 2 seated']].map(([g, n], i, a) => (
          <Row key={g} last={i === a.length - 1}>
            <Num n={i + 1} />
            <Text style={[t.title, {flex: 1, fontSize: 20}]}>{g}</Text>
            <Text style={t.meta}>{n}</Text>
          </Row>
        ))}
      </AHCard>
      <Head>Sunday skins · leaderboard</Head>
      <View>
        {SKINS.map(([who, skins, score], i) => (
          <Row key={who} last={i === SKINS.length - 1}>
            <Text style={{width: 24, fontFamily: ahFonts.serif, fontSize: 24, color: i === 0 ? ah.rose : ah.faint}}>{i + 1}</Text>
            <Monogram name={who} size={34} ring={i === 0 ? ah.rose : ah.line2} />
            <Text style={[t.name, {flex: 1}]}>{who}</Text>
            <Text style={t.meta}>{score}</Text>
            <Text style={[t.num, {width: 70, textAlign: 'right', fontSize: 13}]}>{skins} skins</Text>
          </Row>
        ))}
      </View>
      <Head>Weekly pick’em · bragging rights</Head>
      {PICKS.map(([a, b], i) => (
        <View key={a} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <Pick label={a} flex on={picks[i] === a} rose={rose} onPress={() => setPicks((p) => ({...p, [i]: a}))} />
          <Text style={[t.meta, {color: ah.faint}]}>vs</Text>
          <Pick label={b} flex on={picks[i] === b} rose={rose} onPress={() => setPicks((p) => ({...p, [i]: b}))} />
        </View>
      ))}
      <Fine>{Object.keys(picks).length} of {PICKS.length} picked. Pick’em and skins are for points and bragging rights — no money changes hands in the app.</Fine>
      <SampleNote>Sample board</SampleNote>
    </View>
  );
}

/* ─────────── the room ─────────── */
export function Club({side}: {side: Side}) {
  const acc = side === 'him' ? deco.lamp : track[side].acc;
  const [tab, setTab] = useState<Tab>('wire');
  return (
    <View style={{gap: 18}}>
      <AHSmoke aspect={0.95} top={<View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}><AHChip label="Members only" live /><AHChip label="Sample" tone="outline" /></View>}>
        <AHEyebrow color={ah.blush}>The members’ club</AHEyebrow>
        <AHTitle size={30} style={{marginTop: 8}}>Read the wire, talk shop, check the board, settle the bets.</AHTitle>
      </AHSmoke>
      <TabStrip tabs={TABS} value={tab} onChange={setTab} />
      <Animated.View key={tab} entering={FadeIn.duration(300)}>
        {tab === 'wire' ? <Wire /> : tab === 'locker' ? <Locker acc={acc} /> : tab === 'ticker' ? <Ticker acc={acc} /> : tab === 'whosin' ? <WhosIn acc={acc} /> : tab === 'garage' ? <Garage /> : tab === 'estate' ? <Estate /> : <Games acc={acc} />}
      </Animated.View>
    </View>
  );
}
