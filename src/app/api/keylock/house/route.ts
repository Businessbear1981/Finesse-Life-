import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {rateLimit} from '@/lib/api-guard';
import {safeEqual} from '@/lib/net/webhook-auth';

// Front-door house code. The code never ships to the browser: only its SHA-256 lives in server env
// (HOUSE_CODE_SHA256, same value the Worker's /keylock/house uses). 5 tries / 10 min per IP.
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limited = rateLimit(`house:${ip}`, 5, 600_000);
  if (limited) return limited;
  const want = process.env.HOUSE_CODE_SHA256?.toLowerCase();
  if (!want) return NextResponse.json({ok: false, error: 'house code not configured'}, {status: 503});
  const {code} = (await req.json().catch(() => ({}))) as {code?: string};
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return NextResponse.json({ok: false}, {status: 400});
  const got = createHash('sha256').update(code).digest('hex');
  return safeEqual(got, want) ? NextResponse.json({ok: true}) : NextResponse.json({ok: false}, {status: 401});
}
