// Captures raw store screenshots from the Expo web build of the app.
//
//   cd mobile && EXPO_PUBLIC_STORE_PREVIEW=1 CI=1 BROWSER=none npx expo start --web --port 8098 --clear   (in another shell)
//   BASE=http://localhost:8098 node store/tools/capture.cjs            # both device sizes
//   BASE=... DEVICE=ios node store/tools/capture.cjs                    # one size
//   BASE=... REVIEWER_EMAIL=review@demo.finesselife.vip REVIEWER_PASSWORD=… node store/tools/capture.cjs
//                                                                       # signed in as the reviewer (needs a live API:
//                                                                       # set EXPO_PUBLIC_SUPABASE_* / _API_BASE_URL on the Expo server)
//
// Output: mobile/store/raw/<device>/<NN-name>.png at the device's native pixel size, then run compose.cjs.
// EXPO_PUBLIC_STORE_PREVIEW=1 matters: it renders the STORE build (VIP / Vault and other hidden rooms gated off),
// so nothing in a screenshot is a feature the store build doesn't have.
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:8098';
const OUT = path.join(__dirname, '..', 'raw');
const EXEC = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);

// 430×932 @3x = 1290×2796 (iPhone 6.9"); 360×780 @3x = 1080×2340 (Play phone, composed to 1080×1920 — see compose.cjs).
const DEVICES = {
  ios: {width: 430, height: 932, scale: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'},
  play: {width: 360, height: 780, scale: 3, ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'},
};

// The shot list. `anchor` (signed-out only) scrolls the main scroller so the first element whose text matches
// sits `at` CSS px from the top — past the "Members only · Sign in" card, onto the room's sample content.
const SHOTS = [
  {name: '01-entrance', path: '/', wait: 5000},
  {name: '02-floors', path: '/side', wait: 3500},
  {name: '03-lobby', path: '/hotel', wait: 4500},
  {name: '04-concierge', path: '/room/concierge', wait: 4500},
  // `hide` (signed-out only): the in-app "sample" stamps on demo content are left out of the marketing frame, the way
  // a signed-in capture of the reviewer's seeded data would look. The app itself always shows them.
  {name: '05-wardrobe', path: '/room/wardrobe', wait: 4500, hide: ['^Sample rack ·'], play: {anchor: '^TOP$', at: 64}},
  // Play frames are cropped (9:16), so those scroll further down to keep the sample content in view.
  {name: '06-departures', path: '/room/departures', wait: 4500, hide: ['^SAMPLE PASS$', '^Sample trip ·'], play: {anchor: '^Fly$', at: 70}},
  {name: '07-diary', path: '/room/diary', wait: 4500, hide: ['^Sample page ·'], play: {anchor: '^LIVE$', at: 70}},
  // The Lounge scrolls past its sign-in card and the sample headcount, onto the floor itself.
  {name: '08-lounge', path: '/room/lounge', wait: 4500, anchor: '^Lounge$', at: 70},
];

/** Scroll the tallest scroll container so the element whose own text matches `re` lands `at` px from the top. */
async function scrollTo(p, re, at) {
  if (!re) return;
  const moved = await p.evaluate(([src, top]) => {
    const rx = new RegExp(src, 'i');
    const hit = [...document.querySelectorAll('div,span')].find((e) => rx.test((e.textContent || '').trim()) && ![...e.children].some((c) => rx.test((c.textContent || '').trim())));
    if (!hit) return false;
    const box = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.contains(hit))
      .sort((a, b) => b.clientHeight - a.clientHeight)[0];
    const dy = hit.getBoundingClientRect().top - top;
    if (box) box.scrollTop += dy; else window.scrollBy(0, dy);
    return true;
  }, [re, at]);
  if (!moved) console.log('  (anchor not found:', re + ')');
  await p.waitForTimeout(900);
}

/** Hide (visibility only, layout kept) the innermost elements whose own text matches one of `res`. */
async function hideText(p, res) {
  const n = await p.evaluate((srcs) => {
    let hits = 0;
    for (const src of srcs) {
      const rx = new RegExp(src);
      for (const e of document.querySelectorAll('div,span')) {
        const txt = (e.textContent || '').trim();
        if (rx.test(txt) && ![...e.children].some((c) => rx.test((c.textContent || '').trim()))) { e.style.visibility = 'hidden'; hits++; }
      }
    }
    return hits;
  }, res);
  if (!n) console.log('  (nothing hidden for', res.join(', ') + ')');
}

(async () => {
  const only = (process.env.DEVICE || 'ios,play').split(',');
  const pick = process.env.SHOTS ? new Set(process.env.SHOTS.split(',')) : null;
  const b = await chromium.launch({executablePath: EXEC, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const errors = [];
  for (const dev of only) {
    const d = DEVICES[dev];
    fs.mkdirSync(path.join(OUT, dev), {recursive: true});
    const ctx = await b.newContext({viewport: {width: d.width, height: d.height}, deviceScaleFactor: d.scale, isMobile: true, hasTouch: true, userAgent: d.ua, reducedMotion: 'reduce'});
    const p = await ctx.newPage();
    // Signed out with no house line, the dev build "rehearses" the door and says so. Answer the door's challenge the
    // way the live house does, so the capture shows the release door (ready for six digits), not the rehearsal.
    if (!(process.env.REVIEWER_EMAIL && process.env.REVIEWER_PASSWORD)) {
      await p.route('**/api/keylock/entrance/challenge', (r) => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({state: 'ready', challengeId: 'store-capture'})}));
    }
    p.on('pageerror', (e) => errors.push(`${dev} [pageerror] ${String(e).slice(0, 200)}`));
    // Warm the bundle (first load can take a while after --clear).
    for (let i = 0; i < 40; i++) { try { await p.goto(BASE + '/', {waitUntil: 'networkidle', timeout: 90000}); break; } catch { await p.waitForTimeout(3000); } }
    // Signed-in mode. The web preview keeps the session in memory only (secure-storage.ts), so a reload signs out:
    // sign in through the UI once, then move between screens in-page (history.pushState), never page.goto.
    const signedIn = Boolean(process.env.REVIEWER_EMAIL && process.env.REVIEWER_PASSWORD);
    if (signedIn) {
      await p.goto(BASE + '/sign-in', {waitUntil: 'networkidle', timeout: 90000});
      await p.waitForTimeout(2500);
      await p.getByLabel('Email').first().fill(process.env.REVIEWER_EMAIL);
      await p.getByLabel('Password').first().fill(process.env.REVIEWER_PASSWORD);
      await p.getByRole('button', {name: /^sign in$/i}).first().click();
      await p.waitForTimeout(5000);
      const adult = p.getByRole('button', {name: /18 or older/i}).first();
      if (await adult.count()) { await adult.click(); await p.waitForTimeout(3000); }
      console.log(dev, 'signed in as', process.env.REVIEWER_EMAIL);
    }
    const go = async (route) => {
      if (!signedIn) return p.goto(BASE + route, {waitUntil: 'networkidle', timeout: 90000}).catch(() => {});
      await p.evaluate((r) => { history.pushState({}, '', r); dispatchEvent(new PopStateEvent('popstate', {state: {}})); }, route);
    };
    for (const s of SHOTS) {
      if (pick && !pick.has(s.name)) continue;
      if (signedIn && s.path === '/') continue; // the door is captured signed out
      await go(s.path);
      await p.waitForTimeout(s.wait);
      const pos = s[dev] ?? s;
      if (!signedIn) await scrollTo(p, pos.anchor, pos.at);
      if (!signedIn && s.hide) await hideText(p, s.hide);
      const file = path.join(OUT, dev, `${s.name}.png`);
      await p.screenshot({path: file});
      console.log(dev, s.name, '→', path.relative(process.cwd(), file));
    }
    await ctx.close();
  }
  await b.close();
  if (errors.length) console.log('page errors:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
})();
