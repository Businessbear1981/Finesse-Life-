// The Private Lift — After Hours (mirrors web src/components/hotel/private-lift.tsx): a chrome frame around two
// black-glass doors, three cipher cells per door, rose-gold light leaking through the seam, and the penthouse
// at night waiting behind. Display only — the server opens the doors.
import {useEffect, useId} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue} from 'react-native-reanimated';
import Svg, {Defs, G, LinearGradient, RadialGradient, Rect, Stop} from 'react-native-svg';
import {ah, ahFonts} from '@/lib/ah';

const ROW = 30;
const ROWS = ['·', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const svgId = (raw: string, p: string) => `${p}${raw.replace(/[^a-zA-Z0-9]/g, '')}`;

type Props = {
  width: number;
  digits: string;
  masked: boolean;               // enrolment: show a dot instead of numbers
  active: boolean;               // cells lit (cipher showing)
  floor: SharedValue<number>;    // 0 = Lobby, 1 = Penthouse
  doors: SharedValue<number>;    // 0 = closed, 1 = open
  reduced: boolean;
};

/* A deterministic night skyline (no randomness at render). */
type Tower = {x: number; w: number; h: number; lit: Array<[number, number, boolean]>};
function skyline(width: number, maxH: number, seed0 = 23): Tower[] {
  let seed = seed0;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const out: Tower[] = [];
  let x = -4;
  while (x < width) {
    const w = 12 + Math.round(rnd() * 20);
    const tall = rnd() > 0.8;
    const h = (tall ? 0.7 + rnd() * 0.3 : 0.25 + rnd() * 0.45) * maxH;
    const lit: Array<[number, number, boolean]> = [];
    for (let row = 6; row < h - 4; row += 6) for (let col = 3; col < w - 3; col += 4) if (rnd() > 0.86) lit.push([col, row, rnd() > 0.6]);
    out.push({x, w, h, lit});
    x += w + 2 + Math.round(rnd() * 3);
  }
  return out;
}

/** The penthouse at night, as SVG: sky, rose horizon, skyline. Shared with the Penthouse floor. */
export function NightView({width, height, glow = 1}: {width: number; height: number; glow?: number}) {
  const id = svgId(useId(), 'nv');
  const towers = skyline(width, height * 0.55);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0B0B12" /><Stop offset="0.6" stopColor="#1A0F14" /><Stop offset="1" stopColor="#3A1D22" /></LinearGradient>
        <RadialGradient id={`${id}h`} cx="0.5" cy="1" r="0.7"><Stop offset="0" stopColor={ah.rose} stopOpacity={0.7 * glow} /><Stop offset="1" stopColor={ah.rose} stopOpacity={0} /></RadialGradient>
        <RadialGradient id={`${id}m`} cx="0.8" cy="0.18" r="0.35"><Stop offset="0" stopColor={ah.platinum} stopOpacity={0.22} /><Stop offset="1" stopColor={ah.platinum} stopOpacity={0} /></RadialGradient>
        <LinearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#141218" /><Stop offset="1" stopColor="#050506" /></LinearGradient>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${id}s)`} />
      <Rect width={width} height={height} fill={`url(#${id}h)`} />
      <Rect width={width} height={height} fill={`url(#${id}m)`} />
      {towers.map((t, i) => (
        <G key={i} transform={`translate(${t.x} ${height - t.h})`}>
          <Rect width={t.w} height={t.h} fill={`url(#${id}t)`} />
          <Rect width={t.w} height={0.6} fill="rgba(255,255,255,0.18)" />
          {t.lit.map(([cx, cy, warm], j) => <Rect key={j} x={cx} y={cy} width={1.6} height={2.2} fill={warm ? ah.blush : '#C9CCD2'} opacity={warm ? 0.9 : 0.55} />)}
        </G>
      ))}
    </Svg>
  );
}

/** Small black-glass floor readout: "--" in the lobby, "17" at the top. Driven by the floor value. */
export function FloorReadout({floor, lit}: {floor: SharedValue<number>; lit: boolean}) {
  const lobby = useAnimatedStyle(() => ({opacity: 1 - floor.value}));
  const top = useAnimatedStyle(() => ({opacity: floor.value}));
  return (
    <View accessible accessibilityLabel="Floor indicator" style={{minWidth: 66, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 7, borderRadius: 12, alignItems: 'center', backgroundColor: '#070708', borderWidth: 1, borderColor: ah.line2}}>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 9, letterSpacing: 2, color: ah.faint}}>FLOOR</Text>
      <View style={{height: 28, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center'}}>
        <Animated.Text style={[{position: 'absolute', fontFamily: ahFonts.cond, fontSize: 22, letterSpacing: 1.5, color: lit ? ah.rose : ah.faint, textShadowColor: lit ? 'rgba(232,180,160,0.55)' : 'transparent', textShadowRadius: 10}, lobby]}>{lit ? '01' : '· · ·'}</Animated.Text>
        <Animated.Text style={[{position: 'absolute', fontFamily: ahFonts.cond, fontSize: 22, letterSpacing: 1.5, color: ah.rose, textShadowColor: 'rgba(232,180,160,0.55)', textShadowRadius: 10}, top]}>17</Animated.Text>
      </View>
    </View>
  );
}

