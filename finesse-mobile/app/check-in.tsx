import { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CTA } from '../src/components/ui';
import { StepRegister, StepConnect, StepInterview, StepStyle, StepStaff, type CheckIn } from '../src/components/CheckInSteps';
import { saveCheckIn, saveProfile } from '../src/lib/api';
import { setSession, useSession } from '../src/lib/session';
import { C, F, accent } from '../src/theme';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** 03–07 Check-in: register → connect accounts → interview → style read → Nova + shopper. */
export default function CheckInScreen() {
  const { side } = useSession();
  const [step, setStep] = useState(0);
  const [q, setQ] = useState(0);
  const [d, setD] = useState<CheckIn>({ name: '', age: '', city: '', contact: '', connected: {}, answers: {}, voice: 'Discreet', posting: 'Ask first', shopper: side === 'him' ? 'Hart' : 'Celeste' });
  const up = (p: Partial<CheckIn>) => setD((x) => ({ ...x, ...p }));
  const color = accent(side);

  const canNext = step === 0 ? d.name.trim().length >= 2 && Number(d.age) >= 18 && d.city.trim().length >= 2 : true;
  const back = () => (step === 0 ? router.replace('/side') : step === 2 && q > 0 ? setQ(q - 1) : setStep(step - 1));

  const next = async () => {
    if (step === 0) setSession({ name: d.name.trim(), city: d.city.trim() });
    if (step === 2 && q < 11) return setQ(q + 1);
    if (step < 4) return setStep(step + 1);
    await saveProfile({ display_name: d.name.trim(), gender: side === 'him' ? 'masculine' : 'feminine', age: Number(d.age), city: d.city.trim(), vibe: d.answers.walk_in, intake_complete: true }).catch(() => {});
    await saveCheckIn({ answers: d.answers, nova: { voice: d.voice, posting: d.posting }, shopper: { name: d.shopper } }).catch(() => {});
    router.replace('/lobby');
  };

  const label = step === 0 ? 'SIGN & CONTINUE'
    : step === 1 ? `CONTINUE · ${Object.values(d.connected).filter(Boolean).length} CONNECTED`
    : step === 2 ? (q < 11 ? 'NEXT QUESTION' : 'FINISH INTERVIEW')
    : step === 3 ? 'THAT’S ME' : 'ENTER THE LOBBY';

  return (
    <SafeAreaView style={s.page}>
      <View style={s.top}>
        <Pressable onPress={back} hitSlop={12}><Text style={s.back}>← {step === 0 ? 'Change side' : 'Back'}</Text></Pressable>
        <Text style={s.count}>{ROMAN[step]} / V{step === 2 ? ` · Q${q + 1} OF 12` : ''}</Text>
      </View>
      <View style={{ flex: 1, marginTop: 14 }}>
        {step === 0 && <StepRegister d={d} up={up} />}
        {step === 1 && <StepConnect d={d} up={up} />}
        {step === 2 && <StepInterview d={d} up={up} q={q} color={color} />}
        {step === 3 && <StepStyle color={color} />}
        {step === 4 && <StepStaff d={d} up={up} color={color} />}
      </View>
      <CTA label={label} onPress={next} disabled={!canNext} color={step === 4 ? undefined : color} gold={step === 4} style={{ marginTop: 14 }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.ink, paddingHorizontal: 16, paddingBottom: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingTop: 6 },
  back: { fontFamily: F.sans, fontSize: 14, color: C.creamMuted },
  count: { fontFamily: F.capsSemi, fontSize: 12, letterSpacing: 2.4, color: C.gold },
});
