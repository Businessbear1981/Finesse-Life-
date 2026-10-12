// Scale (group buys: the price falls as members pledge), The Exchange (consign with provenance and offers)
// and Embassy (partner offers, fully disclosed) — After Hours skin. Pledging never charges; accepting an
// offer or a partner deal here is a preview until the commerce partners are live.
// Scale is live when signed in: GET /api/scale/pledges lists the member's pledges with their honest state;
// a pledge in `payment_requested` can be paid through Stripe Checkout in the browser (physical goods —
// allowed in-app). The app never marks anything paid: it re-reads the pledge when you come back.
import {useEffect, useRef, useState} from 'react';
import {AppState, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {PLEDGES_PATH, PLEDGE_LABEL, formatCents, formatDate, payPledge, pledgeCopy, type Pledge} from '@/lib/billing';
import {track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {useLive} from '@/lib/live';
import {AHCard, AHChip, AHEyebrow, AHTitle} from '@/components/ah';
import {ActionBar, Chips, SampleNote} from './shared';
import {ERR_PINK, LiveGate, OK_GREEN, Status} from './live';
import {Fine, Head, Meter, Pick, Row, Step, Tag, Tile, ah, ahFonts, t} from './RoomKit';

const LADDER: Array<[number, number]> = [[50, 520], [100, 460], [150, 412], [250, 360]];

export function Scale({side}: {side: Side}) {
  const {live, reload} = useLive<{pledges: Pledge[]}>(PLEDGES_PATH);
  return (
    <View style={{gap: 14}}>
      <View style={{gap: 6}}>
        <AHTitle size={34}>The price falls as members join.</AHTitle>
      </View>
      <LiveGate live={live} reload={() => void reload()} what="your pledges" signedOut={<ScaleSample side={side} />}>
        {(data) => <ScaleLive pledges={Array.isArray(data.pledges) ? data.pledges : []} side={side} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

const STATE_TONE: Record<Pledge['state'], string> = {
  pledged: ah.platinum, waitlisted: ah.mute, goal_met: OK_GREEN, payment_requested: ah.warn,
  paid: OK_GREEN, fulfilled: OK_GREEN, refunded: ah.text, cancelled: ah.faint,
};

function ScaleLive({pledges, side, reload}: {pledges: Pledge[]; side: Side; reload: () => Promise<void>}) {
  const acc = track[side].acc;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{id: string; ok: boolean; text: string} | null>(null);
  // The pledge whose checkout we opened; when the app comes back to the front we re-read until the server says paid.
  const [awaiting, setAwaiting] = useState<string | null>(null);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const awaited = awaiting ? pledges.find((p) => p.id === awaiting) : undefined;
  const confirmed = awaited && (awaited.state === 'paid' || awaited.state === 'fulfilled');

  useEffect(() => {
    if (!awaiting || confirmed) return;
    let tries = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = () => {
      if (timer) clearInterval(timer);
      tries = 0;
      timer = setInterval(() => {
        tries += 1;
        void reloadRef.current();
        if (tries >= 6 && timer) clearInterval(timer);
      }, 4000);
      void reloadRef.current();
    };
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') poll(); });
    return () => { sub.remove(); if (timer) clearInterval(timer); };
  }, [awaiting, confirmed]);

  const pay = async (id: string) => {
    setBusy(id); setMsg(null);
    const r = await payPledge(id);
    setBusy(null);
    if (r.kind === 'opened') { setAwaiting(id); return; }
    setMsg({id, ok: false, text: r.text});
    if (r.kind === 'not_payable') void reload();
  };

  return (
    <View style={{gap: 14}}>
      <Head right={String(pledges.length)}>Your pledges</Head>
      {pledges.length === 0 ? (
        <AHCard pad={22}>
          <Text style={t.voice}>No pledges yet.</Text>
          <Fine style={{marginTop: 8}}>You haven’t pledged to a group buy yet. A pledge never charges — payment is only requested if the group reaches its goal.</Fine>
        </AHCard>
      ) : pledges.map((p) => {
        const price = formatCents(p.deal?.group_price_cents);
        const tone = STATE_TONE[p.state] ?? ah.platinum;
        const mine = awaiting === p.id;
        const closes = formatDate(p.deal?.deadline);
        return (
          <Animated.View key={p.id} layout={LinearTransition}>
            <AHCard pad={18} style={p.state === 'payment_requested' ? {borderColor: 'rgba(255,207,110,0.4)'} : undefined}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10}}>
                <View style={{flex: 1, gap: 3}}>
                  {p.deal?.brand ? <Text style={t.eyebrow}>{p.deal.brand}</Text> : null}
                  <Text style={t.title}>{p.deal?.title ?? 'Group buy'}</Text>
                </View>
                {price ? <Text style={{fontFamily: ahFonts.serif, fontSize: 24, color: ah.text}}>{price}</Text> : null}
              </View>
              <View style={{marginTop: 10}}><Tag tone={tone}>{PLEDGE_LABEL[p.state] ?? String(p.state)}</Tag></View>
              <Fine style={{marginTop: 10}}>
                {pledgeCopy(p)}
                {p.state === 'pledged' && typeof p.deal?.current_count === 'number' && typeof p.deal?.goal_count === 'number' ? ` ${p.deal.current_count}/${p.deal.goal_count} so far${closes ? ` · closes ${closes}` : ''}.` : ''}
              </Fine>
              {p.state === 'payment_requested' ? (
                mine ? (
                  <View style={{gap: 8, marginTop: 12}}>
                    <Text style={[t.small, {color: ah.warn}]} accessibilityLiveRegion="polite">Processing · Finish checkout in your browser. This shows Paid once the house confirms it — nothing is marked paid before then.</Text>
                    <Pick label="Check again" onPress={() => void reload()} />
                    <Pick label={busy === p.id ? 'One moment…' : 'Reopen checkout'} onPress={() => void pay(p.id)} disabled={busy !== null} />
                  </View>
                ) : (
                  <View style={{marginTop: 12}}><ActionBar color={acc} label={busy === p.id ? 'Opening secure checkout…' : `Pay now${price ? ` · ${price}` : ''}`} onPress={() => void pay(p.id)} disabled={busy !== null} /></View>
                )
              ) : null}
              {mine && (p.state === 'paid' || p.state === 'fulfilled') ? <View style={{marginTop: 10}}><Status msg={{ok: true, text: 'Payment confirmed by the house. Thank you.'}} /></View> : null}
              {msg?.id === p.id ? <Text style={[t.small, {marginTop: 10, color: msg.ok ? OK_GREEN : ERR_PINK}]} accessibilityLiveRegion="polite">{msg.text}</Text> : null}
            </AHCard>
          </Animated.View>
        );
      })}
      <SampleNote>Live · A pledge never charges · Payment is only requested if the buy closes · Paid shows only when the house confirms it</SampleNote>
    </View>
  );
}

function ScaleSample({side}: {side: Side}) {
  const acc = track[side].acc;
  const [pledged, setPledged] = useState(false);
  const pledges = 163 + (pledged ? 1 : 0);
  const cur = LADDER.filter(([n]) => pledges >= n).pop()!;
  const next = LADDER.find(([n]) => pledges < n);
  const pct = next ? Math.round(((pledges - cur[0]) / (next[0] - cur[0])) * 100) : 100;
  return (
    <View style={{gap: 14}}>
      <Head>Sample group buy</Head>
      <AHCard pad={20}>
        <View style={{flexDirection: 'row', gap: 14, alignItems: 'center'}}>
          <Tile icon="shirt" size={64} tone={ah.mute} />
          <View style={{flex: 1, gap: 3}}>
            <Text style={[t.title, {fontSize: 24, lineHeight: 27}]}>Cashmere travel wrap</Text>
            <Text style={t.small}>Group buy · closes Sunday</Text>
          </View>
        </View>
        <View style={{alignItems: 'center', gap: 4, paddingVertical: 22}}>
          <Text style={[t.num, {fontSize: 13, color: ah.ok}]}>▼ ${680 - cur[1]} from $680</Text>
          <Text style={{fontFamily: ahFonts.serif, fontSize: 72, lineHeight: 76, color: ah.text, letterSpacing: -1.5}}>${cur[1]}</Text>
          <Text style={t.small}>{pledges} members pledged · price falls as more join</Text>
        </View>
        <View style={{gap: 8}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={t.eyebrow}>Demand</Text>
            <Text style={t.meta}>{next ? `${next[0] - pledges} to next drop` : 'Lowest price reached'}</Text>
          </View>
          <Meter pct={pct} tone={acc} />
        </View>
      </AHCard>
      <View>
        {LADDER.map(([n, p], i) => {
          const hit = pledges >= n;
          return (
            <Row key={n} last={i === LADDER.length - 1} style={{minHeight: 48, opacity: hit ? 1 : 0.55}}>
              <View style={{width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: hit ? ah.rose : ah.line2, backgroundColor: hit ? ah.rose : 'transparent'}} />
              <Text style={[t.body, {flex: 1}]}>{n} pledges</Text>
              <Text style={[t.num, {color: cur[0] === n ? ah.rose : ah.text}]}>${p}</Text>
            </Row>
          );
        })}
      </View>
      <ActionBar color={pledged ? ah.white : acc} label={pledged ? 'Pledged · tap to withdraw' : `Pledge at $${cur[1]}`} onPress={() => setPledged((p) => !p)} />
      <SampleNote>Sample · Preview · A pledge never charges · Payment is only requested if the buy closes, and you confirm it</SampleNote>
    </View>
  );
}

const PROV: Array<[string, string]> = [['2022 · PARIS', 'Bought new at the flagship'], ['2022–2026', 'Carried 40 times, stored in dust bag'], ['SEP 2026', 'Authenticated by the house'], ['OCT 2026', 'Listed on the Exchange']];
const OFFERS: Array<[string, string, string]> = [['$2,150', 'a member in Paris', 'EXPIRES 2D'], ['$1,980', 'a member in Atlanta', 'EXPIRES 5H'], ['$2,300', 'a member in Dubai', 'EXPIRES 1D']];

export function Exchange() {
  const [accepted, setAccepted] = useState<number | null>(null);
  return (
    <View style={{gap: 14}}>
      <AHCard pad={0}>
        <View style={{height: 220, backgroundColor: ah.ink3, alignItems: 'center', justifyContent: 'center', gap: 10}}>
          <Icon name="briefcase" size={44} color={ah.faint} strokeWidth={1.1} />
          <Text style={[t.eyebrow, {color: ah.faint, fontSize: 10}]}>Your listing photo</Text>
        </View>
        <View style={{padding: 20, gap: 6}}>
          <AHChip label="On the Exchange" tone="rose" />
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 6}}>
            <AHTitle size={30} italic={false} style={{flexShrink: 1}}>Black leather tote</AHTitle>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 30, color: ah.text}}>$2,400</Text>
          </View>
        </View>
      </AHCard>
      <Head>Provenance</Head>
      <View>
        {PROV.map(([when, x], i) => (
          <Step key={when} last={i === PROV.length - 1} tone={i === PROV.length - 1 ? ah.rose : ah.platinum}>
            <Text style={t.eyebrow}>{when}</Text>
            <Text style={[t.body, {marginTop: 2}]}>{x}</Text>
          </Step>
        ))}
      </View>
      <Head right={accepted != null ? 'Preview pick' : `${OFFERS.length} open`}>Offers</Head>
      {OFFERS.map(([amt, from, exp], i) => {
        const me = accepted === i;
        return (
          <Animated.View key={amt} layout={LinearTransition} style={{opacity: accepted != null && !me ? 0.4 : 1}}>
            <AHCard pad={18} style={me ? {borderColor: ah.white} : undefined}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={{fontFamily: ahFonts.serif, fontSize: 34, lineHeight: 36, color: ah.text}}>{amt}</Text>
                <Tag>{exp}</Tag>
              </View>
              <Text style={[t.small, {marginTop: 4}]}>from {from}</Text>
              <Pick label={me ? 'Preview · not accepted yet' : 'Accept'} on={me} style={{marginTop: 14}} onPress={() => setAccepted(me ? null : i)} />
            </AHCard>
          </Animated.View>
        );
      })}
      <SampleNote>Sample listing · Funds are held by the payment partner, never by Finesse · Accepting here is a preview</SampleNote>
    </View>
  );
}

