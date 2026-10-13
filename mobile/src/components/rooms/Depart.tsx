// Departures — FLY (the member's trips on a black-and-chrome boarding pass, with Nova's composed itinerary)
// and RIDE (Nova plans the car). Trips live in `trips` (/api/departures/trips); Nova plans through the hub
// (plan · trip / ride) and the plan is kept on the trip. No flight, hotel or ride partner is connected,
// so nothing is searched live or booked — the room says so at that step. Signed out, a labelled sample.
import {useId, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, RadialGradient, Rect, Stop} from 'react-native-svg';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {AHCard, AHDisplay, AHEyebrow, AHInput, AHTitle} from '@/components/ah';
import {createRequest, requestErrorText, resultView} from '@/lib/rooms/nova-requests';
import {
  PARTNER_NOTE, createTrip, dayToIso, deleteTrip, planTrip, readTrips, rideBrief, setTripStatus, tripDate, type Trip,
} from '@/lib/rooms/departures';
import {ActionBar, Chips, SampleNote, Segmented, s} from './shared';
import {LiveGate, Meta, RowBtn, Status} from './live';

type Msg = {ok: boolean; text: string} | null;
const code = (place: string | null) => (place ? place.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3).toUpperCase() || '—' : '—');

/** The boarding pass: nano-black lacquer, a brushed-chrome sheen, a chrome hairline and a perforated tear. */
function BoardingPass({children, stub}: {children: React.ReactNode; stub: React.ReactNode}) {
  const id = `bp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{borderRadius: radius.card, overflow: 'hidden', backgroundColor: '#09090A', shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 28, shadowOffset: {width: 0, height: 20}, elevation: 10}}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#2B2B2E" /><Stop offset="0.4" stopColor="#0B0B0D" /><Stop offset="0.7" stopColor="#1C1C1F" /><Stop offset="1" stopColor="#050506" /></LinearGradient>
          <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0.55"><Stop offset="0.3" stopColor="#fff" stopOpacity={0} /><Stop offset="0.46" stopColor="#fff" stopOpacity={0.09} /><Stop offset="0.6" stopColor="#fff" stopOpacity={0} /></LinearGradient>
          <RadialGradient id={`${id}r`} cx="1" cy="0" r="0.7"><Stop offset="0" stopColor={ah.rose2} stopOpacity={0.22} /><Stop offset="1" stopColor={ah.rose2} stopOpacity={0} /></RadialGradient>
          <LinearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} /><Stop offset="0.5" stopColor="#B9BCC2" stopOpacity={0.12} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.3} /></LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}g)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}r)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}s)`} />
        <Rect x="0.5" y="0.5" width="99.7%" height="99.6%" rx={radius.card} fill="none" stroke={`url(#${id}e)`} strokeWidth={1} />
      </Svg>
      <View style={{padding: 22, gap: 18}}>{children}</View>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <View style={{width: 22, height: 22, borderRadius: 11, marginLeft: -11, backgroundColor: ah.ink}} />
        <View style={{flex: 1, height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.18)'}} />
        <View style={{width: 22, height: 22, borderRadius: 11, marginRight: -11, backgroundColor: ah.ink}} />
      </View>
      <View style={{paddingHorizontal: 22, paddingTop: 16, paddingBottom: 20}}>{stub}</View>
    </View>
  );
}

