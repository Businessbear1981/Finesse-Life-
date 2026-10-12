// Materials, not flat fills: black lacquer, black marble, oxblood velvet (optionally channel-tufted),
// ivory card stock, smoked mirror and brushed metal. Each draws itself in SVG behind its children, sized
// to the real box so veins, grain and tufting never stretch.
import {useMemo, type ReactNode} from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import Svg, {ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {continental as C, type Metal} from '@/lib/deco';
import {MetalGradient, brushed, rng, specks, useBox, useSvgId} from './util';

export type Material = 'lacquer' | 'marble' | 'velvet' | 'tufted' | 'ivory' | 'mirror' | 'metal';

type Props = {
  kind: Material;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  seed?: number;
  metal?: Metal;
  /** Warm light falling from above (lamp) — 0..1. */
  light?: number;
};

export function Surface({kind, children, style, radius = 0, seed = 7, metal = 'brass', light = 0}: Props) {
  const {box, onLayout} = useBox();
  return (
    <View onLayout={onLayout} style={[{borderRadius: radius, overflow: 'hidden'}, style]}>
      {box ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <MaterialArt kind={kind} w={box.w} h={box.h} seed={seed} metal={metal} light={light} radius={radius} />
        </View>
      ) : <View style={[StyleSheet.absoluteFill, {backgroundColor: FALLBACK[kind]}]} />}
      {children}
    </View>
  );
}

const FALLBACK: Record<Material, string> = {lacquer: C.lacquer, marble: C.marble, velvet: C.velvet, tufted: C.velvet, ivory: C.ivory, mirror: C.mirror, metal: '#8A6A2A'};

