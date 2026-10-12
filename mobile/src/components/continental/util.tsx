// Small helpers shared by the Continental kit: SVG-safe unique ids, a seeded random source (so
// textures are stable between renders and platforms), metal gradient stops, and the reduced-motion flag.
import {useId, useState} from 'react';
import type {LayoutChangeEvent} from 'react-native';
import {useReducedMotion} from 'react-native-reanimated';
import {LinearGradient, RadialGradient, Stop} from 'react-native-svg';
import {metals, type Metal} from '@/lib/deco';

/** Gradient ids must be unique per page on web (ids are document-global) and free of ':' for url(#…). */
export function useSvgId(prefix: string) {
  const raw = useId();
  return `${prefix}${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** Mulberry32 — tiny deterministic PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Linear metal gradient, top-left → bottom-right by default, with the specular band from `metals`. */
export function MetalGradient({id, metal = 'brass', x1 = '0', y1 = '0', x2 = '1', y2 = '1', reverse}: {id: string; metal?: Metal; x1?: string; y1?: string; x2?: string; y2?: string; reverse?: boolean}) {
  const stops = metals[metal];
  return (
    <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops.map(([o, c], i) => <Stop key={i} offset={reverse ? 1 - o : o} stopColor={c} />)}
    </LinearGradient>
  );
}

/** A soft radial light — lamp glow, specular hotspot. */
export function Glow({id, color, opacity = 1, cx = '0.5', cy = '0.5', r = '0.5', mid = 0.45}: {id: string; color: string; opacity?: number; cx?: string; cy?: string; r?: string; mid?: number}) {
  return (
    <RadialGradient id={id} cx={cx} cy={cy} r={r} fx={cx} fy={cy}>
      <Stop offset="0" stopColor={color} stopOpacity={opacity} />
      <Stop offset={String(mid)} stopColor={color} stopOpacity={opacity * 0.35} />
      <Stop offset="1" stopColor={color} stopOpacity={0} />
    </RadialGradient>
  );
}

/** Measure a box once it lays out (the kit draws stepped corners and veins in real pixels). */
export function useBox() {
  const [box, setBox] = useState<{w: number; h: number} | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    const w = Math.round(width), h = Math.round(height);
    setBox((b) => (b && b.w === w && b.h === h ? b : {w, h}));
  };
  return {box, onLayout};
}

/** True when the member asked the OS for less motion: animations settle immediately. */
export function useCalm() {
  return useReducedMotion();
}

/** One SVG path made of many 1-unit specks — grain, sparkle and paper tooth in a single element. */
export function specks(w: number, h: number, count: number, seed: number, size = 0.8) {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h, s = size * (0.5 + r());
    d += `M${x.toFixed(1)} ${y.toFixed(1)}h${s.toFixed(2)}v${s.toFixed(2)}h-${s.toFixed(2)}z`;
  }
  return d;
}

/** Horizontal brushed-metal hairlines split into three opacity bands (3 elements, hundreds of lines). */
export function brushed(w: number, h: number, seed: number, step = 0.9) {
  const r = rng(seed);
  const bands = ['', '', ''];
  for (let y = 0; y < h; y += step * (0.6 + r() * 0.9)) {
    const b = Math.floor(r() * 3);
    const x0 = r() * w * 0.2, x1 = w - r() * w * 0.2;
    bands[b] += `M${x0.toFixed(1)} ${y.toFixed(2)}H${x1.toFixed(1)}`;
  }
  return bands;
}

