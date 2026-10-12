import {z} from 'zod';

/** The Salon — booking *requests*. A request is not a booking: only a salon partner confirms (none connected yet). */
export const bookingRequest = z.object({
  service_name: z.string().trim().min(1).max(120),
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requested_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  notes: z.string().trim().max(500).optional(),
  category: z.string().trim().max(40).optional(),
  duration: z.string().trim().max(40).optional(),
  edition: z.enum(['finesse', 'carpe_diem']).default('finesse'),
});
export type BookingRequest = z.infer<typeof bookingRequest>;

export type SalonBooking = {
  id: string; service_name: string; category: string | null; duration: string | null; edition: string;
  requested_date: string; requested_time: string; notes: string | null; price_cents: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'; created_at: string;
};

export const SALON_STATUS: Record<SalonBooking['status'], string> = {
  pending: 'Requested — the salon confirms',
  confirmed: 'Confirmed by the salon',
  completed: 'Done',
  cancelled: 'Cancelled',
};

/** Upcoming = pending/confirmed on or after `today` (YYYY-MM-DD); history = the rest. Upcoming soonest first. */
export function splitBookings<T extends Pick<SalonBooking, 'status' | 'requested_date' | 'requested_time'>>(rows: T[], today: string) {
  const upcoming = rows.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && b.requested_date >= today)
    .sort((a, b) => `${a.requested_date}${a.requested_time}`.localeCompare(`${b.requested_date}${b.requested_time}`));
  const history = rows.filter((b) => !upcoming.includes(b));
  return {upcoming, history};
}
