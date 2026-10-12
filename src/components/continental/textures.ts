/**
 * Continental textures — SVG turbulence rendered as data-URI background images.
 * No network, no raster assets; the browser rasterises each once and caches it.
 */

const svgUri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s{2,}/g, ' '))}")`;

/** Fine film grain, alpha only. */
export const grainUri = (opacity = 0.5, freq = 0.85) =>
  svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>
    <filter id='g'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' stitchTiles='stitch'/>
    <feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${opacity} 0'/></filter>
    <rect width='100%' height='100%' filter='url(#g)'/></svg>`);

/** Anisotropic brushed-metal streaks (horizontal). Use with mix-blend-mode overlay/soft-light. */
export const brushedUri = (strength = 0.55) =>
  svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300' preserveAspectRatio='none'>
    <filter id='b' x='0' y='0' width='100%' height='100%'>
      <feTurbulence type='fractalNoise' baseFrequency='0.0025 0.95' numOctaves='3' seed='3'/>
      <feColorMatrix type='saturate' values='0'/>
      <feComponentTransfer><feFuncA type='linear' slope='0' intercept='${strength}'/></feComponentTransfer>
    </filter>
    <rect width='100%' height='100%' filter='url(#b)'/></svg>`);

/** Sparse bright specks — the "nano" sparkle in black anodised metal or lacquer. */
export const sparkleUri = (density = 0.6) =>
  svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>
    <filter id='s'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' seed='11' stitchTiles='stitch'/>
      <feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1.4 1.4 1.4 0 -3.15'/>
      <feComponentTransfer><feFuncA type='linear' slope='${(density * 4).toFixed(2)}'/></feComponentTransfer>
    </filter>
    <rect width='100%' height='100%' filter='url(#s)'/></svg>`);

/** Nero Marquina veining: thin bands carved out of fractal noise. */
export const marbleUri = (seed = 7, tint = '236,230,218') =>
  svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900' preserveAspectRatio='xMidYMid slice'>
    <filter id='v' x='0' y='0' width='100%' height='100%'>
      <feTurbulence type='fractalNoise' baseFrequency='0.0022 0.0062' numOctaves='6' seed='${seed}' result='n'/>
      <feColorMatrix in='n' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 0' result='a'/>
      <feComponentTransfer in='a' result='vein'><feFuncA type='table' tableValues='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.95 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0'/></feComponentTransfer>
      <feTurbulence type='fractalNoise' baseFrequency='0.006 0.016' numOctaves='5' seed='${seed + 13}' result='n2'/>
      <feColorMatrix in='n2' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 0' result='a2'/>
      <feComponentTransfer in='a2' result='hair'><feFuncA type='table' tableValues='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.45 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0'/></feComponentTransfer>
      <feMerge result='m'><feMergeNode in='vein'/><feMergeNode in='hair'/></feMerge>
      <feGaussianBlur in='m' stdDeviation='0.6'/>
    </filter>
    <rect width='100%' height='100%' fill='rgb(${tint})' filter='url(#v)'/></svg>`);

/** Soft cloudy depth for marble ground. */
export const cloudUri = (seed = 2) =>
  svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='700' height='700' preserveAspectRatio='xMidYMid slice'>
    <filter id='c' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.004' numOctaves='4' seed='${seed}'/>
    <feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.9 0 0 0 -0.32'/></filter>
    <rect width='100%' height='100%' filter='url(#c)'/></svg>`);

/** Velvet pile — vertical micro-streaks plus crushed patches. */
export const velvetUri = () =>
  svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>
    <filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.95 0.16' numOctaves='2' seed='5' stitchTiles='stitch'/>
    <feColorMatrix values='0 0 0 0 1 0 0 0 0 0.8 0 0 0 0 0.82 0 0 0 0.13 0'/></filter>
    <rect width='100%' height='100%' filter='url(#p)'/></svg>`);

/** Cotton card stock fibres for ivory calling cards. */
export const paperUri = () =>
  svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
    <filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.65 0.9' numOctaves='3' seed='9' stitchTiles='stitch'/>
    <feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0 0.12 0 0 0 0.14 0'/></filter>
    <rect width='100%' height='100%' filter='url(#f)'/></svg>`);

/* ─── Guilloché (banknote engraving) — generated, deterministic ─────────── */

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Epitrochoid rosette path centred on 0,0, fits within radius ~ `size`. */
export function rosettePath(size: number, lobes = 18, depth = 0.32, turns = 1, phase = 0): string {
  const steps = 720 * turns;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const r = size * (1 - depth / 2 + (depth / 2) * Math.cos(lobes * t + phase));
    const x = r2(r * Math.cos(t));
    const y = r2(r * Math.sin(t));
    d += `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  }
  return `${d}Z`;
}

/** Interlaced sine band (border guilloché), `width` × `height`, `lines` strands. */
export function wavePaths(width: number, height: number, lines = 6, waves = 12): string[] {
  const out: string[] = [];
  for (let l = 0; l < lines; l++) {
    const phase = (l / lines) * Math.PI;
    let d = '';
    for (let i = 0; i <= 240; i++) {
      const x = (i / 240) * width;
      const y = height / 2 + (height / 2 - 1) * Math.sin((i / 240) * Math.PI * 2 * waves + phase) * Math.cos((i / 240) * Math.PI * 2 + phase / 2);
      d += `${i === 0 ? 'M' : 'L'}${r2(x)} ${r2(y)}`;
    }
    out.push(d);
  }
  return out;
}
