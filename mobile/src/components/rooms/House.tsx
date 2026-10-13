// The remaining rooms, built from the 31-Room Design Atlas (After Hours skin). Signed in, each is live:
//  • Carpe Diem — today's brief from the member's Diary, the Alpaca PAPER portfolio (read-only snapshot via
//    POST /api/integrations/alpaca; never trades), the garage (POST /api/carpe-diem/garage) and Nova's brief
//    (persona 'briefing', from the member's real context).
//  • Market — demand and price signals computed from real Exchange listings (GET /api/intelligence/market).
//    No retail partner is contracted, so no partner goods are shown; the room says so.
//  • Ballroom — compose an evening (POST /api/ballroom/compose → a proposal in the Diary), ask the desk for
//    holds, and confirm only what a partner has held: the server's 409 is shown as "awaiting the venue".
// Signed out, each keeps its labelled sample.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {deco, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {clock, localISO, readDiaryDay, DIARY_LABEL, type DiaryDay} from '@/lib/diary';
import {BALLROOM_KINDS, BALLROOM_PATH, briefing, composeEvening, connectAlpaca, readCarpeDiem, readMarketSignals, saveGarage, stepEvening,
  type BallroomData, type CarpeProfile, type Evening, type Signal} from '@/lib/rooms/house';
import {BALLROOM_STAGE, dollars} from '@/lib/rooms/logic';
import {AHCard, AHChip, AHEyebrow, AHInput, AHSmoke, AHTitle} from '@/components/ah';
import {ActionBar, Chips, SampleNote} from './shared';
import {LiveGate, RowBtn, Status} from './live';
import {useAIConsent} from './AIConsent';
import {NovaReport} from './NovaReport';
import {Fine, Head, Meter, Row, Tag, TextBtn, Tile, ah, ahFonts, t} from './RoomKit';

const PLAT = deco.lamp;
type Msg = {ok: boolean; text: string} | null;

/* ═════════════════════════ Carpe Diem ═════════════════════════ */

