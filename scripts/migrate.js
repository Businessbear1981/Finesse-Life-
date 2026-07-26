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

// Password comes from SUPABASE_DB_PASSWORD (see .env.example) — env var first,
// then .env.local / .env. Never hardcode credentials in this file.
function dbPassword() {
  if (process.env.SUPABASE_DB_PASSWORD) return process.env.SUPABASE_DB_PASSWORD;
  for (const name of ['.env.local', '.env']) {
    const p = path.resolve(__dirname, '..', name);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^SUPABASE_DB_PASSWORD=(.+)$/m);
    if (m) return m[1].trim();
  }
  console.error('❌ SUPABASE_DB_PASSWORD not set (env var or .env.local). See .env.example.');
  process.exit(1);
}

const client = new Client({
  host:     'db.zcqcgqsovrjlxxiipuzg.supabase.co',
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: dbPassword(),
  ssl:      {rejectUnauthorized: false},
});

(async () => {
  await client.connect();
  console.log('Connected to Supabase DB');
  await client.query(sql);
  console.log(`✅ Migration applied: ${file}`);
  await client.end();
})().catch(e => { console.error('❌ Migration failed:', e.message); process.exit(1); });
