// Scale (group buys: the price falls as members pledge), The Exchange (member-to-member resale with offers)
// and Embassy (the house's sourcing desk) — After Hours skin. Signed in, all three are live:
//  • Scale: the open group buys from scale_deals (as the web Scale reads them) with a pledge button
//    (POST /api/scale/join — never a charge), and GET /api/scale/pledges with each pledge's honest state;
//    a pledge in `payment_requested` can be paid through Stripe Checkout in the browser (physical goods —
//    allowed in-app). The app never marks anything paid: it re-reads the pledge when you come back.
//  • Exchange: active listings, your listings and offers, list an item, make an offer, "Fair price" via Nova.
//    Accepting an offer needs the payment partner — the app says so instead of pretending.
//  • Embassy: the deal pipeline (scale_deals, mapped as the web Embassy maps it) and "suggest a deal"
//    (POST /api/embassy/deals, reviewed by the house). No partner offer is shown that doesn't exist.
// Signed out, each keeps its labelled sample.
import {useEffect, useRef, useState} from 'react';
import {AppState, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {PLEDGES_PATH, PLEDGE_LABEL, formatCents, formatDate, payPledge, pledgeCopy, type Pledge} from '@/lib/billing';
import {track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {CONDITIONS, EMBASSY_CATEGORIES, EX_CATEGORIES, joinScale, listItem, makeOffer, readEmbassy, readListings, readMyDeals, readScaleDeals, suggestDeal,
  type Listing, type Offer, type PipelineDeal} from '@/lib/rooms/market';
import {ago, dollars, goalPct, parseDollars, savingsPct, type ScaleDeal} from '@/lib/rooms/logic';
import {AHCard, AHChip, AHEyebrow, AHInput, AHTitle} from '@/components/ah';
import {ActionBar, Chips, SampleNote, Segmented} from './shared';
import {ERR_PINK, LiveGate, OK_GREEN, RowBtn, Status} from './live';
import {NovaAskButton} from './NovaAsk';
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
      <OpenDeals side={side} pledges={pledges} onPledged={reload} />
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

/* ─────────────── Scale · the open group buys ─────────────── */

function OpenDeals({side, pledges, onPledged}: {side: Side; pledges: Pledge[]; onPledged: () => Promise<void>}) {
  const {live, reload} = useLive<{deals: ScaleDeal[]}>(null, readScaleDeals);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{id: string; ok: boolean; text: string} | null>(null);
  const joined = new Set(pledges.filter((p) => p.state !== 'cancelled').map((p) => p.deal_id));
  const pledge = async (d: ScaleDeal) => {
    setBusy(d.id); setMsg(null);
    const r = await joinScale(d, side);
    setBusy(null);
    setMsg({id: d.id, ok: r.ok, text: r.ok ? (r.body.message ?? 'You’re in. Nothing is charged.') : failure(r.status, r.body, 'No pledge was made.')});
    if (r.ok) { void reload(true); void onPledged(); }
  };
  return (
    <View style={{gap: 12}}>
      <Head>Open group buys</Head>
      <LiveGate live={live} reload={() => void reload()} what="the group buys">
        {(data) => data.deals.length === 0 ? (
          <AHCard pad={22}><Text style={t.voice}>No group buy is open right now.</Text><Fine style={{marginTop: 8}}>The house opens new ones as members ask — check back soon.</Fine></AHCard>
        ) : (
          <View style={{gap: 12}}>
            {data.deals.map((d) => {
              const pct = goalPct(d.current_count, d.goal_count), off = savingsPct(d.original_price_cents, d.group_price_cents), mine = joined.has(d.id);
              const closes = formatDate(d.deadline);
              return (
                <AHCard key={d.id} pad={18} style={mine ? {borderColor: 'rgba(232,180,160,0.45)'} : undefined}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10}}>
                    <View style={{flex: 1, gap: 3}}>
                      {d.brand ? <Text style={t.eyebrow}>{d.brand}{d.category ? ` · ${d.category}` : ''}</Text> : null}
                      <Text style={t.title}>{d.title}</Text>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                      <Text style={{fontFamily: ahFonts.serif, fontSize: 26, color: ah.text}}>{dollars(d.group_price_cents)}</Text>
                      {off > 0 ? <Text style={[t.num, {fontSize: 12, color: ah.ok}]}>▼ {off}% from {dollars(d.original_price_cents)}</Text> : null}
                    </View>
                  </View>
                  <View style={{gap: 6, marginTop: 12}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <Text style={t.meta}>{d.current_count} of {d.goal_count} members</Text>
                      <Text style={t.meta}>{closes ? `Closes ${closes}` : `${Math.max(0, d.goal_count - d.current_count)} to go`}</Text>
                    </View>
                    <Meter pct={pct} tone={track[side].acc === ah.rose ? ah.rose : ah.white} />
                  </View>
                  <View style={{marginTop: 12}}>
                    {mine ? <Tag tone={ah.rose}>You’re in · no charge</Tag> : <RowBtn label={busy === d.id ? 'One moment…' : `Pledge at ${dollars(d.group_price_cents)}`} onPress={() => void pledge(d)} disabled={busy !== null} tone={ah.rose} />}
                  </View>
                  {msg?.id === d.id ? <View style={{marginTop: 8}}><Status msg={msg} /></View> : null}
                </AHCard>
              );
            })}
          </View>
        )}
      </LiveGate>
    </View>
  );
}

/* ═════════════════════════ The Exchange ═════════════════════════ */

const COND_LABEL = Object.fromEntries(CONDITIONS);

export function Exchange({side}: {side: Side}) {
  const {live, reload} = useLive<{mine: Listing[]; received: Offer[]; made: Offer[]}>(null, readMyDeals);
  return (
    <View style={{gap: 14}}>
      <AHTitle size={32}>Resell with provenance. Offers, not haggling.</AHTitle>
      <LiveGate live={live} reload={() => void reload()} what="the Exchange" signedOut={<ExchangeSample />}>
        {(data) => <ExchangeLive side={side} deals={data} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function ExchangeLive({side, deals, reload}: {side: Side; deals: {mine: Listing[]; received: Offer[]; made: Offer[]}; reload: () => Promise<void>}) {
  const [tab, setTab] = useState<'browse' | 'sell' | 'mine'>('browse');
  return (
    <View style={{gap: 14}}>
      <Segmented options={[['browse', 'Browse'], ['sell', 'Sell'], ['mine', 'My deals']]} value={tab} onChange={setTab} />
      {tab === 'browse' ? <Browse side={side} onOffered={reload} /> : tab === 'sell' ? <Sell side={side} onListed={async () => { await reload(); setTab('mine'); }} /> : <MyDeals deals={deals} />}
    </View>
  );
}

function Browse({side, onOffered}: {side: Side; onOffered: () => Promise<void>}) {
  const [cat, setCat] = useState('All');
  return (
    <View style={{gap: 12}}>
      <Chips options={EX_CATEGORIES} value={cat} onChange={setCat} />
      <BrowseList key={cat} cat={cat} side={side} onOffered={onOffered} />
    </View>
  );
}

function BrowseList({cat, side, onOffered}: {cat: string; side: Side; onOffered: () => Promise<void>}) {
  const {live, reload} = useLive<{listings: Listing[]}>(null, () => readListings(cat));
  const [open, setOpen] = useState<string | null>(null);
  return (
    <LiveGate live={live} reload={() => void reload()} what="the Exchange">
      {(data) => data.listings.length === 0 ? (
        <AHCard pad={22}><Text style={t.voice}>Nothing listed{cat !== 'All' ? ` in ${cat.toLowerCase()}` : ''} yet.</Text><Fine style={{marginTop: 8}}>Be the first — list a piece from the Sell tab.</Fine></AHCard>
      ) : (
        <View style={{gap: 12}}>
          {data.listings.map((l) => <ListingCard key={l.id} l={l} side={side} open={open === l.id} onToggle={() => setOpen(open === l.id ? null : l.id)} onOffered={onOffered} />)}
        </View>
      )}
    </LiveGate>
  );
}

function ListingCard({l, side, open, onToggle, onOffered}: {l: Listing; side: Side; open: boolean; onToggle: () => void; onOffered: () => Promise<void>}) {
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const offer = async () => {
    const cents = parseDollars(amt);
    if (!cents) { setMsg({ok: false, text: 'Enter an offer in dollars.'}); return; }
    setBusy(true); setMsg(null);
    const r = await makeOffer(l, cents, note);
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'No offer was sent.')}); return; }
    setAmt(''); setNote('');
    setMsg({ok: true, text: `Offer of ${dollars(cents)} sent. The seller decides — nothing is charged.`});
    void onOffered();
  };
  return (
    <AHCard pad={18}>
      <View style={{flexDirection: 'row', gap: 14, alignItems: 'center'}}>
        <Tile icon="briefcase" size={56} tone={ah.mute} />
        <View style={{flex: 1, gap: 2}}>
          <Text style={t.eyebrow}>{[l.brand, l.category, l.size].filter(Boolean).join(' · ') || 'Listing'}</Text>
          <Text style={[t.title, {fontSize: 20, lineHeight: 23}]}>{l.title}</Text>
          <Text style={t.small}>{COND_LABEL[l.condition ?? ''] ?? l.condition ?? ''} · listed {ago(l.created_at)}</Text>
        </View>
        <Text style={{fontFamily: ahFonts.serif, fontSize: 24, color: ah.text}}>{dollars(l.asking_price_cents)}</Text>
      </View>
      {l.description ? <Text style={[t.small, {marginTop: 10}]} numberOfLines={open ? undefined : 2}>{l.description}</Text> : null}
      <View style={{flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap'}}>
        <RowBtn label={open ? 'Close' : 'Make an offer'} onPress={onToggle} tone={open ? undefined : ah.rose} />
      </View>
      {open ? (
        <Animated.View entering={FadeIn.duration(250)} style={{gap: 10, marginTop: 12}}>
          <NovaAskButton label="Fair price" kind="price_check" title={`Fair price: ${[l.brand, l.title].filter(Boolean).join(' ')}`} room="exchange"
            details={{title: l.title.slice(0, 160), brand: (l.brand ?? '').slice(0, 80), category: (l.category || 'fashion').toLowerCase(), retail_cents: l.asking_price_cents}} />
          <AHInput value={amt} onChangeText={setAmt} placeholder={`Your offer, $ (asking ${dollars(l.asking_price_cents)})`} keyboardType="decimal-pad" accessibilityLabel="Your offer in dollars" />
          <AHInput value={note} onChangeText={(v) => setNote(v.slice(0, 280))} placeholder="A note to the seller (optional)" accessibilityLabel="Note to the seller" />
          <ActionBar label={busy ? 'Sending…' : 'Send the offer'} color={track[side].acc} onPress={() => void offer()} disabled={busy || !amt.trim()} />
          <Fine>An offer isn’t a payment. If the seller accepts, payment goes through the payment partner — Finesse never holds the money.</Fine>
        </Animated.View>
      ) : null}
      {msg ? <View style={{marginTop: 8}}><Status msg={msg} /></View> : null}
    </AHCard>
  );
}

function Sell({side, onListed}: {side: Side; onListed: () => Promise<void>}) {
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [cond, setCond] = useState('Excellent');
  const [cat, setCat] = useState('Fashion');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const cents = parseDollars(price) ?? 0;
  const list = async () => {
    setBusy(true); setMsg(null);
    const r = await listItem({title, brand, size, condition: CONDITIONS.find(([, l]) => l === cond)?.[0] ?? 'excellent', asking_price_cents: cents, category: cat, description: desc});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was posted.')}); return; }
    setTitle(''); setBrand(''); setSize(''); setPrice(''); setDesc('');
    setMsg({ok: true, text: `Listed.${r.body.seller_receives_cents ? ` You’d receive ${dollars(r.body.seller_receives_cents)} after the house fee.` : ''}`});
    await onListed();
  };
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>List a piece</AHEyebrow>
      <AHInput value={title} onChangeText={setTitle} placeholder="What are you selling?" accessibilityLabel="Title" />
      <AHInput value={brand} onChangeText={setBrand} placeholder="Brand" accessibilityLabel="Brand" />
      <AHInput value={size} onChangeText={setSize} placeholder="Size (optional)" accessibilityLabel="Size" />
      <Chips options={EX_CATEGORIES.filter((c) => c !== 'All')} value={cat} onChange={setCat} />
      <Chips options={CONDITIONS.map(([, l]) => l)} value={cond} onChange={setCond} />
      <AHInput value={price} onChangeText={setPrice} placeholder="Asking price, $" keyboardType="decimal-pad" accessibilityLabel="Asking price in dollars" />
      <AHInput value={desc} onChangeText={(v) => setDesc(v.slice(0, 1000))} placeholder="Provenance — where it’s from, how it was kept" multiline style={{minHeight: 70, paddingTop: 12}} accessibilityLabel="Description" />
      {cents >= 100 ? <Fine>The house fee is 8% ({dollars(Math.floor(cents * 0.08))}); you’d receive {dollars(cents - Math.floor(cents * 0.08))}.</Fine> : null}
      {title.trim() && cents >= 100 ? (
        <NovaAskButton label="Fair price with Nova" kind="price_check" title={`Fair price: ${[brand, title].filter(Boolean).join(' ')}`} room="exchange"
          details={{title: title.trim().slice(0, 160), brand: brand.trim().slice(0, 80), category: cat.toLowerCase(), retail_cents: cents}} />
      ) : null}
      <ActionBar label={busy ? 'Listing…' : 'List it'} color={track[side].acc} onPress={() => void list()} disabled={busy || !title.trim() || cents < 100} />
      <Status msg={msg} />
    </AHCard>
  );
}

function MyDeals({deals}: {deals: {mine: Listing[]; received: Offer[]; made: Offer[]}}) {
  const byListing = (id: string) => deals.received.filter((o) => o.listing_id === id);
  return (
    <View style={{gap: 12}}>
      <Head right={String(deals.mine.length)}>Your listings</Head>
      {deals.mine.length === 0 ? <Fine>You haven’t listed anything yet.</Fine> : deals.mine.map((l) => {
        const offers = byListing(l.id);
        return (
          <AHCard key={l.id} pad={18} style={{gap: 8}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 10}}>
              <View style={{flex: 1, gap: 2}}><Text style={t.eyebrow}>{l.status}</Text><Text style={[t.title, {fontSize: 20}]}>{l.title}</Text></View>
              <Text style={{fontFamily: ahFonts.serif, fontSize: 22, color: ah.text}}>{dollars(l.asking_price_cents)}</Text>
            </View>
            {offers.length === 0 ? <Fine>No offers yet.</Fine> : offers.map((o) => (
              <Row key={o.id} last style={{minHeight: 44, paddingVertical: 6}}>
                <Text style={{flex: 1, fontFamily: ahFonts.serif, fontSize: 20, color: ah.text}}>{dollars(o.offer_price_cents)}</Text>
                <Text style={t.meta}>{o.status} · {ago(o.created_at)}</Text>
              </Row>
            ))}
            {offers.length > 0 ? <Fine>Accepting an offer opens once the payment partner is live — nothing is sold from here yet.</Fine> : null}
          </AHCard>
        );
      })}
      <Head right={String(deals.made.length)}>Your offers</Head>
      {deals.made.length === 0 ? <Fine>You haven’t made an offer yet.</Fine> : deals.made.map((o) => (
        <Row key={o.id}>
          <View style={{flex: 1, gap: 2}}>
            <Text style={[t.title, {fontSize: 19}]}>{o.exchange_listings?.title ?? 'A listing'}</Text>
            <Text style={t.meta}>{o.status} · {ago(o.created_at)}</Text>
          </View>
          <Text style={{fontFamily: ahFonts.serif, fontSize: 20, color: ah.text}}>{dollars(o.offer_price_cents)}</Text>
        </Row>
      ))}
    </View>
  );
}

