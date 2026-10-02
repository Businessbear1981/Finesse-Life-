// Art Deco geometry + palette helpers shared by the KeyLock, the Private Lift and room plates.
import {Easing} from 'react-native-reanimated';

export const deco = {
  ink: '#0A0406',
  oxblood: '#17090D',
  burgundy: '#3A121B',
  brassDeep: '#4A3416',
  brassShadow: '#6B5028',
  brassMid: '#8A6A2A',
  brass: '#C9A961',
  brassHighlight: '#E8C87A',
  brassLight: '#F0D88A',
  brassWhite: '#FFF1C2',
  cream: '#F4E8D0',
  champagne: '#FFE4A0',
  lamp: '#FFA96B',
  pink: '#FF4D7D',
} as const;

export const fonts = {
  display: 'PlayfairDisplay_400Regular_Italic',
  displayBold: 'PlayfairDisplay_700Bold_Italic',
  label: 'Marcellus_400Regular',
  body: 'Manrope_500Medium',
} as const;

// Cinematic ease from the Finesse motion spec: [0.16, 1, 0.3, 1].
export const easeCine = Easing.bezier(0.16, 1, 0.3, 1);
export const easeSlide = Easing.bezier(0.4, 0, 0.2, 1);

/** Point on a circle; 0deg = 12 o'clock, clockwise. */
export function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return {x: cx + r * Math.sin(a), y: cy - r * Math.cos(a)};
}

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${c(r1, r2)},${c(g1, g2)},${c(b1, b2)})`;
}

/**
 * SVG has no conic gradient, so a polished brass bezel is drawn as many thin ring wedges whose
 * colour follows the conic stops. 120 wedges reads as continuous metal at phone sizes.
 */
export function conicRing(
  cx: number, cy: number, rOuter: number, rInner: number,
  stops: Array<[number, string]>, fromDeg = 210, wedges = 120,
) {
  const out: Array<{d: string; fill: string}> = [];
  const colorAt = (p: number) => {
    for (let i = 0; i < stops.length - 1; i++) {
      const [p0, c0] = stops[i];
      const [p1, c1] = stops[i + 1];
      if (p >= p0 && p <= p1) return mix(c0, c1, (p - p0) / (p1 - p0 || 1));
    }
    return stops[stops.length - 1][1];
  };
  for (let i = 0; i < wedges; i++) {
    const a0 = fromDeg + (i * 360) / wedges;
    const a1 = fromDeg + ((i + 1.15) * 360) / wedges; // slight overlap hides seams
    const o0 = polar(cx, cy, rOuter, a0), o1 = polar(cx, cy, rOuter, a1);
    const i1 = polar(cx, cy, rInner, a1), i0 = polar(cx, cy, rInner, a0);
    out.push({
      d: `M${o0.x.toFixed(2)} ${o0.y.toFixed(2)} A${rOuter} ${rOuter} 0 0 1 ${o1.x.toFixed(2)} ${o1.y.toFixed(2)} L${i1.x.toFixed(2)} ${i1.y.toFixed(2)} A${rInner} ${rInner} 0 0 0 ${i0.x.toFixed(2)} ${i0.y.toFixed(2)} Z`,
      fill: colorAt(i / wedges),
    });
  }
  return out;
}

export const BEZEL_STOPS: Array<[number, string]> = [
  [0, deco.brassDeep], [0.12, deco.brassLight], [0.25, deco.brassMid], [0.4, deco.brassHighlight],
  [0.55, '#5A4018'], [0.68, deco.brassWhite], [0.82, deco.brassMid], [1, deco.brassDeep],
];

/** Equilateral-ish triangle (apex at angle) centred on (cx, cy) — the KeyLock puzzle piece. */
export function trianglePath(cx: number, cy: number, w: number, h: number, deg: number) {
  const pts = [[0, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]].map(([x, y]) => {
    const a = (deg * Math.PI) / 180;
    return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  });
  return `M${pts.map((p) => p.map((v) => v.toFixed(2)).join(' ')).join(' L')} Z`;
}

export const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
