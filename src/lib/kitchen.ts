import {z} from 'zod';
import {mondayOf} from '@/lib/closet';

export const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export const mealSchema = z.object({
  day: z.number().int().min(0).max(6),
  slot: z.enum(SLOTS),
  name: z.string().trim().min(1).max(120),
  kcal: z.number().int().min(0).max(4000).nullable().optional(),
});
export const groceryItem = z.object({item: z.string().trim().min(1).max(80), qty: z.string().trim().max(40).default('1')});
export type Meal = z.infer<typeof mealSchema>;

export const weekOf = (s?: string | null) => mondayOf(s ? new Date(`${s}T12:00:00Z`) : new Date());

export function dailyTotals(meals: Meal[]) {
  return Array.from({length: 7}, (_, day) => meals.filter((m) => m.day === day).reduce((t, m) => t + (m.kcal ?? 0), 0));
}

/** Grocery partners are configured server-side only. None ⇒ honest empty list. */
export function groceryPartners() {
  const out: {id: string; name: string}[] = [];
  if (process.env.INSTACART_API_KEY) out.push({id: 'instacart', name: 'Instacart'});
  return out;
}
