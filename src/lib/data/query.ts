/* eslint-disable @typescript-eslint/no-explicit-any -- dynamic, Supabase-compatible query surface */
// database-compatible query builder backed by the Finesse Worker (/v1/data).
// Implements the subset of the PostgREST client API this app uses, so call sites stay unchanged.

export type DataError = { message: string; code?: string; details?: unknown } | null;
export type DataResult<T = any> = { data: T; error: DataError; count: number | null; status?: number };
export type Transport = (body: Record<string, unknown>) => Promise<DataResult>;

type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'contains';
type Filter = { col: string; op: Op; value: unknown; not?: boolean };

function parseOr(expr: string): Filter[] {
  // PostgREST syntax: "col.op.value,col2.op.value" (values here never contain commas)
  return expr.split(',').map((part) => {
    const m = part.trim().match(/^([a-z_][a-z0-9_]*)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.*)$/);
    if (!m) throw new Error(`unsupported or() clause: ${part}`);
    const raw = m[3]!;
    const value = m[2] === 'is' ? (raw === 'null' ? null : raw === 'true') : m[2]!.endsWith('like') ? raw.replace(/\*/g, '%') : raw;
    return { col: m[1]!, op: m[2] as Op, value };
  });
}

export class QueryBuilder<T = any[]> implements PromiseLike<DataResult<T>> {
  private q: Record<string, any>;
  constructor(private transport: Transport, table: string) {
    this.q = { table, op: 'select', columns: '*', filters: [] as Filter[], or: [] as Filter[][], order: [] };
  }
  select(columns = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    if (this.q.op === 'select') this.q.columns = columns.replace(/\s+/g, ' ');
    else { this.q.returning = true; this.q.columns = columns; }
    if (opts?.count) this.q.count = 'exact';
    if (opts?.head) this.q.head = true;
    return this;
  }
  insert(values: object | object[]) { this.q.op = 'insert'; this.q.values = values; return this; }
  upsert(values: object | object[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.q.op = 'upsert'; this.q.values = values; this.q.onConflict = opts?.onConflict; this.q.ignoreDuplicates = opts?.ignoreDuplicates; return this;
  }
  update(values: object) { this.q.op = 'update'; this.q.values = values; return this; }
  delete() { this.q.op = 'delete'; return this; }
  private f(col: string, op: Op, value: unknown, not = false) { this.q.filters.push({ col, op, value, ...(not ? { not } : {}) }); return this; }
  eq(c: string, v: unknown) { return this.f(c, 'eq', v); }
  neq(c: string, v: unknown) { return this.f(c, 'neq', v); }
  gt(c: string, v: unknown) { return this.f(c, 'gt', v); }
  gte(c: string, v: unknown) { return this.f(c, 'gte', v); }
  lt(c: string, v: unknown) { return this.f(c, 'lt', v); }
  lte(c: string, v: unknown) { return this.f(c, 'lte', v); }
  like(c: string, v: string) { return this.f(c, 'like', v); }
  ilike(c: string, v: string) { return this.f(c, 'ilike', v); }
  in(c: string, v: readonly unknown[]) { return this.f(c, 'in', [...v]); }
  is(c: string, v: null | boolean) { return this.f(c, 'is', v); }
  contains(c: string, v: unknown) { return this.f(c, 'contains', v); }
  not(c: string, op: Op, v: unknown) { return this.f(c, op, v, true); }
  filter(c: string, op: Op, v: unknown) { return this.f(c, op, v); }
  match(obj: Record<string, unknown>) { for (const [k, v] of Object.entries(obj)) this.f(k, 'eq', v); return this; }
  or(expr: string) { this.q.or.push(parseOr(expr)); return this; }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) { this.q.order.push({ col, ascending: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst }); return this; }
  limit(n: number) { this.q.limit = n; return this; }
  range(from: number, to: number) { this.q.offset = from; this.q.limit = to - from + 1; return this; }
  single(): QueryBuilder<any> { this.q.single = 'single'; if (this.q.op !== 'select') this.q.returning = true; return this as any; }
  maybeSingle(): QueryBuilder<any> { this.q.single = 'maybe'; if (this.q.op !== 'select') this.q.returning = true; return this as any; }
  returns<U>() { return this as unknown as QueryBuilder<U>; }
  then<R1 = DataResult<T>, R2 = never>(ok?: ((v: DataResult<T>) => R1 | PromiseLike<R1>) | null, fail?: ((e: unknown) => R2 | PromiseLike<R2>) | null) {
    return this.transport(this.q).then(ok as any, fail as any) as Promise<R1 | R2>;
  }
  /** For tests. */
  toJSON() { return this.q; }
}

export interface AuthUser { id: string; email: string | null; role?: string | null }
export interface AuthApi {
  getUser(): Promise<{ data: { user: AuthUser | null }; error: DataError }>;
  getSession?(): Promise<{ data: { session: { access_token: string } | null }; error: DataError }>;
}

export class DataClient {
  constructor(private transport: Transport, public auth: AuthApi) {}
  from<T = any[]>(table: string) { return new QueryBuilder<T>(this.transport, table); }
}

export function httpTransport(url: string, headers: () => Promise<Record<string, string>> | Record<string, string>): Transport {
  return async (body) => {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await headers()) }, body: JSON.stringify(body), cache: 'no-store' });
      const j = (await r.json().catch(() => ({}))) as Partial<DataResult>;
      return { data: j.data ?? null, error: j.error ?? (r.ok ? null : { message: `HTTP ${r.status}` }), count: j.count ?? null, status: r.status };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message, code: 'FETCH_ERROR' }, count: null };
    }
  };
}
