// Signage: wide-tracked Cinzel caps in gold leaf with a cut shadow beneath (raised gilt letters on a
// dark ground), or letterpress ink with a paper highlight on ivory. Shrinks to fit narrow columns.
import {Text, View} from 'react-native';
import Svg, {Defs, Text as SvgText} from 'react-native-svg';
import {continental as Cn, deco, fonts, type Metal} from '@/lib/deco';
import {MetalGradient, useBox, useSvgId} from './util';

type Props = {
  children: string;
  size?: number;
  kicker?: string;
  sub?: string;
  tone?: 'gilt' | 'ink';
  metal?: Metal;
  align?: 'center' | 'left';
  tracking?: number;
};

export function EngravedHeading({children, size = 22, kicker, sub, tone = 'gilt', metal = 'goldLeaf', align = 'center', tracking = 0.32}: Props) {
  const {box, onLayout} = useBox();
  const id = useSvgId('eh');
  const text = children.toUpperCase();
  const ink = tone === 'ink';
  const per = 0.74 + tracking; // Cinzel caps advance ≈ 0.74em, plus tracking
  const fs = box ? Math.min(size, (box.w - 6) / (text.length * per)) : size;
  const h = Math.ceil(fs * 1.35);
  const x = align === 'center' ? (box?.w ?? 0) / 2 + (fs * tracking) / 2 : 1;
  const anchor = align === 'center' ? 'middle' : 'start';
  return (
    <View style={{gap: 4, alignItems: align === 'center' ? 'center' : 'flex-start'}} accessibilityRole="header" accessibilityLabel={children}>
      {kicker ? <Text style={{fontFamily: fonts.label, fontSize: 9.5, letterSpacing: 4, color: ink ? Cn.oxbloodInk : deco.brass, textAlign: align, paddingLeft: align === 'center' ? 4 : 0}}>{kicker.toUpperCase()}</Text> : null}
      <View onLayout={onLayout} style={{alignSelf: 'stretch', height: h}}>
        {box ? (
          <Svg width={box.w} height={h}>
            <Defs><MetalGradient id={id} metal={metal} x1="0" y1="0" x2="0.35" y2="1" /></Defs>
            {ink ? (
              <>
                <SvgText x={x} y={fs * 1.02 + 0.8} fontSize={fs} letterSpacing={fs * tracking} fontFamily={fonts.capsBold} textAnchor={anchor} fill="#FFFFFF" fillOpacity={0.7}>{text}</SvgText>
                <SvgText x={x} y={fs * 1.02} fontSize={fs} letterSpacing={fs * tracking} fontFamily={fonts.capsBold} textAnchor={anchor} fill={Cn.engrave}>{text}</SvgText>
              </>
            ) : (
              <>
                <SvgText x={x} y={fs * 1.02 + 1.4} fontSize={fs} letterSpacing={fs * tracking} fontFamily={fonts.capsBold} textAnchor={anchor} fill="#000" fillOpacity={0.85}>{text}</SvgText>
                <SvgText x={x} y={fs * 1.02} fontSize={fs} letterSpacing={fs * tracking} fontFamily={fonts.capsBold} textAnchor={anchor} fill={`url(#${id})`} stroke="#FFF4C8" strokeOpacity={0.25} strokeWidth={0.3}>{text}</SvgText>
              </>
            )}
          </Svg>
        ) : null}
      </View>
      {sub ? <Text style={{fontFamily: fonts.script, fontSize: 16, lineHeight: 20, color: ink ? Cn.ink : 'rgba(244,232,208,0.82)', textAlign: align}}>{sub}</Text> : null}
    </View>
  );
}
