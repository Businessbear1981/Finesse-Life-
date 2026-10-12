import { Hono } from 'hono';
import { z } from 'zod';
import { AwsClient } from 'aws4fetch';
import type { AppEnv } from '../app';
import { requireAuth } from '../auth';

const PROVIDERS = ['instagram', 'tiktok', 'pinterest', 'facebook', 'x', 'google'] as const;

async function sha256Hex(s: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const notConfigured = (what: string) => ({ error: 'not_configured', detail: what });

export const mobile = new Hono<AppEnv>();

/** KeyLock house code. Public; the code itself never ships in the app. */
mobile.post('/keylock/house', async (c) => {
  const body = z.object({ code: z.string().regex(/^\d{6}$/) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ ok: false }, 400);
  const expected = c.env.HOUSE_CODE_SHA256;
  if (!expected) return c.json(notConfigured('HOUSE_CODE_SHA256 secret'), 501);
  return c.json({ ok: timingSafeEqual(await sha256Hex(body.data.code), expected.toLowerCase()) });
});

mobile.use('/profile', requireAuth);
mobile.use('/check-in', requireAuth);
mobile.use('/vip/*', requireAuth);
mobile.use('/uploads/*', requireAuth);
mobile.use('/style-read', requireAuth);
mobile.use('/connect/*', requireAuth);

const ProfilePatch = z.object({
  display_name: z.string().min(1).max(80).optional(),
  gender: z.enum(['feminine', 'masculine']).optional(),
  age: z.number().int().min(18).max(120).optional(),
  city: z.string().max(80).optional(),
  vibe: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
  intake_complete: z.boolean().optional(),
}).strict();

mobile.get('/profile', async (c) => {
  const profile = await c.var.deps.db.tx('app_user', c.var.claims, async (tx) =>
    (await tx.query('select id, username, display_name, gender, age, city, vibe, bio, avatar_url, is_vip, vip_expires_at, intake_complete from public.profiles where id = app.uid()')).rows[0] ?? null);
  return c.json({ profile });
});

mobile.patch('/profile', async (c) => {
  const p = ProfilePatch.safeParse(await c.req.json().catch(() => null));
  if (!p.success) return c.json({ error: 'invalid_body', issues: p.error.issues }, 400);
  const entries = Object.entries(p.data).filter(([, v]) => v !== undefined);
  if (!entries.length) return c.json({ error: 'empty_patch' }, 400);
  const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const row = await c.var.deps.db.tx('app_user', c.var.claims, async (tx) =>
    (await tx.query(`update public.profiles set ${sets}, updated_at = now() where id = app.uid() returning id`, entries.map(([, v]) => v))).rows[0]);
  if (!row) return c.json({ error: 'profile_not_found' }, 404);
  return c.json({ ok: true });
});

const CheckIn = z.object({
  answers: z.record(z.string(), z.string().max(2000)),
  nova: z.object({ voice: z.enum(['Discreet', 'Warm', 'Direct']), posting: z.enum(['Drafts only', 'Ask first', 'Auto-post']) }),
  shopper: z.object({ name: z.string().min(1).max(40) }),
});

mobile.put('/check-in', async (c) => {
  const b = CheckIn.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'invalid_body', issues: b.error.issues }, 400);
  await c.var.deps.db.tx('app_user', c.var.claims, async (tx) => {
    await tx.query(
      `insert into public.interview_answers(user_id, answers) values (app.uid(), $1)
       on conflict (user_id) do update set answers = excluded.answers, updated_at = now()`, [b.data.answers]);
    await tx.query(
      `insert into public.member_staff(user_id, nova_voice, nova_posting, shopper_name) values (app.uid(), $1, $2, $3)
       on conflict (user_id) do update set nova_voice = excluded.nova_voice, nova_posting = excluded.nova_posting,
         shopper_name = excluded.shopper_name, updated_at = now()`, [b.data.nova.voice, b.data.nova.posting, b.data.shopper.name]);
    await tx.query("select orch.emit('checkin.saved', '{}'::jsonb)");
  });
  return c.json({ ok: true });
});

mobile.post('/vip/redeem', async (c) => {
  const b = z.object({ code: z.string().min(1).max(64) }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'Code is required.' }, 400);
  try {
    const expires = await c.var.deps.db.tx('app_user', c.var.claims, async (tx) =>
      (await tx.query<{ e: string }>('select app.redeem_vip($1) e', [b.data.code])).rows[0]!.e);
    return c.json({ success: true, message: 'VIP access granted. Welcome to the inner room.', vip_expires_at: expires });
  } catch (e) {
    const m = (e as Error).message;
    if (m.includes('invalid_code')) return c.json({ error: 'Invalid or expired code.' }, 404);
    if (m.includes('code_exhausted')) return c.json({ error: 'This code has already been fully redeemed.' }, 409);
    if (m.includes('code_expired')) return c.json({ error: 'This code has expired.' }, 410);
    throw e;
  }
});

/** Presigned R2 PUT for closet photos. Needs the R2 S3 API token secrets. */
mobile.post('/uploads/sign', async (c) => {
  const b = z.object({ contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']) }).safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: 'invalid_content_type' }, 400);
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_MEDIA_BUCKET_NAME } = c.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || R2_ACCOUNT_ID.startsWith('REPLACE_ME')) return c.json(notConfigured('R2 S3 API token'), 501);
  const ext = b.data.contentType.split('/')[1];
  const key = `closet/${c.var.claims.uid}/${crypto.randomUUID()}.${ext}`;
  const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
  const url = new URL(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_MEDIA_BUCKET_NAME}/${key}`);
  url.searchParams.set('X-Amz-Expires', '600');
  const signed = await aws.sign(new Request(url, { method: 'PUT', headers: { 'Content-Type': b.data.contentType } }), { aws: { signQuery: true } });
  return c.json({ uploadUrl: signed.url, key });
});

/** STUB: style read needs connected social accounts (OAuth apps not yet registered). */
mobile.get('/style-read', (c) => c.json(notConfigured('style read requires social OAuth + model provider'), 501));

/** STUB: OAuth start per provider. Needs each provider's client id/secret and redirect URI. */
mobile.get('/connect/:provider', (c) => {
  const p = c.req.param('provider');
  if (!(PROVIDERS as readonly string[]).includes(p)) return c.json({ error: 'unknown_provider' }, 404);
  return c.json(notConfigured(`${p} OAuth app credentials`), 501);
});
