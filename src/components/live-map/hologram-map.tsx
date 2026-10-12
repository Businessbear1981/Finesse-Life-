'use client';

// The hologram city: streets and buildings drawn as laser light (wireframe extrusions with
// additive blending), members as neon dots, events as yellow light beams.
// Live mode streams real OpenStreetMap streets/buildings as vector tiles (OpenFreeMap, no key;
// override with NEXT_PUBLIC_MAP_TILEJSON_URL). Demo mode draws a generated grid city for the
// design preview, where no tile host is reachable.

import {useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import DeckGL from '@deck.gl/react';
import type {MapViewState, PickingInfo} from '@deck.gl/core';
import {ColumnLayer, LineLayer, PathLayer, PolygonLayer, ScatterplotLayer, TextLayer} from '@deck.gl/layers';
import {MVTLayer} from '@deck.gl/geo-layers';
import {NEON, type MapDot, type MapEvent} from '@/lib/live-map';
import {demoCity} from './demo-city';

export type LatLng = {lat: number; lng: number};

export type HologramMapProps = {
  center: LatLng;
  dots: MapDot[];
  events: MapEvent[];
  me?: (LatLng & {kind: MapDot['kind']}) | null;
  city: 'live' | 'demo';
  onViewChange?: (center: LatLng, zoom: number) => void;
  onSelectEvent?: (e: MapEvent | null) => void;
};

const ORBIT_START = -20;
const TILEJSON = process.env.NEXT_PUBLIC_MAP_TILEJSON_URL || 'https://tiles.openfreemap.org/planet';

/** Additive blending: overlapping light adds up, like a projected hologram. */
const LIGHT = {
  blend: true,
  blendColorOperation: 'add',
  blendColorSrcFactor: 'src-alpha',
  blendColorDstFactor: 'one',
  blendAlphaOperation: 'add',
  blendAlphaSrcFactor: 'one',
  blendAlphaDstFactor: 'one',
  depthWriteEnabled: false,
} as const;

const rgba = (c: readonly [number, number, number], a: number): [number, number, number, number] => [c[0], c[1], c[2], a];

const ROAD_WIDTH: Record<string, number> = {motorway: 14, trunk: 12, primary: 10, secondary: 8, tertiary: 6, minor: 4, service: 2.5};

type Feature = {properties: Record<string, unknown>; geometry: {type: string}};

const motionQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)');
function useReducedMotion() {
  return useSyncExternalStore(
    (on) => {
      const q = motionQuery();
      q.addEventListener('change', on);
      return () => q.removeEventListener('change', on);
    },
    () => motionQuery().matches,
    () => false,
  );
}

