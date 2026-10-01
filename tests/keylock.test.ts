import {describe, expect, it} from 'vitest';
import {hashPin, isWeakPin, readEntrance, signEntrance, verifyPin} from '@/lib/keylock-server';

const SECRET = 'x'.repeat(40);

describe('lift PIN hashing', () => {
  it('verifies the right PIN and rejects a wrong one', async () => {
    const h = await hashPin('482913');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(h).not.toContain('482913');
    expect(await verifyPin('482913', h)).toBe(true);
    expect(await verifyPin('482914', h)).toBe(false);
  });
  it('refuses trivial PINs at enrolment', () => {
    for (const p of ['111111', '123456', '654321', '012345', '121212']) expect(isWeakPin(p), p).toBe(true);
    expect(isWeakPin('482913')).toBe(false);
  });
});

describe('signed entrance cookie', () => {
  it('round-trips and rejects tampering or the wrong secret', () => {
    const v = signEntrance(SECRET, 'production', 60_000);
    expect(readEntrance(SECRET, v)?.mode).toBe('production');
    expect(readEntrance('y'.repeat(40), v)).toBeNull();
    const [payload, sig] = v.split('.');
    expect(readEntrance(SECRET, `${payload}x.${sig}`)).toBeNull();
  });
  it('expires', () => {
    expect(readEntrance(SECRET, signEntrance(SECRET, 'preview', -1))).toBeNull();
  });
});
