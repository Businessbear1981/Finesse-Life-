// Shared frame for every room: a deco proscenium with the room's number and name, an honest
// build-truth badge, then the room's own content. Each room keeps its own scene below.
import {type ReactNode, useEffect} from 'react';
import {ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {Link} from 'expo-router';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText} from 'react-native-svg';
import {deco, easeCine, fonts, polar} from '@/lib/deco';
import type {Room} from '@/lib/registry';

const TRUTH: Record<Room['truthState'], {label: string; tone: string}> = {
  wired: {label: 'LIVE', tone: deco.brassLight},
  preview: {label: 'PREVIEW', tone: deco.lamp},
  specified: {label: 'IN PREPARATION', tone: deco.brass},
  gated: {label: 'BY INVITATION', tone: deco.pink},
};

export function RoomPlate({room, children}: {room: Room; children?: ReactNode}) {
  const {width} = useWindowDimensions();
  const W = Math.min(width, 520);
  const arrive = useSharedValue(0);
  useEffect(() => { arrive.value = withTiming(1, {duration: 900, easing: easeCine}); }, [arrive]);
  const headStyle = useAnimatedStyle(() => ({opacity: arrive.value, transform: [{translateY: 12 * (1 - arrive.value)}]}));
  const truth = TRUTH[room.truthState];
  const n = String(room.number).padStart(2, '0');

  return (
    <ScrollView style={{backgroundColor: deco.ink}} contentContainerStyle={styles.page}>
      <Animated.View style={[{width: W, alignSelf: 'center'}, headStyle]}>
        <Svg width={W} height={W * 0.62} viewBox="0 0 360 224">
          <Defs>
            <LinearGradient id="pb" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={deco.brassWhite} />
              <Stop offset="0.5" stopColor={deco.brass} />
              <Stop offset="1" stopColor={deco.brassShadow} />
            </LinearGradient>
            <RadialGradient id="pl" cx="180" cy="210" r="190" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={deco.lamp} stopOpacity={0.32} />
              <Stop offset="1" stopColor={deco.ink} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={360} height={224} fill="url(#pl)" />
          {Array.from({length: 17}, (_, i) => {
            const a = -80 + i * 10; const p = polar(180, 214, 196, a), q = polar(180, 214, 70, a);
            return <Path key={i} d={`M${q.x} ${q.y} L${p.x} ${p.y}`} stroke={deco.champagne} strokeOpacity={0.12} />;
          })}
          {/* stepped proscenium */}
          <Path d="M20 222 L20 92 L44 92 L44 68 L72 68 L72 46 L288 46 L288 68 L316 68 L316 92 L340 92 L340 222" fill="none" stroke="url(#pb)" strokeWidth={2} />
          <Path d="M34 222 L34 104 L56 104 L56 80 L84 80 L84 58 L276 58 L276 80 L304 80 L304 104 L326 104 L326 222" fill="none" stroke={deco.brass} strokeOpacity={0.4} />
          <Path d="M180 30 L190 40 L180 50 L170 40 Z" fill={deco.ink} stroke={deco.brassHighlight} />
          <Path d="M120 40 L160 40 M200 40 L240 40" stroke={deco.brass} strokeOpacity={0.5} />
          <SvgText x={180} y={104} fontSize={11} letterSpacing={6} fill={deco.brass} fontFamily={fonts.label} textAnchor="middle">{`ROOM ${n}`}</SvgText>
          <SvgText x={180} y={150} fontSize={room.name.length > 16 ? 30 : 38} fill={deco.brassLight} fontFamily={fonts.display} textAnchor="middle">{room.name}</SvgText>
          <Path d="M130 172 L172 172 M188 172 L230 172" stroke={deco.brass} strokeOpacity={0.5} />
          <Path d="M180 168 L184 172 L180 176 L176 172 Z" fill={deco.brassHighlight} />
        </Svg>
      </Animated.View>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, {borderColor: truth.tone}]}><Text style={[styles.badgeText, {color: truth.tone}]}>{truth.label}</Text></View>
      </View>
      <Text style={styles.design}>{room.design}</Text>
      <View style={styles.body}>{children}</View>
      <Link href="/lobby" style={styles.back}>RETURN TO THE LOBBY</Link>
    </ScrollView>
  );
}

/** Brass-edged panel used inside rooms. */
export function Panel({title, children}: {title?: string; children: ReactNode}) {
  return (
    <View style={styles.panel}>
      {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export const plateText = StyleSheet.create({
  lead: {fontFamily: fonts.display, fontSize: 22, lineHeight: 30, color: deco.cream},
  body: {fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: deco.cream, opacity: 0.85},
  small: {fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: deco.cream, opacity: 0.7},
  label: {fontFamily: fonts.label, fontSize: 10, letterSpacing: 4, color: deco.brass},
  figure: {fontFamily: fonts.display, fontSize: 44, color: deco.brassLight},
});

const styles = StyleSheet.create({
  page: {paddingBottom: 90},
  badgeRow: {alignItems: 'center', marginTop: -6},
  badge: {borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5},
  badgeText: {fontFamily: fonts.label, fontSize: 9, letterSpacing: 4},
  design: {fontFamily: fonts.display, fontSize: 17, lineHeight: 25, color: deco.brassHighlight, textAlign: 'center', paddingHorizontal: 32, marginTop: 16},
  body: {paddingHorizontal: 20, marginTop: 22, gap: 16},
  panel: {borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)', backgroundColor: 'rgba(23,9,13,0.9)', padding: 18, gap: 12},
  panelTitle: {fontFamily: fonts.label, fontSize: 10, letterSpacing: 4, color: deco.brass},
  back: {fontFamily: fonts.label, fontSize: 11, letterSpacing: 4, color: deco.brassHighlight, textAlign: 'center', marginTop: 36, paddingVertical: 14},
});
