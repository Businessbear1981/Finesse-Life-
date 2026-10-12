import {describe, expect, it} from 'vitest';
import {
  actionsFor, draftsFromToolCalls, formatCents, requestErrorText, resultView, safeUrl, toRequest,
} from '@/lib/nova-request-view';
import {brandSignals, categoryTrends, fromEmbassy, fromScale, savingsPct} from '@/lib/embassy-insights';
import {wardrobeSeedQuery} from '@/lib/wardrobe-seed';

const ID = '3f2b6a52-8c0e-4c1e-9d55-7f0a3c1b2e10';

describe('draftsFromToolCalls', () => {
  it('returns only successful draft_request results, de-duplicated', () => {
    const req = {id: ID, kind: 'find_item', title: 'Black slingbacks under $600', status: 'drafted'};
    const out = draftsFromToolCalls([
      {name: 'check_vault_balance', result: {balance_display: '$1'}},
      {name: 'draft_request', result: {drafted: true, request: req}},
      {name: 'draft_request', result: {drafted: true, request: req}},
      {name: 'draft_request', result: {drafted: false, error: 'requests_unavailable'}},
      {name: 'draft_request', result: {drafted: true, request: {id: ID, kind: 'hack', title: 'x', status: 'drafted'}}},
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({id: ID, kind: 'find_item', status: 'drafted'});
  });
  it('tolerates junk', () => {
    expect(draftsFromToolCalls(undefined)).toEqual([]);
    expect(draftsFromToolCalls([null, 1, 'x', {name: 'draft_request'}])).toEqual([]);
  });
});

describe('toRequest', () => {
  it('rejects unknown statuses and missing ids', () => {
    expect(toRequest({id: ID, kind: 'plan', title: 't', status: 'booked'})).toBeNull();
    expect(toRequest({kind: 'plan', title: 't', status: 'ready'})).toBeNull();
  });
  it('falls back to the kind label when title is empty', () => {
    expect(toRequest({id: ID, kind: 'price_check', title: '', status: 'ready'})?.title).toBe('Price check');
  });
});

describe('actionsFor', () => {
  it('mirrors the hub transitions', () => {
    expect(actionsFor('drafted')).toEqual({confirm: true, retry: false, cancel: true, done: false});
    expect(actionsFor('running')).toEqual({confirm: false, retry: false, cancel: false, done: false});
    expect(actionsFor('ready')).toEqual({confirm: false, retry: false, cancel: true, done: true});
    expect(actionsFor('failed')).toEqual({confirm: false, retry: true, cancel: true, done: false});
    expect(actionsFor('done').cancel).toBe(false);
    expect(actionsFor('cancelled').confirm).toBe(false);
  });
});

describe('resultView', () => {
  it('maps scout items and drops unsafe links', () => {
    const v = resultView({agent: 'scout', items: [
      {title: 'Slingback', brand: 'Aquazzura', price_cents: 59500, source: 'web', purchase_url: 'javascript:alert(1)', image_url: 'https://img.example/x.jpg'},
      {title: '', brand: 'x'},
      'junk',
    ]});
    expect(v.type).toBe('items');
    if (v.type !== 'items') return;
    expect(v.items).toHaveLength(1);
    expect(v.items[0].url).toBeNull();
    expect(v.items[0].image_url).toBe('https://img.example/x.jpg');
  });
  it('sorts price-hunter results cheapest first', () => {
    const v = resultView({agent: 'price-hunter', prices: [
      {source: 'Net-a-Porter', price_cents: 70000, url: 'https://net-a-porter.com', is_members_price: false, savings_cents: 0},
      {source: 'Scale', price_cents: 52000, url: null, is_members_price: true, savings_cents: 18000},
    ]});
    expect(v.type === 'prices' && v.prices.map((p) => p.source)).toEqual(['Scale', 'Net-a-Porter']);
  });
  it('keeps procurement paths', () => {
    const v = resultView({agent: 'procurement', path: {method: 'partner', partner_name: 'Carvana', partner_url: 'https://carvana.com', token: 'FSS-VIP-ABCD1234', instructions: 'Use the code.', estimated_savings_cents: 250000}});
    expect(v).toMatchObject({type: 'path', path: {partner: 'Carvana', token: 'FSS-VIP-ABCD1234', savings_cents: 250000}});
  });
  it('plans are never booked, whatever the row says', () => {
    expect(resultView({agent: 'planner', plan: 'Option A at 9pm', booked: true})).toEqual({type: 'plan', text: 'Option A at 9pm', booked: false});
  });
  it('is empty for unknown or empty results', () => {
    expect(resultView(null).type).toBe('empty');
    expect(resultView({agent: 'stylist', items: []}).type).toBe('empty');
    expect(resultView({agent: 'mystery'}).type).toBe('empty');
  });
});

describe('helpers', () => {
  it('safeUrl allows http(s) only', () => {
    expect(safeUrl('https://a.com/x')).toBe('https://a.com/x');
    expect(safeUrl('data:text/html,hi')).toBeNull();
    expect(safeUrl('/relative')).toBeNull();
  });
  it('formatCents', () => {
    expect(formatCents(59500)).toBe('$595');
    expect(formatCents(1999)).toBe('$19.99');
    expect(formatCents(null)).toBe('—');
  });
  it('requestErrorText never claims success', () => {
    for (const s of [0, 401, 404, 409, 429, 502, 503]) expect(requestErrorText(s, null)).not.toMatch(/booked!|done!|success/i);
    expect(requestErrorText(429, {retryAfterS: 12})).toContain('12 s');
  });
});

describe('embassy insights', () => {
  const scale = fromScale({id: 's1', title: 'Le Carré Scarf', brand: 'Hermès', original_price_cents: 44500, group_price_cents: 32000, goal_count: 5, current_count: 3, category: 'accessories', status: 'open'});
  const emb = fromEmbassy({id: 'e1', brand: 'Hermès', item: 'Twilly', source: 'Direct', retail_price_cents: 23000, members_price_cents: 18400, category: 'Accessories', tier: 'mid', status: 'pending'});
  const shoe = fromEmbassy({id: 'e2', brand: 'Amina Muaddi', item: 'Begum', source: null, retail_price_cents: null, members_price_cents: null, category: 'shoes', tier: 'factoryish', status: 'review'});

  it('maps rows honestly', () => {
    expect(scale).toMatchObject({status: 'live', tier: 'contemporary', margin_pct: 28, joins: 3, category: 'Accessories'});
    expect(emb).toMatchObject({status: 'pending', tier: 'mid', margin_pct: 20});
    expect(shoe).toMatchObject({retail: 0, margin_pct: 0, tier: 'budget', source: 'Submitted', status: 'review'});
    expect(savingsPct(100, 120)).toBe(0);
  });
  it('derives category trends and brand signals from real rows only', () => {
    expect(categoryTrends([])).toEqual([]);
    const t = categoryTrends([scale, emb, shoe]);
    expect(t[0]).toMatchObject({category: 'Accessories', deals: 2, live: 1, top_brand: 'Hermès', joins: 3, avg_savings_pct: 24});
    const b = brandSignals([scale, emb, shoe]);
    expect(b[0]).toMatchObject({name: 'Hermès', deals: 2, live: 1, status: 'active'});
    expect(b[1]).toMatchObject({name: 'Amina Muaddi', status: 'prospect', avg_savings_pct: 0});
  });
});

describe('wardrobeSeedQuery', () => {
  it('is empty with nothing to go on', () => {
    expect(wardrobeSeedQuery({})).toBe('');
  });
  it('ranks brands across looks, wishlist and registry', () => {
    const q = wardrobeSeedQuery({
      lookBrands: [['The Row', 'Khaite'], ['the row']],
      wishlist: [{brand: 'Bottega Veneta', item: 'Andiamo'}],
      registry: [{brand: 'Khaite', category: 'Clothing'}, {brand: null, category: 'Other'}],
    });
    expect(q).toBe('pieces in the style of The Row, Khaite, Bottega Veneta — clothing');
    expect(q.length).toBeLessThanOrEqual(200);
  });
});
