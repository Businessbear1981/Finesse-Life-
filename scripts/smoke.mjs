#!/usr/bin/env node
/**
 * HTTP smoke test for the Keylock hotel build. Signed-out checks only — safe to run
 * against production. Usage: BASE_URL=https://finesselife.vip npm run smoke
 */
const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const req = (path, init = {}) => fetch(`${BASE}${path}`, {redirect: 'manual', ...init});

console.log(`Smoke: ${BASE}`);

await check('entrance challenge issues a challenge', async () => {
  const r = await req('/api/keylock/entrance/challenge', {method: 'POST'});
  const b = await r.json();
  expect(r.status === 200 && b.state === 'ready' && b.challengeId, `got ${r.status} ${JSON.stringify(b)}`);
  expect((r.headers.get('cache-control') ?? '').includes('no-store'), 'challenge must be no-store');
});

await check('entrance rejects malformed codes', async () => {
  const r = await req('/api/keylock/entrance/verify', {method: 'POST', headers: {'content-type': 'application/json'}, body: '{"challengeId":"x","code":"12"}'});
  expect(r.status === 400, `got ${r.status}`);
});

await check('home page ships no entrance code', async () => {
  const html = await (await req('/')).text();
  expect(!/DEMO_PIN/.test(html), 'DEMO_PIN found in HTML');
});

for (const path of ['/api/diary', '/api/ballroom/context', '/api/closet/rotation', '/api/identity/context', '/api/camera/items', '/api/gym/today', '/api/kitchen/plan', '/api/scale/pledges', '/api/vip-keylock/session']) {
  await check(`${path} answers JSON 401 when signed out`, async () => {
    const r = await req(path);
    expect(r.status === 401, `got ${r.status} (redirect would mean middleware regression)`);
    expect((r.headers.get('content-type') ?? '').includes('json'), 'not JSON');
  });
}

await check('vip lift challenge refuses signed-out callers', async () => {
  const r = await req('/api/vip-keylock/challenge', {method: 'POST', headers: {'content-type': 'application/json'}, body: '{}'});
  expect(r.status === 401, `got ${r.status}`);
});

await check('/penthouse redirects into the VIP Room', async () => {
  const r = await req('/penthouse');
  expect([307, 308].includes(r.status) && (r.headers.get('location') ?? '').includes('/vip/penthouse'), `got ${r.status} → ${r.headers.get('location')}`);
});

await check('/vip/penthouse is not reachable signed out', async () => {
  const r = await req('/vip/penthouse');
  expect([307, 308].includes(r.status) && (r.headers.get('location') ?? '').includes('/login'), `got ${r.status} → ${r.headers.get('location')}`);
});

await check('Stripe webhook reaches its handler (not redirected to /login)', async () => {
  const r = await req('/api/webhooks/stripe', {method: 'POST', body: '{}'});
  expect(r.status === 400, `got ${r.status} — expected 400 "missing signature"`);
});

await check('Vault top-up is frozen', async () => {
  const r = await req('/api/vault/fund', {method: 'POST', headers: {'content-type': 'application/json'}, body: '{"amount_cents":5000}'});
  expect(r.status === 401 || r.status === 423, `got ${r.status}`);
});

console.log(failed ? `\n${failed} check(s) failed` : '\nAll smoke checks passed');
process.exitCode = failed ? 1 : 0;
