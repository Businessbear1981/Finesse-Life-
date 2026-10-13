import {beforeEach, describe, expect, it, vi} from 'vitest';

// Agents + Nova are mocked; the service client is a small in-memory fake keyed by table.
const agents = {
  scoutByText: vi.fn(),
  filterByStyle: vi.fn(),
  suggestForOccasion: vi.fn(),
  huntPrice: vi.fn(),
  findProcurementPath: vi.fn(),
};
class NovaUnavailableError extends Error {
  constructor(public readonly status: number) { super('nova_unavailable'); }
}
vi.mock('@/lib/agents', () => ({...agents, NovaUnavailableError}));
const runNova = vi.fn();
vi.mock('@/lib/nova', () => ({runNova: (...a: unknown[]) => runNova(...a)}));

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
function fakeDb() {
  return {
    from(table: string) {
      const rows = (tables[table] ??= []);
      const q: {filters: Array<[string, unknown]>; patch?: Row; insert?: Row} = {filters: []};
      const match = (r: Row) => q.filters.every(([k, v]) => r[k] === v);
      const api = {
        select: () => api,
        eq: (k: string, v: unknown) => { q.filters.push([k, v]); return api; },
        update: (p: Row) => { q.patch = p; return api; },
        insert: (p: Row) => { q.insert = {id: `${table}-${rows.length + 1}`, ...p}; rows.push(q.insert); return api; },
        maybeSingle: async () => run(),
        single: async () => run(),
        // Real query builders run when awaited.
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(run()).then(resolve),
      };
      const run = () => {
        if (q.insert) return {data: q.insert, error: null};
        const hit = rows.filter(match);
        if (q.patch) hit.forEach((r) => Object.assign(r, q.patch));
        return {data: hit[0] ?? null, error: null};
      };
      return api;
    },
  };
}
vi.mock('@/lib/supabase/service', () => ({createServiceClient: () => fakeDb()}));

const {cleanDetails, confirmAndDispatch, closeRequest} = await import('@/lib/nova-requests');

const ME = 'member-1';
function seed(row: Partial<Row>) {
  const r = {id: 'req-1', member_id: ME, kind: 'find_item', title: 'Slingbacks', details: {query: 'black slingbacks'}, status: 'drafted', result: null, diary_item_id: null, ...row};
  tables.nova_requests = [r];
  tables.profiles = [{id: ME, nightvision_data: {palette: 'noir'}, style_dna: null}];
  tables.diary_items = [];
  return r;
}

beforeEach(() => {
  Object.values(agents).forEach((f) => f.mockReset());
  runNova.mockReset();
});

describe('cleanDetails', () => {
  it('accepts valid details per kind and applies defaults', () => {
    expect(cleanDetails('find_item', {query: 'loafers'})).toEqual({ok: true, details: {query: 'loafers'}});
    const p = cleanDetails('price_check', {title: 'Bag', retail_cents: 1000});
    expect(p.ok && p.details).toMatchObject({brand: '', category: 'fashion'});
    expect(cleanDetails('plan', {brief: 'Dinner for 4'})).toMatchObject({ok: true, details: {topic: 'other'}});
  });
  it('rejects bad details', () => {
    expect(cleanDetails('find_item', {})).toEqual({ok: false, error: 'bad_details'});
    expect(cleanDetails('price_check', {title: 'x', retail_cents: -1})).toEqual({ok: false, error: 'bad_details'});
    expect(cleanDetails('plan', {brief: 'x', topic: 'jet'})).toEqual({ok: false, error: 'bad_details'});
    expect(cleanDetails('plan', {brief: 'x', when: 'tomorrow'})).toEqual({ok: false, error: 'bad_details'});
  });
});

