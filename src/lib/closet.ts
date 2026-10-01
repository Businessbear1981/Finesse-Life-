/** Closet week helpers (Monday-start weeks, UTC). */
export function mondayOf(d: Date): string {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return m.toISOString().slice(0, 10);
}
export type RotationDay = {day: number; lookId: string | null};
export const emptyWeek = (): RotationDay[] => Array.from({length: 7}, (_, day) => ({day, lookId: null}));
