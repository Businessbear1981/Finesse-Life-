import pg from 'pg';
import { migrate } from '../migrate.mjs';

// TEST_DATABASE_URL must point at a disposable server (a superuser connection that can create databases).
export const ADMIN_URL = process.env.TEST_DATABASE_URL;

export async function freshDb(name) {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${name}`);
  await admin.query(`create database ${name}`);
  await admin.end();
  const url = new URL(ADMIN_URL); url.pathname = '/' + name;
  await migrate(url.toString(), { log: () => {} });
  const c = new pg.Client({ connectionString: url.toString() });
  await c.connect();
  return c;
}

/** Run fn as app_user with the given claims inside a transaction that is rolled back unless commit=true. */
export async function asUser(c, uid, fn, extra = {}) {
  await c.query('begin');
  try {
    await c.query('set local role app_user');
    await c.query('select app.set_claims($1)', [JSON.stringify({ uid, ...extra })]);
    return await fn();
  } finally {
    await c.query('rollback');
  }
}

export async function newUser(c, email) {
  const { rows } = await c.query("insert into app.users(workos_user_id, email) values ($1, $2) returning id", ['user_' + Math.random().toString(36).slice(2), email]);
  return rows[0].id;
}

/** Assert a statement fails inside an open transaction without aborting it. */
export async function rejects(c, sql, params, re) {
  await c.query('savepoint t');
  let err;
  try { await c.query(sql, params); } catch (e) { err = e; }
  await c.query('rollback to savepoint t');
  if (!err) throw new Error(`expected failure: ${sql}`);
  if (re && !re.test(err.message)) throw new Error(`expected ${re}, got: ${err.message}`);
}