export function MaterialArt({kind, w, h, seed = 7, metal = 'brass', light = 0, radius = 0, clip}: {kind: Material; w: number; h: number; seed?: number; metal?: Metal; light?: number; radius?: number; /** Optional outline (in this box's pixels) the material is cut to. */ clip?: string}) {
  const id = useSvgId('m');
  const art = useMemo(() => {
    const r = rng(seed * 31 + Math.round(w) * 7 + Math.round(h));
    if (kind === 'marble') {
      // a few long wandering veins + fine secondaries; one warm gold vein
      const veins: Array<{d: string; wide: number; op: number; gold?: boolean}> = [];
      const n = 3 + Math.round(w * h / 60000);
      for (let v = 0; v < n + 4; v++) {
        let x = r() * w * 1.2 - w * 0.1, y = -10;
        const dir = r() > 0.5 ? 1 : -1;
        let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
        const segs = 4 + Math.floor(r() * 4);
        for (let s = 0; s < segs; s++) {
          const nx = x + dir * (r() * w * 0.35), ny = y + (h + 20) / segs;
          d += ` C${(x + (r() - 0.5) * w * 0.4).toFixed(1)} ${(y + (ny - y) * 0.3).toFixed(1)} ${(nx + (r() - 0.5) * w * 0.3).toFixed(1)} ${(y + (ny - y) * 0.7).toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
          x = nx; y = ny;
        }
        veins.push({d, wide: v < n ? 1.1 : 0.45, op: v < n ? 0.32 : 0.16, gold: v === 1});
      }
      return {veins, grain: specks(w, h, Math.min(900, (w * h) / 90), seed, 0.7)};
    }
    if (kind === 'ivory') return {grain: specks(w, h, Math.min(1400, (w * h) / 40), seed, 0.6), grain2: specks(w, h, Math.min(500, (w * h) / 120), seed + 3, 0.9)};
    if (kind === 'velvet' || kind === 'tufted') return {grain: specks(w, h, Math.min(1600, (w * h) / 30), seed, 0.7)};
    if (kind === 'lacquer') return {grain: specks(w, h, Math.min(600, (w * h) / 140), seed, 0.5)};
    if (kind === 'metal') return {bands: brushed(w, h, seed)};
    if (kind === 'mirror') {
      const fox: string[] = [];
      for (let i = 0; i < 14; i++) {
        const edge = r() > 0.5;
        const x = edge ? (r() > 0.5 ? r() * w * 0.12 : w - r() * w * 0.12) : r() * w;
        const y = edge ? r() * h : (r() > 0.5 ? r() * h * 0.12 : h - r() * h * 0.12);
        const s = 3 + r() * 10;
        fox.push(`M${x - s} ${y}a${s} ${s * 0.7} 0 1 0 ${2 * s} 0a${s} ${s * 0.7} 0 1 0 ${-2 * s} 0`);
      }
      return {fox: fox.join(''), grain: specks(w, h, Math.min(500, (w * h) / 160), seed, 0.6)};
    }
    return {};
  }, [kind, w, h, seed]) as {veins?: Array<{d: string; wide: number; op: number; gold?: boolean}>; grain?: string; grain2?: string; bands?: string[]; fox?: string};

  const lamp = light > 0 ? (
    <>
      <Defs>
        <RadialGradient id={`${id}l`} cx="0.5" cy="0" r="0.9" fx="0.5" fy="0">
          <Stop offset="0" stopColor="#FFC88A" stopOpacity={0.32 * light} />
          <Stop offset="0.45" stopColor="#FF9A5A" stopOpacity={0.1 * light} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={w} height={h} fill={`url(#${id}l)`} />
    </>
  ) : null;

  const rr = radius;
  return (
    <Svg width={w} height={h}>
      {clip ? <Defs><ClipPath id={`${id}k`}><Path d={clip} /></ClipPath></Defs> : null}
      <G clipPath={clip ? `url(#${id}k)` : undefined}>
      {kind === 'lacquer' ? (
        <>
          <Defs>
            <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={C.lacquerHi} /><Stop offset="0.35" stopColor={C.lacquer} /><Stop offset="1" stopColor="#020203" /></LinearGradient>
            <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0.35"><Stop offset="0" stopColor="#FFF" stopOpacity={0} /><Stop offset="0.5" stopColor="#FFF" stopOpacity={0.075} /><Stop offset="1" stopColor="#FFF" stopOpacity={0} /></LinearGradient>
          </Defs>
          <Rect width={w} height={h} rx={rr} fill={`url(#${id}b)`} />
          <Path d={`M${w * 0.18} 0 L${w * 0.46} 0 L${w * 0.12} ${h} L${-w * 0.16} ${h} Z`} fill={`url(#${id}s)`} />
          <Path d={`M${w * 0.52} 0 L${w * 0.58} 0 L${w * 0.24} ${h} L${w * 0.18} ${h} Z`} fill="#FFF" opacity={0.025} />
          <Path d={art.grain} fill="#FFF" opacity={0.05} />
          {lamp}
          <Path d={`M${rr} 0.5 H${w - rr}`} stroke="#FFF" strokeOpacity={0.14} />
        </>
      ) : null}

      {kind === 'marble' ? (
        <>
          <Defs>
            <RadialGradient id={`${id}b`} cx="0.35" cy="0.25" r="0.95"><Stop offset="0" stopColor="#1C1A1D" /><Stop offset="0.6" stopColor={C.marble} /><Stop offset="1" stopColor="#030304" /></RadialGradient>
            <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF" stopOpacity={0.07} /><Stop offset="0.4" stopColor="#FFF" stopOpacity={0} /><Stop offset="1" stopColor="#FFF" stopOpacity={0.02} /></LinearGradient>
          </Defs>
          <Rect width={w} height={h} rx={rr} fill={`url(#${id}b)`} />
          <Path d={art.grain} fill="#FFF" opacity={0.06} />
          {art.veins?.map((v, i) => (
            <G key={i}>
              <Path d={v.d} fill="none" stroke={v.gold ? C.goldLeaf : C.marbleVein} strokeOpacity={v.op * 0.18} strokeWidth={v.wide * 7} strokeLinecap="round" />
              <Path d={v.d} fill="none" stroke={v.gold ? C.goldLeaf : C.marbleVein} strokeOpacity={v.gold ? 0.55 : v.op} strokeWidth={v.wide} strokeLinecap="round" />
            </G>
          ))}
          <Rect width={w} height={h} rx={rr} fill={`url(#${id}s)`} />
          {lamp}
        </>
      ) : null}

      {kind === 'velvet' || kind === 'tufted' ? (
        <>
          <Defs>
            <RadialGradient id={`${id}b`} cx="0.5" cy="0.3" r="0.85"><Stop offset="0" stopColor={C.velvetHi} /><Stop offset="0.55" stopColor={C.velvet} /><Stop offset="1" stopColor={C.velvetDeep} /></RadialGradient>
            <LinearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#000" stopOpacity={0.55} /><Stop offset="0.18" stopColor="#000" stopOpacity={0.05} /><Stop offset="0.42" stopColor="#FFB0B8" stopOpacity={0.09} /><Stop offset="0.8" stopColor="#000" stopOpacity={0.1} /><Stop offset="1" stopColor="#000" stopOpacity={0.6} /></LinearGradient>
          </Defs>
          <Rect width={w} height={h} rx={rr} fill={`url(#${id}b)`} />
          {kind === 'tufted' ? Array.from({length: Math.ceil(w / 26)}, (_, i) => <Rect key={i} x={i * 26} y={0} width={26} height={h} fill={`url(#${id}c)`} />) : null}
          <Path d={art.grain} fill="#FF9AAA" opacity={0.07} />
          {lamp}
        </>
      ) : null}

      {kind === 'ivory' ? (
        <>
          <Defs>
            <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FAF3E3" /><Stop offset="0.55" stopColor={C.ivory} /><Stop offset="1" stopColor={C.ivoryShade} /></LinearGradient>
          </Defs>
          <Rect width={w} height={h} rx={rr} fill={`url(#${id}b)`} />
          <Path d={art.grain} fill="#8A6A3A" opacity={0.09} />
          <Path d={art.grain2} fill="#FFF" opacity={0.5} />
        </>
      ) : null}

      {kind === 'mirror' ? (
        <>
          <Defs>
            <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#2A2620" /><Stop offset="0.45" stopColor={C.mirror} /><Stop offset="1" stopColor="#0A0909" /></LinearGradient>
            <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#FFE9C8" stopOpacity={0} /><Stop offset="0.5" stopColor="#FFE9C8" stopOpacity={0.16} /><Stop offset="1" stopColor="#FFE9C8" stopOpacity={0} /></LinearGradient>
          </Defs>
          <Rect width={w} height={h} rx={rr} fill={`url(#${id}b)`} />
          <Path d={`M${w * 0.1} ${h} L${w * 0.42} 0 L${w * 0.58} 0 L${w * 0.26} ${h} Z`} fill={`url(#${id}s)`} />
          <Path d={`M${w * 0.62} ${h} L${w * 0.84} 0 L${w * 0.88} 0 L${w * 0.66} ${h} Z`} fill={`url(#${id}s)`} opacity={0.7} />
          <Path d={art.fox} fill="#C9A961" opacity={0.08} />
          <Path d={art.grain} fill="#FFF" opacity={0.05} />
          {lamp}
        </>
      ) : null}

      {kind === 'metal' ? (
        <>
          <Defs>
            <MetalGradient id={`${id}b`} metal={metal} x1="0" y1="0" x2="1" y2="0.6" />
          </Defs>
          <Rect width={w} height={h} rx={rr} fill={`url(#${id}b)`} />
          <Path d={art.bands?.[0]} stroke="#FFF" strokeOpacity={0.11} strokeWidth={0.4} />
          <Path d={art.bands?.[1]} stroke="#000" strokeOpacity={0.08} strokeWidth={0.4} />
          <Path d={art.bands?.[2]} stroke="#FFF" strokeOpacity={0.04} strokeWidth={0.7} />
          <Rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rr} fill="none" stroke="#FFF" strokeOpacity={0.35} />
          <Rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={Math.max(0, rr - 1)} fill="none" stroke="#000" strokeOpacity={0.25} />
        </>
      ) : null}
      </G>
    </Svg>
  );
}
