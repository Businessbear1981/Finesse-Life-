// The Salon — the member's own appointment *requests*, read from /api/salon/bookings. A request says
// "Requested — the salon confirms" until a salon partner confirms it (none is connected yet), so nothing here is
// presented as booked. Members can request, withdraw a pending request, and ask Nova to plan an appointment
// (/api/nova/requests, kind 'plan', topic 'appointment' — options only, nothing reserved).
// Signed out, a labelled sample of the appointment cards and ritual timeline is shown.
import {useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {useLive, failure} from '@/lib/live';
import {AHCard, AHEyebrow, AHInput} from '@/components/ah';
import {SALON_STATUS, cancelBooking, localDay, prettyWhen, readBookings, requestBooking, splitBookings, type SalonBooking} from '@/lib/rooms/salon';
import {ActionBar, Monogram, SampleNote, s} from './shared';
import {LiveGate, Meta, NumRow, OK_GREEN, RowBtn, Status} from './live';
import {PlanWithNova} from './plan-with-nova';

const APPTS: Array<[string, string, string, Array<[string, string]>]> = [
  ['THU · 4:00 PM', 'Silk press & gloss', 'Renée', [['Consult at the mirror', '10 min'], ['Cleanse & treatment', '25 min'], ['Silk press', '50 min'], ['Gloss & finish', '15 min']]],
  ['SAT · 11:00 AM', 'Gel manicure, oxblood', 'Lin', [['Shape & cuticle', '15 min'], ['Hand ritual', '10 min'], ['Colour, 2 coats', '25 min'], ['Oil & set', '5 min']]],
];
const HIM: typeof APPTS = [
  ['THU · 4:00 PM', 'Cut & hot-towel shave', 'Marco', [['Consult at the chair', '10 min'], ['Wash & cut', '35 min'], ['Hot-towel shave', '25 min'], ['Finish & balm', '10 min']]],
  ['SAT · 11:00 AM', 'Manicure & hand ritual', 'Lin', [['Shape & cuticle', '15 min'], ['Hand ritual', '10 min'], ['Buff & matte', '15 min'], ['Oil & set', '5 min']]],
];
const pretty = (x: string) => x.replace(/^([A-Z])([A-Z]+)/, (_, a: string, b: string) => a + b.toLowerCase());

export function Salon({side}: {side: Side}) {
  const acc = track[side].acc;
  const {live, reload} = useLive<{bookings: SalonBooking[]}>('salon:bookings', readBookings);
  return (
    <View style={{gap: 16}}>
      <LiveGate live={live} reload={() => void reload()} what="your salon requests" signedOut={<SalonSample side={side} />}>
        {(data) => <SalonLive bookings={data.bookings ?? []} side={side} acc={acc} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function BookingRow({b, acc, busy, onCancel, last}: {b: SalonBooking; acc: string; busy: boolean; onCancel: () => void; last?: boolean}) {
  const confirmed = b.status === 'confirmed';
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderColor: ah.line}}>
      <Monogram name={b.service_name} size={48} ring={confirmed ? OK_GREEN : b.status === 'pending' ? acc : ah.line2} />
      <View style={{flex: 1, gap: 3}}>
        <Meta color={confirmed ? OK_GREEN : ah.mute}>{prettyWhen(b.requested_date, b.requested_time)}</Meta>
        <Text style={{fontFamily: ahFonts.serif, fontSize: 22, lineHeight: 25, color: ah.text}}>{b.service_name}</Text>
        <Text style={[s.small, {color: confirmed ? OK_GREEN : b.status === 'pending' ? ah.blush : ah.faint}]}>{SALON_STATUS[b.status] ?? b.status}</Text>
        {b.notes ? <Text style={s.small} numberOfLines={2}>{b.notes}</Text> : null}
      </View>
      {b.status === 'pending' ? <RowBtn label="Withdraw" a11y={`Withdraw the request for ${b.service_name}`} onPress={onCancel} disabled={busy} /> : null}
    </View>
  );
}

const nextDays = () => Array.from({length: 14}, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; });

