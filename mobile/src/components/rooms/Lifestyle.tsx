// NightVision, the Game Room and Per Diem — After Hours skin. Signed in, each is the member's real data:
//  · NightVision: a read-only view of the member's OWN taste profile and behaviour signals
//    (/api/nightvision/profile, /api/nightvision/behavioral) — built only from what they do inside Finesse.
//    Nothing about other members is shown, and nothing outside Finesse is pulled.
//  · Game Room: tables members host and seats they take (/api/clubhouse/tables; the seat cap is enforced by
//    the database). Points only — no money moves, and no sportsbook/fantasy partner or sports feed is connected.
//  · Per Diem: the member's night for a date (/api/per-diem), drawn by Nova through the hub (plan · evening);
//    stops are ticked off as the night goes. Nothing is reserved or paid.
import {useMemo, useState} from 'react';
import {Text, View} from 'react-native';
import Animated, {FadeInDown, LinearTransition} from 'react-native-reanimated';
import {deco, track, type Side} from '@/lib/deco';
import {AHCard, AHChip, AHEyebrow, AHInput, AHSmoke, AHTitle} from '@/components/ah';
import {failure, useLive} from '@/lib/live';
import {
  GAMES, GAME_INFO, clubErrorText, closeTable, hostTable, joinTable, leaveTable, readBoard, readNightVision, topAffinities,
  type ClubTable, type Game, type NightVisionData,
} from '@/lib/rooms/clubhouse';
import {dollars, planNight, readNight, toggleStop, totals, type PerDiemPlan} from '@/lib/rooms/perdiem';
import {ActionBar, Chips, SampleNote} from './shared';
import {LiveGate, Status, Tick} from './live';
import {ModerationMenu, useHouseRules} from './moderation';
import {needsTerms} from '@/lib/rooms/moderation';
import {Fine, Head, Meter, Pick, Step, Tag, TextBtn, ah, ahFonts, t} from './RoomKit';
import {useAIConsent} from './AIConsent';
import {NovaReport} from './NovaReport';

/* ─────────────── NightVision ─────────────── */
function NightVisionSample() {
  return (
    <View style={{gap: 14}}>
      <View style={{gap: 6}}>
        <AHTitle size={30}>Your quiet analyst.</AHTitle>
        <Fine>A read-only view of your own taste profile and behaviour signals — built only from what you do inside Finesse.</Fine>
      </View>
      <AHCard pad={20} style={{gap: 10}}>
        <AHEyebrow>Read-only · only you</AHEyebrow>
        <Text style={t.body}>When you sign in, your style DNA, the categories and brands you lean to, and your pace appear here. Nothing about another member is shown, and nothing outside Finesse is pulled.</Text>
      </AHCard>
      <SampleNote>Sign in to see your own NightVision. No sample profiles of other members are shown.</SampleNote>
    </View>
  );
}

/* ─────────────── Game Room ─────────────── */
const TABLES: Array<[string, string, string, number, boolean, number]> = [
  ['I', 'Poker · Texas Hold’em', 'Dealer’s choice at midnight', 5, true, 6],
  ['II', 'Spades', 'Partners · books to 500 · trash talk welcome', 3, true, 4],
  ['III', 'Dominoes', 'Bones to 150 · slam the table', 2, false, 4],
];

function GameRoomSample() {
  return (
    <View style={{gap: 14, marginTop: 14}}>
      {TABLES.map(([, name, topic, filled, live, cap], i) => {
        const lit = Math.min(6, Math.round((filled / cap) * 6));
        return (
          <AHCard key={name} pad={18}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10}}>
              <View style={{flex: 1, gap: 3}}>
                <Text style={t.eyebrow}>Sample table {String(i + 1).padStart(2, '0')}</Text>
                <Text style={[t.title, {fontSize: 24, lineHeight: 27}]}>{name}</Text>
                <Text style={t.small}>{topic}</Text>
              </View>
              {live ? <AHChip label="Sample" tone="outline" /> : null}
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14}}>
              {Array.from({length: Math.min(6, cap)}, (_, k) => <View key={k} style={{width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: k < lit ? 'transparent' : ah.line2, backgroundColor: k < lit ? ah.white : 'transparent'}} />)}
              <Text style={[t.meta, {marginLeft: 6}]}>{filled} / {cap} seated</Text>
            </View>
            <Pick style={{marginTop: 14}} disabled label="Sign in to take a seat" />
          </AHCard>
        );
      })}
      <SampleNote>Sample tables · Points only · sign in to see the real board</SampleNote>
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

