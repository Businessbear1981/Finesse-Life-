import {View} from 'react-native';
import Svg, {Defs, LinearGradient, Path, Stop, Text as SvgText} from 'react-native-svg';
import {deco, fonts} from '@/lib/deco';

/** FINESSE in polished gold with the EST. MMXXVI flourish. */
export function Wordmark({width}: {width: number}) {
  const w = Math.min(width, 340), h = 96;
  return (
    <View style={{width: w, height: h, alignSelf: 'center'}} accessible accessibilityRole="header" accessibilityLabel="Finesse, established twenty twenty-six">
      <Svg width={w} height={h} viewBox="0 0 340 96">
        <Defs>
          <LinearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF6D2" />
            <Stop offset="0.3" stopColor={deco.brassLight} />
            <Stop offset="0.58" stopColor="#A47A34" />
            <Stop offset="0.78" stopColor="#F6E2A0" />
            <Stop offset="1" stopColor={deco.brass} />
          </LinearGradient>
        </Defs>
        <SvgText x={170} y={58} fontSize={54} letterSpacing={7.5} fontFamily={fonts.display} fill="#000" fillOpacity={0.6} textAnchor="middle" dy={5}>FINESSE</SvgText>
        <SvgText x={170} y={58} fontSize={54} letterSpacing={7.5} fontFamily={fonts.display} fill="url(#gold)" textAnchor="middle">FINESSE</SvgText>
        <Path d="M78 82 L118 82 M222 82 L262 82" stroke={deco.brass} strokeOpacity={0.4} />
        <Path d="M128 78.5 L131.5 82 L128 85.5 L124.5 82 Z M212 78.5 L215.5 82 L212 85.5 L208.5 82 Z" stroke={deco.brass} strokeOpacity={0.6} fill="none" />
        <SvgText x={170} y={86} fontSize={11} letterSpacing={6} fontFamily={fonts.label} fill={deco.brassLight} textAnchor="middle">EST. MMXXVI</SvgText>
      </Svg>
    </View>
  );
}
