// The Salon — the member's own booking *requests* (GET/POST /api/salon/bookings, POST …/:id/cancel).
// A request is not a booking: only a salon partner confirms, and none is connected yet.
import {api} from '../api';

export type SalonBooking = {
  id: string; service_name: string; category: string | null; duration: string | null; edition: string;
  requested_date: string; requested_time: string; notes: string | null; price_cents: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'; created_at: string;
};
type Err = {error?: string; message?: string};

export const SALON_STATUS: Record<string, string> = {pending: 'Requested — the salon confirms', confirmed: 'Confirmed by the salon', completed: 'Done', cancelled: 'Cancelled'};

export const readBookings = () => api<{bookings: SalonBooking[]} & Err>('/api/salon/bookings');
export const requestBooking = (b: {service_name: string; requested_date: string; requested_time: string; notes?: string; category?: string; edition: 'finesse' | 'carpe_diem'}) =>
  api<{booking?: SalonBooking} & Err>('/api/salon/bookings', {method: 'POST', json: b});
export const cancelBooking = (id: string) => api<Err>(`/api/salon/bookings/${id}/cancel`, {method: 'POST'});

const pad = (n: number) => String(n).padStart(2, '0');
export const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function splitBookings(rows: SalonBooking[], today: string) {
  const upcoming = rows.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && b.requested_date >= today)
    .sort((a, b) => `${a.requested_date}${a.requested_time}`.localeCompare(`${b.requested_date}${b.requested_time}`));
  return {upcoming, history: rows.filter((b) => !upcoming.includes(b))};
}

export function prettyWhen(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const at = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  if (Number.isNaN(at.getTime())) return `${date} · ${time}`;
  return `${at.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'})} · ${at.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}`;
}