function PerDiemSample() {
  const [occ, setOcc] = useState('Date night');
  const [budget, setBudget] = useState(600);
  const [swaps, setSwaps] = useState<Record<string, number>>({});
  const {ix, total} = useMemo(() => plan(budget, occ, swaps), [budget, occ, swaps]);
  const over = total > budget;
  const tier = budget < 400 ? 'EASY' : budget < 900 ? 'POLISHED' : budget < 1800 ? 'MEMORABLE' : 'NO CEILING';
  const nudge = (d: number) => { setBudget((b) => Math.max(150, Math.min(3000, b + d))); setSwaps({}); };
  return (
    <View style={{gap: 16, marginTop: 14}}>
      <AHSmoke aspect={1.15} top={<AHChip label={`Sample · ${occ.toLowerCase()}`} />}>
        <AHEyebrow color={ah.blush}>Per Diem · budget</AHEyebrow>
        <Text style={{fontFamily: ahFonts.serif, fontSize: 76, lineHeight: 80, color: ah.white, letterSpacing: -2, marginTop: 4}} accessibilityLabel={`Budget ${budget} dollars for two`}>${budget.toLocaleString()}</Text>
        <Text style={[t.body, {color: 'rgba(255,255,255,0.75)'}]}>Set the number. The house plans the night around it.</Text>
      </AHSmoke>
      <View style={{flexDirection: 'row', gap: 8}}>
        {[-100, -50, 50, 100].map((d) => <Pick key={d} flex label={`${d > 0 ? '+' : '−'}${Math.abs(d)}`} a11y={`${d > 0 ? 'Raise' : 'Lower'} budget by ${Math.abs(d)}`} onPress={() => nudge(d)} />)}
      </View>
      <Chips options={['$250', '$600', '$1.2K', '$2.5K']} value={{250: '$250', 600: '$600', 1200: '$1.2K', 2500: '$2.5K'}[budget] ?? ''}
        onChange={(v) => { setBudget({$250: 250, $600: 600, '$1.2K': 1200, '$2.5K': 2500}[v] ?? 600); setSwaps({}); }} />
      <Head>The occasion</Head>
      <Chips options={OCCS} value={occ} onChange={setOcc} accent={ah.rose} />
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
                  <TextBtn label="Swap ↻" tone={ah.rose} a11y={`Swap ${key}`} onPress={() => { setSwaps((m) => ({...m, [key]: (m[key] ?? 0) + 1})); }} />
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
      <SampleNote>Sample venues · sign in and Nova plans your real night around the budget · nothing is booked or paid</SampleNote>
    </View>
  );
}

/* ─────────────── NightVision · live (read-only) ─────────────── */
const VELOCITY: Record<string, string> = {low: 'Considered', medium: 'Steady', high: 'Quick to buy'};

