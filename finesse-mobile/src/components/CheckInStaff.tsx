import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { Label, Seg } from './ui';
import { getStyleRead, type StyleRead } from '../lib/api';
import type { CheckIn } from './CheckInSteps';
import { C, F } from '../theme';

/** 06 Your style, read — from connected accounts. Tap a tag to drop it (Nova learns from the edit). */
export function StepStyle({ color }: { color: string }) {
  const [r, setR] = useState<StyleRead | null>(null);
  const [dropped, setDropped] = useState<string[]>([]);
  useEffect(() => { getStyleRead().then(setR); }, []);
  if (!r) return <Text style={s.loading}>Reading your feed…</Text>;
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 8, gap: 14 }}>
      <Label color={C.goldHi}>FROM {r.accounts} ACCOUNTS · {r.posts} POSTS</Label>
      <Text style={s.h}>{r.headline} <Text style={{ color }}>{r.accentWord}</Text></Text>
      <View style={s.feed}>
        {Array.from({ length: 6 }, (_, i) => <View key={i} style={s.feedCell} />)}
      </View>
      <Label>PALETTE</Label>
      <View style={s.palette}>{r.palette.map((c) => <View key={c} style={{ flex: 1, height: 40, backgroundColor: c }} />)}</View>
      <Label>SIGNATURES</Label>
      <View style={s.tags}>
        {r.tags.map((t) => {
          const off = dropped.includes(t);
          return (
            <Pressable key={t} onPress={() => setDropped((d) => (off ? d.filter((x) => x !== t) : [...d, t]))} accessibilityRole="button" accessibilityState={{ selected: !off }}
              style={[s.tag, off && { opacity: 0.4 }]}>
              <Text style={[s.tagText, off && { textDecorationLine: 'line-through' }]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.hint}>Wrong? Tap anything to correct it. Nova learns from the edit.</Text>
    </ScrollView>
  );
}

/** 07 Meet your staff — create Nova (voice, posting rule) and the personal shopper. */
export function StepStaff({ d, up, color }: { d: CheckIn; up: (p: Partial<CheckIn>) => void; color: string }) {
  return (
    <ScrollView contentContainerStyle={{ gap: 12 }}>
      <Text style={[s.h, { paddingHorizontal: 8 }]}>Your staff.</Text>
      <View style={[s.card, { borderColor: C.brass }]}>
        <View style={s.who}>
          <View style={[s.avatar, { borderColor: C.gold }]} />
          <View><Label>CONCIERGE</Label><Text style={s.name}>Nova</Text></View>
        </View>
        <Text style={s.small}>VOICE</Text>
        <Seg options={['Discreet', 'Warm', 'Direct']} value={d.voice} onChange={(voice) => up({ voice })} />
        <Text style={s.small}>POSTING ON YOUR SOCIALS</Text>
        <Seg options={['Drafts only', 'Ask first', 'Auto-post']} value={d.posting} onChange={(posting) => up({ posting })} />
      </View>
      <View style={[s.card, { borderColor: color, backgroundColor: '#1E0710' }]}>
        <View style={s.who}>
          <View style={[s.avatar, { borderColor: color }]} />
          <View style={{ flex: 1 }}>
            <Label color={color}>PERSONAL SHOPPER</Label>
            <TextInput value={d.shopper} onChangeText={(shopper) => up({ shopper: shopper.slice(0, 24) })} style={s.nameInput} accessibilityLabel="Shopper name" />
          </View>
        </View>
        <Text style={s.body}>Shops from your interview: sizes, budget and the houses you return to. Sends a box for approval every Friday.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  loading: { padding: 24, fontFamily: F.serif, fontSize: 20, color: C.creamMuted },
  h: { fontFamily: F.display, fontSize: 40, lineHeight: 42, color: C.cream },
  feed: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4, backgroundColor: C.brassDeep },
  feedCell: { width: '32%', aspectRatio: 1, backgroundColor: '#17110E' },
  palette: { flexDirection: 'row', borderWidth: 2, borderColor: C.brass },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: C.brass },
  tagText: { fontFamily: F.sans, fontSize: 13, color: C.cream },
  hint: { fontFamily: F.sans, fontSize: 13, color: C.creamMuted },
  card: { padding: 16, gap: 10, borderWidth: 2, backgroundColor: '#120C0A' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, backgroundColor: '#17110E' },
  name: { fontFamily: F.displaySemi, fontSize: 28, color: C.cream },
  nameInput: { fontFamily: F.displaySemi, fontSize: 28, color: C.cream, paddingVertical: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(255,143,169,0.5)' },
  small: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2, color: 'rgba(244,232,208,0.65)' },
  body: { fontFamily: F.sans, fontSize: 13, lineHeight: 19, color: 'rgba(244,232,208,0.85)' },
});