const PROV: Array<[string, string]> = [['2022 · PARIS', 'Bought new at the flagship'], ['2022–2026', 'Carried 40 times, stored in dust bag'], ['SEP 2026', 'Authenticated by the house'], ['OCT 2026', 'Listed on the Exchange']];
const OFFERS: Array<[string, string, string]> = [['$2,150', 'a member in Paris', 'EXPIRES 2D'], ['$1,980', 'a member in Atlanta', 'EXPIRES 5H']];

function ExchangeSample() {
  return (
    <View style={{gap: 14, marginTop: 14}}>
      <AHCard pad={0}>
        <View style={{height: 180, backgroundColor: ah.ink3, alignItems: 'center', justifyContent: 'center', gap: 10}}>
          <Icon name="briefcase" size={44} color={ah.faint} strokeWidth={1.1} />
        </View>
        <View style={{padding: 20, gap: 6}}>
          <AHChip label="Sample listing" tone="outline" />
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 6}}>
            <AHTitle size={28} italic={false} style={{flexShrink: 1}}>Black leather tote</AHTitle>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 28, color: ah.text}}>$2,400</Text>
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
      <Head>Offers</Head>
      {OFFERS.map(([amt, from, exp]) => (
        <AHCard key={amt} pad={18}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 30, color: ah.text}}>{amt}</Text>
            <Tag>{exp}</Tag>
          </View>
          <Text style={[t.small, {marginTop: 4}]}>from {from}</Text>
        </AHCard>
      ))}
      <SampleNote>Sample listing · signed out · funds are held by the payment partner, never by Finesse</SampleNote>
    </View>
  );
}