function Affinities({title, rows}: {title: string; rows: Array<[string, number]>}) {
  if (!rows.length) return null;
  return (
    <View style={{gap: 10}}>
      <Head>{title}</Head>
      {rows.map(([k, v]) => (
        <View key={k} style={{gap: 6}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
            <Text style={t.name}>{k}</Text>
            <Text style={t.meta}>{v}</Text>
          </View>
          <Meter pct={v} tone={ah.platinum} />
        </View>
      ))}
    </View>
  );
}

function NightVisionLive({data}: {data: NightVisionData}) {
  const p = data.profile, b = data.behavior;
  const cats = topAffinities(b?.category_affinities), brands = topAffinities(b?.brand_affinities);
  const range = b?.price_range_preference;
  return (
    <View style={{gap: 16}}>
      <View style={{gap: 6}}>
        <AHTitle size={30}>Your taste, read back.</AHTitle>
        <Fine>What the house has learned from your NightVision intake and what you do inside Finesse. Only you see this.</Fine>
      </View>
      {p ? (
        <AHCard pad={20} style={{backgroundColor: ah.ink3, gap: 10}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
            <AHEyebrow>Style DNA</AHEyebrow>
            {p.generated_at ? <Tag tone={ah.ok}>{new Date(p.generated_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</Tag> : null}
          </View>
          {p.style_dna ? <Text style={[t.voice, {fontSize: 20, lineHeight: 26}]}>{p.style_dna}</Text> : <Text style={t.small}>No style summary yet.</Text>}
          {p.style_tags?.length ? <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>{p.style_tags.slice(0, 12).map((x) => <AHChip key={x} label={x} tone="outline" />)}</View> : null}
          {p.brand_radar?.length ? (
            <View style={{gap: 6, marginTop: 4}}>
              <Text style={t.eyebrow}>Brand radar</Text>
              <Text style={t.body}>{p.brand_radar.slice(0, 10).join(' · ')}</Text>
            </View>
          ) : null}
        </AHCard>
      ) : (
        <AHCard style={{gap: 6}}>
          <AHEyebrow>No profile yet</AHEyebrow>
          <Text style={t.small}>No style profile has been written for you yet. When one is, your style DNA appears here.</Text>
        </AHCard>
      )}
      <Head right={`${data.signalCount} in 90 days`}>Signals</Head>
      {b && (cats.length || brands.length || b.style_signals?.length) ? (
        <View style={{gap: 16}}>
          <Affinities title="Categories you lean to" rows={cats} />
          <Affinities title="Brands you return to" rows={brands} />
          <View style={{flexDirection: 'row', gap: 10}}>
            {range && range.max_cents > 0 ? (
              <AHCard pad={16} style={{flex: 1, gap: 4}}>
                <Text style={t.eyebrow}>Comfort range</Text>
                <Text style={[t.title, {fontSize: 20}]}>${Math.round(range.min_cents / 100).toLocaleString()}–${Math.round(range.max_cents / 100).toLocaleString()}</Text>
              </AHCard>
            ) : null}
            {b.buying_velocity ? (
              <AHCard pad={16} style={{flex: 1, gap: 4}}>
                <Text style={t.eyebrow}>Pace</Text>
                <Text style={[t.title, {fontSize: 20}]}>{VELOCITY[b.buying_velocity] ?? b.buying_velocity}</Text>
              </AHCard>
            ) : null}
          </View>
          {b.style_signals?.length ? <Fine>Style signals: {b.style_signals.slice(0, 8).join(', ')}</Fine> : null}
        </View>
      ) : (
        <Text style={t.small}>Not enough activity yet to read signals — they build as you browse, save and shop in the house.</Text>
      )}
      <Fine>Read-only. Signals are derived from your own actions in Finesse; no outside accounts are pulled and nothing is shared with other members.</Fine>
    </View>
  );
}

export function NightVision({side: _side}: {side: Side}) {
  const {live, reload} = useLive<NightVisionData>(null, readNightVision);
  return (
    <LiveGate live={live} reload={() => void reload()} what="your NightVision profile" signedOut={<View style={{marginTop: 14}}><NightVisionSample /></View>}>
      {(d) => <NightVisionLive data={d} />}
    </LiveGate>
  );
}

/* ─────────────── Game Room · live ─────────────── */
type Msg = {ok: boolean; text: string} | null;
const DAY_OFFSETS: Array<[string, number]> = [['Tonight', 0], ['Tomorrow', 1], ['In 2 days', 2], ['In 3 days', 3]];
const HOURS: Array<[string, number]> = [['7 PM', 19], ['9 PM', 21], ['11 PM', 23]];

function HostTable({acc, onDone}: {acc: string; onDone: () => void}) {
  const rose = acc === deco.pink;
  const [game, setGame] = useState<Game>('spades');
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('Tonight');
  const [hour, setHour] = useState('9 PM');
  const [seats, setSeats] = useState(GAME_INFO.spades.defaultSeats);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const info = GAME_INFO[game];
  const rules = useHouseRules();
  const open = async () => {
    if (!title.trim() || busy) return;
    const d = new Date();
    d.setDate(d.getDate() + (DAY_OFFSETS.find((x) => x[0] === day)?.[1] ?? 0));
    d.setHours(HOURS.find((x) => x[0] === hour)?.[1] ?? 21, 0, 0, 0);
    if (d.getTime() < Date.now()) { setMsg({ok: false, text: 'That time has passed — pick a later one. No table was opened.'}); return; }
    setMsg(null);
    // House rules & terms, once, before a member's first table.
    if (!(await rules.ensure())) return;
    setBusy(true);
    const send = () => hostTable({game, title: title.trim(), note: null, starts_at: d.toISOString(), seats});
    let r = await send();
    if (needsTerms(r)) {
      if (!(await rules.require())) { setBusy(false); setMsg({ok: false, text: 'Accept the house rules to host. No table was opened.'}); return; }
      r = await send();
    }
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: r.status === 409 || r.status === 400 ? clubErrorText(r.body.error) : failure(r.status, r.body, 'No table was opened.')}); return; }
    setTitle('');
    setMsg({ok: true, text: 'Your table is on the board. You’re seated.'});
    onDone();
  };
  return (
    <AHCard style={{gap: 12}}>
      {rules.sheet}
      <AHEyebrow>Host a table</AHEyebrow>
      <Chips options={GAMES.map((g) => GAME_INFO[g].label)} value={info.label} onChange={(l) => { const g = GAMES.find((x) => GAME_INFO[x].label === l) ?? 'spades'; setGame(g); setSeats(GAME_INFO[g].defaultSeats); }} />
      <Fine>{info.blurb}</Fine>
      <AHInput label="Name the table" value={title} onChangeText={(v) => setTitle(v.slice(0, 80))} placeholder="Spades at midnight" />
      <Chips options={DAY_OFFSETS.map((x) => x[0])} value={day} onChange={setDay} />
      <Chips options={HOURS.map((x) => x[0])} value={hour} onChange={setHour} accent={ah.rose} />
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <Text style={t.eyebrow}>Seats</Text>
        <Pick label="−" a11y="Fewer seats" onPress={() => setSeats((n) => Math.max(2, n - 1))} />
        <Text style={[t.num, {minWidth: 24, textAlign: 'center'}]}>{seats}</Text>
        <Pick label="+" a11y="More seats" onPress={() => setSeats((n) => Math.min(info.maxSeats, n + 1))} />
        <Text style={t.meta}>up to {info.maxSeats}</Text>
      </View>
      <Pick label={busy ? 'Opening…' : 'Open the table'} on rose={rose} disabled={busy || !title.trim()} onPress={open} />
      <Status msg={msg} />
    </AHCard>
  );
}

function BoardTable({tb, n, acc, reload}: {tb: ClubTable; n: number; acc: string; reload: () => void}) {
  const rose = acc === deco.pink;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const left = Math.max(0, tb.seats - tb.seats_taken);
  const lit = Math.min(6, Math.round((tb.seats_taken / tb.seats) * 6));
  const act = async (fn: () => Promise<{ok: boolean; status: number; body: {message?: string; error?: string}}>) => {
    setBusy(true); setMsg(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setMsg({ok: false, text: r.status === 409 ? clubErrorText(r.body.error) : failure(r.status, r.body)});
    reload();
  };
  return (
    <Animated.View layout={LinearTransition}>
      <AHCard pad={18} style={tb.seated ? {borderColor: 'rgba(255,255,255,0.4)'} : undefined}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10}}>
          <View style={{flex: 1, gap: 3}}>
            <Text style={t.eyebrow}>Table {String(n).padStart(2, '0')} · {GAME_INFO[tb.game].label}</Text>
            <Text style={[t.title, {fontSize: 24, lineHeight: 27}]}>{tb.title}</Text>
            <Text style={t.small}>{new Date(tb.starts_at).toLocaleString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'})} · hosted by {tb.is_host ? 'you' : tb.host_name}</Text>
            {tb.note ? <Text style={t.small}>{tb.note}</Text> : null}
          </View>
          {new Date(tb.starts_at).getTime() <= Date.now() ? <AHChip label="Live" live /> : null}
          <ModerationMenu kind="club_table" targetId={tb.id} name={tb.host_name} own={tb.is_host} onBlocked={reload} />
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14}}>
          {Array.from({length: Math.min(6, tb.seats)}, (_, k) => <View key={k} style={{width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: k < lit ? 'transparent' : ah.line2, backgroundColor: k < lit ? (tb.seated && k === lit - 1 ? ah.rose : ah.white) : 'transparent'}} />)}
          <Text style={[t.meta, {marginLeft: 6}]}>{tb.seats_taken} / {tb.seats} seated</Text>
        </View>
        {tb.is_host
          ? <Pick style={{marginTop: 14}} label={busy ? 'Closing…' : 'Your table · close it'} disabled={busy} onPress={() => act(() => closeTable(tb.id))} />
          : <Pick style={{marginTop: 14}} on={tb.seated} rose={rose} disabled={busy || (!tb.seated && left === 0)}
              label={tb.seated ? 'You’re seated · leave' : left === 0 ? 'Table full' : tb.game === 'book' ? 'Join · points only' : 'Take a seat'}
              onPress={() => act(() => (tb.seated ? leaveTable(tb.id) : joinTable(tb.id)))} />}
        <View style={{marginTop: msg ? 10 : 0}}><Status msg={msg} /></View>
      </AHCard>
    </Animated.View>
  );
}

