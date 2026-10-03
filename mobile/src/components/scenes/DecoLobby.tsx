// Original art deco lobby artwork, drawn in code — replaces the reference photographs (which were stills
// from a TV set and can't ship). One-point perspective hall: stepped coffered ceiling, tiered chandelier,
// fluted pilasters with sconces, terrazzo floor with a brass diamond inlay running to sunburst doors.
// The Finesse hall is lit blush; Carpe Diem is a warmer amber atrium with a staircase and velvet seating.
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop} from 'react-native-svg';
import {deco, type Side} from '@/lib/deco';

const W = 400, H = 265, VX = 200, VY = 120; // vanishing point

const PAL: Record<Side, {wallA: string; wallB: string; light: string; glow: string; floorA: string; floorB: string; door: string; velvet: string}> = {
  her: {wallA: '#3A2A2E', wallB: '#160C10', light: '#FFE2EA', glow: '#FF8FB0', floorA: '#4A3A3A', floorB: '#1A1012', door: '#7A3A2A', velvet: '#5A1A2A'},
  him: {wallA: '#3A2A1C', wallB: '#140C06', light: '#FFE9C8', glow: '#FFB070', floorA: '#4A2E1E', floorB: '#170D06', door: '#6E3A16', velvet: '#6E2A14'},
};

/** Lerp a point on the wall toward the vanishing point. */
const toV = (x: number, y: number, t: number) => [x + (VX - x) * t, y + (VY - y) * t] as const;

