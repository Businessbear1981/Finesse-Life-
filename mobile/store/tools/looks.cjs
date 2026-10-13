// Renders the reviewer account's sample Wardrobe look cards (900×1200 JPEG, lookbook style) into
// mobile/store/reviewer/looks/. scripts/seed-demo.mjs --reviewer uploads them to a public Supabase Storage
// bucket and uses them as the reviewer's wardrobe_looks photos. Replace with real photography when available
// (REVIEWER_LOOK_DIR=/path/to/jpgs on the seed run).
//   node store/tools/looks.cjs
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'reviewer', 'looks');
const EXEC = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const FONTS = path.join(ROOT, '..', 'node_modules', '@expo-google-fonts');
const font = (rel) => fs.readFileSync(path.join(FONTS, rel)).toString('base64');

// Keep in step with REVIEWER_LOOKS in scripts/seed-demo.mjs (file names).
const LOOKS = [
  ['look-01.jpg', 'Black tie, Saturday', ['Satin column dress', 'Opera gloves', 'Pearl drop earrings'], '#B76E79'],
  ['look-02.jpg', 'Gallery night', ['Oversized wool blazer', 'Silk camisole', 'Pointed slingbacks'], '#B9BCC2'],
  ['look-03.jpg', 'Sunday reset', ['Cashmere crewneck', 'Wide-leg trousers', 'Leather loafers'], '#E8B4A0'],
  ['look-04.jpg', 'Rooftop, late', ['Leather midi skirt', 'Sheer black top', 'Strappy heels'], '#8E4B55'],
];

const card = (title, pieces, glow) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:IS;src:url(data:font/ttf;base64,${font('instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf')})}
@font-face{font-family:IT;font-weight:500;src:url(data:font/ttf;base64,${font('inter-tight/500Medium/InterTight_500Medium.ttf')})}
html,body{margin:0;width:900px;height:1200px;overflow:hidden;background:#050505;color:#EDEBE7}
.bg{position:absolute;inset:0;background:radial-gradient(70% 45% at 70% 18%, ${glow}88, transparent 70%),radial-gradient(60% 40% at 15% 95%, ${glow}33, transparent 70%),#070607}
.rail{position:absolute;left:90px;right:90px;top:120px;height:6px;border-radius:3px;background:linear-gradient(90deg,#6D7076,#FFFFFF,#6D7076)}
.hanger{position:absolute;left:50%;top:126px;transform:translateX(-50%);width:2px;height:90px;background:#B9BCC2}
.silhouette{position:absolute;left:50%;top:214px;transform:translateX(-50%);width:360px;height:560px;border-radius:180px 180px 24px 24px;
  background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.16)}
.t{position:absolute;left:90px;right:90px;top:840px;font:92px/1 IS,serif;font-style:italic}
.p{position:absolute;left:92px;right:90px;top:960px;font:500 30px/1.6 IT,sans-serif;color:#A9A9AE}
</style><div class="bg"></div><div class="rail"></div><div class="hanger"></div><div class="silhouette"></div>
<div class="t">${title}</div><div class="p">${pieces.join(' · ')}</div>`;

(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const b = await chromium.launch({executablePath: EXEC});
  const p = await b.newPage({viewport: {width: 900, height: 1200}});
  for (const [file, title, pieces, glow] of LOOKS) {
    await p.setContent(card(title, pieces, glow));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    await p.screenshot({path: path.join(OUT, file), type: 'jpeg', quality: 86});
    console.log('look', file);
  }
  await b.close();
})();