const ENVOYS: Array<[string, string, string, string[], string]> = [
  ['Maison Aurel', 'Partner since 2026 · heritage leather', 'Private fitting for the Aurel evening bag, with a monogram on the house.', ['You answered “Heritage” for houses you return to', 'Gold hardware is in your style read', 'Your budget per piece fits this range'], 'Finesse earns 8% if you buy. Aurel never sees your data unless you accept.'],
  ['Atelier Nuit', 'Partner since 2026 · eveningwear', 'First look at the winter gown edit, two days before release.', ['“Old Hollywood” in your interview', 'Evening-first in your style read', 'Three gala dates in your Diary'], 'Finesse earns 6% if you buy. Offer shown to members whose style read matches.'],
  ['Hôtel Lumen', 'Partner since 2026 · hospitality', 'Suite upgrade for your Amalfi return, late checkout included.', ['Travel picked for your ideal week', 'Amalfi is a season in your Scrapbook', 'You prefer quiet over social'], 'Finesse earns a flat referral fee. No data shared until you book.'],
];

export function Embassy({side}: {side: Side}) {
  const acc = track[side].acc;
  const [ei, setEi] = useState(ENVOYS[0][0]);
  const [st, setSt] = useState<Record<string, 'yes' | 'no' | undefined>>({});
  const E = ENVOYS.find((e) => e[0] === ei)!;
  const state = st[ei];
  return (
    <View style={{gap: 14}}>
      <Chips options={ENVOYS.map((e) => e[0])} value={ei} onChange={setEi} />
      <Animated.View key={ei} entering={FadeInDown.duration(400)}>
        <AHCard pad={22}>
          <AHEyebrow>Partner dossier</AHEyebrow>
          <AHTitle size={36} italic={false} style={{marginTop: 8}}>{E[0]}</AHTitle>
          <Text style={[t.small, {marginTop: 4}]}>{E[1]}</Text>
          <Head style={{marginTop: 22}}>The offer</Head>
          <Text style={[t.voice, {marginTop: 8}]}>{E[2]}</Text>
          <Head style={{marginTop: 22}}>Why it fits you</Head>
          <View style={{marginTop: 4}}>
            {E[3].map((w, i) => (
              <Row key={w} last={i === E[3].length - 1} style={{minHeight: 44, paddingVertical: 10}}>
                <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: ah.rose}} />
                <Text style={[t.body, {flex: 1}]}>{w}</Text>
              </Row>
            ))}
          </View>
          <Animated.View entering={FadeIn} style={{marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: 'rgba(232,180,160,0.08)', borderWidth: 1, borderColor: 'rgba(232,180,160,0.2)'}}>
            <AHEyebrow color={ah.rose}>Disclosed</AHEyebrow>
            <Text style={[t.small, {color: ah.text, marginTop: 4}]}>{E[4]}</Text>
          </Animated.View>
        </AHCard>
      </Animated.View>
      <ActionBar color={state === 'yes' ? ah.white : acc} label={state === 'yes' ? 'Noted · preview, nothing booked' : state === 'no' ? 'Declined · reconsider' : 'Accept the offer'} onPress={() => setSt((x) => ({...x, [ei]: state === 'yes' ? undefined : 'yes'}))} />
      <Pick label="Decline" on={state === 'no'} onPress={() => setSt((x) => ({...x, [ei]: 'no'}))} style={{minHeight: 50}} />
      <SampleNote>Sample partners · Every offer shows what Finesse earns · No data is shared with a partner until you accept</SampleNote>
    </View>
  );
}
