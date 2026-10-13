import {z} from 'zod';
import {isIsoDate} from '@/lib/entourage';

export const PERSON_COLS = 'id, name, relation, city, birthday, loves, notes, linked_member_id, created_at, updated_at';
export const GIFT_COLS = 'id, person_id, title, status, price_cents, url, occasion, source, created_at';

export const loves = z.array(z.string().trim().min(1).max(50)).max(12);
export const personFields = {
  name: z.string().trim().min(1).max(80),
  relation: z.string().trim().min(1).max(40),
  city: z.string().trim().max(80).nullable(),
  birthday: z.string().refine(isIsoDate, 'Use YYYY-MM-DD').nullable(),
  loves,
  notes: z.string().trim().max(2000).nullable(),
  linked_member_id: z.string().uuid().nullable(),
};

export const emptyToNull = (s: string | null | undefined) => (s ? s : null);
export const isUuid = (s: string) => z.string().uuid().safeParse(s).success;
