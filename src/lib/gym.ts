/** Gym helpers — volume and a simple, explainable recovery read. Not medical advice. */
export type GymSet = {exercise: string; reps: number | null; weight_kg: number | null; duration_s: number | null; rpe: number | null; performed_at: string};

export const setVolume = (s: GymSet) => (s.reps ?? 0) * Number(s.weight_kg ?? 0);

/**
 * Recovery = hours since last session vs. load of that session (sum of reps×kg and mean RPE).
 * Deliberately simple and explained in the response so it never pretends to be clinical.
 */
export function recoveryRead(sets: GymSet[], now = Date.now()) {
  if (sets.length === 0) return {status: 'no_data' as const, hoursSince: null, lastLoad: 0, note: 'No sessions logged yet.'};
  const last = sets.reduce((a, b) => (a.performed_at > b.performed_at ? a : b));
  const lastDay = last.performed_at.slice(0, 10);
  const session = sets.filter((s) => s.performed_at.slice(0, 10) === lastDay);
  const load = Math.round(session.reduce((t, s) => t + setVolume(s), 0));
  const rpes = session.map((s) => Number(s.rpe)).filter((n) => !Number.isNaN(n) && n > 0);
  const meanRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  const hoursSince = Math.round((now - new Date(last.performed_at).getTime()) / 3_600_000);
  const needed = meanRpe !== null && meanRpe >= 8.5 ? 48 : meanRpe !== null && meanRpe >= 7 ? 36 : 24;
  const status = hoursSince >= needed ? ('ready' as const) : ('recovering' as const);
  return {
    status, hoursSince, lastLoad: load, meanRpe, hoursNeeded: needed,
    note: `Rule of thumb: ${needed}h after a session averaging RPE ${meanRpe?.toFixed(1) ?? 'n/a'}. Listen to your body; this is not medical advice.`,
  };
}
