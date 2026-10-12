// Preview city for the design showcase, where no tile host is reachable: a hand-built model
// of downtown Austin, TX. The 1839 Waller grid (Lamar → I-35, Cesar Chavez → 15th), Congress
// Avenue up to the Capitol, Lady Bird Lake, I-35, South Congress and the Rainey Street towers.
// Real geography, simplified geometry. Live members never see this; the live map streams
// real OpenStreetMap streets and buildings.

import type {MapDot, MapEvent} from '@/lib/live-map';

type LatLng = {lat: number; lng: number};
type P = [number, number]; // [lng, lat]

export const AUSTIN: LatLng = {lat: 30.2648, lng: -97.7418};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Downtown grid: N–S streets (west → east) and E–W streets (south → north).
const NS: {name: string; lng: number; w: number}[] = [
  {name: 'Lamar', lng: -97.7536, w: 16}, {name: 'West Ave', lng: -97.7514, w: 8}, {name: 'Rio Grande', lng: -97.7492, w: 8},
  {name: 'Nueces', lng: -97.7481, w: 7}, {name: 'San Antonio', lng: -97.7469, w: 8}, {name: 'Guadalupe', lng: -97.7457, w: 11},
  {name: 'Lavaca', lng: -97.7445, w: 11}, {name: 'Colorado', lng: -97.7433, w: 8}, {name: 'Congress', lng: -97.7421, w: 22},
  {name: 'Brazos', lng: -97.7409, w: 8}, {name: 'San Jacinto', lng: -97.7397, w: 9}, {name: 'Trinity', lng: -97.7385, w: 8},
  {name: 'Neches', lng: -97.7373, w: 7}, {name: 'Red River', lng: -97.7361, w: 9},
];
const EW: {name: string; lat: number; w: number}[] = Array.from({length: 15}, (_, i) => ({
  name: i === 0 ? 'Cesar Chavez' : `${i + 1}th`,
  lat: 30.2629 + i * 0.00098,
  w: i === 0 ? 16 : i === 5 ? 12 : 8, // Cesar Chavez, 6th Street
}));
const I35 = -97.7349;
// North shore of Lady Bird Lake: ~30.2612 at Congress, rising west toward Lamar, dropping east
// so Rainey Street (≈30.259) stays on dry land.
const RIVER_N = (lng: number) =>
  30.2612 - (lng + 97.7421) * (lng < -97.7421 ? 0.35 : 0.85) + Math.sin((lng + 97.75) * 260) * 0.00015;
const RIVER_S = (lng: number) => RIVER_N(lng) - 0.0021 - Math.cos((lng + 97.75) * 180) * 0.0003;

// Real tower clusters (approximate): 2nd St district, Congress core, Rainey Street.
const TOWER_ZONES = [
  {lat: 30.2650, lng: -97.7440, r: 0.0022, peak: 210},
  {lat: 30.2668, lng: -97.7418, r: 0.0016, peak: 185},
  {lat: 30.2598, lng: -97.7380, r: 0.0011, peak: 175},
  {lat: 30.2660, lng: -97.7475, r: 0.0012, peak: 150},
];

function towerBoost(lat: number, lng: number) {
  let best = 0;
  for (const z of TOWER_ZONES) {
    const d = Math.hypot((lat - z.lat) / z.r, (lng - z.lng) / z.r);
    if (d < 1) best = Math.max(best, (1 - d) * z.peak);
  }
  return best;
}

const rect = (w: number, s: number, e: number, n: number): P[] => [[w, s], [e, s], [e, n], [w, n]];