describe('confirmAndDispatch', () => {
  it('runs scout, ranks by style, stores the result and files a diary item', async () => {
    seed({});
    agents.scoutByText.mockResolvedValue([{title: 'A', price_cents: 50000}, {title: 'B', price_cents: 90000}]);
    agents.filterByStyle.mockImplementation(async (items: unknown[]) => [...items].reverse());
    const out = await confirmAndDispatch('req-1', ME);
    expect(out.status).toBe(200);
    expect(agents.scoutByText).toHaveBeenCalledWith('black slingbacks', expect.stringContaining('noir'), {userId: ME});
    const row = tables.nova_requests[0];
    expect(row.status).toBe('ready');
    expect((row.result as {items: Array<{title: string}>}).items.map((i) => i.title)).toEqual(['B', 'A']);
    expect(tables.diary_items).toHaveLength(1);
    expect(tables.diary_items[0]).toMatchObject({user_id: ME, source_room: 'nova', source_id: 'req-1', state: 'needs_member_action'});
    expect(row.diary_item_id).toBe(tables.diary_items[0].id);
  });

  it('applies the budget to scout results', async () => {
    seed({details: {query: 'bag', budget_cents: 60000}});
    agents.scoutByText.mockResolvedValue([{title: 'Cheap', price_cents: 50000}, {title: 'Dear', price_cents: 90000}]);
    agents.filterByStyle.mockImplementation(async (i: unknown[]) => i);
    await confirmAndDispatch('req-1', ME);
    expect((tables.nova_requests[0].result as {items: unknown[]}).items).toEqual([{title: 'Cheap', price_cents: 50000}]);
  });

  it('plans honestly: booked is always false and the diary note says so', async () => {
    seed({kind: 'plan', title: 'Dinner Friday', details: {topic: 'table', brief: 'Dinner for 4', when: '2026-10-16T20:00:00.000Z'}});
    runNova.mockResolvedValue({ok: true, text: 'Option 1: Uchi at 8pm'});
    const out = await confirmAndDispatch('req-1', ME);
    expect(out.status).toBe(200);
    expect(runNova).toHaveBeenCalledWith(expect.objectContaining({persona: 'date_planner', userId: ME}));
    expect(tables.nova_requests[0].result).toMatchObject({agent: 'planner', booked: false});
    expect(tables.diary_items[0]).toMatchObject({starts_at: '2026-10-16T20:00:00.000Z', notes: expect.stringMatching(/Nothing is booked/)});
  });

  it('marks the request failed (and retryable) when Nova is down', async () => {
    seed({kind: 'style_for_occasion', details: {occasion: 'Gala', occasion_type: 'black tie'}});
    agents.suggestForOccasion.mockRejectedValue(new NovaUnavailableError(503));
    const out = await confirmAndDispatch('req-1', ME);
    expect(out).toEqual({status: 503, body: {error: 'nova_unavailable'}});
    expect(tables.nova_requests[0]).toMatchObject({status: 'failed', error: 'nova_unavailable'});
    expect(tables.diary_items).toHaveLength(0);
    agents.suggestForOccasion.mockResolvedValue([{title: 'Gown'}]);
    expect((await confirmAndDispatch('req-1', ME)).status).toBe(200);
  });

  it("refuses someone else's request and non-confirmable states", async () => {
    seed({});
    expect((await confirmAndDispatch('req-1', 'intruder')).status).toBe(404);
    expect((await confirmAndDispatch('nope', ME)).status).toBe(404);
    tables.nova_requests[0].status = 'ready';
    expect((await confirmAndDispatch('req-1', ME)).status).toBe(409);
    expect(agents.scoutByText).not.toHaveBeenCalled();
  });

  it('routes price checks and procurement to their agents', async () => {
    seed({kind: 'price_check', details: {title: 'Kelly 28', brand: 'Hermès', category: 'bags', retail_cents: 1200000}});
    agents.huntPrice.mockResolvedValue([{source: 'Retail (est.)', price_cents: 1200000}]);
    await confirmAndDispatch('req-1', ME);
    expect(agents.huntPrice).toHaveBeenCalledWith('Kelly 28', 'Hermès', 'bags', 1200000, {userId: ME});
    seed({kind: 'procurement', details: {title: 'Model 3', category: 'cars', price_cents: 4000000}});
    agents.findProcurementPath.mockResolvedValue({partner: 'Carvana'});
    await confirmAndDispatch('req-1', ME);
    expect(tables.nova_requests[0].result).toEqual({agent: 'procurement', path: {partner: 'Carvana'}});
  });
});

describe('closeRequest', () => {
  it('cancels drafts and closes the linked diary item', async () => {
    seed({status: 'ready', diary_item_id: 'd1'});
    tables.diary_items = [{id: 'd1', state: 'needs_member_action'}];
    expect((await closeRequest('req-1', ME, 'done')).status).toBe(200);
    expect(tables.diary_items[0].state).toBe('done');
  });
  it('only marks ready requests done, and only for the owner', async () => {
    seed({status: 'drafted'});
    expect((await closeRequest('req-1', ME, 'done')).status).toBe(409);
    expect((await closeRequest('req-1', 'intruder', 'cancelled')).status).toBe(404);
    expect((await closeRequest('req-1', ME, 'cancelled')).status).toBe(200);
  });
});
