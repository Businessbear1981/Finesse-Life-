// Guilloché — the engine-turned line work of banknotes and watch dials. A rosette (overlaid
// hypotrochoids) and a band (phase-shifted waves) for borders. Paths are computed once per size.
import {useMemo} from 'react';
import Svg, {Defs, G, Path} from 'react-native-svg';
import {deco, type Metal} from '@/lib/deco';
import {MetalGradient, useSvgId} from './util';

/** Hypotrochoid rosette paths centred on (cx, cy) fitting radius `R`. */
export function rosettePaths(cx: number, cy: number, R: number, opts: {lobes?: number; curves?: number; depth?: number; steps?: number} = {}) {
  const lobes = opts.lobes ?? 18, curves = opts.curves ?? 10, depth = opts.depth ?? 0.32, steps = opts.steps ?? 360;
  const out: string[] = [];
  for (let c = 0; c < curves; c++) {
    const phase = (c / curves) * ((2 * Math.PI) / lobes);
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const rr = R * (1 - depth) + R * depth * (0.5 + 0.5 * Math.cos(lobes * t + phase * lobes));
      const wob = 1 + 0.035 * Math.sin((lobes / 2) * t - phase * 3);
      const x = cx + rr * wob * Math.cos(t), y = cy + rr * wob * Math.sin(t);
      d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    out.push(`${d}Z`);
  }
  return out;
}

/** Waves for a guilloché border band of width w, height h. */
export function bandPaths(w: number, h: number, opts: {waves?: number; lines?: number} = {}) {
  const waves = opts.waves ?? Math.max(4, Math.round(w / 22)), lines = opts.lines ?? 7;
  const out: string[] = [];
  for (let l = 0; l < lines; l++) {
    const ph = (l / lines) * Math.PI;
    let d = '';
    const steps = Math.max(60, Math.round(w / 1.5));
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const t = (x / w) * waves * Math.PI * 2;
      const y = h / 2 + (h / 2 - 0.6) * Math.sin(t + ph) * Math.cos(t / 2 - ph);
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(2)}`;
    }
    out.push(d);
  }
  return out;
}

export function GuillocheRosette({size, color = deco.brass, opacity = 0.6, lobes = 18, curves = 10, depth = 0.32, rings = 2, strokeWidth = 0.5, metal}: {
  size: number; color?: string; opacity?: number; lobes?: number; curves?: number; depth?: number; rings?: number; strokeWidth?: number; metal?: Metal;
}) {
  const id = useSvgId('gr');
  const paths = useMemo(() => {
    const c = size / 2, all: string[] = [];
    for (let k = 0; k < rings; k++) all.push(...rosettePaths(c, c, c * (1 - k * 0.34) - 1, {lobes: lobes - k * 4, curves, depth: depth + k * 0.08}));
    return all;
  }, [size, lobes, curves, depth, rings]);
  return (
    <Svg width={size} height={size}>
      {metal ? <Defs><MetalGradient id={id} metal={metal} /></Defs> : null}
      <G opacity={opacity}>{paths.map((d, i) => <Path key={i} d={d} fill="none" stroke={metal ? `url(#${id})` : color} strokeWidth={strokeWidth} />)}</G>
    </Svg>
  );
}

export function GuillocheBand({width, height = 14, color = deco.brass, opacity = 0.55, lines = 7}: {width: number; height?: number; color?: string; opacity?: number; lines?: number}) {
  const paths = useMemo(() => bandPaths(width, height, {lines}), [width, height, lines]);
  return (
    <Svg width={width} height={height}>
      <G opacity={opacity}>{paths.map((d, i) => <Path key={i} d={d} fill="none" stroke={color} strokeWidth={0.5} />)}</G>
    </Svg>
  );
}