function Board({tables, acc, reload}: {tables: ClubTable[]; acc: string; reload: () => void}) {
  return (
    <View style={{gap: 14}}>
      {tables.length === 0 ? (
        <AHCard style={{gap: 6}}><AHTitle size={26}>No tables open yet.</AHTitle><Text style={t.small}>Host the first one — members see it on the board and take seats.</Text></AHCard>
      ) : tables.map((tb, i) => <BoardTable key={tb.id} tb={tb} n={i + 1} acc={acc} reload={reload} />)}
      <HostTable acc={acc} onDone={reload} />
    </View>
  );
}

export function GameRoom({side}: {side: Side}) {
  const acc = track[side].acc;
  const {live, reload} = useLive<{tables?: ClubTable[]}>(null, readBoard);
  return (
    <View style={{gap: 14}}>
      <AHTitle size={30}>Pull up a chair.</AHTitle>
      <Fine>Poker, Spades, Dominoes, Rummy and the Pool are played for points between members — no real money changes hands in the app.</Fine>
      <LiveGate live={live} reload={() => void reload()} what="the Game Room" signedOut={<GameRoomSample />}>
        {(d) => <Board tables={d.tables ?? []} acc={acc} reload={() => void reload(true)} />}
      </LiveGate>
    </View>
  );
}

