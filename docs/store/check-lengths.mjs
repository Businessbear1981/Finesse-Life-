#!/usr/bin/env node
// Checks the store listing copy against the store character limits.
//   node docs/store/check-lengths.mjs
// Reads the fenced blocks in listing-ios.md / listing-play.md (```name, ```subtitle, …) and counts characters
// the way the consoles do (Unicode code points; newlines count).
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIMITS = {
  'listing-ios.md': {name: 30, subtitle: 30, promo: 170, description: 4000, keywords: 100, copyright: 200},
  'listing-play.md': {title: 30, short: 80, full: 4000},
};
// Words App Store keyword guidance says not to repeat (already indexed from name/subtitle).
const IN_NAME = ['finesse', 'life', 'private', 'house', 'after', 'hours'];

let failed = 0;
for (const [file, limits] of Object.entries(LIMITS)) {
  const md = readFileSync(join(HERE, file), 'utf8');
  for (const [block, max] of Object.entries(limits)) {
    const m = new RegExp('```' + block + '\\n([\\s\\S]*?)\\n```').exec(md);
    if (!m) { console.log(`✗ ${file} ${block}: block not found`); failed++; continue; }
    const n = [...m[1]].length;
    const ok = n <= max && n > 0;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${file} ${block}: ${n}/${max}`);
    if (block === 'keywords') {
      const words = m[1].split(',');
      if (words.some((w) => w !== w.trim())) { console.log('  ✗ keywords: remove spaces around commas'); failed++; }
      const dup = words.filter((w) => IN_NAME.includes(w.toLowerCase()));
      if (dup.length) { console.log(`  ✗ keywords repeat name/subtitle words: ${dup.join(', ')}`); failed++; }
    }
    // Store-build copy guard: nothing hidden in the store build may be promised.
    const banned = /(?<!\.)\b(vault|cashback|card|penthouse|vip|membership fee|subscribe|after dark|dating|gold|1920s|deco)\b/i.exec(m[1]);
    if (banned) { console.log(`  ✗ ${block}: mentions “${banned[0]}” (hidden in the store build / off-brand)`); failed++; }
  }
}
process.exit(failed ? 1 : 0);