export function demoCity() {
  const r = rng(512);
  const streets: {path: P[]; width: number}[] = [];
  const buildings: {ring: P[]; height: number}[] = [];
  const north = EW[EW.length - 1].lat;

  for (const s of NS) streets.push({path: [[s.lng, RIVER_N(s.lng) + 0.0003], [s.lng, north]], width: s.w});
  for (const s of EW) streets.push({path: [[NS[0].lng - 0.002, s.lat], [I35, s.lat]], width: s.w});
  // Congress Avenue bridge and South Congress.
  streets.push({path: [[-97.7421, RIVER_N(-97.7421) + 0.0003], [-97.7462, 30.2500], [-97.7497, 30.2440]], width: 22});
  streets.push({path: [[-97.7473, RIVER_N(-97.7473)], [-97.7480, 30.2560], [-97.7525, 30.2480]], width: 9}); // S 1st
  // I-35 and Rainey Street.
  streets.push({path: [[I35 + 0.0012, 30.2440], [I35, 30.2600], [I35, north + 0.004]], width: 34});
  streets.push({path: [[-97.7389, 30.2582], [-97.7383, 30.2629]], width: 7});
  // A few East Austin and South Austin streets to frame the core.
  for (let i = 1; i <= 6; i++) streets.push({path: [[I35, 30.2600 + i * 0.0018], [I35 + 0.012, 30.2600 + i * 0.0018]], width: 6});
  for (let i = 1; i <= 7; i++) streets.push({path: [[-97.7560, RIVER_S(-97.75) - i * 0.0017], [-97.7380, RIVER_S(-97.74) - i * 0.0017]], width: 6});

  // Mid-block alleys (the Waller plan gives most downtown blocks one).
  for (let i = 0; i < NS.length - 1; i++) {
    const lng = (NS[i].lng + NS[i + 1].lng) / 2;
    streets.push({path: [[lng, EW[0].lat], [lng, EW[9].lat]], width: 2.5});
  }

  // Downtown blocks.
  for (let i = 0; i < NS.length - 1; i++) {
    for (let j = 0; j < EW.length - 1; j++) {
      const w = NS[i].lng + 0.00012, e = NS[i + 1].lng - 0.00012;
      const s = EW[j].lat + 0.0001, n = EW[j + 1].lat - 0.0001;
      if (s < RIVER_N((w + e) / 2) + 0.0002) continue;
      // Capitol grounds (11th–14th, Colorado–Brazos) are open lawn + the Capitol itself.
      if (j >= 10 && j <= 12 && i >= 7 && i <= 8) continue;
      const halves = r() < 0.5 ? 2 : 1;
      for (let k = 0; k < halves; k++) {
        const bw = (e - w) / halves;
        const lat = (s + n) / 2, lng = w + bw * (k + 0.5);
        const boost = towerBoost(lat, lng);
        const base = 12 + r() * 30;
        const x0 = w + bw * k, x1 = w + bw * (k + 1);
        if (boost > 40 && r() < 0.55) {
          // Tower on a podium, with a crown setback.
          const h = boost * (0.6 + r() * 0.45);
          const podium = 18 + r() * 14;
          buildings.push({ring: rect(x0 + 0.00002, s + 0.00002, x1 - 0.00002, n - 0.00002), height: Math.round(podium)});
          const ix = (x1 - x0) * (0.18 + r() * 0.1), iy = (n - s) * (0.18 + r() * 0.1);
          buildings.push({ring: rect(x0 + ix, s + iy, x1 - ix, n - iy), height: Math.round(h)});
          buildings.push({ring: rect(x0 + ix * 1.8, s + iy * 1.8, x1 - ix * 1.8, n - iy * 1.8), height: Math.round(h * 1.08)});
        } else {
          // Low/mid-rise: split the lot into a few buildings of different heights.
          const parts = 1 + Math.floor(r() * 3);
          for (let q = 0; q < parts; q++) {
            const ps = s + ((n - s) / parts) * q, pn = s + ((n - s) / parts) * (q + 1);
            buildings.push({ring: rect(x0 + 0.00002, ps + 0.00001, x1 - 0.00002, pn - 0.00001), height: Math.round(base * (0.6 + r() * 0.8) + boost * 0.25)});
          }
        }
      }
    }
  }
  // The Capitol: wide base, rotunda, dome.
  buildings.push({ring: rect(-97.7414, 30.2738, -97.7395, 30.2756), height: 32});
  buildings.push({ring: octagon(-97.74045, 30.2747, 0.00045), height: 70});
  buildings.push({ring: octagon(-97.74045, 30.2747, 0.00022), height: 92});

  // Low-rise East Austin, SoCo and South Austin, sparse.
  const scatter = (w: number, s: number, e: number, n: number, count: number, maxH: number) => {
    for (let k = 0; k < count; k++) {
      const lng = w + r() * (e - w), lat = s + r() * (n - s);
      const sz = 0.00012 + r() * 0.00018;
      buildings.push({ring: rect(lng, lat, lng + sz * 1.4, lat + sz), height: Math.round(6 + r() * maxH)});
    }
  };
  scatter(I35 + 0.0008, 30.2600, I35 + 0.012, 30.2730, 140, 22);
  scatter(-97.7520, 30.2440, -97.7440, RIVER_S(-97.748) - 0.0004, 120, 26);
  scatter(-97.7560, 30.2440, -97.7380, 30.2500, 60, 14);

  // Lady Bird Lake as a sampled band.
  const water: P[] = [];
  for (let lng = -97.7620; lng <= -97.7300; lng += 0.0005) water.push([lng, RIVER_N(lng)]);
  for (let lng = -97.7300; lng >= -97.7620; lng -= 0.0005) water.push([lng, RIVER_S(lng)]);

  const labels: {text: string; lng: number; lat: number; kind: 'street' | 'district' | 'landmark' | 'water'}[] = [
    {text: 'CONGRESS AVE', lng: -97.74195, lat: 30.2690, kind: 'street'},
    {text: 'E 6TH ST', lng: -97.7385, lat: EW[5].lat, kind: 'street'},
    {text: 'W 6TH ST', lng: -97.7500, lat: EW[5].lat, kind: 'street'},
    {text: 'CESAR CHAVEZ', lng: -97.7470, lat: EW[0].lat, kind: 'street'},
    {text: 'LAMAR BLVD', lng: NS[0].lng, lat: 30.2700, kind: 'street'},
    {text: 'I-35', lng: I35 + 0.0004, lat: 30.2690, kind: 'street'},
    {text: 'S CONGRESS', lng: -97.7470, lat: 30.2525, kind: 'street'},
    {text: 'LADY BIRD LAKE', lng: -97.7520, lat: (RIVER_N(-97.752) + RIVER_S(-97.752)) / 2, kind: 'water'},
    {text: 'TEXAS CAPITOL', lng: -97.74045, lat: 30.2747, kind: 'landmark'},
    {text: 'RAINEY', lng: -97.7380, lat: 30.2588, kind: 'district'},
    {text: 'EAST AUSTIN', lng: -97.7285, lat: 30.2650, kind: 'district'},
    {text: 'SOCO', lng: -97.7505, lat: 30.2480, kind: 'district'},
    {text: 'WEST 6TH', lng: -97.7520, lat: 30.2710, kind: 'district'},
    {text: 'WAREHOUSE DISTRICT', lng: -97.7470, lat: 30.2665, kind: 'district'},
  ];

  return {streets, buildings, water: [water], labels};
}

