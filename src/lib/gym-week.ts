import {z} from 'zod';
import {mondayOf} from '@/lib/closet';

/** The Gym — the member's own planned week (gym_sessions). A planned session is a note, not a booking. */
export const SESSION_KINDS = ['class', 'training', 'recovery', 'other'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const sessionInput = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  atTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  kind: z.enum(SESSION_KINDS).default('training'),
  title: z.string().trim().min(1).max(120),
  venue: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export const sessionPatch = z.object({
  done: z.boolean().optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  atTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to change');

export type GymSession = {id: string; day: string; at_time: string | null; kind: SessionKind; title: string; venue: string | null; notes: string | null; done: boolean};

/** Monday of the week containing `day` (YYYY-MM-DD, UTC calendar) — or of today. */
export const gymWeekOf = (day?: string | null) => mondayOf(day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00Z`) : new Date());

/** The seven YYYY-MM-DD dates of the week starting `weekStart`. */
export function weekDays(weekStart: string): string[] {
  const base = new Date(`${weekStart}T12:00:00Z`);
  return Array.from({length: 7}, (_, i) => new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10));
}

/** Sessions grouped per day of the week (Mon..Sun), each day sorted by time (untimed last). */
export function byDay<T extends Pick<GymSession, 'day' | 'at_time'>>(sessions: T[], weekStart: string): T[][] {
  const days = weekDays(weekStart);
  return days.map((d) => sessions.filter((s) => s.day === d).sort((a, b) => (a.at_time ?? '99:99').localeCompare(b.at_time ?? '99:99')));
}
