// Entourage — the member's own dossiers (GET/POST /api/entourage, PATCH/DELETE /api/entourage/:id,
// /api/entourage/:id/gifts). Mirrors the pure bits of src/lib/entourage.ts (keep the two in step).
// The server computes each birthday countdown from the member's local day, which we send.
import {api} from '../api';

export type GiftStatus = 'idea' | 'purchased' | 'given';
export type Gift = {id: string; person_id: string; title: string; status: GiftStatus; price_cents: number | null; url: string | null; occasion: string | null; source: 'member' | 'nova'; created_at: string};
export type NextOccasion = {date: string; days: number; turning: number | null};
export type Person = {
  id: string; name: string; relation: string; city: string | null; birthday: string | null; loves: string[]; notes: string | null;
  linked_member_id: string | null; next: NextOccasion | null; gifts: Gift[];
};
export type PeopleData = {today: string; people: Person[]};
export type PersonInput = {name: string; relation: string; city: string | null; birthday: string | null; loves: string[]; notes: string | null};
type Err = {message?: string; error?: string};

const pad = (n: number) => String(n).padStart(2, '0');
export const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** YYYY-MM-DD that is a real calendar date. */
export function isIsoDate(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export const lovesFrom = (s: string) => [...new Set(s.split(',').map((x) => x.trim().slice(0, 50)).filter(Boolean))].slice(0, 12);

export function daysLabel(days: number) {
  return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}

export function giftQuery(p: Pick<Person, 'relation' | 'loves'>) {
  const loves = p.loves.filter(Boolean).slice(0, 6).join(', ');
  return [`a thoughtful gift for my ${p.relation.toLowerCase() || 'friend'}`, loves ? `who loves ${loves}` : ''].filter(Boolean).join(' ').slice(0, 200);
}

export function birthdayBrief(p: Pick<Person, 'name' | 'relation' | 'city' | 'loves'>, turning: number | null) {
  return [
    `A birthday evening for ${p.name} (my ${p.relation.toLowerCase() || 'friend'})${turning ? `, turning ${turning}` : ''}.`,
    p.city ? `They live in ${p.city}.` : '',
    p.loves.length ? `They love ${p.loves.slice(0, 6).join(', ')}.` : '',
    'Suggest where to go and what to do, with times.',
  ].filter(Boolean).join(' ').slice(0, 600);
}

export const readPeople = () => api<PeopleData & Err>(`/api/entourage?today=${localDay()}`);
export const addPerson = (p: PersonInput) => api<{person?: Person} & Err>('/api/entourage', {method: 'POST', json: p});
export const editPerson = (id: string, p: Partial<PersonInput>) => api<{person?: Person} & Err>(`/api/entourage/${id}`, {method: 'PATCH', json: p});
export const removePerson = (id: string) => api<Err>(`/api/entourage/${id}`, {method: 'DELETE'});
export const saveGift = (personId: string, g: {title: string; price_cents?: number | null; url?: string | null; source?: 'member' | 'nova'; occasion?: string | null; status?: GiftStatus}) =>
  api<{gift?: Gift} & Err>(`/api/entourage/${personId}/gifts`, {method: 'POST', json: g});
export const setGiftStatus = (personId: string, giftId: string, status: GiftStatus) =>
  api<{gift?: Gift} & Err>(`/api/entourage/${personId}/gifts`, {method: 'PATCH', json: {gift_id: giftId, status}});
export const removeGift = (personId: string, giftId: string) => api<Err>(`/api/entourage/${personId}/gifts?gift_id=${giftId}`, {method: 'DELETE'});
