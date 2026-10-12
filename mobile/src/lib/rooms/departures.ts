// Departures — the member's trips (GET/POST /api/departures/trips, PATCH/DELETE /api/departures/trips/:id)
// composed with Nova through the hub (topic 'trip'), plus ride plans (topic 'ride'). Mirrors the pure bits
// of src/lib/departures.ts (keep the two in step). Nothing is booked: no flight/hotel/ride partner exists.
import {api} from '../api';
import {createRequest, requestErrorText} from './nova-requests';

export type TripStatus = 'draft' | 'planned' | 'cancelled';
export type Trip = {
  id: string; title: string; origin: string | null; destination: string; depart_at: string | null; return_at: string | null;
  party_size: number; status: TripStatus; brief: string | null; plan: string | null; nova_request_id: string | null; created_at: string;
};
export type TripInput = {destination: string; origin: string | null; depart_at: string | null; return_at: string | null; party_size: number; brief: string | null};
type Err = {message?: string; error?: string};

export const PARTNER_NOTE = 'Booking partners connect soon — your plan is saved. Nothing has been booked.';

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

export function tripBrief(t: Pick<Trip, 'origin' | 'destination' | 'depart_at' | 'return_at' | 'party_size' | 'brief'>) {
  const from = t.origin ? ` from ${t.origin}` : '';
  const dates = t.depart_at ? ` (${day(t.depart_at)}${t.return_at ? ` to ${day(t.return_at)}` : ''})` : '';
  return [
    `A trip to ${t.destination}${from}${dates} for ${t.party_size} ${t.party_size === 1 ? 'person' : 'people'}.`,
    t.brief?.trim() ?? '',
    'Draft a day-by-day plan: neighbourhoods, where to stay, dining and experiences, with rough prices.',
  ].filter(Boolean).join(' ').slice(0, 600);
}

export function rideBrief(pickup: string, dropoff: string, when: string | null) {
  return `A car from ${pickup} to ${dropoff}${when ? ` at ${when}` : ''}. Suggest the right class of car, when to leave, and a rough fare.`.slice(0, 600);
}

export function tripDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', {weekday: 'short', day: 'numeric', month: 'short'});
}

/** "2026-11-14" (local calendar day) → ISO at local noon, so the day survives every timezone. */
export function dayToIso(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = new Date(`${d}T12:00:00`);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

export const readTrips = () => api<{trips?: Trip[]} & Err>('/api/departures/trips');
export const createTrip = (t: TripInput) => api<{trip?: Trip} & Err>('/api/departures/trips', {method: 'POST', json: t});
export const setTripStatus = (id: string, status: 'draft' | 'cancelled') => api<{trip?: Trip} & Err>(`/api/departures/trips/${id}`, {method: 'PATCH', json: {status}});
export const deleteTrip = (id: string) => api<Err>(`/api/departures/trips/${id}`, {method: 'DELETE'});

/** Ask Nova for the trip's plan, then have the server copy it from the member's own request onto the trip. */
export async function planTrip(t: Trip): Promise<{ok: true; trip: Trip} | {ok: false; text: string}> {
  const r = await createRequest({kind: 'plan', title: `Trip: ${t.title}`, room: 'departures',
    details: {topic: 'trip', brief: tripBrief(t), party_size: t.party_size, ...(t.depart_at ? {when: t.depart_at} : {})}}, true);
  if (!r.ok) return {ok: false, text: `${requestErrorText(r.status, r.body)} Your trip is saved as a draft.`};
  if (r.data.status !== 'ready') return {ok: false, text: 'Nova couldn’t finish the plan. Your trip is saved as a draft.'};
  const p = await api<{trip?: Trip} & Err>(`/api/departures/trips/${t.id}`, {method: 'PATCH', json: {nova_request_id: r.data.id}});
  if (!p.ok || !p.body.trip) return {ok: false, text: 'Nova’s plan is in your Diary, but it couldn’t be attached to the trip. It stays a draft.'};
  return {ok: true, trip: p.body.trip};
}
