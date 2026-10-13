// The mobile app bundles its own copy of the 31-room manifest (mobile/src/lib/room-manifest.json) so EAS
// never needs files outside mobile/. This keeps that copy byte-identical to the canonical root manifest.
// Fix a failure with: node scripts/sync-room-manifest.mjs
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';

const root = path.resolve(__dirname, '..');

describe('room manifest sync', () => {
  it('mobile/src/lib/room-manifest.json matches FINESSE_31_ROOM_PROJECT.json', () => {
    const canonical = readFileSync(path.join(root, 'FINESSE_31_ROOM_PROJECT.json'), 'utf8');
    const mobile = readFileSync(path.join(root, 'mobile/src/lib/room-manifest.json'), 'utf8');
    expect(mobile, 'Run: node scripts/sync-room-manifest.mjs').toBe(canonical);
  });
});
