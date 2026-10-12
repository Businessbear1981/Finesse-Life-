// The Salon — appointment cards, the ritual timeline and "move it to" slots (from the design).
// Sample bookings until the salon partner is connected; confirming here records nothing outside the app.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {AHEyebrow} from '@/components/ah';
import {ActionBar, Chips, Monogram, SampleNote} from './shared';
import {Meta, NumRow} from './live';

const APPTS: Array<[string, string, string, Array<[string, string]>]> = [
  ['THU · 4:00 PM', 'Silk press & gloss', 'Renée', [['Consult at the mirror', '10 min'], ['Cleanse & treatment', '25 min'], ['Silk press', '50 min'], ['Gloss & finish', '15 min']]],
  ['SAT · 11:00 AM', 'Gel manicure, oxblood', 'Lin', [['Shape & cuticle', '15 min'], ['Hand ritual', '10 min'], ['Colour, 2 coats', '25 min'], ['Oil & set', '5 min']]],
];
const HIM: typeof APPTS = [
  ['THU · 4:00 PM', 'Cut & hot-towel shave', 'Marco', [['Consult at the chair', '10 min'], ['Wash & cut', '35 min'], ['Hot-towel shave', '25 min'], ['Finish & balm', '10 min']]],
  ['SAT · 11:00 AM', 'Manicure & hand ritual', 'Lin', [['Shape & cuticle', '15 min'], ['Hand ritual', '10 min'], ['Buff & matte', '15 min'], ['Oil & set', '5 min']]],
];
const SLOTS = ['FRI 2:30 PM', 'FRI 5:00 PM', 'SAT 9:30 AM'];
const pretty = (x: string) => x.replace(/^([A-Z])([A-Z]+)/, (_, a: string, b: string) => a + b.toLowerCase());

export function Salon({side}: {side: Side}) {
  const acc = track[side].acc;
  const list = side === 'her' ? APPTS : HIM;
  const [ai, setAi] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [ok, setOk] = useState<Record<number, boolean>>({});
  const A = list[ai];
  const confirmed = ok[ai];
  return (
    <View style={{gap: 16}}>
      <View style={{gap: 10}}>
        {list.map(([when, what, who], i) => {
          const on = i === ai;
          return (
            <Pressable key={when} onPress={() => { setAi(i); setSlot(null); }} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${what} with ${who}, ${pretty(when)}`}
              style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, borderWidth: on ? 1.5 : 1,
                borderColor: on ? (acc === ah.rose ? 'rgba(232,180,160,0.7)' : 'rgba(255,255,255,0.6)') : ah.line, backgroundColor: on ? ah.ink3 : ah.ink2, opacity: on ? 1 : pressed ? 0.8 : 0.7})}>
              <Monogram name={who} size={52} ring={on ? acc : ah.line2} />
              <View style={{flex: 1, gap: 2}}>
                <Meta color={ok[i] ? ah.ok : ah.mute}>{pretty(when)}{ok[i] ? ' · noted (preview)' : ''}</Meta>
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
            <NumRow n={i + 1} title={t} last={i === A[3].length - 1}
              right={<Text style={{fontFamily: ahFonts.sansMedium, fontSize: 12.5, color: ah.mute}}>{min}</Text>} />
          </Animated.View>
        ))}
      </Animated.View>

      <AHEyebrow style={{marginTop: 8}}>Move it to</AHEyebrow>
      <Chips options={SLOTS} value={slot ?? ''} onChange={(v) => { setSlot(v === slot ? null : v); setOk((o) => ({...o, [ai]: false})); }} />
      <ActionBar color={confirmed ? ah.platinum : acc}
        label={confirmed ? `Noted · ${pretty(slot ?? A[0])} · preview` : slot ? `Move to ${pretty(slot)}` : 'Confirm appointment'}
        onPress={() => setOk((o) => ({...o, [ai]: !confirmed}))} />
      <SampleNote>Sample bookings · confirmations reach the salon once your salon partner is connected</SampleNote>
    </View>
  );
}
