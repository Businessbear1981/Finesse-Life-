// Live map (the hologram city) — shared types, validation and palette.
// Server rules live in supabase/migrations/20261014_live_map.sql; see docs/LIVE_MAP.md.

export type DotKind = 'f' | 'm' | 'x';
export type MapDot = {lat: number; lng: number; kind: DotKind};
export type MapEvent = {id: string; title: string; venue: string | null; lat: number; lng: number; startsAt: string; endsAt: string};
export type MapSnapshot = {dots: MapDot[]; events: MapEvent[]; sharing: boolean};
export type Bbox = {minLat: number; minLng: number; maxLat: number; maxLng: number};

/** Neon palette (RGB): pink = women, blue = men, white = everyone else, yellow = events. */
export const NEON: Record<DotKind | 'event' | 'street' | 'building', [number, number, number]> = {
  f: [255, 46, 160],
  m: [0, 200, 255],
  x: [235, 235, 255],
  event: [230, 255, 0],
  street: [0, 255, 240],
  building: [0, 190, 255],
};

/** Largest box the snapshot RPC accepts, per side, in degrees. */
export const MAX_BBOX_SPAN = 1.5;

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function validLatLng(lat: unknown, lng: unknown): {lat: number; lng: number} | null {
  if (!finite(lat) || !finite(lng)) return null;
  if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return null;
  return {lat, lng};
}

/** `?bbox=minLng,minLat,maxLng,maxLat` (GeoJSON order). Oversized boxes are rejected. */
export function parseBbox(raw: string | null): Bbox | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => (s.trim() === '' ? NaN : Number(s)));
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (!validLatLng(minLat, minLng) || !validLatLng(maxLat, maxLng)) return null;
  if (maxLat <= minLat || maxLng <= minLng) return null;
  if (maxLat - minLat > MAX_BBOX_SPAN || maxLng - minLng > MAX_BBOX_SPAN) return null;
  return {minLat, minLng, maxLat, maxLng};
}

/** Bounding box around a centre, clamped to the snapshot limit. */
export function bboxAround(lat: number, lng: number, span = 0.12): Bbox {
  const h = Math.min(span, MAX_BBOX_SPAN) / 2;
  return {
    minLat: Math.max(-85, lat - h), maxLat: Math.min(85, lat + h),
    minLng: Math.max(-180, lng - h), maxLng: Math.min(180, lng + h),
  };
}

export const bboxParam = (b: Bbox) => [b.minLng, b.minLat, b.maxLng, b.maxLat].map((n) => n.toFixed(5)).join(',');

export type NewEventInput = {title: string; venue: string | null; lat: number; lng: number; startsAt: string; endsAt: string};

/** Validates a staff-created event. Returns the cleaned event or an error code. */
export function parseNewEvent(body: unknown): NewEventInput | {error: string} {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title || title.length > 80) return {error: 'bad_title'};
  const venue = typeof b.venue === 'string' && b.venue.trim() ? b.venue.trim() : null;
  if (venue && venue.length > 80) return {error: 'bad_venue'};
  const at = validLatLng(b.lat, b.lng);
  if (!at) return {error: 'bad_location'};
  const starts = typeof b.startsAt === 'string' ? Date.parse(b.startsAt) : NaN;
  const ends = typeof b.endsAt === 'string' ? Date.parse(b.endsAt) : NaN;
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || ends <= starts) return {error: 'bad_window'};
  if (ends - starts > 3 * 24 * 3600 * 1000) return {error: 'bad_window'};
  return {title, venue, ...at, startsAt: new Date(starts).toISOString(), endsAt: new Date(ends).toISOString()};
}

export function toDot(row: {lat: unknown; lng: unknown; kind: unknown}): MapDot | null {
  const at = validLatLng(row.lat, row.lng);
  if (!at) return null;
  const kind = row.kind === 'f' || row.kind === 'm' ? row.kind : 'x';
  return {...at, kind};
}
