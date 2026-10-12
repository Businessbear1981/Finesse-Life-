#!/usr/bin/env node
// Applies db/migrations/*.sql in order, once each, inside a transaction per file.
// Usage: DATABASE_URL=postgres://... node db/migrate.mjs   (use Neon's DIRECT, non-pooled URL)
import pg from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function migrate(connectionString, { log = console.log } = {}) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query('create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    const done = new Set((await client.query('select name from public.schema_migrations')).rows.map((r) => r.name));
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      await client.query('begin');
      try {
        await client.query(readFileSync(join(dir, f), 'utf8'));
        await client.query('insert into public.schema_migrations(name) values ($1)', [f]);
        await client.query('commit');
        log(`applied ${f}`);
      } catch (e) {
        await client.query('rollback');
        throw new Error(`${f}: ${e.message}`);
      }
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL is required'); process.exit(1); }
  migrate(url).catch((e) => { console.error(e.message); process.exit(1); });
}
