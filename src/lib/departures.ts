// Departures — pure helpers shared by the API routes, the web room and tests (the mobile app keeps a
// mirror in mobile/src/lib/rooms/departures.ts). No fetch, no React, no server imports.

export type TripStatus = 'draft' | 'planned' | 'cancelled';
export type Trip = {
  id: string;
  title: string;
  origin: string | null;
  destination: string;
  depart_at: string | null;
  return_at: string | null;
  party_size: number;
  status: TripStatus;
  brief: string | null;
  plan: string | null;
  nova_request_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Honest copy shown wherever flights, hotels or rides would be booked. */
export const PARTNER_NOTE = 'Booking partners connect soon — your plan is saved. Nothing has been booked.';

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

/** The planner brief for a trip (topic 'trip'). */
export function tripBrief(t: Pick<Trip, 'origin' | 'destination' | 'depart_at' | 'return_at' | 'party_size' | 'brief'>): string {
  const from = t.origin ? ` from ${t.origin}` : '';
  const dates = t.depart_at ? ` (${day(t.depart_at)}${t.return_at ? ` to ${day(t.return_at)}` : ''})` : '';
  return [
    `A trip to ${t.destination}${from}${dates} for ${t.party_size} ${t.party_size === 1 ? 'person' : 'people'}.`,
    t.brief?.trim() ?? '',
    'Draft a day-by-day plan: neighbourhoods, where to stay, dining and experiences, with rough prices.',
  ].filter(Boolean).join(' ').slice(0, 600);
}

/** The planner brief for a ride (topic 'ride'). */
export function rideBrief(pickup: string, dropoff: string, when: string | null): string {
  return `A car from ${pickup} to ${dropoff}${when ? ` at ${when}` : ''}. Suggest the right class of car, when to leave, and a rough fare.`.slice(0, 600);
}

/** "Fri 14 Jun" style date for a trip card; '' when unset. */
export function tripDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {weekday: 'short', day: 'numeric', month: 'short'});
}

/** Days until departure (whole days, from `now`); null when undated or already gone. */
export function daysUntil(iso: string | null, now = new Date()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t) || t < now.getTime()) return null;
  return Math.floor((t - now.getTime()) / 86_400_000);
}