/** ~30 fps clock for pulses and the slow cinematic orbit. Frozen under reduced motion. */
function useClock(enabled: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const loop = (now: number) => {
      if (now - last > 33) {
        last = now;
        setT((now - start) / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return t;
}

export function HologramMap({center, dots, events, me, city, onViewChange, onSelectEvent}: HologramMapProps) {
  const reduced = useReducedMotion();
  const [orbiting, setOrbiting] = useState(true);
  const t = useClock(!reduced);
  const [view, setView] = useState<MapViewState>({
    latitude: center.lat, longitude: center.lng, zoom: 15.25, pitch: 58, bearing: ORBIT_START, maxPitch: 75, minZoom: 12, maxZoom: 18,
  });
  // Recentre when the caller moves the centre (e.g. the device fix arrives).
  const [lastCenter, setLastCenter] = useState(center);
  if (lastCenter.lat !== center.lat || lastCenter.lng !== center.lng) {
    setLastCenter(center);
    setView((v) => ({...v, latitude: center.lat, longitude: center.lng}));
  }

  // Cinematic orbit until the member touches the map.
  const shown: MapViewState = orbiting && !reduced ? {...view, bearing: ORBIT_START + t * 2.2} : view;

  const grid = useMemo(() => floorGrid(center), [center]);
  const demo = useMemo(() => (city === 'demo' ? demoCity() : null), [city]);
  const pulse = (Math.sin(t * 2.4) + 1) / 2;
  const ripple = (t % 2.4) / 2.4;

  const layers = [
    new LineLayer({
      id: 'floor',
      data: grid,
      getSourcePosition: (d: Seg) => d[0],
      getTargetPosition: (d: Seg) => d[1],
      getColor: rgba(NEON.building, 10),
      getWidth: 1,
      parameters: LIGHT,
    }),

    ...(demo
      ? [
          new PolygonLayer({
            id: 'water',
            data: demo.water,
            getPolygon: (d: [number, number][]) => d,
            getFillColor: [0, 70, 170, 70],
            getLineColor: rgba(NEON.street, 140),
            lineWidthMinPixels: 1,
            stroked: true,
            parameters: LIGHT,
          }),
          new PathLayer({
            id: 'streets-glow',
            data: demo.streets,
            getPath: (d: DemoStreet) => d.path,
            getWidth: (d: DemoStreet) => d.width * 3.5,
            widthUnits: 'meters',
            getColor: rgba(NEON.street, 16),
            parameters: LIGHT,
          }),
          new PathLayer({
            id: 'streets',
            data: demo.streets,
            getPath: (d: DemoStreet) => d.path,
            getWidth: (d: DemoStreet) => Math.max(1.2, d.width * 0.4),
            widthUnits: 'meters',
            widthMinPixels: 0.5,
            getColor: (d: DemoStreet) => rgba(NEON.street, d.width >= 20 ? 255 : d.width >= 10 ? 190 : d.width >= 5 ? 120 : 55),
            parameters: LIGHT,
          }),
          new TextLayer({
            id: 'labels',
            data: demo.labels,
            getPosition: (d: DemoLabel) => [d.lng, d.lat, d.kind === 'landmark' ? 120 : 6],
            getText: (d: DemoLabel) => d.text,
            getSize: (d: DemoLabel) => (d.kind === 'district' ? 13 : d.kind === 'street' ? 10 : 11),
            getColor: (d: DemoLabel) =>
              d.kind === 'district' ? [255, 255, 255, 235] : d.kind === 'water' ? [120, 200, 255, 220] : d.kind === 'landmark' ? [255, 240, 200, 240] : rgba(NEON.street, 230),
            fontFamily: 'Inter Tight, system-ui, sans-serif',
            fontWeight: 700,
            characterSet: 'auto',
            fontSettings: {sdf: true},
            outlineWidth: 4,
            outlineColor: [0, 6, 14, 230],
            billboard: true,
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'center',
            parameters: {depthCompare: 'always'},
          }),
          new PolygonLayer({
            id: 'buildings',
            data: demo.buildings,
            getPolygon: (d: DemoBuilding) => d.ring,
            extruded: true,
            wireframe: true,
            getElevation: (d: DemoBuilding) => d.height,
            getFillColor: (d: DemoBuilding) => rgba(NEON.building, d.height > 100 ? 14 : 6),
            getLineColor: (d: DemoBuilding) => rgba(NEON.building, Math.min(220, 40 + d.height * 0.9)),
            material: false,
            parameters: LIGHT,
          }),
        ]
      : [
          new MVTLayer({
            id: 'city',
            data: TILEJSON,
            minZoom: 13,
            maxZoom: 14,
            binary: false,
            loadOptions: {mvt: {layers: ['transportation', 'building', 'water', 'place']}},
            pointType: 'text',
            getText: (f: Feature) => String(f.properties.name ?? '').toUpperCase(),
            getTextSize: 12,
            getTextColor: [255, 255, 255, 230],
            textFontFamily: 'Inter Tight, system-ui, sans-serif',
            textFontWeight: 700,
            textCharacterSet: 'auto',
            textOutlineWidth: 4,
            textOutlineColor: [0, 6, 14, 230],
            textFontSettings: {sdf: true},
            extruded: true,
            wireframe: true,
            filled: true,
            stroked: true,
            material: false,
            lineWidthUnits: 'meters',
            lineWidthMinPixels: 0.6,
            getElevation: (f: Feature) =>
              f.properties.layerName === 'building' ? Number(f.properties.render_height ?? 12) || 12 : 0,
            getFillColor: (f: Feature) =>
              f.properties.layerName === 'building' ? rgba(NEON.building, 8)
                : f.properties.layerName === 'water' ? [0, 60, 140, 40] : [0, 0, 0, 0],
            getLineColor: (f: Feature) =>
              f.properties.layerName === 'transportation'
                  ? rgba(NEON.street, ({motorway: 255, trunk: 240, primary: 220, secondary: 180, tertiary: 150} as Record<string, number>)[String(f.properties.class)] ?? 90)
                : f.properties.layerName === 'building' ? rgba(NEON.building, Math.min(220, 40 + (Number(f.properties.render_height) || 12) * 0.9)) : [0, 0, 0, 0],
            getLineWidth: (f: Feature) =>
              f.properties.layerName === 'transportation' ? (ROAD_WIDTH[String(f.properties.class)] ?? 2) * 0.4 : 0,
            parameters: LIGHT,
          }),
        ]),

    // People: a soft halo and a hot core per dot.
    new ScatterplotLayer({
      id: 'people-halo',
      data: dots,
      getPosition: (d: MapDot) => [d.lng, d.lat, 2],
      getRadius: 30,
      radiusMinPixels: 6,
      getFillColor: (d: MapDot) => rgba(NEON[d.kind], 22 + pulse * 16),
      updateTriggers: {getFillColor: pulse},
      parameters: LIGHT,
    }),
    new ScatterplotLayer({
      id: 'people',
      data: dots,
      getPosition: (d: MapDot) => [d.lng, d.lat, 3],
      getRadius: 7,
      radiusMinPixels: 2.6,
      getFillColor: (d: MapDot) => rgba(NEON[d.kind], 255),
      // Normal blending: overlapping dots keep their colour instead of adding up to white.
      parameters: {depthWriteEnabled: false},
    }),

    // Events: a yellow beam of light, a ripple at its base and the title floating above.
    new ColumnLayer({
      id: 'event-beams',
      data: events,
      diskResolution: 12,
      radius: 7,
      extruded: true,
      getPosition: (e: MapEvent) => [e.lng, e.lat],
      getElevation: 420,
      getFillColor: rgba(NEON.event, 110 + pulse * 60),
      updateTriggers: {getFillColor: pulse},
      material: false,
      pickable: true,
      parameters: LIGHT,
    }),
    new ScatterplotLayer({
      id: 'event-ripple',
      data: events,
      getPosition: (e: MapEvent) => [e.lng, e.lat, 1],
      getRadius: 20 + ripple * 90,
      stroked: true,
      filled: false,
      lineWidthMinPixels: 1.5,
      getLineColor: rgba(NEON.event, 220 * (1 - ripple)),
      updateTriggers: {getRadius: ripple, getLineColor: ripple},
      parameters: LIGHT,
    }),
    new ScatterplotLayer({
      id: 'event-core',
      data: events,
      getPosition: (e: MapEvent) => [e.lng, e.lat, 2],
      getRadius: 14,
      radiusMinPixels: 4,
      getFillColor: rgba(NEON.event, 255),
      pickable: true,
      parameters: LIGHT,
    }),
    new TextLayer({
      id: 'event-labels',
      data: events,
      getPosition: (e: MapEvent) => [e.lng, e.lat, 440],
      getText: (e: MapEvent) => e.title.toUpperCase(),
      getSize: 12,
      getColor: rgba(NEON.event, 255),
      fontFamily: 'Inter Tight, system-ui, sans-serif',
      fontWeight: 700,
      characterSet: 'auto',
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      billboard: true,
      outlineWidth: 0,
      parameters: {depthCompare: 'always'},
    }),

    ...(me
      ? [
          new ScatterplotLayer({
            id: 'me-ring',
            data: [me],
            getPosition: (d: LatLng) => [d.lng, d.lat, 4],
            getRadius: 18 + ripple * 50,
            radiusMinPixels: 8,
            stroked: true,
            filled: false,
            lineWidthMinPixels: 2,
            getLineColor: [255, 255, 255, 230 * (1 - ripple)],
            updateTriggers: {getRadius: ripple, getLineColor: ripple},
            parameters: LIGHT,
          }),
          new ScatterplotLayer({
            id: 'me',
            data: [me],
            getPosition: (d: LatLng) => [d.lng, d.lat, 5],
            getRadius: 9,
            radiusMinPixels: 5,
            stroked: true,
            lineWidthMinPixels: 2,
            getLineColor: [255, 255, 255, 255],
            getFillColor: (d: {kind: MapDot['kind']}) => rgba(NEON[d.kind], 255),
            parameters: LIGHT,
          }),
        ]
      : []),
  ];

  return (
    <DeckGL
      viewState={shown}
      controller={{dragRotate: true, touchRotate: true, inertia: 300}}
      onViewStateChange={({viewState, interactionState}) => {
        const v = viewState as MapViewState;
        if (interactionState?.isDragging || interactionState?.isZooming || interactionState?.isRotating || interactionState?.isPanning) {
          setOrbiting(false);
        }
        setView(v);
        onViewChange?.({lat: v.latitude, lng: v.longitude}, v.zoom);
      }}
      onClick={(info: PickingInfo) => {
        const e = info.layer?.id.startsWith('event') ? (info.object as MapEvent) : null;
        onSelectEvent?.(e ?? null);
      }}
      getCursor={({isHovering}) => (isHovering ? 'pointer' : 'grab')}
      layers={layers}
      style={{background: 'transparent'}}
    />
  );
}

type Seg = [[number, number], [number, number]];
type DemoStreet = {path: [number, number][]; width: number};
type DemoBuilding = {ring: [number, number][]; height: number};
type DemoLabel = {text: string; lng: number; lat: number; kind: 'street' | 'district' | 'landmark' | 'water'};

/** Faint holographic floor grid around the centre. */
function floorGrid(c: LatLng): Seg[] {
  const out: Seg[] = [];
  const step = 0.0016;
  const n = 40;
  const lat0 = Math.round(c.lat / step) * step;
  const lng0 = Math.round(c.lng / step) * step;
  for (let i = -n; i <= n; i++) {
    out.push([[lng0 + i * step, lat0 - n * step], [lng0 + i * step, lat0 + n * step]]);
    out.push([[lng0 - n * step, lat0 + i * step], [lng0 + n * step, lat0 + i * step]]);
  }
  return out;
}