function Pass({from, fromCity, to, toCity, label, stub}: {from: string; fromCity: string; to: string; toCity: string; label: string; stub: Array<[string, string]>}) {
  return (
    <BoardingPass stub={
      <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
        {stub.map(([k, v]) => (
          <View key={k} style={{gap: 2, flexShrink: 1}}><Meta>{k}</Meta><Text style={{fontFamily: ahFonts.sansSemi, fontSize: 16, color: ah.white}}>{v}</Text></View>
        ))}
      </View>
    }>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={{fontFamily: ahFonts.sansBold, fontSize: 11, letterSpacing: 3.5, color: 'rgba(237,235,231,0.85)'}}>FINESSE</Text>
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 2, color: ah.mute}}>{label}</Text>
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <View style={{flex: 1}}>
          <AHDisplay size={54} accessibilityRole="text">{from}</AHDisplay>
          <Text style={[s.small, {fontSize: 12.5}]} numberOfLines={1}>{fromCity}</Text>
        </View>
        <View style={{alignItems: 'center', gap: 4}}>
          <Icon name="plane" size={22} color={ah.rose} />
          <View style={{width: 44, height: 1, backgroundColor: ah.line2}} />
        </View>
        <View style={{flex: 1, alignItems: 'flex-end'}}>
          <View style={{width: 116}}><AHDisplay size={54} accessibilityRole="text" style={{alignItems: 'flex-end'}}>{to}</AHDisplay></View>
          <Text style={[s.small, {fontSize: 12.5}]} numberOfLines={1}>{toCity}</Text>
        </View>
      </View>
    </BoardingPass>
  );
}

/* ─── Signed out: the labelled sample ─── */
function Sample() {
  return (
    <View style={{gap: 14, marginTop: 14}}>
      <Pass from="ATL" fromCity="Atlanta" to="NAP" toCity="Naples" label="SAMPLE PASS" stub={[['Departs', 'Fri 14 Nov'], ['Party', '2'], ['Status', 'Planned']]} />
      <SampleNote>Sample trip · sign in to compose your own · nothing is booked here</SampleNote>
    </View>
  );
}

/* ─── Compose ─── */
function Compose({acc, onDone}: {acc: string; onDone: (id?: string) => void}) {
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [depart, setDepart] = useState('');
  const [ret, setRet] = useState('');
  const [party, setParty] = useState(2);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const go = async () => {
    if (!destination.trim() || busy) return;
    const d = depart ? dayToIso(depart) : null, r = ret ? dayToIso(ret) : null;
    if ((depart && !d) || (ret && !r)) { setMsg({ok: false, text: 'Write dates as YYYY-MM-DD. Nothing was saved.'}); return; }
    if (d && r && r < d) { setMsg({ok: false, text: 'The return is before departure. Nothing was saved.'}); return; }
    setMsg(null); setBusy('Saving your trip…');
    const c = await createTrip({destination: destination.trim(), origin: origin.trim() || null, depart_at: d, return_at: r, party_size: party, brief: brief.trim() || null});
    if (!c.ok || !c.body.trip) { setBusy(null); setMsg({ok: false, text: failure(c.status, c.body, 'Nothing was saved.')}); return; }
    setBusy('Nova is composing…');
    const p = await planTrip(c.body.trip);
    setBusy(null);
    setMsg(p.ok ? {ok: true, text: 'Composed. Nova’s plan is on the trip and in your Diary.'} : {ok: false, text: p.text});
    setDestination(''); setOrigin(''); setDepart(''); setRet(''); setBrief('');
    onDone(c.body.trip.id);
  };
  return (
    <AHCard style={{gap: 12}}>
      <AHEyebrow>Compose a departure</AHEyebrow>
      <AHInput label="Where to" value={destination} onChangeText={(v) => setDestination(v.slice(0, 120))} placeholder="Amalfi, Tokyo, Miami" />
      <AHInput label="From" value={origin} onChangeText={(v) => setOrigin(v.slice(0, 120))} placeholder="Optional" />
      <View style={{flexDirection: 'row', gap: 10}}>
        <View style={{flex: 1}}><AHInput label="Depart" value={depart} onChangeText={(v) => setDepart(v.replace(/[^\d-]/g, '').slice(0, 10))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View>
        <View style={{flex: 1}}><AHInput label="Return" value={ret} onChangeText={(v) => setRet(v.replace(/[^\d-]/g, '').slice(0, 10))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View>
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <Meta>Party</Meta>
        <RowBtn label="−" a11y="Fewer people" onPress={() => setParty((n) => Math.max(1, n - 1))} />
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 16, color: ah.text, minWidth: 22, textAlign: 'center'}} accessibilityLiveRegion="polite">{party}</Text>
        <RowBtn label="+" a11y="More people" onPress={() => setParty((n) => Math.min(40, n + 1))} />
      </View>
      <AHInput label="The kind of trip" value={brief} onChangeText={(v) => setBrief(v.slice(0, 600))} placeholder="Great food and beaches, one boat day" multiline style={{minHeight: 70, paddingTop: 14}} />
      <ActionBar color={acc} label={busy ?? 'Compose with Nova'} onPress={go} disabled={!!busy || !destination.trim()} />
      <Status msg={msg} />
      <Text style={s.small}>{PARTNER_NOTE}</Text>
    </AHCard>
  );
}

