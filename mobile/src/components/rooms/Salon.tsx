// The Salon — gold-framed appointment cards, the ritual timeline and "move it to" slots (from the design).
// Sample bookings until the salon partner is connected; confirming here records nothing outside the app.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {ActionBar, Chips, GoldFrame, Monogram, SampleNote, SectionHead} from './shared';

const APPTS: Array<[string, string, string, Array<[string, string]>]> = [
  ['THU · 4:00 PM', 'Silk press & gloss', 'Renée', [['Consult at the mirror', '10 min'], ['Cleanse & treatment', '25 min'], ['Silk press', '50 min'], ['Gloss & finish', '15 min']]],
  ['SAT · 11:00 AM', 'Gel manicure, oxblood', 'Lin', [['Shape & cuticle', '15 min'], ['Hand ritual', '10 min'], ['Colour, 2 coats', '25 min'], ['Oil & set', '5 min']]],
];
const HIM: typeof APPTS = [
  ['THU · 4:00 PM', 'Cut & hot-towel shave', 'Marco', [['Consult at the chair', '10 min'], ['Wash & cut', '35 min'], ['Hot-towel shave', '25 min'], ['Finish & balm', '10 min']]],
  ['SAT · 11:00 AM', 'Manicure & hand ritual', 'Lin', [['Shape & cuticle', '15 min'], ['Hand ritual', '10 min'], ['Buff & matte', '15 min'], ['Oil & set', '5 min']]],
];
const SLOTS = ['FRI 2:30 PM', 'FRI 5:00 PM', 'SAT 9:30 AM'];

export function Salon({side}: {side: Side}) {
  const acc = track[side].acc;
  const list = side === 'her' ? APPTS : HIM;
  const [ai, setAi] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [ok, setOk] = useState<Record<number, boolean>>({});
  const A = list[ai];
  const confirmed = ok[ai];
  return (
    <View style={{gap: 12}}>
      {list.map(([when, what, who], i) => {
        const on = i === ai;
        return (
          <Pressable key={when} onPress={() => { setAi(i); setSlot(null); }} accessibilityRole="button" accessibilityState={{selected: on}} style={{opacity: on ? 1 : 0.55}}>
            <GoldFrame pad={on ? 3 : 1.5}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: on ? '#1C1210' : '#120C0A'}}>
                <Monogram name={who} size={46} ring={on ? acc : deco.brass} />
                <View style={{flex: 1, gap: 2}}>
                  <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, color: deco.brass}}>{when}{ok[i] ? ' · NOTED (PREVIEW)' : ''}</Text>
                  <Text style={{fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, color: deco.cream}}>{what}</Text>
                  <Text style={{fontFamily: fonts.script, fontSize: 15, color: 'rgba(244,232,208,0.75)'}}>with {who}</Text>
                </View>
              </View>
            </GoldFrame>
          </Pressable>
        );
      })}

      <SectionHead>THE RITUAL · {A[1].toUpperCase()}</SectionHead>
      <Animated.View key={ai} entering={FadeIn.duration(350)}>
        {A[3].map(([t, min], i) => (
          <Animated.View key={t} entering={FadeInDown.delay(i * 70).duration(400)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9}}>
            <View style={{alignItems: 'center', width: 26}}>
              <View style={{width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: deco.brassHighlight, alignItems: 'center', justifyContent: 'center'}}>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 10, color: deco.brassHighlight}}>{['I', 'II', 'III', 'IV'][i]}</Text>
              </View>
            </View>
            <Text style={{flex: 1, fontFamily: fonts.body, fontSize: 13, color: deco.cream}}>{t}</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brass}}>{min}</Text>
          </Animated.View>
        ))}
      </Animated.View>

      <SectionHead>MOVE IT TO</SectionHead>
      <Chips options={SLOTS} value={slot ?? ''} onChange={(v) => { setSlot(v === slot ? null : v); setOk((o) => ({...o, [ai]: false})); }} />
      <ActionBar color={confirmed ? deco.brass : acc}
        label={confirmed ? `NOTED · ${slot ?? A[0]} · PREVIEW` : slot ? `MOVE TO ${slot}` : 'CONFIRM APPOINTMENT'}
        onPress={() => setOk((o) => ({...o, [ai]: !confirmed}))} />
      <SampleNote>SAMPLE BOOKINGS · CONFIRMATIONS REACH THE SALON ONCE YOUR SALON PARTNER IS CONNECTED</SampleNote>
    </View>
  );
}