export function DecoLobby({side, style, dim = 0}: {side: Side; style?: object; dim?: number}) {
  const p = PAL[side];
  const id = side; // keep gradient ids unique per palette
  const depths = [0, 0.22, 0.4, 0.55, 0.66];
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={`${id}-wallL`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={p.wallB} /><Stop offset="1" stopColor={p.wallA} /></LinearGradient>
          <LinearGradient id={`${id}-wallR`} x1="1" y1="0" x2="0" y2="0"><Stop offset="0" stopColor={p.wallB} /><Stop offset="1" stopColor={p.wallA} /></LinearGradient>
          <LinearGradient id={`${id}-ceil`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0E0808" /><Stop offset="1" stopColor={p.wallA} /></LinearGradient>
          <LinearGradient id={`${id}-floor`} x1="0" y1="1" x2="0" y2="0"><Stop offset="0" stopColor={p.floorB} /><Stop offset="1" stopColor={p.floorA} /></LinearGradient>
          <LinearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={deco.brassWhite} /><Stop offset="0.5" stopColor={deco.brass} /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient>
          <LinearGradient id={`${id}-door`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#C88A3E" /><Stop offset="0.5" stopColor={p.door} /><Stop offset="1" stopColor="#2A1408" /></LinearGradient>
          <RadialGradient id={`${id}-pool`} cx={VX} cy={VY + 10} r="150" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor={p.light} stopOpacity={0.55} /><Stop offset="0.45" stopColor={p.glow} stopOpacity={0.16} /><Stop offset="1" stopColor={p.glow} stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`${id}-chand`} cx={VX} cy="52" r="46" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} /><Stop offset="0.35" stopColor={p.light} stopOpacity={0.5} /><Stop offset="1" stopColor={p.light} stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`${id}-sconce`} cx="0" cy="0" r="1"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} /><Stop offset="0.4" stopColor={p.light} stopOpacity={0.45} /><Stop offset="1" stopColor={p.glow} stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`${id}-vig`} cx={VX} cy={VY} r="260" gradientUnits="userSpaceOnUse"><Stop offset="0.45" stopColor="#000" stopOpacity={0} /><Stop offset="1" stopColor="#000" stopOpacity={0.85} /></RadialGradient>
        </Defs>

        {/* shell: ceiling, walls, floor in one-point perspective */}
        <Polygon points={`0,0 ${W},0 ${VX + 70},${VY - 46} ${VX - 70},${VY - 46}`} fill={`url(#${id}-ceil)`} />
        <Polygon points={`0,0 ${VX - 70},${VY - 46} ${VX - 70},${VY + 40} 0,${H}`} fill={`url(#${id}-wallL)`} />
        <Polygon points={`${W},0 ${VX + 70},${VY - 46} ${VX + 70},${VY + 40} ${W},${H}`} fill={`url(#${id}-wallR)`} />
        <Polygon points={`0,${H} ${VX - 70},${VY + 40} ${VX + 70},${VY + 40} ${W},${H}`} fill={`url(#${id}-floor)`} />

        {/* stepped coffered ceiling */}
        {[0.18, 0.36, 0.52].map((t, i) => {
          const [lx, ly] = toV(0, 0, t), [rx] = toV(W, 0, t);
          return <Path key={i} d={`M${lx} ${ly} L${rx} ${ly} L${rx - 14 * (1 - t)} ${ly + 10 * (1 - t)} L${lx + 14 * (1 - t)} ${ly + 10 * (1 - t)} Z`} fill="none" stroke={deco.brass} strokeOpacity={0.35 - i * 0.07} strokeWidth={1.2} />;
        })}
        <Path d={`M${VX - 92} 14 Q${VX} -6 ${VX + 92} 14 L${VX + 74} 30 Q${VX} 14 ${VX - 74} 30 Z`} fill={p.light} opacity={0.12} />

        {/* far doors with sunburst transom */}
        <Rect x={VX - 70} y={VY - 46} width={140} height={86} fill="#0E0806" />
        <Path d={`M${VX - 34} ${VY + 40} L${VX - 34} ${VY - 8} Q${VX} ${VY - 40} ${VX + 34} ${VY - 8} L${VX + 34} ${VY + 40} Z`} fill={`url(#${id}-door)`} stroke={`url(#${id}-brass)`} strokeWidth={1.5} />
        {Array.from({length: 9}, (_, i) => { const a = Math.PI + (i / 8) * Math.PI; return <Path key={i} d={`M${VX} ${VY - 6} L${VX + Math.cos(a) * 30} ${VY - 6 + Math.sin(a) * 28}`} stroke={deco.brassHighlight} strokeOpacity={0.6} strokeWidth={0.8} />; })}
        <Path d={`M${VX} ${VY - 4} L${VX} ${VY + 40}`} stroke={deco.brassShadow} strokeWidth={1.2} />
        {[-1, 1].map((d) => (
          <G key={d}>
            <Path d={`M${VX + d * 20} ${VY + 4} L${VX + d * 26} ${VY + 14} L${VX + d * 20} ${VY + 24} L${VX + d * 14} ${VY + 14} Z`} fill="none" stroke={deco.brassHighlight} strokeOpacity={0.7} strokeWidth={0.7} />
            <Rect x={VX + d * 50 - 3} y={VY + 18} width={6} height={22} fill={`url(#${id}-brass)`} />
            <Ellipse cx={VX + d * 50} cy={VY + 14} rx={7} ry={5} fill={p.light} opacity={0.8} />
          </G>
        ))}

        {/* fluted pilasters receding down both walls, each with a sconce */}
        {depths.map((t, i) => {
          const [lx, ty] = toV(0, 0, t + 0.06), [, by] = toV(0, H, t + 0.06);
          const [rx] = toV(W, 0, t + 0.06);
          const w = 18 * (1 - t);
          return (
            <G key={i}>
              {[[lx, 1], [rx, -1]].map(([x, d]) => (
                <G key={d}>
                  <Rect x={x - (d === 1 ? 0 : w)} y={ty} width={w} height={by - ty} fill={p.wallB} opacity={0.85} />
                  {[0.25, 0.5, 0.75].map((f) => <Path key={f} d={`M${x - d * -w * f} ${ty + 4} L${x - d * -w * f} ${by - 4}`} stroke={deco.brass} strokeOpacity={0.25} strokeWidth={0.6} />)}
                  <Rect x={x - (d === 1 ? 0 : w)} y={ty} width={w} height={3 * (1 - t) + 1} fill={`url(#${id}-brass)`} />
                  <Ellipse cx={x + d * (w + 8 * (1 - t))} cy={ty + (by - ty) * 0.34} rx={10 * (1 - t) + 3} ry={16 * (1 - t) + 4} fill={`url(#${id}-sconce)`} />
                  <Rect x={x + d * (w + 8 * (1 - t)) - 2 * (1 - t) - 1} y={ty + (by - ty) * 0.3} width={4 * (1 - t) + 2} height={10 * (1 - t) + 3} fill={p.light} opacity={0.9} />
                </G>
              ))}
            </G>
          );
        })}

        {/* terrazzo floor: receding bands and the brass diamond inlay */}
        {[0.15, 0.32, 0.48, 0.6].map((t) => { const [lx, y] = toV(0, H, t), [rx] = toV(W, H, t); return <Path key={t} d={`M${lx} ${y} L${rx} ${y}`} stroke={deco.brass} strokeOpacity={0.18} strokeWidth={0.8} />; })}
        <Path d={`M${VX} ${VY + 44} L${VX + 120} ${H - 40} L${VX} ${H + 30} L${VX - 120} ${H - 40} Z`} fill="none" stroke={`url(#${id}-brass)`} strokeWidth={2.5} opacity={0.85} />
        <Path d={`M${VX} ${VY + 62} L${VX + 80} ${H - 46} L${VX} ${H + 6} L${VX - 80} ${H - 46} Z`} fill={p.light} opacity={0.06} stroke={deco.brass} strokeOpacity={0.4} strokeWidth={1} />
        <Path d={`M${VX - 70} ${VY + 40} L${-40} ${H} M${VX + 70} ${VY + 40} L${W + 40} ${H}`} stroke={deco.brass} strokeOpacity={0.3} strokeWidth={1} />

        {/* light pool on the floor and the chandelier */}
        <Ellipse cx={VX} cy={VY + 70} rx={150} ry={60} fill={`url(#${id}-pool)`} />
        <Path d={`M${VX} 0 L${VX} 30`} stroke={deco.brass} strokeWidth={1} />
        <Circle cx={VX} cy={52} r={46} fill={`url(#${id}-chand)`} />
        {[[36, 6], [28, 5], [18, 4]].map(([rx, ry], i) => (
          <Ellipse key={i} cx={VX} cy={34 + i * 11} rx={rx} ry={ry} fill="none" stroke={`url(#${id}-brass)`} strokeWidth={1.6} />
        ))}
        {Array.from({length: 11}, (_, i) => <Path key={i} d={`M${VX - 30 + i * 6} 38 L${VX - 30 + i * 6} ${46 + (i % 2) * 6}`} stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={0.8} />)}
        <Path d={`M${VX - 10} 66 L${VX} 76 L${VX + 10} 66`} fill={p.light} opacity={0.9} />

        {/* Carpe Diem: a sweeping stair on the right and velvet club chairs; Finesse: twin deco benches */}
        {side === 'him' ? (
          <G>
            {Array.from({length: 9}, (_, i) => <Rect key={i} x={262 + i * 8} y={158 - i * 7} width={60} height={7} fill={i % 2 ? '#22140A' : '#2E1A0C'} stroke={deco.brass} strokeOpacity={0.25} strokeWidth={0.5} />)}
            <Path d="M262 158 L334 95" stroke={`url(#${id}-brass)`} strokeWidth={2} />
            {[[48, 214], [112, 228], [292, 222]].map(([x, y], i) => (
              <G key={i}>
                <Rect x={x - 26} y={y - 22} width={52} height={30} rx={10} fill={p.velvet} />
                <Rect x={x - 32} y={y - 8} width={12} height={22} rx={5} fill={p.velvet} />
                <Rect x={x + 20} y={y - 8} width={12} height={22} rx={5} fill={p.velvet} />
                <Rect x={x - 22} y={y + 2} width={44} height={10} rx={3} fill="#3A120A" />
              </G>
            ))}
            <Path d="M200 232 L200 200 M190 200 Q200 190 210 200 Z" stroke={`url(#${id}-brass)`} strokeWidth={2} fill={p.light} fillOpacity={0.7} />
          </G>
        ) : (
          <G>
            {[[64, 1], [336, -1]].map(([x, d]) => (
              <G key={x}>
                <Path d={`M${x - 34} 214 Q${x} 200 ${x + 34} 214 L${x + 30} 228 Q${x} 218 ${x - 30} 228 Z`} fill={p.velvet} />
                <Path d={`M${x - 36} 210 Q${x - 44} 236 ${x - 30} 262 M${x + 36} 210 Q${x + 44} 236 ${x + 30} 262`} stroke={`url(#${id}-brass)`} strokeWidth={4} fill="none" strokeLinecap="round" />
                <Circle cx={x - 36} cy={208} r={5} fill={`url(#${id}-brass)`} />
                <Circle cx={x + 36} cy={208} r={5} fill={`url(#${id}-brass)`} />
                <Path d={`M${x - 30} 240 Q${x} 236 ${x + 30} 240`} stroke={deco.brassShadow} strokeWidth={2} fill="none" opacity={d ? 0.8 : 0.8} />
              </G>
            ))}
          </G>
        )}

        <Rect x={0} y={0} width={W} height={H} fill={`url(#${id}-vig)`} />
        {dim > 0 ? <Rect x={0} y={0} width={W} height={H} fill="#000" opacity={dim} /> : null}
      </Svg>
    </View>
  );
}
