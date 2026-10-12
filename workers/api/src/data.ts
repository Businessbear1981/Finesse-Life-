// Generic, RLS-bound data endpoint used by the Next.js app in place of the Supabase client.
// Compiles a small, validated query description to parameterised SQL. Identifiers are checked
// against the live catalogue of the public schema; values are always bound parameters.
import { z } from 'zod';
import type { Tx } from './db';

const Ident = z.string().regex(/^[a-z_][a-z0-9_]*$/);
const Op = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is', 'contains']);
const Filter = z.object({ col: Ident, op: Op, value: z.unknown(), not: z.boolean().optional() });

export const DataQuery = z.object({
  table: Ident,
  op: z.enum(['select', 'insert', 'update', 'upsert', 'delete']),
  columns: z.string().max(2000).default('*'),
  filters: z.array(Filter).max(50).default([]),
  or: z.array(z.array(Filter).min(1).max(20)).max(10).default([]),
  order: z.array(z.object({ col: Ident, ascending: z.boolean().default(true), nullsFirst: z.boolean().optional() })).max(5).default([]),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  values: z.union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown())).max(500)]).optional(),
  onConflict: z.string().max(200).optional(),
  ignoreDuplicates: z.boolean().optional(),
  returning: z.boolean().default(false),
  count: z.enum(['exact']).optional(),
  head: z.boolean().optional(),
  single: z.enum(['single', 'maybe']).optional(),
});
export type DataQuery = z.infer<typeof DataQuery>;

export class DataError extends Error { constructor(public code: string, msg: string, public status = 400) { super(msg); } }

const catalogue = new Map<string, Set<string>>();
const jsonCols = new Map<string, Set<string>>();
let loadedAt = 0;
async function columnsOf(tx: Tx, table: string): Promise<Set<string>> {
  if (Date.now() - loadedAt > 300_000) { catalogue.clear(); loadedAt = Date.now(); }
  if (!catalogue.size) {
    const { rows } = await tx.query<{ t: string; c: string; ty: string }>("select table_name t, column_name c, data_type ty from information_schema.columns where table_schema = 'public'");
    for (const r of rows) {
      if (!catalogue.has(r.t)) { catalogue.set(r.t, new Set()); jsonCols.set(r.t, new Set()); }
      catalogue.get(r.t)!.add(r.c);
      if (r.ty === 'json' || r.ty === 'jsonb') jsonCols.get(r.t)!.add(r.c);
    }
  }
  const cols = catalogue.get(table);
  if (!cols) throw new DataError('42P01', `relation "${table}" does not exist`, 404);
  return cols;
}
export const resetCatalogue = () => { catalogue.clear(); jsonCols.clear(); loadedAt = 0; };

/** Bind a column value: objects always, and arrays only for json/jsonb columns, go as JSON text (arrays otherwise bind as Postgres arrays). */
function bindValue(table: string, col: string, v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (!Array.isArray(v) || jsonCols.get(table)?.has(col)) return JSON.stringify(v);
  return v;
}

const q = (s: string) => `"${s}"`;

function selectList(columns: string, cols: Set<string>): string {
  const parts = columns.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length || parts.includes('*')) return '*';
  return parts.map((p) => {
    const m = p.match(/^([a-z_][a-z0-9_]*)(?::([a-z_][a-z0-9_]*))?$/);
    if (!m) throw new DataError('PGRST100', `unsupported select item "${p}"`);
    const [alias, col] = m[2] ? [m[1]!, m[2]] : [m[1]!, m[1]!];
    if (!cols.has(col)) throw new DataError('42703', `column "${col}" does not exist`);
    return alias === col ? q(col) : `${q(col)} as ${q(alias)}`;
  }).join(', ');
}

function compileFilter(f: z.infer<typeof Filter>, cols: Set<string>, params: unknown[]): string {
  if (!cols.has(f.col)) throw new DataError('42703', `column "${f.col}" does not exist`);
  const c = q(f.col);
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
  let sql: string;
  switch (f.op) {
    case 'eq': sql = `${c} = ${p(f.value)}`; break;
    case 'neq': sql = `${c} <> ${p(f.value)}`; break;
    case 'gt': sql = `${c} > ${p(f.value)}`; break;
    case 'gte': sql = `${c} >= ${p(f.value)}`; break;
    case 'lt': sql = `${c} < ${p(f.value)}`; break;
    case 'lte': sql = `${c} <= ${p(f.value)}`; break;
    case 'like': sql = `${c}::text like ${p(f.value)}`; break;
    case 'ilike': sql = `${c}::text ilike ${p(f.value)}`; break;
    case 'in': if (!Array.isArray(f.value)) throw new DataError('PGRST100', 'in() needs an array'); sql = `${c} = any(${p(f.value)})`; break;
    case 'is': if (!(f.value === null || typeof f.value === 'boolean')) throw new DataError('PGRST100', 'is() takes null or boolean'); sql = `${c} is ${f.value === null ? 'null' : f.value ? 'true' : 'false'}`; break;
    case 'contains': sql = `${c} @> ${p(Array.isArray(f.value) ? f.value : JSON.stringify(f.value))}`; break;
  }
  return f.not ? `not (${sql})` : sql;
}