/* ═════════════════════════ The Embassy ═════════════════════════ */

const PIPE_TONE: Record<PipelineDeal['status'], string> = {live: ah.ok, pending: ah.warn, review: ah.mute};

export function Embassy({side}: {side: Side}) {
  const {live, reload} = useLive<{deals: PipelineDeal[]}>(null, readEmbassy);
  return (
    <View style={{gap: 14}}>
      <AHTitle size={32}>What the house is sourcing — and what it saves you.</AHTitle>
      <LiveGate live={live} reload={() => void reload()} what="the Embassy" signedOut={<EmbassySample side={side} />}>
        {(data) => <EmbassyLive side={side} deals={data.deals} />}
      </LiveGate>
    </View>
  );
}

function EmbassyLive({side, deals}: {side: Side; deals: PipelineDeal[]}) {
  const [filter, setFilter] = useState('All');
  const list = deals.filter((d) => filter === 'All' || d.status === filter.toLowerCase());
  return (
    <View style={{gap: 14}}>
      <Head right={`${deals.length} deals`}>The pipeline</Head>
      {deals.length > 0 ? <Chips options={['All', 'Live', 'Pending', 'Review']} value={filter} onChange={setFilter} /> : null}
      {deals.length === 0 ? (
        <AHCard pad={22}><Text style={t.voice}>Nothing in the pipeline yet.</Text><Fine style={{marginTop: 8}}>Suggest a deal below — the house reviews every one.</Fine></AHCard>
      ) : list.length === 0 ? <Fine>No {filter.toLowerCase()} deals right now.</Fine> : (
        <View>
          {list.map((d, i) => (
            <Animated.View key={d.id} entering={FadeInDown.duration(250)}>
              <Row last={i === list.length - 1} style={{alignItems: 'flex-start'}}>
                <View style={{flex: 1, gap: 3}}>
                  <Text style={t.eyebrow}>{d.brand} · {d.category} · {d.tier}</Text>
                  <Text style={[t.title, {fontSize: 20, lineHeight: 23}]}>{d.item}</Text>
                  <Text style={t.small}>{dollars(d.members_cents)} for members · {dollars(d.retail_cents)} retail · {d.current}/{d.goal} in</Text>
                </View>
                <View style={{alignItems: 'flex-end', gap: 6}}>
                  <Text style={{fontFamily: ahFonts.serif, fontSize: 22, color: d.savings > 0 ? ah.ok : ah.text}}>−{d.savings}%</Text>
                  <Tag tone={PIPE_TONE[d.status]}>{d.status}</Tag>
                </View>
              </Row>
            </Animated.View>
          ))}
        </View>
      )}
      <SuggestDeal side={side} />
      <Fine>Every deal is sourced by the house and opens as a group buy in Scale. Partners never see your data.</Fine>
    </View>
  );
}

