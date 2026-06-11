/**
 * Run a SQL migration file against Supabase (direct Postgres, bypasses pooler).
 * Usage: node scripts/migrate.js supabase/migrations/your_file.sql
 */
const {Client} = require('pg');
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/migrate.js <path-to-sql-file>'); process.exit(1); }

const sql = fs.readFileSync(path.resolve(file), 'utf8');

const client = new Client({
  host:     'db.zcqcgqsovrjlxxiipuzg.supabase.co',
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: 'Superdog#109918',
  ssl:      {rejectUnauthorized: false},
});

(async () => {
  await client.connect();
  console.log('Connected to Supabase DB');
  await client.query(sql);
  console.log(`✅ Migration applied: ${file}`);
  await client.end();
})().catch(e => { console.error('❌ Migration failed:', e.message); process.exit(1); });
