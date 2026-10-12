// The door at night (After Hours, mirrors web src/app/entrance.css): a chrome arch, two noir panels,
// a seam of rose light that warms with each digit (progress only — never correctness), a velvet rope.
// `progress` is 0..1 digits entered; `open` 0..1 slides the panels apart into the house.
import {useId} from 'react';
import {StyleSheet, View, useWindowDimensions} from 'react-native';
import Animated, {useAnimatedStyle, type SharedValue} from 'react-native-reanimated';
import Svg, {Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {ah} from '@/lib/ah';

const sid = (raw: string, p: string) => `${p}${raw.replace(/[^a-zA-Z0-9]/g, '')}`;

type Props = {width: number; progress: SharedValue<number>; open: SharedValue<number>};

export function Door({width: W, progress, open}: Props) {
  const id = sid(useId(), 'door');
  const H = Math.round(W / 0.74);
  const B = 1.5; // chrome frame
  const iw = W - B * 2;
  const half = iw / 2;

  const halo = useAnimatedStyle(() => ({opacity: 0.25 + 0.6 * progress.value + 0.15 * open.value}));
  const seam = useAnimatedStyle(() => ({
    opacity: (0.35 + 0.65 * progress.value) * (1 - open.value),
    transform: [{scaleX: 1 + 1.4 * progress.value}],
  }));
  const seamGlow = useAnimatedStyle(() => ({opacity: (0.12 + 0.6 * progress.value) * (1 - open.value)}));
  const under = useAnimatedStyle(() => ({opacity: (0.2 + 0.8 * progress.value) * (1 - open.value)}));
  const rope = useAnimatedStyle(() => ({opacity: 1 - Math.min(1, open.value * 2.5), transform: [{translateY: 16 * Math.min(1, open.value * 2.5)}]}));

  const ropeW = W * 1.12;
  const SQ = Math.round(H * 1.6);
  return (
    <View style={{width: W, height: H + 26, alignSelf: 'center'}} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* halo + floor light (gradients sit on circles/ellipses so no box edge ever shows) */}
      <Animated.View style={[{position: 'absolute', left: W / 2 - SQ / 2, top: H * 0.55 - SQ / 2, width: SQ, height: SQ}, halo]}>
        <Svg width={SQ} height={SQ}>
          <Defs>
            <RadialGradient id={`${id}h`} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={ah.rose2} stopOpacity={0.4} />
              <Stop offset="0.5" stopColor={ah.rose3} stopOpacity={0.1} />
              <Stop offset="1" stopColor={ah.rose3} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`${id}f`} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={ah.rose2} stopOpacity={0.55} />
              <Stop offset="1" stopColor={ah.rose2} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={SQ / 2} cy={SQ / 2} r={SQ / 2} fill={`url(#${id}h)`} />
          <Ellipse cx={SQ / 2} cy={SQ / 2 + H * 0.45 + 6} rx={W * 0.85} ry={W * 0.16} fill={`url(#${id}f)`} />
        </Svg>
      </Animated.View>

      {/* the arch: chrome frame */}
      <View style={[styles.arch, {width: W, height: H, borderTopLeftRadius: W / 2, borderTopRightRadius: W / 2}]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={`${id}fr`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.6} />
              <Stop offset="0.45" stopColor={ah.platinum} stopOpacity={0.28} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.06} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id}fr)`} />
        </Svg>
        <View style={[styles.inner, {left: B, right: B, top: B, bottom: B, borderTopLeftRadius: iw / 2, borderTopRightRadius: iw / 2}]}>
          {/* the house behind the door */}
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <RadialGradient id={`${id}l2`} cx="0.5" cy="0.6" rx="0.8" ry="0.8">
                <Stop offset="0" stopColor={ah.rose2} />
                <Stop offset="0.6" stopColor="#3A1A20" />
                <Stop offset="1" stopColor="#0B0708" />
              </RadialGradient>
              <RadialGradient id={`${id}l1`} cx="0.5" cy="0.55" rx="0.4" ry="0.6">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="0.3" stopColor="#F6DCCF" stopOpacity={0.95} />
                <Stop offset="1" stopColor="#F6DCCF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${id}l2)`} />
            <Rect width="100%" height="100%" fill={`url(#${id}l1)`} />
          </Svg>

          <Panel side="l" w={half} h={H - B * 2} id={id} open={open} />
          <Panel side="r" w={half} h={H - B * 2} id={id} open={open} />

          {/* seam glow + seam */}
          <Animated.View style={[{position: 'absolute', top: '3%', bottom: 0, left: half - 22, width: 44}, seamGlow]}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id={`${id}sg`} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={ah.rose} stopOpacity={0} />
                  <Stop offset="0.5" stopColor={ah.rose} stopOpacity={0.55} />
                  <Stop offset="1" stopColor={ah.rose} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${id}sg)`} />
            </Svg>
          </Animated.View>
          <Animated.View style={[{position: 'absolute', top: '3%', bottom: 0, left: half - 1, width: 2}, seam]}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id={`${id}sm`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFEEE6" stopOpacity={0} />
                  <Stop offset="0.3" stopColor="#FFEEE6" stopOpacity={1} />
                  <Stop offset="0.85" stopColor={ah.blush} stopOpacity={1} />
                  <Stop offset="1" stopColor={ah.blush} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${id}sm)`} />
            </Svg>
          </Animated.View>
          <Animated.View style={[{position: 'absolute', bottom: 0, left: iw * 0.2, width: iw * 0.6, height: 12}, under]}>
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient id={`${id}u`} cx="0.5" cy="1" rx="0.5" ry="1">
                  <Stop offset="0" stopColor="#FFE6DC" stopOpacity={0.8} />
                  <Stop offset="1" stopColor="#FFE6DC" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${id}u)`} />
            </Svg>
          </Animated.View>
        </View>
      </View>

      {/* velvet rope + chrome posts */}
      <View style={{position: 'absolute', left: (W - ropeW) / 2, width: ropeW, top: H - 44, height: 70}}>
        <Animated.View style={[StyleSheet.absoluteFill, rope]}>
          <Svg width="100%" height="100%" viewBox="0 0 300 70" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={`${id}rp`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={ah.rose3} />
                <Stop offset="0.5" stopColor="#D58F98" />
                <Stop offset="1" stopColor={ah.rose3} />
              </LinearGradient>
            </Defs>
            <Path d="M18 26 Q150 66 282 26" fill="none" stroke={`url(#${id}rp)`} strokeWidth={5} strokeLinecap="round" />
          </Svg>
        </Animated.View>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 300 70" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={`${id}po`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#6D7076" />
              <Stop offset="0.45" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#6D7076" />
            </LinearGradient>
          </Defs>
          {[12, 288].map((x) => (
            <Path key={x} d={`M${x - 3} 22 h6 v46 h-6 Z`} fill={`url(#${id}po)`} />
          ))}
          {[12, 288].map((x) => <Ellipse key={`e${x}`} cx={x} cy={68.5} rx={10} ry={2} fill={`url(#${id}po)`} />)}
          {[12, 288].map((x) => <Circle key={`c${x}`} cx={x} cy={19} r={5.5} fill={`url(#${id}po)`} />)}
        </Svg>
      </View>
    </View>
  );
}

