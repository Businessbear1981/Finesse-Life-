import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { Parchment } from './ui';
import { connectProvider, type Provider } from '../lib/api';
import { C, F } from '../theme';

export type CheckIn = {
  name: string; age: string; city: string; contact: string;
  connected: Partial<Record<Provider, boolean>>;
  answers: Record<string, string>;
  voice: string; posting: string; shopper: string;
};
type StepProps = { d: CheckIn; up: (p: Partial<CheckIn>) => void };

function Field({ label, value, onChange, placeholder, keyboard }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboard?: 'number-pad' | 'email-address' }) {
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.parchmentMuted} keyboardType={keyboard} style={s.input} />
    </View>
  );
}

export function StepRegister({ d, up }: StepProps) {
  const young = d.age !== '' && Number(d.age) < 18;
  return (
    <Parchment title="GUEST REGISTER" meta="FOLIO 0412">
      <Text style={s.h}>Sign in, as you’d like to be known.</Text>
      <View style={{ gap: 18, marginTop: 20 }}>
        <Field label="NAME" value={d.name} onChange={(name) => up({ name: name.slice(0, 40) })} />
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ width: 80 }}><Field label="AGE" value={d.age} onChange={(age) => up({ age: age.replace(/\D/g, '').slice(0, 3) })} keyboard="number-pad" /></View>
          <Field label="CITY" value={d.city} onChange={(city) => up({ city: city.slice(0, 60) })} />
        </View>
        {young && <Text style={s.err}>Members must be 18 or older.</Text>}
        <Field label="EMAIL OR PHONE" value={d.contact} onChange={(contact) => up({ contact })} placeholder="For the front desk only" keyboard="email-address" />
      </View>
    </Parchment>
  );
}

const PROVIDERS: { id: Provider; name: string; perm: string }[] = [
  { id: 'instagram', name: 'Instagram', perm: 'Draft posts · read style' },
  { id: 'tiktok', name: 'TikTok', perm: 'Draft posts · read style' },
  { id: 'pinterest', name: 'Pinterest', perm: 'Read boards only' },
  { id: 'facebook', name: 'Facebook', perm: 'Post events · read style' },
  { id: 'x', name: 'X', perm: 'Draft posts' },
  { id: 'google', name: 'Google Maps', perm: 'Check-ins · map your nights out' },
];