/* ─── Fly: the member's trips ─── */
function Fly({trips, acc, reload}: {trips: Trip[]; acc: string; reload: () => void}) {
  const [sel, setSel] = useState<string | null>(null);
  const [composing, setComposing] = useState(trips.length === 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const labels = trips.map((t, i) => (trips.findIndex((x) => x.destination === t.destination) === i ? t.destination : `${t.destination} ${i + 1}`));
  const idx = Math.max(0, trips.findIndex((t) => t.id === sel));
  const T = trips[idx] ?? null;
  const act = async (fn: () => Promise<string | null>) => {
    setBusy(true); setMsg(null);
    const err = await fn();
    setBusy(false);
    setMsg(err ? {ok: false, text: err} : null);
    setConfirmDelete(false);
    reload();
  };
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 16}}>
      {trips.length ? <Chips options={labels} value={labels[idx]} onChange={(l) => { setSel(trips[labels.indexOf(l)]?.id ?? null); setComposing(false); setMsg(null); }} /> : (
        <AHCard style={{gap: 6}}><AHTitle size={28}>No trips yet.</AHTitle><Text style={s.small}>Compose one — Nova drafts the itinerary and keeps it on the trip.</Text></AHCard>
      )}
      {composing ? <Compose acc={acc} onDone={(id) => { setComposing(false); if (id) setSel(id); reload(); }} /> : <RowBtn label="Compose a departure" onPress={() => setComposing(true)} tone={acc} />}
      {T && !composing ? (
        <Animated.View key={T.id} entering={FadeInDown.duration(450)} style={{gap: 14}}>
          <Pass from={code(T.origin)} fromCity={T.origin ?? 'From anywhere'} to={code(T.destination)} toCity={T.destination}
            label={T.status === 'planned' ? 'PLANNED · NOT BOOKED' : T.status.toUpperCase()}
            stub={[['Departs', tripDate(T.depart_at) || 'Undated'], ['Returns', tripDate(T.return_at) || '—'], ['Party', String(T.party_size)]]} />
          <AHEyebrow style={{marginTop: 4}}>Itinerary · Nova’s plan</AHEyebrow>
          {T.plan ? <Text style={[s.body, {color: ah.text}]}>{T.plan}</Text> : <Text style={s.small}>No plan yet — ask Nova to compose it.</Text>}
          <Text style={s.small}>{PARTNER_NOTE}</Text>
          {T.status !== 'cancelled' ? (
            <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
              <RowBtn label={busy ? 'Working…' : T.plan ? 'Re-plan with Nova' : 'Plan with Nova'} disabled={busy} tone={acc} onPress={() => act(async () => { const r = await planTrip(T); return r.ok ? null : r.text; })} />
              <RowBtn label="Cancel trip" disabled={busy} onPress={() => act(async () => { const r = await setTripStatus(T.id, 'cancelled'); return r.ok ? null : failure(r.status, r.body); })} />
            </View>
          ) : (
            <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
              <RowBtn label="Restore" disabled={busy} onPress={() => act(async () => { const r = await setTripStatus(T.id, 'draft'); return r.ok ? null : failure(r.status, r.body); })} />
              {confirmDelete
                ? <RowBtn label="Delete for good" tone={ah.rose} disabled={busy} onPress={() => act(async () => { const r = await deleteTrip(T.id); setSel(null); return r.ok ? null : failure(r.status, r.body); })} />
                : <RowBtn label="Delete" onPress={() => setConfirmDelete(true)} />}
            </View>
          )}
          <Status msg={msg} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/* ─── Ride: Nova plans the car ─── */
function Ride({acc}: {acc: string}) {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const go = async () => {
    if (!pickup.trim() || !dropoff.trim() || busy) return;
    setBusy(true); setMsg(null); setPlan(null);
    const r = await createRequest({kind: 'plan', title: `Ride to ${dropoff.trim()}`, room: 'departures', details: {topic: 'ride', brief: rideBrief(pickup.trim(), dropoff.trim(), when.trim() || null)}}, true);
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: requestErrorText(r.status, r.body)}); return; }
    const v = resultView(r.data.result);
    setPlan(v.type === 'plan' ? v.text : null);
    setMsg(v.type === 'plan' ? {ok: true, text: 'Nova’s ride plan is in your Diary. No car has been requested.'} : {ok: false, text: 'Nova returned an empty plan. No car has been requested.'});
  };
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
      <AHCard style={{gap: 0}}>
        {([['Pickup', pickup, setPickup, 'Home, the office, the hotel', ah.ok], ['Drop-off', dropoff, setDropoff, 'Dinner, the airport', acc]] as const).map(([k, v, set, ph, c], i) => (
          <View key={k} style={{flexDirection: 'row', gap: 14}}>
            <View style={{alignItems: 'center', width: 12, paddingTop: 40}}>
              <View style={{width: 10, height: 10, borderRadius: i === 0 ? 5 : 2, backgroundColor: c}} />
              {i === 0 ? <View style={{flex: 1, width: 1, marginVertical: 4, backgroundColor: ah.line2}} /> : null}
            </View>
            <View style={{flex: 1, paddingBottom: i === 0 ? 12 : 0}}>
              <AHInput label={k} value={v} onChangeText={(x) => set(x.slice(0, 120))} placeholder={ph} />
            </View>
          </View>
        ))}
      </AHCard>
      <AHInput label="When" value={when} onChangeText={(v) => setWhen(v.slice(0, 60))} placeholder="Tonight 8:15 PM (optional)" />
      <ActionBar color={acc} label={busy ? 'Nova is planning…' : 'Plan the ride with Nova'} onPress={go} disabled={busy || !pickup.trim() || !dropoff.trim()} />
      <Status msg={msg} />
      {plan ? (
        <Animated.View entering={FadeIn.duration(300)} style={{paddingLeft: 14, borderLeftWidth: 2, borderColor: acc, gap: 6}}>
          <Meta>Nova’s ride plan · nothing requested</Meta>
          <Text style={[s.body, {color: ah.text}]}>{plan}</Text>
        </Animated.View>
      ) : null}
      <AHCard pad={16} style={{gap: 6, backgroundColor: 'transparent'}}>
        <Meta color={ah.text}>Ride partners</Meta>
        <Text style={s.small}>No ride partner is connected — your plan is saved, and no car is requested from this room.</Text>
      </AHCard>
    </Animated.View>
  );
}

export function Depart({side}: {side: Side}) {
  const acc = track[side].acc;
  const [tab, setTab] = useState<'fly' | 'ride'>('fly');
  const {live, reload} = useLive<{trips?: Trip[]}>(null, readTrips);
  return (
    <View style={{gap: 16}}>
      <Segmented options={[['fly', 'Fly'], ['ride', 'Ride']]} value={tab} onChange={setTab} />
      <LiveGate live={live} reload={() => void reload()} what="your Departures" signedOut={<Sample />}>
        {(d) => (tab === 'fly' ? <Fly trips={d.trips ?? []} acc={acc} reload={() => void reload(true)} /> : <Ride acc={acc} />)}
      </LiveGate>
    </View>
  );
}