function Panel({side, w, h, id, open}: {side: 'l' | 'r'; w: number; h: number; id: string; open: SharedValue<number>}) {
  const isL = side === 'l';
  const style = useAnimatedStyle(() => ({transform: [{translateX: (isL ? -1 : 1) * w * 1.02 * open.value}]}));
  const handleH = Math.max(26, h * 0.13);
  return (
    <Animated.View style={[{position: 'absolute', top: 0, bottom: 0, width: w, [isL ? 'left' : 'right']: 0}, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={`${id}p${side}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#141417" />
            <Stop offset="0.7" stopColor="#070708" />
            <Stop offset="1" stopColor="#070708" />
          </LinearGradient>
          <LinearGradient id={`${id}q${side}`} x1={isL ? '0' : '1'} y1="0" x2={isL ? '1' : '0'} y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.04} />
            <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}p${side})`} />
        <Rect width="100%" height="100%" fill={`url(#${id}q${side})`} />
      </Svg>
      {/* moulding */}
      <View style={{position: 'absolute', top: h * 0.22, bottom: h * 0.1, left: w * 0.16, right: w * 0.16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
        borderRadius: 2, [isL ? 'borderTopLeftRadius' : 'borderTopRightRadius']: w}} />
      {/* edge + chrome handle */}
      <View style={{position: 'absolute', top: 0, bottom: 0, width: 1, [isL ? 'right' : 'left']: 0, backgroundColor: 'rgba(255,255,255,0.06)'}} />
      <View style={{position: 'absolute', top: h * 0.52, height: handleH, width: 3, borderRadius: 3, [isL ? 'right' : 'left']: Math.max(7, w * 0.1), overflow: 'hidden'}}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={`${id}hd${side}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.55" stopColor={ah.platinum} />
              <Stop offset="1" stopColor="#6D7076" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id}hd${side})`} />
        </Svg>
      </View>
    </Animated.View>
  );
}

/** The light behind the door floods the screen, and a chrome sweep crosses it, when the house opens. */
export function Flood({open, reduced}: {open: SharedValue<number>; reduced: boolean}) {
  const id = sid(useId(), 'fl');
  const {width, height} = useWindowDimensions();
  const flood = useAnimatedStyle(() => ({opacity: Math.max(0, (open.value - 0.3) / 0.7)}));
  const sweep = useAnimatedStyle(() => ({
    opacity: open.value > 0 && open.value < 1 ? 1 : 0,
    transform: [{translateX: (-1.2 + 2.4 * open.value) * width}],
  }));
  if (reduced) return null;
  const sw = width * 1.2, sh = height * 1.4;
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, flood]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id={`${id}a`} cx={width / 2} cy={height * 0.45} rx={width * 0.95} ry={height * 0.6} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.22" stopColor="#F6DCCF" />
              <Stop offset="0.5" stopColor={ah.rose2} stopOpacity={0.8} />
              <Stop offset="1" stopColor={ah.ink} />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill={`url(#${id}a)`} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{position: 'absolute', top: -height * 0.2, left: (width - sw) / 2, width: sw, height: sh}, sweep]}>
        <Svg width={sw} height={sh}>
          <Defs>
            <LinearGradient id={`${id}b`} x1="0" y1="0.12" x2="1" y2="0">
              <Stop offset="0.38" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.08} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.7} />
              <Stop offset="0.54" stopColor={ah.blush} stopOpacity={0.2} />
              <Stop offset="0.62" stopColor={ah.blush} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={sw} height={sh} fill={`url(#${id}b)`} />
        </Svg>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  arch: {position: 'absolute', top: 0, left: 0, overflow: 'hidden', borderBottomLeftRadius: 4, borderBottomRightRadius: 4},
  inner: {position: 'absolute', overflow: 'hidden', backgroundColor: '#000', borderBottomLeftRadius: 3, borderBottomRightRadius: 3},
});