export function CarpeDiem({side}: {side: Side}) {
  const {live, reload} = useLive<{profile: CarpeProfile | null}>(null, readCarpeDiem);
  const acc = side === 'him' ? PLAT : track[side].acc;
  return (
    <View style={{gap: 16}}>
      <AHSmoke tone="city" aspect={1.3} top={<View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}><AHChip label="Today’s brief" /><AHChip label={new Date().toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'})} tone="outline" /></View>}>
        <AHEyebrow color={ah.platinum}>Carpe Diem</AHEyebrow>
        <AHTitle size={34} style={{marginTop: 6}}>Seize it. One decisive brief for the day.</AHTitle>
      </AHSmoke>
      <LiveGate live={live} reload={() => void reload()} what="Carpe Diem" signedOut={<CarpeSample />}>
        {(data) => <CarpeLive acc={acc} profile={data.profile} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function CarpeLive({acc, profile, reload}: {acc: string; profile: CarpeProfile | null; reload: () => Promise<void>}) {
  const today = localISO(new Date());
  const diary = useLive<DiaryDay>(null, () => readDiaryDay(today));
  const day = diary.live.state === 'ready' ? diary.live.data : null;
  const [brief, setBrief] = useState<Msg>(null);
  const [briefing_, setBriefing] = useState(false);
  const [briefId, setBriefId] = useState('');
  const consent = useAIConsent();
  const askBrief = async () => {
    setBriefing(true); setBrief(null);
    const r = await briefing(profile, {today: day?.items.length ?? 0, needsYou: day?.counts.needsYou ?? 0});
    setBriefing(false);
    setBrief({ok: r.ok, text: r.text}); setBriefId(`carpe-diem-brief:${Date.now()}`);
  };
  return (
    <View style={{gap: 16}}>
      <Head right={day ? `${day.counts.done}/${day.items.length} done` : undefined}>Today · from your Diary</Head>
      <LiveGate live={diary.live} reload={() => void diary.reload()} what="your Diary">
        {(d) => d.items.length === 0 ? (
          <Fine>Nothing in today’s Diary — plan something in the Concierge or the Ballroom.</Fine>
        ) : (
          <View>
            {d.items.slice(0, 5).map((i, k) => (
              <Row key={i.id} last={k === Math.min(4, d.items.length - 1)}>
                <Text style={[t.meta, {width: 64}]}>{clock(i.starts_at)}</Text>
                <Text style={[t.body, {flex: 1, textDecorationLine: i.state === 'done' ? 'line-through' : 'none'}]} numberOfLines={2}>{i.title}</Text>
                <Tag tone={i.state === 'needs_member_action' ? ah.rose : i.state === 'done' ? ah.ok : ah.mute}>{DIARY_LABEL[i.state] ?? i.state}</Tag>
              </Row>
            ))}
          </View>
        )}
      </LiveGate>

      <Portfolio profile={profile} reload={reload} />
      <GarageCard profile={profile} reload={reload} />

      <AHCard style={{gap: 10}}>
        <AHEyebrow color={ah.platinum}>Nova briefing</AHEyebrow>
        {brief ? <Text style={[brief.ok ? t.voice : t.small, !brief.ok && {color: ah.danger}]} accessibilityLiveRegion="polite">{brief.text}</Text>
          : <Fine>Built from your Diary, portfolio and garage — nothing invented.</Fine>}
        {brief?.ok ? <NovaReport key={briefId} targetId={briefId} text={brief.text} /> : null}
        <ActionBar color={acc} label={briefing_ ? 'Nova is reading your week…' : brief?.ok ? 'Brief me again' : 'Brief me'} onPress={() => void consent.ensure('ai_processing', () => void askBrief())} disabled={briefing_} />
      </AHCard>
    </View>
  );
}

function Portfolio({profile, reload}: {profile: CarpeProfile | null; reload: () => Promise<void>}) {
  const snap = profile?.alpaca_connected ? profile.alpaca_portfolio_snapshot ?? null : null;
  const [open, setOpen] = useState(!snap);
  const [key, setKey] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const connect = async () => {
    setBusy(true); setMsg(null);
    const r = await connectAlpaca(key, secret);
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: r.status === 401 && r.body.error !== 'signed_out' ? 'Alpaca didn’t accept those keys. Nothing was saved.' : failure(r.status, r.body, 'Nothing was saved.')}); return; }
    setKey(''); setSecret(''); setOpen(false);
    setMsg({ok: true, text: 'Paper portfolio read. Only a partial key is kept.'});
    void reload();
  };
  const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
  return (
    <AHCard style={{gap: 12}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <AHEyebrow>Portfolio · paper · read-only</AHEyebrow>
        {snap ? <TextBtn label={open ? 'Close' : 'Refresh'} onPress={() => setOpen((o) => !o)} /> : null}
      </View>
      {snap ? (
        <>
          <View style={{flexDirection: 'row', gap: 10}}>
            <View style={{flex: 1}}><Text style={t.eyebrow}>Value</Text><Text style={{fontFamily: ahFonts.serif, fontSize: 26, color: ah.text}}>{usd(snap.portfolio_value)}</Text></View>
            <View style={{flex: 1}}><Text style={t.eyebrow}>Today</Text><Text style={{fontFamily: ahFonts.serif, fontSize: 26, color: snap.pnl_today >= 0 ? ah.ok : ah.danger}}>{snap.pnl_today >= 0 ? '+' : '−'}{usd(Math.abs(snap.pnl_today))}</Text></View>
          </View>
          {snap.top_positions?.map((p, i) => (
            <Row key={p.symbol} last={i === snap.top_positions.length - 1} style={{minHeight: 44, paddingVertical: 8}}>
              <Text style={[t.name, {width: 64}]}>{p.symbol}</Text>
              <Text style={[t.small, {flex: 1}]}>{p.qty} · {usd(p.market_value)}</Text>
              <Text style={[t.num, {fontSize: 13, color: p.change_today_pct >= 0 ? ah.ok : ah.danger}]}>{p.change_today_pct >= 0 ? '+' : ''}{p.change_today_pct.toFixed(1)}%</Text>
            </Row>
          ))}
          <Fine>Snapshot from {new Date(snap.fetched_at).toLocaleString([], {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}. The app never trades.</Fine>
        </>
      ) : <Fine>Connect an Alpaca paper account to see a read-only snapshot here. No trades are ever placed from Finesse.</Fine>}
      {open ? (
        <Animated.View entering={FadeIn.duration(250)} style={{gap: 10}}>
          <AHInput value={key} onChangeText={setKey} placeholder="Alpaca paper API key" autoCapitalize="none" autoCorrect={false} accessibilityLabel="Alpaca API key" />
          <AHInput value={secret} onChangeText={setSecret} placeholder="Alpaca paper API secret" secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel="Alpaca API secret" />
          <RowBtn label={busy ? 'Reading…' : snap ? 'Refresh the snapshot' : 'Connect paper account'} onPress={() => void connect()} disabled={busy || !key.trim() || !secret.trim()} tone={ah.rose} />
          <Fine>Paper trading keys only. The secret is used once to read the snapshot and is not stored.</Fine>
        </Animated.View>
      ) : null}
      <Status msg={msg} />
    </AHCard>
  );
}

function GarageCard({profile, reload}: {profile: CarpeProfile | null; reload: () => Promise<void>}) {
  const [make, setMake] = useState(profile?.car_make ?? '');
  const [model, setModel] = useState(profile?.car_model ?? '');
  const [year, setYear] = useState(profile?.car_year ? String(profile.car_year) : '');
  const [size, setSize] = useState(profile?.sneaker_size ?? '');
  const [hcp, setHcp] = useState(profile?.golf_handicap != null ? String(profile.golf_handicap) : '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const save = async () => {
    setBusy(true); setMsg(null);
    const y = Number(year), h = Number(hcp);
    const r = await saveGarage({car_make: make.trim() || null, car_model: model.trim() || null, car_year: year && Number.isFinite(y) ? Math.round(y) : null,
      sneaker_size: size.trim() || null, golf_handicap: hcp && Number.isFinite(h) ? h : null});
    setBusy(false);
    setMsg(r.ok ? {ok: true, text: 'Garage saved. Nova uses it for your brief.'} : {ok: false, text: failure(r.status, r.body, 'Nothing was saved.')});
    if (r.ok) void reload();
  };
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>The garage</AHEyebrow>
      <View style={{flexDirection: 'row', gap: 8}}>
        <View style={{flex: 1}}><AHInput value={make} onChangeText={setMake} placeholder="Make" accessibilityLabel="Car make" /></View>
        <View style={{flex: 1}}><AHInput value={model} onChangeText={setModel} placeholder="Model" accessibilityLabel="Car model" /></View>
      </View>
      <View style={{flexDirection: 'row', gap: 8}}>
        <View style={{flex: 1}}><AHInput value={year} onChangeText={(v) => setYear(v.replace(/\D/g, '').slice(0, 4))} placeholder="Year" keyboardType="number-pad" accessibilityLabel="Car year" /></View>
        <View style={{flex: 1}}><AHInput value={size} onChangeText={setSize} placeholder="Sneaker size" accessibilityLabel="Sneaker size" /></View>
        <View style={{flex: 1}}><AHInput value={hcp} onChangeText={setHcp} placeholder="Handicap" keyboardType="decimal-pad" accessibilityLabel="Golf handicap" /></View>
      </View>
      <RowBtn label={busy ? 'Saving…' : 'Save the garage'} onPress={() => void save()} disabled={busy} />
      <Status msg={msg} />
    </AHCard>
  );
}

const BRIEF: Array<[string, string, string]> = [
  ['MOVEMENT', 'Gym · upper body, 45 min', 'dumbbell'],
  ['WORK', 'Two decisions due before noon', 'briefcase'],
  ['SPORT', 'Tee time Sunday, 07:50 · four-ball', 'trendingup'],
  ['PORTFOLIO', 'Read-only · paper account · no trades from the app', 'wallet'],
];

function CarpeSample() {
  return (
    <View style={{marginTop: 14, gap: 12}}>
      {BRIEF.map(([k, line, icon], i) => (
        <Row key={k} last={i === BRIEF.length - 1}>
          <View style={{width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: ah.line2, alignItems: 'center', justifyContent: 'center', backgroundColor: ah.ink3}}><Icon name={icon} size={18} color={ah.text} /></View>
          <View style={{flex: 1, gap: 2}}><Text style={t.eyebrow}>{k}</Text><Text style={[t.title, {fontSize: 20, lineHeight: 23}]}>{line}</Text></View>
        </Row>
      ))}
      <SampleNote>Sample brief · signed out · your Diary, paper portfolio and garage appear once you sign in</SampleNote>
    </View>
  );
}

/* ═════════════════════════ Market ═════════════════════════ */

const TREND: Record<Signal['price_trend'], [string, string]> = {rising: ['▲ Rising', ah.ok], stable: ['■ Stable', ah.mute], falling: ['▼ Falling', ah.danger]};

export function Market({side}: {side: Side}) {
  const acc = side === 'him' ? PLAT : track[side].acc;
  const {live, reload} = useLive<{signals?: Signal[]}>(null, readMarketSignals);
  return (
    <View style={{gap: 14}}>
      <AHTitle size={30}>The honest price, the original source and what Finesse earns — before you leave the house.</AHTitle>
      <LiveGate live={live} reload={() => void reload()} what="the Market" signedOut={<MarketSample acc={acc} />}>
        {(data) => {
          const signals = Array.isArray(data.signals) ? data.signals : [];
          return (
            <View style={{gap: 14}}>
              <AHCard style={{gap: 6}}>
                <AHEyebrow color={ah.rose}>Partner goods</AHEyebrow>
                <Text style={t.voice}>No retail partner is contracted yet.</Text>
                <Fine>When one is, each piece here shows the partner’s own price, the source and exactly what Finesse earns. Until then nothing is sold from this room.</Fine>
              </AHCard>
              <Head right={signals.length ? `${signals.length} categories` : undefined}>What members are trading</Head>
              {signals.length === 0 ? <Fine>No member listings yet, so there are no market signals to read. List something on the Exchange to start the market.</Fine> : (
                <View>
                  {signals.map((sg, i) => (
                    <Animated.View key={sg.category} entering={FadeInDown.delay(i * 40).duration(250)}>
                      <Row last={i === signals.length - 1} style={{alignItems: 'flex-start'}}>
                        <View style={{flex: 1, gap: 4}}>
                          <Text style={t.eyebrow}>{sg.category}</Text>
                          <Text style={[t.title, {fontSize: 20}]}>{dollars(sg.avg_price_cents)} avg</Text>
                          <Text style={t.small}>{sg.listing_count} listings · sells in ~{Math.round(sg.avg_days_to_sell)} days</Text>
                          <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
                            <Text style={[t.meta, {width: 70}]}>Demand</Text>
                            <View style={{flex: 1}}><Meter pct={sg.demand_score} /></View>
                          </View>
                        </View>
                        <Text style={[t.meta, {color: TREND[sg.price_trend]?.[1] ?? ah.mute}]}>{TREND[sg.price_trend]?.[0] ?? sg.price_trend}</Text>
                      </Row>
                    </Animated.View>
                  ))}
                </View>
              )}
              <Fine>Computed from real Exchange listings — no partner data, no invented prices.</Fine>
            </View>
          );
        }}
      </LiveGate>
    </View>
  );
}

const GOODS: Array<[string, string, string, string, number, string]> = [
  ['WATCHES', 'Steel dress watch, 38 mm', 'Partner boutique', 'Affiliate · Finesse earns 6%', 4200, 'briefcase'],
  ['TAILORING', 'Made-to-measure navy suit', 'Partner tailor', 'Referral fee disclosed at fitting', 1890, 'shirt'],
];

function MarketSample({acc}: {acc: string}) {
  const [flip, setFlip] = useState<string | null>(null);
  return (
    <View style={{gap: 12, marginTop: 14}}>
      {GOODS.map(([c, name, src, fee, price, icon]) => {
        const open = flip === name;
        return (
          <AHCard key={name} pad={16}>
            <View style={{flexDirection: 'row', gap: 14, alignItems: 'center'}}>
              <Tile icon={icon} size={58} />
              <View style={{flex: 1, gap: 2}}><Text style={t.eyebrow}>{c}</Text><Text style={[t.title, {fontSize: 21, lineHeight: 24}]}>{name}</Text><Text style={t.small}>{src}</Text></View>
            </View>
            <Pressable onPress={() => setFlip(open ? null : name)} accessibilityRole="button" accessibilityState={{expanded: open}} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, marginTop: 10}}>
              <Text style={{fontFamily: ahFonts.serif, fontSize: 28, color: ah.text}}>${price.toLocaleString()}</Text>
              <Text style={[t.name, {fontSize: 13, color: open ? ah.rose : ah.text}]}>{open ? 'Hide fees' : 'Fees & source'}</Text>
            </Pressable>
            {open ? <Text style={[t.small, {color: acc === deco.pink ? ah.rose : ah.text}]}>Disclosed · {fee}</Text> : null}
          </AHCard>
        );
      })}
      <SampleNote>Sample goods · signed out · outbound links open once partners are contracted</SampleNote>
    </View>
  );
}

/* ═════════════════════════ Ballroom ═════════════════════════ */

const STAGES = ['Proposal', 'Holds', 'Confirmed'];
const STATE_LABEL: Record<string, string> = {proposal: 'Proposal', hold_requested: 'Holds requested', held: 'Held by the venue', confirmed: 'Confirmed'};
const WHEN: Array<[string, () => Date]> = [
  ['Tonight', () => { const d = new Date(); d.setHours(20, 0, 0, 0); if (d.getTime() < Date.now()) d.setHours(22, 0, 0, 0); return d; }],
  ['Tomorrow', () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(20, 0, 0, 0); return d; }],
  ['Saturday', () => { const d = new Date(); d.setDate(d.getDate() + (((6 - d.getDay() + 7) % 7) || 7)); d.setHours(20, 0, 0, 0); return d; }],
];