export function LiftScene({width, digits, masked, active, floor, doors, reduced}: Props) {
  const id = svgId(useId(), 'lf');
  const W = width;
  const pad = 6;
  const bayW = W - pad * 2;
  const bayH = bayW * (4.6 / 4);
  const H = bayH + pad * 2;
  const doorW = bayW / 2;

  const left = useAnimatedStyle(() => ({transform: [{translateX: -doorW * doors.value}]}));
  const right = useAnimatedStyle(() => ({transform: [{translateX: doorW * doors.value}]}));
  const inside = useAnimatedStyle(() => ({opacity: interpolate(doors.value, [0, 0.3, 1], [0, 0.6, 1])}));
  const seam = useAnimatedStyle(() => ({opacity: interpolate(doors.value, [0, 0.4], [1, 0])}));
  const pool = useAnimatedStyle(() => ({opacity: (active ? 0.9 : 0.35) + 0.1 * floor.value}));

  return (
    <View style={{width: W, height: H + 30, alignSelf: 'center'}}>
      {/* rose light pooling under the car */}
      <Animated.View pointerEvents="none" style={[{position: 'absolute', left: W * 0.1, right: W * 0.1, top: H - 26, height: 56}, pool]}>
        <Svg width="100%" height="100%">
          <Defs><RadialGradient id={`${id}p`} cx="0.5" cy="0.5" r="0.5"><Stop offset="0" stopColor={ah.rose} stopOpacity={0.4} /><Stop offset="1" stopColor={ah.rose} stopOpacity={0} /></RadialGradient></Defs>
          <Rect width="100%" height="100%" fill={`url(#${id}p)`} />
        </Svg>
      </Animated.View>

      {/* chrome frame */}
      <View style={{width: W, height: H, borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 40, shadowOffset: {width: 0, height: 30}, elevation: 16}}>
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F4F4F2" /><Stop offset="0.22" stopColor="#6D7076" /><Stop offset="0.48" stopColor="#1A1A1D" /><Stop offset="0.78" stopColor="#9A9CA2" /><Stop offset="1" stopColor="#F4F4F2" />
            </LinearGradient>
          </Defs>
          <Rect width={W} height={H} rx={30} fill={`url(#${id}c)`} />
        </Svg>

        {/* the bay */}
        <View style={{position: 'absolute', left: pad, top: pad, width: bayW, height: bayH, borderRadius: 25, overflow: 'hidden', backgroundColor: '#020203'}}>
          <Animated.View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center'}, inside]}>
            <NightView width={bayW} height={bayH} />
            <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 36, color: ah.white, marginTop: -bayH * 0.25}}>The Penthouse</Text>
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10, letterSpacing: 3, color: ah.blush, marginTop: 6}}>FLOOR 17</Text>
          </Animated.View>
          <Animated.View style={[{position: 'absolute', left: 0, top: 0, width: doorW, height: bayH}, left]}>
            <Door w={doorW} h={bayH} side="left" digits={digits} masked={masked} active={active} reduced={reduced} />
          </Animated.View>
          <Animated.View style={[{position: 'absolute', left: doorW, top: 0, width: doorW, height: bayH}, right]}>
            <Door w={doorW} h={bayH} side="right" digits={digits} masked={masked} active={active} reduced={reduced} />
          </Animated.View>
          {/* the seam: chrome hairline, rose light leaking through */}
          <Animated.View pointerEvents="none" style={[{position: 'absolute', left: doorW - 1, top: 0, width: 2, height: bayH}, seam]}>
            <Svg width={2} height={bayH}>
              <Defs>
                <LinearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={active ? ah.rose : '#fff'} stopOpacity={0} />
                  <Stop offset="0.3" stopColor={active ? ah.rose : '#fff'} stopOpacity={active ? 1 : 0.22} />
                  <Stop offset="0.5" stopColor={active ? '#fff' : '#fff'} stopOpacity={active ? 0.9 : 0.22} />
                  <Stop offset="0.7" stopColor={active ? ah.rose : '#fff'} stopOpacity={active ? 1 : 0.22} />
                  <Stop offset="1" stopColor={active ? ah.rose : '#fff'} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width={2} height={bayH} fill={`url(#${id}s)`} />
            </Svg>
          </Animated.View>
          {active ? (
            <Animated.View pointerEvents="none" style={[{position: 'absolute', left: doorW - 14, top: bayH * 0.2, width: 28, height: bayH * 0.6}, seam]}>
              <Svg width={28} height={bayH * 0.6}>
                <Defs><RadialGradient id={`${id}g`} cx="0.5" cy="0.5" rx="0.5" ry="0.5"><Stop offset="0" stopColor={ah.rose} stopOpacity={0.26} /><Stop offset="1" stopColor={ah.rose} stopOpacity={0} /></RadialGradient></Defs>
                <Rect width={28} height={bayH * 0.6} fill={`url(#${id}g)`} />
              </Svg>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Door({w, h, side, digits, masked, active, reduced}: {w: number; h: number; side: 'left' | 'right'; digits: string; masked: boolean; active: boolean; reduced: boolean}) {
  const id = svgId(useId(), `d${side}`);
  const offset = side === 'left' ? 0 : 3;
  const cell = Math.min(34, (w - 44) / 3.4);
  return (
    <View style={{width: w, height: h, alignItems: 'center', justifyContent: 'center', gap: 16}}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#111114" /><Stop offset="0.55" stopColor="#08080A" /><Stop offset="1" stopColor="#050506" /></LinearGradient>
          <LinearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#fff" stopOpacity={0.07} /><Stop offset="0.28" stopColor="#fff" stopOpacity={0} /><Stop offset="0.62" stopColor="#fff" stopOpacity={0} /><Stop offset="0.74" stopColor="#fff" stopOpacity={0.04} /><Stop offset="0.8" stopColor="#fff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={w} height={h} fill={`url(#${id}b)`} />
        <Rect width={w} height={h} fill={`url(#${id}r)`} />
        {/* a single etched hairline inset */}
        <Rect x={14} y={18} width={w - 28} height={h - 36} rx={14} fill="none" stroke="#fff" strokeOpacity={0.05} />
        <Rect x={side === 'left' ? w - 1 : 0} y={0} width={1} height={h} fill="#fff" fillOpacity={0.12} />
      </Svg>
      <View style={{flexDirection: 'row', gap: cell * 0.22}}>
        {[0, 1, 2].map((i) => {
          const index = offset + i;
          return <Cell key={i} size={cell} value={digits[index]} masked={masked} active={active} current={active && index === digits.length} reduced={reduced} />;
        })}
      </View>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 9, letterSpacing: 3.8, color: ah.faint}}>{side === 'left' ? 'PRIVATE' : 'LIFT'}</Text>
    </View>
  );
}