function SalonLive({bookings, side, acc, reload}: {bookings: SalonBooking[]; side: Side; acc: string; reload: () => Promise<void>}) {
  const {upcoming, history} = splitBookings(bookings, localDay(new Date()));
  const [days] = useState(nextDays);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [service, setService] = useState('');
  const [notes, setNotes] = useState('');
  const [day, setDay] = useState(0);
  const [mins, setMins] = useState(11 * 60);
  const hh = Math.floor(mins / 60), mm = mins % 60;
  const timeLabel = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;

  const cancel = async (b: SalonBooking) => {
    setBusy(true); setMsg(null);
    const r = await cancelBooking(b.id);
    setBusy(false);
    setMsg(r.ok ? {ok: true, text: `Withdrawn. “${b.service_name}” was never booked, so nothing else changes.`} : {ok: false, text: failure(r.status, r.body)});
    void reload();
  };
  const send = async () => {
    if (!service.trim() || busy) return;
    setBusy(true); setMsg(null);
    const r = await requestBooking({
      service_name: service.trim(), requested_date: localDay(days[day]), requested_time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      notes: notes.trim() || undefined, category: side === 'him' ? 'grooming' : 'beauty', edition: side === 'him' ? 'carpe_diem' : 'finesse',
    });
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was requested.')}); return; }
    setService(''); setNotes('');
    setMsg({ok: true, text: 'Requested — the salon confirms. Nothing is booked until they do.'});
    void reload();
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 16}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <AHEyebrow>Upcoming</AHEyebrow>
        <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.mute}}>{bookings.filter((b) => b.status === 'pending').length} requested · {bookings.filter((b) => b.status === 'confirmed').length} confirmed</Text>
      </View>
      <AHCard pad={0} style={{paddingHorizontal: 16}}>
        {upcoming.length === 0
          ? <Text style={{paddingVertical: 26, fontFamily: ahFonts.serifItalic, fontSize: 20, color: ah.mute, textAlign: 'center'}}>No appointments requested yet.</Text>
          : upcoming.map((b, i) => <BookingRow key={b.id} b={b} acc={acc} busy={busy} onCancel={() => cancel(b)} last={i === upcoming.length - 1} />)}
      </AHCard>

      <AHCard style={{gap: 12}}>
        <Meta>Request an appointment</Meta>
        <AHInput value={service} onChangeText={(v) => setService(v.slice(0, 120))} placeholder={side === 'him' ? 'Cut & hot-towel shave' : 'Silk press & gloss'} accessibilityLabel="Service" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
          {days.map((d, i) => {
            const on = i === day;
            return (
              <Pressable key={i} onPress={() => setDay(i)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={d.toDateString()}
                style={{minWidth: 56, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? ah.white : 'rgba(255,255,255,0.05)'}}>
                <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, color: on ? '#000' : ah.mute}}>{d.toLocaleDateString([], {weekday: 'short'})}</Text>
                <Text style={{fontFamily: ahFonts.serif, fontSize: 20, color: on ? '#000' : ah.text}}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <RowBtn label="−30" a11y="Thirty minutes earlier" onPress={() => setMins((m) => Math.max(7 * 60, m - 30))} />
          <Text style={{flex: 1, textAlign: 'center', fontFamily: ahFonts.serif, fontSize: 26, color: ah.text}} accessibilityLabel={`Time ${timeLabel}`}>{timeLabel}</Text>
          <RowBtn label="+30" a11y="Thirty minutes later" onPress={() => setMins((m) => Math.min(21 * 60, m + 30))} />
        </View>
        <AHInput value={notes} onChangeText={(v) => setNotes(v.slice(0, 500))} placeholder="Notes for the salon (optional)" accessibilityLabel="Notes" />
        <ActionBar label={busy ? 'Sending…' : 'Send the request'} color={acc} onPress={send} disabled={busy || !service.trim()} />
        <Text style={s.small}>A request, not a booking. It reaches a salon once a salon partner is connected; until then it stays “Requested — the salon confirms”.</Text>
      </AHCard>
      <Status msg={msg} />

      <PlanWithNova room="salon" topic="appointment" title={side === 'him' ? 'Grooming' : 'Salon'} label="Plan my appointment · Nova" acc={acc} withWhen
        placeholder={side === 'him' ? 'Cut and beard sculpt before Friday, near the office' : 'Gloss and blow-out before Saturday’s dinner'} />

      {history.length ? (
        <View style={{gap: 8}}>
          <Pressable onPress={() => setShowHistory((x) => !x)} accessibilityRole="button" accessibilityState={{expanded: showHistory}} style={{minHeight: 44, justifyContent: 'center'}}>
            <AHEyebrow>{showHistory ? 'Hide history' : `History · ${history.length}`}</AHEyebrow>
          </Pressable>
          {showHistory ? (
            <AHCard pad={0} style={{paddingHorizontal: 16}}>
              {history.map((b, i) => <BookingRow key={b.id} b={b} acc={acc} busy={busy} onCancel={() => cancel(b)} last={i === history.length - 1} />)}
            </AHCard>
          ) : null}
        </View>
      ) : null}
      <SampleNote>Your requests · a salon confirms them · nothing is booked or charged here</SampleNote>
    </Animated.View>
  );
}

function SalonSample({side}: {side: Side}) {
  const acc = track[side].acc;
  const list = side === 'her' ? APPTS : HIM;
  const [ai, setAi] = useState(0);
  const A = list[ai];
  return (
    <View style={{gap: 16, opacity: 0.92}}>
      <View style={{gap: 10}}>
        {list.map(([when, what, who], i) => {
          const on = i === ai;
          return (
            <Pressable key={when} onPress={() => setAi(i)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`Sample: ${what} with ${who}, ${pretty(when)}`}
              style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, borderWidth: on ? 1.5 : 1,
                borderColor: on ? (acc === ah.rose ? 'rgba(232,180,160,0.7)' : 'rgba(255,255,255,0.6)') : ah.line, backgroundColor: on ? ah.ink3 : ah.ink2, opacity: on ? 1 : pressed ? 0.8 : 0.7})}>
              <Monogram name={who} size={52} ring={on ? acc : ah.line2} />
              <View style={{flex: 1, gap: 2}}>
                <Meta>{pretty(when)}</Meta>
                <Text style={{fontFamily: ahFonts.serif, fontSize: 24, lineHeight: 27, color: ah.text}}>{what}</Text>
                <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 16, color: ah.mute}}>with {who}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <AHEyebrow style={{marginTop: 8}}>The ritual · {A[1]}</AHEyebrow>
      <Animated.View key={ai} entering={FadeIn.duration(350)}>
        {A[3].map(([t, min], i) => (
          <Animated.View key={t} entering={FadeInDown.delay(i * 70).duration(400)}>
            <NumRow n={i + 1} title={t} last={i === A[3].length - 1} right={<Text style={{fontFamily: ahFonts.sansMedium, fontSize: 12.5, color: ah.mute}}>{min}</Text>} />
          </Animated.View>
        ))}
      </Animated.View>
      <SampleNote>Sample appointments · not yours · sign in to request your own</SampleNote>
    </View>
  );
}