function where(dq: DataQuery, cols: Set<string>, params: unknown[]): string {
  const parts = dq.filters.map((f) => compileFilter(f, cols, params));
  for (const group of dq.or) parts.push(`(${group.map((f) => compileFilter(f, cols, params)).join(' or ')})`);
  return parts.length ? ` where ${parts.join(' and ')}` : '';
}

function rowValues(v: Record<string, unknown>[], cols: Set<string>) {
  const keys = [...new Set(v.flatMap((r) => Object.keys(r)))];
  for (const k of keys) if (!cols.has(k)) throw new DataError('42703', `column "${k}" does not exist`);
  return keys;
}

export async function runData(tx: Tx, dq: DataQuery): Promise<{ data: unknown; count: number | null }> {
  const cols = await columnsOf(tx, dq.table);
  const t = `public.${q(dq.table)}`;
  const params: unknown[] = [];
  const ret = dq.returning ? ` returning ${selectList(dq.columns, cols)}` : '';
  let sql: string;
  let count: number | null = null;

  if (dq.op === 'select') {
    const w = where(dq, cols, params);
    if (dq.count) count = Number((await tx.query<{ n: string }>(`select count(*) n from ${t}${w}`, params)).rows[0]!.n);
    if (dq.head) return { data: null, count };
    const order = dq.order.map((o) => { if (!cols.has(o.col)) throw new DataError('42703', `column "${o.col}" does not exist`); return `${q(o.col)} ${o.ascending ? 'asc' : 'desc'}${o.nullsFirst === undefined ? '' : o.nullsFirst ? ' nulls first' : ' nulls last'}`; });
    sql = `select ${selectList(dq.columns, cols)} from ${t}${w}${order.length ? ` order by ${order.join(', ')}` : ''}${dq.limit ? ` limit ${dq.limit}` : ''}${dq.offset ? ` offset ${dq.offset}` : ''}`;
  } else if (dq.op === 'insert' || dq.op === 'upsert') {
    const rows = Array.isArray(dq.values) ? dq.values : dq.values ? [dq.values] : [];
    if (!rows.length) throw new DataError('PGRST100', 'no values');
    const keys = rowValues(rows, cols);
    const tuples = rows.map((r) => `(${keys.map((k) => { if (!(k in r)) return 'default'; params.push(bindValue(dq.table, k, r[k])); return `$${params.length}`; }).join(', ')})`);
    let conflict = '';
    if (dq.op === 'upsert') {
      const target = (dq.onConflict ?? 'id').split(',').map((s) => s.trim());
      for (const k of target) if (!cols.has(k)) throw new DataError('42703', `column "${k}" does not exist`);
      const upd = keys.filter((k) => !target.includes(k));
      conflict = ` on conflict (${target.map(q).join(', ')}) do ${dq.ignoreDuplicates || !upd.length ? 'nothing' : `update set ${upd.map((k) => `${q(k)} = excluded.${q(k)}`).join(', ')}`}`;
    }
    sql = `insert into ${t} (${keys.map(q).join(', ')}) values ${tuples.join(', ')}${conflict}${ret}`;
  } else if (dq.op === 'update') {
    if (!dq.values || Array.isArray(dq.values)) throw new DataError('PGRST100', 'update needs one object');
    const keys = rowValues([dq.values], cols);
    const sets = keys.map((k) => { const v = (dq.values as Record<string, unknown>)[k]; params.push(bindValue(dq.table, k, v)); return `${q(k)} = $${params.length}`; });
    const w = where(dq, cols, params);
    if (!w) throw new DataError('21000', 'UPDATE requires a WHERE clause');
    sql = `update ${t} set ${sets.join(', ')}${w}${ret}`;
  } else {
    const w = where(dq, cols, params);
    if (!w) throw new DataError('21000', 'DELETE requires a WHERE clause');
    sql = `delete from ${t}${w}${ret}`;
  }

  const { rows } = await tx.query(sql, params);
  if (dq.op !== 'select' && !dq.returning) return { data: null, count };
  if (dq.single) {
    if (rows.length > 1 || (dq.single === 'single' && rows.length === 0)) {
      throw new DataError('PGRST116', `JSON object requested, multiple (or no) rows returned`, 406);
    }
    return { data: rows[0] ?? null, count };
  }
  return { data: rows, count };
}
