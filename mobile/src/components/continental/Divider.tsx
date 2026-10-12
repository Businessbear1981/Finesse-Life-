// Gilded deco rule: twin hairlines that taper to nothing at the ends, stepped fans either side of a
// central lozenge, and an optional engraved caption set in the middle.
import {Text, View} from 'react-native';
import Svg, {Defs, LinearGradient, Path, Stop} from 'react-native-svg';
import {deco, fonts} from '@/lib/deco';
import {MetalGradient, useBox, useSvgId} from './util';

/** Scale for a caption so it always fits between the stepped ends (≈10px per tracked cap at 9.5px). */
const fit = (w: number, label: string) => Math.max(0.72, Math.min(1, (w * 0.9 - 34) / (label.length * 10)));

export function Divider({label, color = deco.brassHighlight, tone}: {label?: string; color?: string; tone?: 'ink'}) {
  const {box, onLayout} = useBox();
  const id = useSvgId('dv');
  const ink = tone === 'ink';
  const line = ink ? '#2A1C0E' : color;
  const H = 18;
  return (
    <View onLayout={onLayout} style={{height: label ? 26 : H, justifyContent: 'center'}} accessibilityRole={label ? 'header' : undefined}>
      {box ? (() => {
        const w = box.w, cx = w / 2, cy = (label ? 26 : H) / 2;
        const gap = label ? Math.min(w * 0.9, label.length * 10 * fit(w, label) + 34) : 34;
        const half = gap / 2;
        return (
          <Svg width={w} height={label ? 26 : H} style={{position: 'absolute'}}>
            <Defs>
              <LinearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={line} stopOpacity={0} /><Stop offset="1" stopColor={line} stopOpacity={0.95} /></LinearGradient>
              <LinearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={line} stopOpacity={0.95} /><Stop offset="1" stopColor={line} stopOpacity={0} /></LinearGradient>
              <MetalGradient id={`${id}m`} metal="goldLeaf" />
            </Defs>
            <Path d={`M0 ${cy - 1.5} H${cx - half} M0 ${cy + 1.5} H${cx - half}`} stroke={`url(#${id}l)`} strokeWidth={0.7} />
            <Path d={`M${cx + half} ${cy - 1.5} H${w} M${cx + half} ${cy + 1.5} H${w}`} stroke={`url(#${id}r)`} strokeWidth={0.7} />
            {/* stepped ends */}
            {[-1, 1].map((sx) => {
              const x = cx + sx * half;
              return <Path key={sx} d={`M${x} ${cy - 4} L${x - sx * 4} ${cy - 4} L${x - sx * 4} ${cy - 2} L${x - sx * 7} ${cy - 2} L${x - sx * 7} ${cy + 2} L${x - sx * 4} ${cy + 2} L${x - sx * 4} ${cy + 4} L${x} ${cy + 4} Z`} fill={ink ? line : `url(#${id}m)`} opacity={0.9} />;
            })}
            {!label ? (
              <>
                <Path d={`M${cx} ${cy - 6} L${cx + 7} ${cy} L${cx} ${cy + 6} L${cx - 7} ${cy} Z`} fill={ink ? line : `url(#${id}m)`} />
                <Path d={`M${cx} ${cy - 3} L${cx + 3.5} ${cy} L${cx} ${cy + 3} L${cx - 3.5} ${cy} Z`} fill={ink ? '#F3EAD6' : '#3A2608'} />
                {[-1, 1].map((sx) => <Path key={`f${sx}`} d={[0, 1, 2].map((k) => `M${cx + sx * 9} ${cy} L${cx + sx * (15 + k * 3)} ${cy - 5 + k * 5}`).join(' ')} stroke={line} strokeOpacity={0.7} strokeWidth={0.6} />)}
              </>
            ) : null}
          </Svg>
        );
      })() : null}
      {label ? <Text numberOfLines={1} style={{textAlign: 'center', fontFamily: fonts.capsBold, fontSize: 9.5 * fit(box?.w ?? 300, label), letterSpacing: 3.2 * fit(box?.w ?? 300, label), color: ink ? '#2A1C0E' : color, paddingLeft: 3}}>{label}</Text> : null}
    </View>
  );
}
