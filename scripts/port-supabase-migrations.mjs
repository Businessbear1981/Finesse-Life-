#!/usr/bin/env node
// Ports supabase/migrations/*.sql to plain Postgres (Neon) in db/migrations/.
// Replaces Supabase auth helpers and roles with the app.* equivalents from 0000_platform.sql.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'supabase/migrations';
const DST = 'db/migrations';
const SKIP = new Set(['20260806_demo_data_seed.sql', '20260614_scale_deals_seed.sql']);

// The Supabase history has overlapping `create table if not exists` blocks
// (core, mvp, v2, master) that drifted. On a fresh database the later block is
// skipped, so its extra columns never appear. After each such block we emit
// `add column if not exists` for every column so a clean replay converges on
// the union of all definitions (what the live database actually ended up with).
function splitTopLevel(body) {
  const parts = []; let depth = 0, cur = '', q = false;
  for (const ch of body) {
    if (ch === "'") q = !q;
    if (!q && ch === '(') depth++;
    if (!q && ch === ')') depth--;
    if (!q && ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}
const NOT_COLUMN = /^(constraint|primary\s+key|unique\s*\(|check\s*\(|foreign\s+key|exclude|like)\b/i;
export function reconcile(sql) {
  const re = /create\s+table\s+if\s+not\s+exists\s+([\w."]+)\s*\(/gi;
  let out = '', last = 0, m;
  while ((m = re.exec(sql))) {
    let i = re.lastIndex, depth = 1, q = false;
    for (; i < sql.length && depth; i++) {
      const ch = sql[i];
      if (ch === "'") q = !q;
      else if (!q && ch === '(') depth++;
      else if (!q && ch === ')') depth--;
    }
    const body = sql.slice(re.lastIndex, i - 1).replace(/--[^\n]*/g, '');
    const semi = sql.indexOf(';', i);
    const cols = splitTopLevel(body).map((c) => c.trim()).filter((c) => c && !NOT_COLUMN.test(c))
      .map((c) => c.replace(/\bprimary\s+key\b/i, '').replace(/\bunique\b(?!\s*\()/i, ''));
    out += sql.slice(last, semi + 1) + '\n' + cols.map((c) => `alter table ${m[1]} add column if not exists ${c};`).join('\n') + '\n';
    last = semi + 1; re.lastIndex = semi + 1;
  }
  return out + sql.slice(last);
}

export function port(sql) {
  return reconcile(sql)
    .replace(/\bauth\.uid\(\)::text\s*=\s*(\w+)\b(?!::)/g, 'app.uid()::text = $1::text') // tolerate uuid/text drift
    .replace(/\bauth\.uid\(\)/g, 'app.uid()')
    .replace(/\bauth\.jwt\(\)/g, 'app.claims()')
    .replace(/\bauth\.users\b/g, 'app.users')
    .replace(/\bto\s+authenticated\b/gi, 'to app_user')
    .replace(/\bto\s+anon\b/gi, 'to app_anon')
    .replace(/\bservice_role\b/g, 'app_service')
    // pg_cron is not part of the Neon baseline; scheduled jobs run from Workers Cron Triggers.
    .replace(/^(\s*)(select\s+cron\.schedule[\s\S]*?;)/gim, (_m, ws, stmt) => ws + '-- [ported] moved to Workers Cron Trigger: ' + stmt.replace(/\n/g, ' '));
}

// member_profiles must exist before the RLS hardening that references it (same date prefix).
const ORDER_FIX = { '20260803_member_profiles.sql': '20260803_a_member_profiles.sql' };
const key = (f) => ORDER_FIX[f] ?? f;
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main();
function main() {
const files = readdirSync(SRC).filter((f) => f.endsWith('.sql')).sort((a, b) => key(a).localeCompare(key(b)));
let n = 1;
for (const f of files) {
  if (SKIP.has(f)) continue;
  const out = `-- Ported from ${SRC}/${f} by scripts/port-supabase-migrations.mjs\n` + port(readFileSync(join(SRC, f), 'utf8'));
  writeFileSync(join(DST, `${String(n++).padStart(4, '0')}_${f.replace(/^\d+_?/, '')}`), out);
}
console.log(`ported ${n - 1} migrations`);
}
