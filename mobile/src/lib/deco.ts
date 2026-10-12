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

// Design type: Playfair Display italic (display), Cinzel (caps), Cormorant Garamond italic (script),
// Marcellus (labels), Manrope (body), JetBrains Mono (status lines).
export const fonts = {
  display: 'PlayfairDisplay_400Regular_Italic',
  displayBold: 'PlayfairDisplay_700Bold_Italic',
  displayHeavy: 'PlayfairDisplay_800ExtraBold_Italic',
  label: 'Marcellus_400Regular',
  caps: 'Cinzel_600SemiBold',
  capsBold: 'Cinzel_700Bold',
  script: 'CormorantGaramond_400Regular_Italic',
  body: 'Manrope_500Medium',
  bodyStrong: 'Manrope_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
} as const;

/** Track accents from the design: Finesse (her) blush, Carpe Diem (him) amber. */
export const track = {
  her: {acc: deco.pink, soft: '#FFB8C8', deep: '#6B1424', name: 'Finesse'},
  him: {acc: deco.lamp, soft: '#FFD2B0', deep: '#3E220C', name: 'Carpe Diem'},
} as const;
export type Side = keyof typeof track;

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

/**
 * One keystone of the six-piece puzzle ring: an annular sector from a0 to a0+span with a dovetail
 * tab on its clockwise edge and a matching socket cut into its counter-clockwise edge, so the six
 * pieces interlock into a single brass ring when seated.
 */
export function keystonePath(cx: number, cy: number, rIn: number, rOut: number, a0: number, span: number, inset = 0) {
  const a1 = a0 + span;
  const ri = rIn + inset, ro = rOut - inset;
  const s0 = a0 + (inset ? inset * 0.9 : 0), s1 = a1 - (inset ? inset * 0.9 : 0);
  const P = (r: number, a: number) => { const p = polar(cx, cy, r, a); return `${p.x.toFixed(2)} ${p.y.toFixed(2)}`; };
  const rm = (ri + ro) / 2;
  if (inset) {
    return `M${P(ro, s0)} A${ro} ${ro} 0 0 1 ${P(ro, s1)} L${P(ri, s1)} A${ri} ${ri} 0 0 0 ${P(ri, s0)} Z`;
  }
  const kr = 6.5; // rounded knuckle: a knob on the clockwise edge, a matching cup on the other
  return [
    `M${P(ro, a0)}`,
    `A${ro} ${ro} 0 0 1 ${P(ro, a1)}`,
    `L${P(rm + kr, a1)}`, `A${kr} ${kr} 0 0 1 ${P(rm - kr, a1)}`,
    `L${P(ri, a1)}`,
    `A${ri} ${ri} 0 0 0 ${P(ri, a0)}`,
    `L${P(rm - kr, a0)}`, `A${kr} ${kr} 0 0 0 ${P(rm + kr, a0)}`,
    'Z',
  ].join(' ');
}

/** Short arc path (for engraved steps and glints). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
  return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${r} ${r} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

/* ───────────── Continental materials (additive) ─────────────
 * A members' club inside a 1920s grand hotel: black lacquer, polished brass and gold leaf, oxblood
 * velvet, ivory card stock, black marble, smoked mirror. Each material is a small set of gradient stops
 * so the kit in components/continental can draw it in SVG with a specular band, never as flat fill.
 */
export const continental = {
  lacquer: '#07060A',
  lacquerHi: '#1B1820',
  lacquerEdge: '#2A2630',
  marble: '#0C0B0D',
  marbleVein: '#D9D2C3',
  velvet: '#4A0C18',
  velvetDeep: '#1C0409',
  velvetHi: '#7A1A2C',
  ivory: '#F3EAD6',
  ivoryShade: '#DCCBA8',
  ink: '#1A120C',
  engrave: '#2A1C0E',
  oxbloodInk: '#6B1424',
  mirror: '#16161A',
  goldLeaf: '#E9C46A',
  goldLeafDeep: '#7A5414',
  hairline: 'rgba(201,169,97,0.55)',
  hairlineSoft: 'rgba(201,169,97,0.25)',
} as const;

/** Metal stop sets: [offset, colour]. Drawn top-left → bottom-right with a bright specular band. */
export const metals = {
  brass: [[0, '#5A3E14'], [0.18, '#C9A961'], [0.34, '#FFF1C2'], [0.46, '#D8B66A'], [0.7, '#8A6A2A'], [0.88, '#E8C87A'], [1, '#4A3416']],
  goldLeaf: [[0, '#6E4A10'], [0.2, '#D4A846'], [0.38, '#FFF4C8'], [0.5, '#E9C46A'], [0.75, '#9A7020'], [0.9, '#F0D88A'], [1, '#5A3C0C']],
  platinum: [[0, '#8E9298'], [0.2, '#D9DBDE'], [0.38, '#FBFBFA'], [0.52, '#C4C7CC'], [0.74, '#9EA2A8'], [0.9, '#E6E7E9'], [1, '#7A7E85']],
  roseGold: [[0, '#7E4148'], [0.2, '#D8A08E'], [0.38, '#FBE1D3'], [0.52, '#E2AE98'], [0.74, '#A8646C'], [0.9, '#F2C9B8'], [1, '#6E3840']],
  nanoBlack: [[0, '#050506'], [0.25, '#121215'], [0.42, '#26252A'], [0.55, '#0E0E10'], [0.8, '#08080A'], [1, '#18171B']],
  gunmetal: [[0, '#1A1A1E'], [0.2, '#4A4A52'], [0.38, '#8A8A94'], [0.5, '#55555E'], [0.75, '#2A2A30'], [0.9, '#6A6A74'], [1, '#141418']],
} as const satisfies Record<string, ReadonlyArray<readonly [number, string]>>;
export type Metal = keyof typeof metals;

/** Slow, weighty motion for the Continental rooms (vault door, lamp glow, foil sheen). */
export const weighty = {
  door: 1600,
  bolts: 700,
  wheel: 1100,
  lamp: 4200,
  sheen: 2600,
  ease: Easing.bezier(0.65, 0, 0.25, 1),
} as const;