export function StepConnect({ d, up }: StepProps) {
  const toggle = async (p: Provider) => {
    if (d.connected[p]) return up({ connected: { ...d.connected, [p]: false } });
    const ok = await connectProvider(p).catch(() => false);
    up({ connected: { ...d.connected, [p]: ok } });
  };
  return (
    <Parchment title="LETTERS OF INTRODUCTION">
      <Text style={[s.h, { fontSize: 32 }]}>Connect your accounts.</Text>
      <Text style={s.sub}>Nova reads your style, drafts posts and maps your nights out. Nothing is posted without your say.</Text>
      <ScrollView style={{ marginTop: 12, borderTopWidth: 2, borderTopColor: C.parchmentInk }}>
        {PROVIDERS.map((p) => {
          const on = !!d.connected[p.id];
          return (
            <View key={p.id} style={s.row}>
              <View style={[s.dot, on && { backgroundColor: '#3E8A4E' }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowName}>{p.name}</Text>
                <Text style={s.rowPerm}>{p.perm}</Text>
              </View>
              <Pressable onPress={() => toggle(p.id)} accessibilityRole="button" style={[s.connect, on && { backgroundColor: C.parchmentInk }]}>
                <Text style={[s.connectText, on && { color: C.parchment }]}>{on ? 'CONNECTED' : 'CONNECT'}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </Parchment>
  );
}

export const QUESTIONS: { id: string; topic: string; q: string; options: string[] }[] = [
  { id: 'dress_for', topic: 'STYLE', q: 'Who do you dress for?', options: ['Myself', 'The room', 'Someone special', 'The camera'] },
  { id: 'week', topic: 'LIFE', q: 'What does a good week look like?', options: ['Work hard, dine late', 'Travel', 'Quiet and home', 'Social every night'] },
  { id: 'evenings', topic: 'LIFE', q: 'Where are you most evenings?', options: ['Dinner out', 'Events', 'Gym then home', 'Studio or office'] },
  { id: 'walk_in', topic: 'STYLE', q: 'When you walk into a room, what should it say?', options: ['Quiet luxury', 'Old Hollywood', 'Street, elevated', 'Minimal', 'Maximal', 'Sporty'] },
  { id: 'colours', topic: 'STYLE', q: 'Colours you live in?', options: ['Black and gold', 'Neutrals', 'Jewel tones', 'Bright'] },
  { id: 'size_top', topic: 'FIT', q: 'Top size?', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { id: 'size_shoe', topic: 'FIT', q: 'Shoe size (US)?', options: ['5–6', '7–8', '9–10', '11–12', '13+'] },
  { id: 'budget', topic: 'SHOPPING', q: 'Usual spend per piece?', options: ['Under $200', '$200–$800', '$800–$3k', '$3k+'] },
  { id: 'brands', topic: 'SHOPPING', q: 'Houses you return to?', options: ['Heritage', 'Independent', 'Vintage', 'No loyalty'] },
  { id: 'shopper', topic: 'SHOPPING', q: 'How should your shopper work?', options: ['Send me a box', 'Shortlists only', 'Buy within budget', 'Only when I ask'] },
  { id: 'post_often', topic: 'SOCIALS', q: 'How often do you post?', options: ['Daily', 'Weekly', 'Rarely', 'Never, but I want to'] },
  { id: 'post_help', topic: 'SOCIALS', q: 'What should Nova handle?', options: ['Captions', 'Timing', 'Full posts', 'Just ideas'] },
];

export function StepInterview({ d, up, q, color }: StepProps & { q: number; color: string }) {
  const item = QUESTIONS[q];
  const sel = d.answers[item.id];
  return (
    <Parchment title="THE INTERVIEW">
      <View style={s.progress}><View style={{ width: `${((q + 1) / 12) * 100}%`, height: 3, backgroundColor: color }} /></View>
      <Text style={s.topic}>{item.topic} · {q + 1}</Text>
      <Text style={[s.h, { fontSize: 32, marginTop: 6 }]}>{item.q}</Text>
      <View style={s.grid}>
        {item.options.map((o) => (
          <Pressable key={o} onPress={() => up({ answers: { ...d.answers, [item.id]: o } })} accessibilityRole="radio" accessibilityState={{ selected: sel === o }}
            style={[s.cell, sel === o && { backgroundColor: C.oxblood }]}>
            <Text style={[s.cellText, sel === o && { color: C.parchment }]}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </Parchment>
  );
}

const s = StyleSheet.create({
  h: { marginTop: 16, fontFamily: F.displaySemi, fontSize: 38, lineHeight: 40, color: C.parchmentInk },
  sub: { marginTop: 6, fontFamily: F.serif, fontSize: 16, color: C.parchmentMuted },
  fieldLabel: { fontFamily: F.caps, fontSize: 10, letterSpacing: 2.4, color: C.oxblood },
  input: { borderBottomWidth: 2, borderBottomColor: C.parchmentInk, paddingVertical: 4, fontFamily: F.serif, fontSize: 24, color: C.parchmentInk },
  err: { fontFamily: F.sansMed, fontSize: 13, color: '#C0485E' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58, borderBottomWidth: 1, borderBottomColor: 'rgba(26,18,12,0.35)' },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: C.parchmentInk },
  rowName: { fontFamily: F.caps, fontSize: 14, color: C.parchmentInk },
  rowPerm: { fontFamily: F.sans, fontSize: 11, color: C.parchmentMuted },
  connect: { minHeight: 36, paddingHorizontal: 8, justifyContent: 'center', borderWidth: 2, borderColor: C.parchmentInk },
  connectText: { fontFamily: F.mono, fontSize: 9, letterSpacing: 1, color: C.parchmentInk },
  progress: { marginTop: 12, height: 3, backgroundColor: 'rgba(26,18,12,0.15)' },
  topic: { marginTop: 14, fontFamily: F.mono, fontSize: 11, color: C.oxblood },
  grid: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 2, borderLeftWidth: 2, borderColor: C.parchmentInk },
  cell: { width: '50%', minHeight: 62, padding: 12, justifyContent: 'flex-end', borderRightWidth: 2, borderBottomWidth: 2, borderColor: C.parchmentInk },
  cellText: { fontFamily: F.caps, fontSize: 13, color: C.parchmentInk },
});

export { StepStyle, StepStaff } from './CheckInStaff';
