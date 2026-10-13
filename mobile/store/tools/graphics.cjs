// Play Store graphics: 512×512 hi-res icon (from mobile/assets/brand/icon.png) and the 1024×500 feature graphic.
//   node store/tools/graphics.cjs   → store/play/icon-512.png, store/play/feature-graphic-1024x500.png
// The icon is written as 32-bit RGBA PNG (Play's format); the artwork itself is fully opaque.
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXEC = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const FONTS = path.join(ROOT, '..', 'node_modules', '@expo-google-fonts');
const font = (rel) => fs.readFileSync(path.join(FONTS, rel)).toString('base64');
const icon = fs.readFileSync(path.join(ROOT, '..', 'assets', 'brand', 'icon.png')).toString('base64');
const OUT = path.join(ROOT, 'play');

const feature = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:IS;src:url(data:font/ttf;base64,${font('instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf')})}
@font-face{font-family:IT;font-weight:600;src:url(data:font/ttf;base64,${font('inter-tight/600SemiBold/InterTight_600SemiBold.ttf')})}
html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:#050505}
.bg{position:absolute;inset:0;background:
  radial-gradient(48% 70% at 82% 20%, rgba(183,110,121,.55), transparent 70%),
  radial-gradient(40% 60% at 10% 100%, rgba(142,75,85,.30), transparent 70%), #050505}
.hair{position:absolute;left:72px;right:72px;bottom:64px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)}
.eyebrow{position:absolute;left:72px;top:118px;font:600 18px/1 IT,sans-serif;letter-spacing:.38em;color:#E8B4A0;text-transform:uppercase}
.head{position:absolute;left:68px;top:150px;font:150px/1 IS,serif;font-style:italic;letter-spacing:-.01em;
  background:linear-gradient(176deg,#FFFFFF 0%,#E3E4E7 48%,#B9BCC2 70%,#F2C9B8 100%);-webkit-background-clip:text;color:transparent}
.sub{position:absolute;left:74px;top:330px;font:600 20px/1 IT,sans-serif;letter-spacing:.3em;color:#A9A9AE;text-transform:uppercase}
.mark{position:absolute;right:86px;top:110px;width:280px;height:280px;border-radius:64px;overflow:hidden;border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 90px rgba(183,110,121,.35)}
.mark img{width:100%;height:100%;display:block}
</style><div class="bg"></div><div class="eyebrow">Members only · After hours</div><div class="head">Finesse Life</div>
<div class="sub">The private house in your pocket</div><div class="mark"><img src="data:image/png;base64,${icon}"></div><div class="hair"></div>`;

(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const b = await chromium.launch({executablePath: EXEC});
  const p = await b.newPage({viewport: {width: 1024, height: 500}});
  await p.setContent(feature);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  await p.screenshot({path: path.join(OUT, 'feature-graphic-1024x500.png'), clip: {x: 0, y: 0, width: 1024, height: 500}});
  await b.close();
  // sharp (repo-root devDependency of Next) resizes with a proper filter and writes RGBA.
  const sharp = require(require.resolve('sharp', {paths: [path.join(ROOT, '..'), path.join(ROOT, '..', '..')]}));
  await sharp(path.join(ROOT, '..', 'assets', 'brand', 'icon.png')).resize(512, 512, {kernel: 'lanczos3'}).ensureAlpha().png().toFile(path.join(OUT, 'icon-512.png'));
  console.log('ok → store/play/feature-graphic-1024x500.png, store/play/icon-512.png');
})();
