// Composes the final store screenshots: a caption band (serif headline on noir) over the raw app capture.
//
//   node store/tools/compose.cjs            # raw/ios → ios/ (1290×2796), raw/play → play/ (1080×1920)
//
// Play note: Google Play rejects phone screenshots whose long side is more than 2× the short side, so a
// 1080×2340 (19.5:9) frame is not accepted. The Play set is composed at 1080×1920 (9:16) from the 1080×2340
// capture; the iOS set is 1290×2796 (6.9" display, accepted for every iPhone size).
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXEC = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const FONTS = path.join(ROOT, '..', 'node_modules', '@expo-google-fonts');
const font = (rel) => fs.readFileSync(path.join(FONTS, rel)).toString('base64');

// Copy: After Hours — elite, discreet, effortless. Only features the store build actually has.
const CAPTIONS = {
  '01-entrance': {eyebrow: 'By invitation', head: 'Say the word.', sub: 'A private house with a door code. Members only.'},
  '02-floors': {eyebrow: 'Welcome in', head: 'Your floor first.', sub: 'Pick what the house features for you. Every floor is open to every member.'},
  '03-lobby': {eyebrow: 'The lobby', head: 'The house, after hours.', sub: 'Every room one tap away: style, travel, the table, the people.'},
  '04-concierge': {eyebrow: 'Nova · AI concierge', head: 'Your private line.', sub: 'Text it the way you would at 1am. Nova drafts; you approve.'},
  '05-wardrobe': {eyebrow: 'The Wardrobe', head: 'Dressed before you ask.', sub: 'Your looks, your rail, the piece that’s missing.'},
  '06-departures': {eyebrow: 'Departures', head: 'Wheels up, quietly.', sub: 'Trips composed into one clean boarding pass and itinerary.'},
  '07-diary': {eyebrow: 'The Diary', head: 'Your night, in order.', sub: 'Every plan in one place, waiting on your yes.'},
  '08-lounge': {eyebrow: 'The Lounge', head: 'The room worth knowing.', sub: 'A quiet members’ feed. Report or block anyone, any time.'},
};

const DEVICES = {
  // fit: the whole screen is shown; bleed: the screen runs off the bottom edge (Play's shorter 9:16 frame).
  ios: {w: 1290, h: 2796, band: 640, mode: 'fit', imgW: 960, radius: 64, head: 132, sub: 44, eyebrow: 30, pad: 96},
  play: {w: 1080, h: 1920, band: 470, mode: 'bleed', imgW: 860, radius: 52, head: 100, sub: 34, eyebrow: 24, pad: 76},
};

function html(d, c, img) {
  return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:IS;src:url(data:font/ttf;base64,${font('instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf')})}
@font-face{font-family:IT;font-weight:400;src:url(data:font/ttf;base64,${font('inter-tight/400Regular/InterTight_400Regular.ttf')})}
@font-face{font-family:IT;font-weight:600;src:url(data:font/ttf;base64,${font('inter-tight/600SemiBold/InterTight_600SemiBold.ttf')})}
*{box-sizing:border-box}html,body{margin:0;width:${d.w}px;height:${d.h}px;overflow:hidden;background:#050505}
.bg{position:absolute;inset:0;background:
  radial-gradient(60% 34% at 86% 4%, rgba(183,110,121,.42), transparent 70%),
  radial-gradient(50% 30% at 6% 30%, rgba(142,75,85,.22), transparent 70%),
  radial-gradient(70% 40% at 50% 100%, rgba(232,180,160,.10), transparent 70%), #050505}
.band{position:absolute;left:0;right:0;top:0;height:${d.band}px;padding:0 ${d.pad}px;display:flex;flex-direction:column;justify-content:center}
.eyebrow{font:600 ${d.eyebrow}px/1 IT,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:#E8B4A0}
.head{margin-top:${Math.round(d.head * 0.22)}px;font:${d.head}px/0.98 IS,serif;font-style:italic;letter-spacing:-.01em;
  background:linear-gradient(176deg,#FFFFFF 0%,#E3E4E7 48%,#B9BCC2 70%,#F2C9B8 100%);-webkit-background-clip:text;color:transparent}
.sub{margin-top:${Math.round(d.sub * 0.8)}px;font:400 ${d.sub}px/1.35 IT,sans-serif;color:#A9A9AE;max-width:${d.w - d.pad * 2}px}
.shot{position:absolute;left:50%;transform:translateX(-50%);top:${d.band}px;width:${d.imgW}px;border-radius:${d.radius}px;overflow:hidden;
  border:2px solid rgba(255,255,255,.14);box-shadow:0 0 0 1px #000, 0 40px 120px rgba(183,110,121,.22)}
.shot img{display:block;width:100%}
${d.mode === 'bleed' ? `.shot{border-bottom-left-radius:0;border-bottom-right-radius:0;border-bottom:0}` : ''}
</style><div class="bg"></div>
<div class="band"><div class="eyebrow">${c.eyebrow}</div><div class="head">${c.head}</div><div class="sub">${c.sub}</div></div>
<div class="shot"><img src="data:image/png;base64,${img}"></div>`;
}

(async () => {
  const b = await chromium.launch({executablePath: EXEC});
  for (const [dev, d] of Object.entries(DEVICES)) {
    const rawDir = path.join(ROOT, 'raw', dev);
    if (!fs.existsSync(rawDir)) { console.log('skip', dev, '(no raw captures)'); continue; }
    const outDir = path.join(ROOT, dev);
    fs.mkdirSync(outDir, {recursive: true});
    const p = await b.newPage({viewport: {width: d.w, height: d.h}, deviceScaleFactor: 1});
    for (const f of fs.readdirSync(rawDir).filter((x) => x.endsWith('.png')).sort()) {
      const name = f.replace(/\.png$/, '');
      const c = CAPTIONS[name];
      if (!c) { console.log('no caption for', name, '— skipped'); continue; }
      await p.setContent(html(d, c, fs.readFileSync(path.join(rawDir, f)).toString('base64')));
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(200);
      // Fit mode: keep the whole screen inside the frame with a bottom margin.
      if (d.mode === 'fit') {
        await p.evaluate(([h, band]) => {
          const s = document.querySelector('.shot');
          const avail = h - band - 90;
          if (s.getBoundingClientRect().height > avail) s.style.width = `${Math.floor(s.getBoundingClientRect().width * avail / s.getBoundingClientRect().height)}px`;
        }, [d.h, d.band]);
      }
      const out = path.join(outDir, `${name}.png`);
      await p.screenshot({path: out, clip: {x: 0, y: 0, width: d.w, height: d.h}});
      console.log(dev, name, `${d.w}×${d.h}`);
    }
    await p.close();
  }
  await b.close();
})();