function octagon(lng: number, lat: number, rad: number): P[] {
  return Array.from({length: 8}, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return [lng + Math.cos(a) * rad * 1.15, lat + Math.sin(a) * rad] as P;
  });
}

/** A Saturday night in Austin: anonymous dots clustered where people actually go. */
export function demoCrowd(seed = 1): {dots: MapDot[]; events: MapEvent[]} {
  const r = rng(seed * 97 + 5);
  const spots = [
    {lat: 30.2597, lng: -97.7381, n: 85, s: 0.0007}, // Rainey Street
    {lat: 30.2672, lng: -97.7392, n: 75, s: 0.0006}, // East 6th
    {lat: 30.2697, lng: -97.7505, n: 55, s: 0.0007}, // West 6th / West End
    {lat: 30.2500, lng: -97.7490, n: 45, s: 0.0008}, // South Congress
    {lat: 30.2640, lng: -97.7290, n: 40, s: 0.0010}, // East Austin
    {lat: 30.2655, lng: -97.7445, n: 30, s: 0.0007}, // 2nd Street district
  ];
  const kind = (): MapDot['kind'] => {
    const v = r();
    return v < 0.5 ? 'f' : v < 0.93 ? 'm' : 'x';
  };
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  const dots: MapDot[] = [];
  for (const sp of spots) {
    for (let i = 0; i < sp.n; i++) dots.push({lat: sp.lat + gauss() * sp.s, lng: sp.lng + gauss() * sp.s * 1.15, kind: kind()});
  }
  for (let i = 0; i < 70; i++) dots.push({lat: 30.246 + r() * 0.03, lng: -97.756 + r() * 0.03, kind: kind()});

  const now = Date.now();
  const ev = (id: string, title: string, venue: string, lat: number, lng: number, inH: number): MapEvent => ({
    id, title, venue, lat, lng,
    startsAt: new Date(now + inH * 3600e3).toISOString(),
    endsAt: new Date(now + (inH + 4) * 3600e3).toISOString(),
  });
  return {
    dots,
    events: [
      ev('e1', 'Rainey Takeover', 'Rainey Street', 30.2599, -97.7384, 0),
      ev('e2', 'Rooftop Session', 'The Penthouse · 2nd St', 30.2652, -97.7447, 1),
      ev('e3', 'SoCo After Dark', 'South Congress', 30.2497, -97.7493, 2),
    ],
  };
}
