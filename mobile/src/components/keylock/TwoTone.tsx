// "Say the <rose>word.</rose>" — chrome serif italic with a rose-gold last phrase, one line (SVG text).
import {useId} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, TSpan, Text as SvgText} from 'react-native-svg';
import {ahFonts, chromeStops, roseStops} from '@/lib/ah';

export function TwoTone({lead, rose, size = 54, style}: {lead: string; rose: string; size?: number; style?: StyleProp<ViewStyle>}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const h = Math.round(size * 1.18);
  return (
    <View style={style} accessible accessibilityRole="header" accessibilityLabel={`${lead} ${rose}`}>
      <Svg width="100%" height={h}>
        <Defs>
          <LinearGradient id={`tc${id}`} x1="0" y1="0" x2="0" y2="1">
            {chromeStops.map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />)}
          </LinearGradient>
          <LinearGradient id={`tr${id}`} x1="0" y1="0" x2="1" y2="1">
            {roseStops.map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />)}
          </LinearGradient>
        </Defs>
        <SvgText x={2} y={size * 0.9} fontFamily={ahFonts.serifItalic} fontSize={size} letterSpacing={-size * 0.02}>
          <TSpan fill={`url(#tc${id})`}>{`${lead} `}</TSpan>
          <TSpan fill={`url(#tr${id})`}>{rose}</TSpan>
        </SvgText>
      </Svg>
    </View>
  );
}