/** A glass cipher cell; the digit rolls into place. */
function Cell({size, value, masked, active, current, reduced}: {size: number; value?: string; masked: boolean; active: boolean; current: boolean; reduced: boolean}) {
  const k = size / 28;
  const H = size * 1.45;
  const row = value === undefined ? 0 : masked ? 0 : ROWS.indexOf(value);
  const y = useSharedValue(0);
  const set = useSharedValue(0);
  useEffect(() => {
    y.value = withTiming(-row * ROW, {duration: reduced ? 0 : 420, easing: Easing.out(Easing.back(1.4))});
    set.value = withTiming(value === undefined ? 0 : 1, {duration: reduced ? 0 : 220});
  }, [row, value, reduced, set, y]);
  const col = useAnimatedStyle(() => ({transform: [{translateY: y.value * k}]}));
  const ring = useAnimatedStyle(() => ({
    borderColor: set.value > 0.5 ? 'rgba(232,180,160,0.75)' : current ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)',
    shadowOpacity: 0.6 * set.value,
  }));
  return (
    <Animated.View style={[{width: size, height: H, borderRadius: 12 * k, borderWidth: 1.2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)',
      shadowColor: ah.rose, shadowRadius: 10, shadowOffset: {width: 0, height: 0}, opacity: active ? 1 : 0.35}, ring]}>
      {value !== undefined && masked ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}><View style={{width: 9 * k, height: 9 * k, borderRadius: 5 * k, backgroundColor: ah.rose}} /></View>
      ) : (
        <Animated.View style={[{position: 'absolute', left: 0, right: 0, top: (H - ROW * k) / 2}, col]}>
          {ROWS.map((r) => (
            <Text key={r} style={{height: ROW * k, lineHeight: ROW * k, textAlign: 'center', fontFamily: ahFonts.serif, fontSize: 24 * k, color: r === '·' ? 'rgba(255,255,255,0.3)' : ah.text}}>{r}</Text>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}
