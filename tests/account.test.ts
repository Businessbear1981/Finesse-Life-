import {describe, expect, it, vi} from 'vitest';
import {
  UPLOAD_TYPES, deleteAccount, deleteAccountRequest, memberStoragePrefixes, memberUploadKey,
  pinResetRequest, resolveUploadType, sessionCookiesToClear, type DeletionDeps,
} from '@/lib/account';

const UID = '3f2a9c1e-8b7d-4e6f-9a0b-1c2d3e4f5a6b';

describe('account deletion request', () => {
  it('requires the literal DELETE and a password', () => {
    expect(deleteAccountRequest.safeParse({confirm: 'DELETE', password: 'pw'}).success).toBe(true);
    expect(deleteAccountRequest.safeParse({confirm: 'delete', password: 'pw'}).success).toBe(false);
    expect(deleteAccountRequest.safeParse({confirm: 'DELETE', password: ''}).success).toBe(false);
    expect(deleteAccountRequest.safeParse({confirm: 'DELETE'}).success).toBe(false);
    expect(deleteAccountRequest.safeParse({password: 'pw'}).success).toBe(false);
  });
  it('pin reset needs a password', () => {
    expect(pinResetRequest.safeParse({password: 'x'}).success).toBe(true);
    expect(pinResetRequest.safeParse({}).success).toBe(false);
  });
});

describe('upload keys', () => {
  it('accepts only allowlisted types, defaulting to upload', () => {
    expect(resolveUploadType(null)).toBe('upload');
    expect(resolveUploadType('')).toBe('upload');
    for (const t of UPLOAD_TYPES) expect(resolveUploadType(t)).toBe(t);
    for (const bad of ['../etc', 'camera', 'avatar/../../x', 'AVATAR', 'models', 42]) expect(resolveUploadType(bad), String(bad)).toBeNull();
  });
  it('always namespaces by the member id', () => {
    const key = memberUploadKey('private-photo', UID, 'jpg', 1700000000000, 'abcdef12-0000-4000-8000-000000000000');
    expect(key).toBe(`private-photos/${UID}/1700000000000-abcdef12.jpg`);
    expect(memberUploadKey('avatar', UID, '../../x')).toMatch(new RegExp(`^avatars/${UID}/\\d+-[0-9a-f]{8}\\.x$`));
    expect(() => memberUploadKey('avatar', '../other', 'png')).toThrow();
  });
  it('lists every member-only prefix for deletion', () => {
    const p = memberStoragePrefixes(UID);
    expect(p).toContain(`avatars/${UID}/`);
    expect(p).toContain(`camera/${UID}/`);
    expect(p).toHaveLength(UPLOAD_TYPES.length + 1);
    expect(p.every((x) => x.includes(`/${UID}/`))).toBe(true);
    expect(() => memberStoragePrefixes('')).toThrow();
  });
});

describe('session cookies', () => {
  it('clears Supabase auth cookies (incl. chunks) and the lift cookie, nothing else', () => {
    const out = sessionCookiesToClear(['sb-abc-auth-token.0', 'sb-abc-auth-token.1', 'fl_entrance', 'theme']);
    expect(out.sort()).toEqual(['fl_vip_lift', 'sb-abc-auth-token.0', 'sb-abc-auth-token.1']);
  });
});

function deps(over: Partial<DeletionDeps> = {}) {
  const calls: string[] = [];
  const d: DeletionDeps = {
    collectStorageKeys: vi.fn(async () => { calls.push('collect'); return ['avatars/x/1.jpg']; }),
    deleteMemberData: vi.fn(async () => { calls.push('data'); return {deleted: {}}; }),
    deleteStorageKeys: vi.fn(async (k: string[]) => { calls.push('storage'); return {deleted: k.length, failed: 0}; }),
    deleteAuthUser: vi.fn(async () => { calls.push('auth'); }),
    ...over,
  };
  return {d, calls};
}

describe('deleteAccount orchestration', () => {
  it('collects storage keys before deleting rows, and deletes the auth user last', async () => {
    const {d, calls} = deps();
    const out = await deleteAccount(UID, d);
    expect(out.ok).toBe(true);
    expect(calls).toEqual(['collect', 'data', 'storage', 'auth']);
  });
  it('stops before touching storage or auth when the database step fails', async () => {
    const {d, calls} = deps({deleteMemberData: vi.fn(async () => { throw new Error('boom'); })});
    const out = await deleteAccount(UID, d);
    expect(out).toEqual({ok: false, stage: 'data', message: 'boom'});
    expect(calls).toEqual(['collect']);
  });
  it('a storage outage does not block the deletion', async () => {
    const {d, calls} = deps({deleteStorageKeys: vi.fn(async () => { throw new Error('r2 down'); })});
    const out = await deleteAccount(UID, d);
    expect(out.ok && out.storage).toEqual({deleted: 0, failed: 1});
    expect(calls).toEqual(['collect', 'data', 'auth']);
  });
  it('reports an auth failure so the member can retry', async () => {
    const {d} = deps({deleteAuthUser: vi.fn(async () => { throw new Error('gotrue'); })});
    expect(await deleteAccount(UID, d)).toEqual({ok: false, stage: 'auth', message: 'gotrue'});
  });
});

describe('deleteAccount billing step', () => {
  const base = () => ({
    collectStorageKeys: vi.fn(async () => []),
    deleteMemberData: vi.fn(async () => ({})),
    deleteStorageKeys: vi.fn(async () => ({deleted: 0, failed: 0})),
    deleteAuthUser: vi.fn(async () => undefined),
  });
  it('closes billing before deleting anything', async () => {
    const order: string[] = [];
    const deps = {
      ...base(),
      closeBilling: vi.fn(async () => order.push('billing')),
      deleteMemberData: vi.fn(async () => order.push('data')),
    };
    const out = await deleteAccount('6f1c2a7e-3b4d-4e5f-8a9b-0c1d2e3f4a5b', deps);
    expect(out.ok).toBe(true);
    expect(order).toEqual(['billing', 'data']);
  });
  it('stops if the subscription could not be cancelled (member must never be charged after deletion)', async () => {
    const deps = {...base(), closeBilling: vi.fn(async () => { throw new Error('stripe down'); })};
    const out = await deleteAccount('6f1c2a7e-3b4d-4e5f-8a9b-0c1d2e3f4a5b', deps);
    expect(out).toMatchObject({ok: false, stage: 'billing'});
    expect(deps.deleteMemberData).not.toHaveBeenCalled();
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });
});