export function Ballroom({side}: {side: Side}) {
  const {live, reload} = useLive<BallroomData>(BALLROOM_PATH);
  return (
    <View style={{gap: 16}}>
      <AHSmoke aspect={1.3} top={<AHChip label="The Ballroom" tone="glass" />}>
        <AHTitle size={32}>Compose an evening. The desk asks for holds; you confirm what the venue holds.</AHTitle>
      </AHSmoke>
      <LiveGate live={live} reload={() => void reload()} what="the Ballroom" signedOut={<BallroomSample />}>
        {(data) => <BallroomLive side={side} data={data} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function BallroomLive({side, data, reload}: {side: Side; data: BallroomData; reload: () => Promise<void>}) {
  const evenings = Array.isArray(data.evenings) ? data.evenings : [];
  return (
    <View style={{gap: 16}}>
      {evenings.length === 0 ? (
        <AHCard pad={22}><Text style={t.voice}>No evenings yet — compose one.</Text><Fine style={{marginTop: 8}}>Nothing is booked when you compose: it’s a proposal, and it waits in your Diary.</Fine></AHCard>
      ) : evenings.map((ev) => <EveningCard key={ev.id} ev={ev} reload={reload} />)}
      <Compose side={side} sources={data.sources} onDone={reload} />
    </View>
  );
}

function EveningCard({ev, reload}: {ev: Evening; reload: () => Promise<void>}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const stage = BALLROOM_STAGE[ev.state] ?? 0;
  const step = async (k: 'hold' | 'confirm') => {
    setBusy(true); setMsg(null);
    const r = await stepEvening(ev.id, k);
    setBusy(false);
    if (r.ok) { setMsg({ok: true, text: r.body.message ?? (k === 'hold' ? 'The desk has your request.' : 'Confirmed.')}); void reload(); return; }
    if (r.status === 409) { setMsg({ok: false, text: k === 'confirm' ? 'Awaiting the venue — nothing can be confirmed until a partner holds it. You’ll see it in the Diary when they do.' : (r.body.message ?? 'This evening has already moved on.')}); void reload(); return; }
    setMsg({ok: false, text: failure(r.status, r.body)});
  };
  return (
    <Animated.View layout={LinearTransition}>
      <AHCard style={{gap: 12}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10}}>
          <AHTitle size={26} style={{flexShrink: 1}}>{ev.title}</AHTitle>
          <Text style={t.meta}>{new Date(ev.starts_at).toLocaleString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'})}</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 6}} accessibilityLabel={`Stage: ${STATE_LABEL[ev.state] ?? ev.state}`}>
          {STAGES.map((x, i) => (
            <View key={x} style={{flex: 1, gap: 6}}>
              <View style={{height: 3, borderRadius: 2, backgroundColor: i <= stage ? (i === 2 ? ah.ok : ah.white) : ah.line2}} />
              <Text style={[t.eyebrow, {fontSize: 11, letterSpacing: 1, color: i <= stage ? ah.text : ah.faint}]}>{x}</Text>
            </View>
          ))}
        </View>
        <View>
          {ev.components.map((c, i) => (
            <Row key={`${c.kind}${i}`} last={i === ev.components.length - 1} style={{minHeight: 44, paddingVertical: 8}}>
              <Text style={[t.eyebrow, {width: 56}]}>{c.kind}</Text>
              <Text style={[t.body, {flex: 1}]}>{c.label}</Text>
              {c.partner ? <Text style={t.meta}>{c.partner}</Text> : null}
            </Row>
          ))}
        </View>
        <Text style={t.small}>{STATE_LABEL[ev.state] ?? ev.state} · party of {ev.party_size}</Text>
        {ev.state === 'proposal' ? <RowBtn label={busy ? 'One moment…' : 'Ask the desk for holds'} onPress={() => void step('hold')} disabled={busy} tone={ah.rose} /> : null}
        {ev.state === 'hold_requested' ? (
          <View style={{gap: 8}}>
            <Fine>Waiting on the venue — nothing is held until a partner says so.</Fine>
            <RowBtn label={busy ? 'One moment…' : 'Confirm the evening'} onPress={() => void step('confirm')} disabled={busy} />
          </View>
        ) : null}
        {ev.state === 'held' ? <RowBtn label={busy ? 'One moment…' : 'Confirm the evening'} onPress={() => void step('confirm')} disabled={busy} tone={ah.rose} /> : null}
        <Status msg={msg} />
      </AHCard>
    </Animated.View>
  );
}

function Compose({side, sources, onDone}: {side: Side; sources: BallroomData['sources'] | undefined; onDone: () => Promise<void>}) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('Tonight');
  const [party, setParty] = useState(2);
  const [parts, setParts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const kinds = BALLROOM_KINDS.slice(0, 4);
  const components = kinds.filter((k) => parts[k]?.trim()).map((k) => ({kind: k, label: parts[k].trim().slice(0, 160)}));
  const go = async () => {
    if (!title.trim() || components.length === 0) { setMsg({ok: false, text: 'Give the evening a name and at least one element.'}); return; }
    setBusy(true); setMsg(null);
    const at = WHEN.find(([w]) => w === when)![1]();
    const r = await composeEvening({title: title.trim().slice(0, 160), startsAt: at.toISOString(), partySize: party, track: side === 'him' ? 'carpe_diem' : 'finesse', components});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was composed.')}); return; }
    setTitle(''); setParts({});
    setMsg({ok: true, text: 'Proposal written. It’s also waiting in your Diary. Nothing is booked.'});
    void onDone();
  };
  const HINT: Record<string, string> = {table: 'Dinner for two at…', look: 'What you’ll wear', gift: 'A gift for the night', route: 'How you get there'};
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>Compose an evening</AHEyebrow>
      <AHInput value={title} onChangeText={setTitle} placeholder="Name the evening" accessibilityLabel="Evening name" />
      <Chips options={WHEN.map(([w]) => w)} value={when} onChange={setWhen} />
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <RowBtn label="−" a11y="Fewer guests" onPress={() => setParty((p) => Math.max(1, p - 1))} />
        <Text style={{flex: 1, textAlign: 'center', fontFamily: ahFonts.serif, fontSize: 20, color: ah.text}}>Party of {party}</Text>
        <RowBtn label="+" a11y="More guests" onPress={() => setParty((p) => Math.min(40, p + 1))} />
      </View>
      {kinds.map((k) => (
        <AHInput key={k} value={parts[k] ?? ''} onChangeText={(v) => setParts((x) => ({...x, [k]: v}))} placeholder={`${k.charAt(0).toUpperCase() + k.slice(1)} · ${HINT[k]}`} accessibilityLabel={k} />
      ))}
      {sources ? <Fine>{sources.looks} looks in your Wardrobe and {sources.registryWishes} wishes in your Registry can feed it.</Fine> : null}
      <ActionBar label={busy ? 'Composing…' : 'Write the proposal'} color={track[side].acc} onPress={() => void go()} disabled={busy} />
      <Status msg={msg} />
    </AHCard>
  );
}

const EVE: Array<[string, string, string, string]> = [
  ['7:00 PM', 'Salon touch-up', 'Partner salon · 30 min', 'sparkles'],
  ['8:30 PM', 'Dinner for two · Lucian', 'Venue hold requested', 'chefhat'],
  ['10:30 PM', 'Nightcap at the Club', 'Two chairs by the fire', 'martini'],
];

function BallroomSample() {
  return (
    <View style={{marginTop: 14}}>
      {EVE.map(([time, title, sub, icon], i) => (
        <View key={title} style={{flexDirection: 'row', gap: 14}}>
          <View style={{alignItems: 'center', width: 40}}>
            <View style={{width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: ah.line2, backgroundColor: ah.ink3, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} size={16} color={ah.rose} /></View>
            {i < EVE.length - 1 ? <View style={{flex: 1, width: 1, backgroundColor: ah.line2}} /> : null}
          </View>
          <View style={{flex: 1, paddingBottom: 18}}>
            <Text style={t.eyebrow}>{time}</Text>
            <Text style={[t.title, {fontSize: 22, lineHeight: 25}]}>{title}</Text>
            <Text style={t.small}>{sub}</Text>
          </View>
        </View>
      ))}
      <SampleNote>Sample evening · signed out · holds are requests to venues · nothing is paid until a partner holds it and you confirm</SampleNote>
    </View>
  );
}
