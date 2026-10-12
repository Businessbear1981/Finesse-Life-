import {createHmac, timingSafeEqual} from 'node:crypto';

/** Constant-time string compare (length leak only). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** HMAC-SHA256 hex of the raw body, accepting an optional "sha256=" prefix on the header. */
export function verifyHmac(raw: string, header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const want = createHmac('sha256', secret).update(raw).digest('hex');
  return safeEqual(header.replace(/^sha256=/, ''), want);
}

/**
 * Media vendors differ (some sign, some only let you set the callback URL). Accept either an
 * HMAC of the raw body in x-finesse-signature, or a shared secret in x-webhook-secret / ?token=.
 * Fails closed when MEDIA_WEBHOOK_SECRET is unset.
 */
export function verifyMediaWebhook(raw: string, headers: Headers, url: URL, secret = process.env.MEDIA_WEBHOOK_SECRET): boolean {
  if (!secret) return false;
  return verifyHmac(raw, headers.get('x-finesse-signature'), secret) ||
    safeEqual(headers.get('x-webhook-secret'), secret) || safeEqual(url.searchParams.get('token'), secret);
}

/** Telegram sends the secret_token set via setWebhook in this header. Fails closed when unset. */
export function verifyTelegram(headers: Headers, secret = process.env.TELEGRAM_WEBHOOK_SECRET): boolean {
  return safeEqual(headers.get('x-telegram-bot-api-secret-token'), secret);
}
