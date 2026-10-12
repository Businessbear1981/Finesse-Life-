// Seed a Nova find_item search from what the member already owns and wants (wardrobe_looks brands,
// wardrobe wishlist, registry items). Pure; tests/wardrobe-seed.test.ts.

export type SeedSources = {
  lookBrands?: string[][]; // wardrobe_looks.brands per look
  wishlist?: Array<{brand?: string | null; item?: string | null}>;
  registry?: Array<{brand?: string | null; category?: string | null}>;
};

const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f]+/g, ' ').trim() : '');

/** Most frequent values first (ties keep first-seen order), case-insensitive de-dupe. */
function ranked(values: string[], limit: number): string[] {
  const counts = new Map<string, {label: string; n: number; first: number}>();
  values.forEach((v, i) => {
    const label = clean(v);
    if (!label) return;
    const key = label.toLowerCase();
    const cur = counts.get(key);
    if (cur) cur.n += 1;
    else counts.set(key, {label, n: 1, first: i});
  });
  return [...counts.values()].sort((a, b) => b.n - a.n || a.first - b.first).slice(0, limit).map((c) => c.label);
}

/** "pieces in the style of Bottega Veneta, The Row, Khaite — bags, outerwear", or '' when there's nothing to go on. */
export function wardrobeSeedQuery(src: SeedSources): string {
  const brands = ranked([
    ...(src.lookBrands ?? []).flat(),
    ...(src.wishlist ?? []).map((w) => clean(w.brand)),
    ...(src.registry ?? []).map((r) => clean(r.brand)),
  ], 4);
  const categories = ranked((src.registry ?? []).map((r) => clean(r.category).toLowerCase()).filter((c) => c && c !== 'other'), 2);
  if (brands.length === 0 && categories.length === 0) return '';
  const parts = [brands.length ? `pieces in the style of ${brands.join(', ')}` : 'pieces for my wardrobe'];
  if (categories.length) parts.push(categories.join(', '));
  return parts.join(' — ').slice(0, 200);
}
