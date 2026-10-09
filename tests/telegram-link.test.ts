import {afterEach, describe, expect, it} from 'vitest';
import {LINK_TTL_MS, createLinkToken, verifyLinkToken, webhookAuthorised} from '@/lib/telegram-link';

const BOT = '123456:test-bot-token';
const USER = '6f1c2a7e-3b4d-4e5f-8a9b-0c1d2e3f4a5b';

describe('telegram link token', () => {
  it('round-trips to the issuing member', () => {
    expect(verifyLinkToken(BOT, createLinkToken(BOT, USER))).toBe(USER);
  });
  it('rejects a bare user id (the old /link <uuid> takeover)', () => {
    expect(verifyLinkToken(BOT, USER)).toBeNull();
  });
  it('rejects a token re-pointed at another member', () => {
    const [, exp, sig] = createLinkToken(BOT, USER).split('.');
    expect(verifyLinkToken(BOT, `00000000-0000-4000-8000-000000000000.${exp}.${sig}`)).toBeNull();
  });
  it('rejects tokens signed for another bot and expired tokens', () => {
    expect(verifyLinkToken('999:other', createLinkToken(BOT, USER))).toBeNull();
    const now = Date.now();
    expect(verifyLinkToken(BOT, createLinkToken(BOT, USER, now), now + LINK_TTL_MS + 1)).toBeNull();
  });
});

describe('telegram webhook secret', () => {
  const prev = process.env.TELEGRAM_WEBHOOK_SECRET;
  afterEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = prev;
  });
  it('fails closed without a configured secret', () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(webhookAuthorised('anything')).toBe(false);
  });
  it('accepts only the exact secret', () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 's'.repeat(32);
    expect(webhookAuthorised('s'.repeat(32))).toBe(true);
    expect(webhookAuthorised('s'.repeat(31))).toBe(false);
    expect(webhookAuthorised(null)).toBe(false);
  });
});
