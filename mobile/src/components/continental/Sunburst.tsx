// Deco sunburst / stepped fan: alternating tapered rays with stepped arcs, drawn from a bottom-centre
// origin (a fan over a doorway) or a centre origin (a full burst behind a medallion).
import {useMemo} from 'react';
import Svg, {Defs, G, Path, RadialGradient, Stop} from 'react-native-svg';
import {deco, polar} from '@/lib/deco';
import {useSvgId} from './util';

export function Sunburst({width, height, origin = 'bottom', rays = 24, color = deco.champagne, opacity = 0.5, steps = 3, span}: {
  width: number; height: number; origin?: 'bottom' | 'center'; rays?: number; color?: string; opacity?: number; steps?: number; span?: number;
}) {
  const id = useSvgId('sb');
  const {wedges, arcs, cx, cy, R} = useMemo(() => {
    const cx = width / 2, cy = origin === 'bottom' ? height : height / 2;
    const R = origin === 'bottom' ? Math.hypot(width / 2, height) : Math.hypot(width, height) / 2;
    const total = span ?? (origin === 'bottom' ? 180 : 360);
    const from = origin === 'bottom' ? -total / 2 : 0;
    const wedges: Array<{d: string; strong: boolean}> = [];
    for (let i = 0; i < rays; i++) {
      const a = from + ((i + 0.5) * total) / rays;
      const half = (total / rays) * (i % 2 ? 0.16 : 0.3);
      const p0 = polar(cx, cy, R * 0.12, a), p1 = polar(cx, cy, R, a - half), p2 = polar(cx, cy, R, a + half);
      wedges.push({d: `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L${p2.x.toFixed(1)} ${p2.y.toFixed(1)} Z`, strong: i % 2 === 0});
    }
    const arcs: string[] = [];
    for (let s = 1; s <= steps; s++) {
      const r = R * (0.12 + (s * 0.5) / (steps + 1));
      const a0 = from, a1 = from + total;
      const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
      arcs.push(total >= 360 ? `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0` : `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A${r} ${r} 0 0 1 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`);
    }
    return {wedges, arcs, cx, cy, R};
  }, [width, height, origin, rays, steps, span]);
  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx={cx} cy={cy} r={R} fx={cx} fy={cy} gradientUnits="userSpaceOnUse">
          <Stop offset="0.1" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <G>
        {wedges.map((w, i) => <Path key={i} d={w.d} fill={`url(#${id})`} opacity={w.strong ? 1 : 0.55} />)}
        {arcs.map((d, i) => <Path key={`a${i}`} d={d} fill="none" stroke={color} strokeOpacity={opacity * 0.6} strokeWidth={0.75} />)}
      </G>
    </Svg>
  );
}