function SuggestDeal({side}: {side: Side}) {
  const [brand, setBrand] = useState('');
  const [item, setItem] = useState('');
  const [retail, setRetail] = useState('');
  const [cat, setCat] = useState('Bags');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const send = async () => {
    setBusy(true); setMsg(null);
    const r = await suggestDeal({brand, item, category: cat, retail: (parseDollars(retail) ?? 0) / 100 || undefined});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was submitted.')}); return; }
    setBrand(''); setItem(''); setRetail('');
    setMsg({ok: true, text: r.body.message ?? 'Submitted for review.'});
  };
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>Suggest a deal</AHEyebrow>
      <AHInput value={brand} onChangeText={setBrand} placeholder="Brand" accessibilityLabel="Brand" />
      <AHInput value={item} onChangeText={setItem} placeholder="The piece" accessibilityLabel="The piece" />
      <AHInput value={retail} onChangeText={setRetail} placeholder="Retail price, $ (optional)" keyboardType="decimal-pad" accessibilityLabel="Retail price in dollars" />
      <Chips options={EMBASSY_CATEGORIES} value={cat} onChange={setCat} />
      <ActionBar label={busy ? 'Sending…' : 'Send to the house'} color={track[side].acc} onPress={() => void send()} disabled={busy || !brand.trim() || !item.trim()} />
      <Status msg={msg} />
    </AHCard>
  );
}

const ENVOYS: Array<[string, string, string]> = [
  ['Maison Aurel', 'Heritage leather', 'Private fitting for the Aurel evening bag, with a monogram on the house.'],
  ['Atelier Nuit', 'Eveningwear', 'First look at the winter gown edit, two days before release.'],
];

function EmbassySample({side: _side}: {side: Side}) {
  return (
    <View style={{gap: 12, marginTop: 14}}>
      {ENVOYS.map(([name, line, offer]) => (
        <AHCard key={name} pad={20} style={{gap: 6}}>
          <AHEyebrow>Sample partner · {line}</AHEyebrow>
          <AHTitle size={28} italic={false}>{name}</AHTitle>
          <Text style={t.voice}>{offer}</Text>
        </AHCard>
      ))}
      <SampleNote>Sample partners · signed out · every offer shows what Finesse earns · no data is shared until you accept</SampleNote>
    </View>
  );
}
