// Deco frame: a polished outer keyline with stepped (ziggurat) corners, a fainter inner keyline, small
// corner fans, and an optional engraved cartouche breaking the top rule. Optionally sits on a material.
import type {ReactNode} from 'react';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import Svg, {Defs, Path} from 'react-native-svg';
import {continental as Cn, deco, fonts, type Metal} from '@/lib/deco';
import {MaterialArt, type Material} from './Surface';
import {MetalGradient, useBox, useSvgId} from './util';

/** Rectangle with a two-step notch at each corner. */
export function steppedRect(x0: number, y0: number, x1: number, y1: number, s: number) {
  const p = [
    [x0 + 2 * s, y0], [x1 - 2 * s, y0], [x1 - 2 * s, y0 + s], [x1 - s, y0 + s], [x1 - s, y0 + 2 * s], [x1, y0 + 2 * s],
    [x1, y1 - 2 * s], [x1 - s, y1 - 2 * s], [x1 - s, y1 - s], [x1 - 2 * s, y1 - s], [x1 - 2 * s, y1],
    [x0 + 2 * s, y1], [x0 + 2 * s, y1 - s], [x0 + s, y1 - s], [x0 + s, y1 - 2 * s], [x0, y1 - 2 * s],
    [x0, y0 + 2 * s], [x0 + s, y0 + 2 * s], [x0 + s, y0 + s], [x0 + 2 * s, y0 + s],
  ];
  return `M${p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`;
}

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Engraved caps set into the top rule. */
  title?: string;
  material?: Material;
  metal?: Metal;
  step?: number;
  pad?: number;
  /** Lamp light from above on the material (0..1). */
  light?: number;
  /** Tone of the keylines for light materials (ivory): engraved ink instead of brass. */
  ink?: boolean;
  seed?: number;
  /** Colour of the cartouche caption (defaults to brass). */
  titleColor?: string;
};

export function DecoFrame({children, style, title, material, metal = 'brass', step = 6, pad = 16, light = 0, ink, seed, titleColor}: Props) {
  const {box, onLayout} = useBox();
  const id = useSvgId('df');
  const maxGap = (box?.w ?? 200) - 4 * step - 24;
  const want = title ? title.length * 9.6 + 28 : 0;
  const titleGap = title ? Math.min(maxGap, want) : 0;
  const tScale = title ? Math.max(0.7, Math.min(1, (maxGap - 28) / (want - 28))) : 1;
  return (
    <View onLayout={onLayout} style={[{padding: pad, paddingTop: title ? pad + 8 : pad}, style]}>
      {box ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {material ? (
            <View style={[StyleSheet.absoluteFill, {left: 2, top: title ? 9 : 2, right: 2, bottom: 2}]}>
              <MaterialArt kind={material} w={box.w - 4} h={box.h - (title ? 11 : 4)} light={light} seed={seed} clip={steppedRect(0, 0, box.w - 4, box.h - (title ? 11 : 4), step)} />
            </View>
          ) : null}
          <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
            <Defs><MetalGradient id={id} metal={metal} /></Defs>
            {(() => {
              const top = title ? 9 : 1;
              const outer = steppedRect(1, top, box.w - 1, box.h - 1, step);
              const inner = steppedRect(6, top + 5, box.w - 6, box.h - 6, step * 0.8);
              const stroke = ink ? Cn.engrave : `url(#${id})`;
              const cx = box.w / 2;
              return (
                <>
                  <Path d={outer} fill="none" stroke={stroke} strokeWidth={1.4} strokeOpacity={ink ? 0.7 : 1} />
                  <Path d={inner} fill="none" stroke={ink ? Cn.engrave : deco.brass} strokeOpacity={ink ? 0.35 : 0.45} strokeWidth={0.6} />
                  {/* corner fans */}
                  {[[6, top + 5, 1, 1], [box.w - 6, top + 5, -1, 1], [6, box.h - 6, 1, -1], [box.w - 6, box.h - 6, -1, -1]].map(([x, y, sx, sy], i) => (
                    <Path key={i} d={[0, 1, 2].map((k) => `M${x + sx * (step * 1.6 + k * 3)} ${y} A${step * 1.6 + k * 3} ${step * 1.6 + k * 3} 0 0 ${sx * sy > 0 ? 1 : 0} ${x} ${y + sy * (step * 1.6 + k * 3)}`).join(' ')}
                      fill="none" stroke={ink ? Cn.engrave : deco.brassHighlight} strokeOpacity={ink ? 0.3 : 0.4} strokeWidth={0.6} />
                  ))}
                  {title ? (
                    <>
                      <Path d={`M${cx - titleGap / 2} ${top} H${cx + titleGap / 2}`} stroke={ink ? Cn.ivory : '#000'} strokeWidth={3} strokeOpacity={ink ? 1 : 0} />
                      <Path d={`M${cx - titleGap / 2 - 4} ${top - 4} L${cx - titleGap / 2} ${top} L${cx - titleGap / 2 - 4} ${top + 4} Z M${cx + titleGap / 2 + 4} ${top - 4} L${cx + titleGap / 2} ${top} L${cx + titleGap / 2 + 4} ${top + 4} Z`} fill={ink ? Cn.engrave : deco.brassHighlight} />
                    </>
                  ) : null}
                </>
              );
            })()}
          </Svg>
          {title ? (
            <View style={{position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center'}}>
              <View style={{width: titleGap, height: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: ink ? 'transparent' : '#0B080A', borderWidth: ink ? 0 : 0.8, borderColor: deco.brass}}>
                <Text numberOfLines={1} style={{fontFamily: fonts.capsBold, fontSize: 9 * tScale, letterSpacing: 3 * tScale, color: ink ? Cn.engrave : titleColor ?? deco.brassHighlight, paddingLeft: 3}}>{title}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Four L-shaped brass brackets — lighter than a full frame, for cards and photos. */
export function CornerBrackets({size = 12, inset = 4, color = deco.brassHighlight, weight = 1.5}: {size?: number; inset?: number; color?: string; weight?: number}) {
  const c = (pos: object, rot: string) => <View style={[{position: 'absolute', width: size, height: size, borderTopWidth: weight, borderLeftWidth: weight, borderColor: color, transform: [{rotate: rot}]}, pos]} />;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {c({left: inset, top: inset}, '0deg')}{c({right: inset, top: inset}, '90deg')}{c({right: inset, bottom: inset}, '180deg')}{c({left: inset, bottom: inset}, '270deg')}
    </View>
  );
}
