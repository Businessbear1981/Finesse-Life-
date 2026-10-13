// The Kitchen beyond this week's plan, derived from the member's own rows: GET /api/kitchen/history (recent
// order intents/orders, the recipe book of plates they've planned, last week's plan) and
// GET /api/kitchen/grocery-options (which grocery partners are connected — none ⇒ an intent is never placed).
import {api} from '../api';

type Err = {error?: string; message?: string};
export type KitchenMeal = {day: number; slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'; name: string; kcal?: number | null};
export type KitchenOrder = {id: string; week_start: string; state: 'intent' | 'authorized' | 'fulfilled' | 'cancelled'; partner: string | null; created_at: string; itemCount: number};
export type BookEntry = {name: string; times: number; kcal: number | null; slots: string[]; lastWeek: string};
export type KitchenHistory = {
  weekStart: string; orders: KitchenOrder[]; book: BookEntry[];
  lastPlan: {weekStart: string; meals: KitchenMeal[]; groceryList: {item: string; qty: string}[]; dailyKcal: number | null} | null;
  partners: {id: string; name: string}[]; disclosure: string;
};

export const ORDER_STATE: Record<KitchenOrder['state'], string> = {
  intent: 'Intent recorded · not ordered, not charged',
  authorized: 'Authorised with the grocer',
  fulfilled: 'Delivered',
  cancelled: 'Withdrawn · nothing ordered',
};

export const readHistory = (week: string) => api<KitchenHistory & Err>(`/api/kitchen/history?week=${week}`);
export const readGroceryOptions = () => api<{partners: {id: string; name: string}[]; disclosure: string} & Err>('/api/kitchen/grocery-options');
