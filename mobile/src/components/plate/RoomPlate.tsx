// Shared frame for every room, After Hours edition: an editorial header (eyebrow with the room number and
// wing, serif room name, short line) with an honest build-truth chip, then the room's own content.
import {type ReactNode} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {FadeInDown, useReducedMotion} from 'react-native-reanimated';
import {ah, ahFonts} from '@/lib/ah';
import type {Room} from '@/lib/registry';
import {AHCard, AHEyebrow, AHGlow, AHLiveDot, AHPill, AHTitle} from '@/components/ah';
import {IS_STORE_BUILD} from '@/lib/release';

const TRUTH: Record<Room['truthState'], {label: string; tone: string; live?: boolean}> = {
  wired: {label: 'Live', tone: ah.ok, live: true},
  preview: {label: 'Preview', tone: ah.text},
  specified: {label: 'In preparation', tone: ah.mute},
  gated: {label: 'By invitation', tone: ah.rose},
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function RoomPlate({room, children}: {room: Room; children?: ReactNode}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const truth = TRUTH[room.truthState];
  // Store builds carry no build-state labels: only "Live" and the invitation key are shown.
  const showChip = !IS_STORE_BUILD || room.truthState === 'wired' || room.truthState === 'gated';
  const n = String(room.number).padStart(2, '0');

  return (
    <View style={{flex: 1, backgroundColor: ah.ink}}>
      <AHGlow height={380} />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Animated.View entering={reduce ? undefined : FadeInDown.duration(600)} style={styles.head}>
          <AHEyebrow>Room {n} · {cap(room.category)}</AHEyebrow>
          <AHTitle size={room.name.length > 14 ? 40 : 48} style={{marginTop: 10}}>{room.name}</AHTitle>
          <Text style={styles.design}>{room.design}</Text>
          {showChip ? <View style={[styles.chip, {borderColor: room.truthState === 'gated' ? 'rgba(232,180,160,0.4)' : ah.line2}]}>
            {truth.live ? <AHLiveDot color={ah.ok} /> : null}
            <Text style={[styles.chipText, {color: truth.tone}]}>{truth.label}</Text>
          </View> : null}
        </Animated.View>
        <View style={styles.body}>{children}</View>
        <AHPill label="Return to the Lobby" variant="ghost" style={{alignSelf: 'center', marginTop: 36}} onPress={() => router.push('/lobby')} />
      </ScrollView>
    </View>
  );
}

/** Panel used inside rooms (an After Hours card with an optional eyebrow). */
export function Panel({title, children}: {title?: string; children: ReactNode}) {
  return (
    <AHCard style={{gap: 12}}>
      {title ? <AHEyebrow style={{fontSize: 11}}>{title}</AHEyebrow> : null}
      {children}
    </AHCard>
  );
}

export const plateText = StyleSheet.create({
  lead: {fontFamily: ahFonts.serifItalic, fontSize: 24, lineHeight: 28, color: ah.text},
  body: {fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.text, opacity: 0.88},
  small: {fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 19, color: ah.mute},
  label: {fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: ah.mute},
  figure: {fontFamily: ahFonts.serif, fontSize: 44, color: ah.text},
});

const styles = StyleSheet.create({
  page: {paddingBottom: 90, width: '100%', maxWidth: 560, alignSelf: 'center'},
  head: {paddingHorizontal: 20, paddingTop: 28},
  design: {fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.mute, marginTop: 12},
  chip: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 16, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1},
  chipText: {fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase'},
  body: {paddingHorizontal: 20, marginTop: 26, gap: 16},
});
