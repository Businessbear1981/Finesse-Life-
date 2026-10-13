import type {Meal} from '@/lib/kitchen';

/** The member's recipe book = the plates they have actually planned, most-planned first. Derived, never seeded. */
export type BookEntry = {name: string; times: number; kcal: number | null; slots: string[]; lastWeek: string};

const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
const SKIP = /^(dinner out|out|eating out|meal|—|-)$/i;

export function dishBook(plans: {week_start: string; meals: Meal[] | null}[], limit = 24): BookEntry[] {
  const book = new Map<string, BookEntry>();
  for (const p of [...plans].sort((a, b) => a.week_start.localeCompare(b.week_start))) {
    for (const m of p.meals ?? []) {
      const name = m.name?.trim();
      if (!name || SKIP.test(name)) continue;
      const k = key(name);
      const e = book.get(k) ?? {name, times: 0, kcal: null, slots: [], lastWeek: p.week_start};
      e.times += 1;
      e.name = name;
      e.lastWeek = p.week_start;
      if (m.kcal != null) e.kcal = m.kcal;
      if (!e.slots.includes(m.slot)) e.slots.push(m.slot);
      book.set(k, e);
    }
  }
  return [...book.values()].sort((a, b) => b.times - a.times || b.lastWeek.localeCompare(a.lastWeek) || a.name.localeCompare(b.name)).slice(0, limit);
}

/** Most recent plan before `week` that has any meals — the "start from last week" source. */
export function previousPlan<T extends {week_start: string; meals: Meal[] | null}>(plans: T[], week: string): T | null {
  return [...plans].filter((p) => p.week_start < week && (p.meals?.length ?? 0) > 0).sort((a, b) => b.week_start.localeCompare(a.week_start))[0] ?? null;
}
