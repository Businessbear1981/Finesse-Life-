import {memberRoute, must} from '@/lib/room-api';

const monday = (d = new Date()) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };

/**
 * GET /api/closet/rotation → this week's rotation built only from pieces the member owns.
 * If none exists yet, propose one: tops/dresses rotate with bottoms and shoes (deterministic, owned items only).
 * Missing categories become "missing piece" callouts, never invented items.
 */
export const GET = memberRoute(async (_req, {db, user}) => {
  const week = monday();
  const have = must(await db.from('closet_rotations').select('*').eq('week_start', week).maybeSingle());
  if (have) return have;
  const items = must(await db.from('closet_items').select('id, name, category').order('created_at')) as {id: string; name: string; category: string | null}[];
  const by = (c: string[]) => items.filter((i) => i.category && c.includes(i.category));
  const tops = by(['top', 'dress']), bottoms = by(['bottom']), shoes = by(['shoes']), outer = by(['outerwear']);
  const looks = tops.length ? Array.from({length: 7}, (_, d) => {
    const t = tops[d % tops.length]!;
    const ids = [t.id];
    if (t.category !== 'dress' && bottoms.length) ids.push(bottoms[d % bottoms.length]!.id);
    if (shoes.length) ids.push(shoes[d % shoes.length]!.id);
    if (outer.length && d % 2 === 0) ids.push(outer[(d / 2) % outer.length]!.id);
    return {day: d, item_ids: ids};
  }) : [];
  const missing = [!tops.length && 'top', !bottoms.length && 'bottom', !shoes.length && 'shoes'].filter(Boolean).map((c) => ({category: c, reason: 'nothing owned in this category'}));
  return must(await db.from('closet_rotations').insert({user_id: user.id, week_start: week, looks, missing}).select('*').single());
});