/* ─────────────── Per Diem · live ─────────────── */
const pad2 = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function nights(): Array<[string, string]> {
  return [0, 1, 2, 3, 4, 5].map((k) => {
    const d = new Date(); d.setDate(d.getDate() + k);
    return [k === 0 ? 'Tonight' : k === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', {weekday: 'short', day: 'numeric'}), isoOf(d)];
  });
}

function Night({date, label}: {date: string; label: string}) {
  const {live, reload} = useLive<{plan?: PerDiemPlan | null}>(null, () => readNight(date));
  const [occ, setOcc] = useState('Date night');
  const [budget, setBudget] = useState(600);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const consent = useAIConsent();
  const nudge = (d: number) => setBudget((b) => Math.max(0, Math.min(10000, b + d)));
  return (
    <LiveGate live={live} reload={() => void reload()} what="Per Diem" signedOut={<PerDiemSample />}>
      {(d) => {
        const plan = d.plan ?? null;
        const shown = plan ? plan.budget_cents / 100 : budget;
        const tot = totals(plan?.items ?? [], plan ? plan.budget_cents : budget * 100);
        const draw = () => void consent.ensure('ai_processing', () => void drawNow());
        const drawNow = async () => {
          setBusy('Nova is drawing the night…'); setMsg(null);
          const r = await planNight(date, budget * 100, occ);
          setBusy(null);
          setMsg(r.ok ? {ok: true, text: 'Planned. Nova’s night is saved and in your Diary — nothing is reserved or paid.'} : {ok: false, text: r.text});
          void reload(true);
        };
        const tick = async (i: number, done: boolean) => {
          if (!plan) return;
          setBusy('Saving…');
          const r = await toggleStop(plan.id, i, done);
          setBusy(null);
          if (!r.ok) setMsg({ok: false, text: failure(r.status, r.body)});
          void reload(true);
        };
        return (
          <View style={{gap: 16}}>
            <AHSmoke aspect={1.15} top={<AHChip label={`For two · ${label.toLowerCase()}`} />}>
              <AHEyebrow color={ah.blush}>Per Diem · budget</AHEyebrow>
              <Text style={{fontFamily: ahFonts.serif, fontSize: 76, lineHeight: 80, color: ah.white, letterSpacing: -2, marginTop: 4}} accessibilityLabel={shown > 0 ? `Budget ${shown} dollars for two` : 'No fixed budget'}>
                {shown > 0 ? `$${shown.toLocaleString()}` : 'Open'}
              </Text>
              <Text style={[t.body, {color: 'rgba(255,255,255,0.75)'}]}>{plan ? `${plan.occasion} · saved` : 'Set the number. Nova plans the night around it.'}</Text>
            </AHSmoke>
            <View style={{flexDirection: 'row', gap: 8}}>
              {[-100, -50, 50, 100].map((x) => <Pick key={x} flex label={`${x > 0 ? '+' : '−'}${Math.abs(x)}`} a11y={`${x > 0 ? 'Raise' : 'Lower'} budget by ${Math.abs(x)}`} onPress={() => nudge(x)} />)}
            </View>
            <Chips options={['$250', '$600', '$1.2K', '$2.5K']} value={{250: '$250', 600: '$600', 1200: '$1.2K', 2500: '$2.5K'}[budget] ?? ''}
              onChange={(v) => setBudget({$250: 250, $600: 600, '$1.2K': 1200, '$2.5K': 2500}[v] ?? 600)} />
            <Head>The occasion</Head>
            <Chips options={OCCS} value={occ} onChange={setOcc} accent={ah.rose} />
            {plan && plan.budget_cents !== budget * 100 ? <Fine>Saved budget ${Math.round(plan.budget_cents / 100).toLocaleString()} — plan again to use ${budget.toLocaleString()}.</Fine> : null}

            <Head right={plan?.status === 'planned' ? 'Nova’s plan · not booked' : undefined}>The night</Head>
            {plan && plan.items.length ? (
              <View>
                {plan.items.map((it, i) => (
                  <Animated.View key={`${i}-${it.label}`} entering={FadeInDown.duration(300)}>
                    <Step last={i === plan.items.length - 1} on={it.done}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                        <View style={{flex: 1, gap: 2}}>
                          <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
                            <Text style={t.eyebrow}>{it.time}</Text>
                            <Text style={t.num}>{it.cost_cents ? dollars(it.cost_cents) : '—'}</Text>
                          </View>
                          <Text style={[t.title, {fontSize: 22, lineHeight: 26, marginTop: 2, textDecorationLine: it.done ? 'line-through' : 'none', color: it.done ? ah.mute : ah.text}]}>{it.label}</Text>
                        </View>
                        <Tick on={it.done} label={`${it.label} done`} onPress={() => { if (!busy) void tick(i, !it.done); }} />
                      </View>
                    </Step>
                  </Animated.View>
                ))}
              </View>
            ) : plan?.plan_text ? null : (
              <Text style={t.small}>No plan for {label.toLowerCase()} yet — set the budget and the occasion, then let Nova draw it.</Text>
            )}
            {plan?.plan_text && !plan.items.length ? <Text style={t.body}>{plan.plan_text}</Text> : null}
            {plan && plan.items.length ? (
              <View style={{gap: 8}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={t.num}>Planned {dollars(tot.planned)}{tot.spent ? ` · ${dollars(tot.spent)} done` : ''}</Text>
                  {plan.budget_cents > 0 ? <Text style={[t.num, {color: tot.over ? ah.danger : ah.ok}]}>{tot.over ? `${dollars(-tot.left)} over` : `${dollars(tot.left)} to spare`}</Text> : null}
                </View>
                {plan.budget_cents > 0 ? <Meter pct={Math.min(100, Math.round((tot.planned / plan.budget_cents) * 100))} tone={tot.over ? ah.danger : ah.ok} /> : null}
              </View>
            ) : null}
            {plan?.plan_text ? <NovaReport key={`${plan.id}:${plan.updated_at}`} targetId={`perdiem:${plan.nova_request_id ?? plan.id}`} text={plan.plan_text} /> : null}
            <ActionBar color={ah.rose} label={busy ?? (plan?.items.length ? 'Plan it again with Nova' : 'Plan the night with Nova')} onPress={draw} disabled={!!busy} />
            <Status msg={msg} />
            <Fine>Your plan is saved and in your Diary. Nothing is reserved or paid — book each stop yourself.</Fine>
          </View>
        );
      }}
    </LiveGate>
  );
}

export function PerDiem() {
  const opts = useMemo(nights, []);
  const [label, setLabel] = useState(opts[0][0]);
  const date = opts.find((o) => o[0] === label)?.[1] ?? opts[0][1];
  return (
    <View style={{gap: 16}}>
      <Chips options={opts.map((o) => o[0])} value={label} onChange={setLabel} />
      <Night key={date} date={date} label={label} />
    </View>
  );
}
