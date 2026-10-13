#!/usr/bin/env node
// Copies the canonical 31-room manifest (repo root FINESSE_31_ROOM_PROJECT.json) into the mobile app
// (mobile/src/lib/room-manifest.json) so the Expo bundle never reaches outside mobile/ — EAS can then upload
// mobile/ on its own. Run after every edit to the root manifest:
//   node scripts/sync-room-manifest.mjs          copy root → mobile
//   node scripts/sync-room-manifest.mjs --check  exit 1 if the two differ (CI; tests/room-manifest-sync.test.ts does the same)
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'FINESSE_31_ROOM_PROJECT.json');
const target = resolve(root, 'mobile/src/lib/room-manifest.json');

const text = readFileSync(source, 'utf8');
JSON.parse(text); // refuse to copy a broken manifest

if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(target, 'utf8'); } catch { /* missing counts as different */ }
  if (current !== text) {
    console.error('mobile/src/lib/room-manifest.json is out of date. Run: node scripts/sync-room-manifest.mjs');
    process.exit(1);
  }
  console.log('Room manifest in sync.');
} else {
  writeFileSync(target, text);
  console.log('Copied FINESSE_31_ROOM_PROJECT.json → mobile/src/lib/room-manifest.json');
}
