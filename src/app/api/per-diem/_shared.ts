import {z} from 'zod';

export const PLAN_COLS = 'id, plan_date, occasion, budget_cents, items, plan_text, nova_request_id, status, updated_at';
export const isUuid = (s: string) => z.string().uuid().safeParse(s).success;
export const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'Use YYYY-MM-DD');
export const item = z.object({
  time: z.string().trim().max(20),
  label: z.string().trim().min(1).max(120),
  cost_cents: z.number().int().min(0).max(10_000_000),
  done: z.boolean(),
});
export const budget = z.number().int().min(0).max(10_000_000);
export const occasion = z.string().trim().min(1).max(60);
