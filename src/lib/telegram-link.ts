import {createHash, createHmac} from 'crypto';
import {constantTimeEqual} from '@/lib/keylock-server';

// Telegram account linking.
//
// Previously the bot accepted `/link <user-uuid>`, and member UUIDs are visible to other
// members, so anyone could re-point another member's private VIP channel at their own chat.
// Now /api/telegram/link issues a short-lived token signed with a key derived from
// TELEGRAM_BOT_TOKEN; the webhook links only when the signature and expiry check out.
// SERVER-ONLY.

export const LINK_TTL_MS = 15 * 60_000;

function linkKey(botToken: string): Buffer {
  return createHash('sha256').update('finesse:telegram-link:v1:').update(botToken).digest();
}

function sign(botToken: string, userId: string, exp: string): string {
  return createHmac('sha256', linkKey(botToken)).update(`${userId}.${exp}`).digest('base64url').slice(0, 22);
}

/** `<userId>.<expiry base36>.<signature>` — short enough to paste after /link. */
export function createLinkToken(botToken: string, userId: string, now = Date.now()): string {
  const exp = (now + LINK_TTL_MS).toString(36);
  return `${userId}.${exp}.${sign(botToken, userId, exp)}`;
}

/** Returns the user id when the token is authentic and unexpired, otherwise null. */
export function verifyLinkToken(botToken: string, token: string, now = Date.now()): string | null {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-z]{1,12}$/.test(exp)) return null;
  if (!constantTimeEqual(sig, sign(botToken, userId, exp))) return null;
  if (parseInt(exp, 36) < now) return null;
  return userId;
}

/** Telegram echoes the `secret_token` given to setWebhook in this header on every update. */
export function webhookAuthorised(headerValue: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || expected.length < 16) return false;
  return constantTimeEqual(headerValue ?? '', expected);
}
