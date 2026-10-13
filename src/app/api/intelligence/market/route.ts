// Members only.
// GET  /api/intelligence/market?category=Sneakers   (DB aggregate, no model call)
// GET  /api/intelligence/market?mode=anomalies
// POST /api/intelligence/market  { mode: 'price', item: {...} }   (model call — AI consent required, rate limited)

import {NextResponse} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {createClient} from '@/lib/supabase/server';
import {guardAiCall} from '@/lib/ai-rate-limit';
import {requireAiConsent} from '@/lib/ai-consent-gate';
import {getMarketSignals, recommendListingPrice, detectMarketAnomalies} from '@/lib/intelligence';

async function signedInUser() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  return user ? Object.assign(user, {supabase}) : null;
}

const signedOut = () => NextResponse.json({error: 'signed_out'}, {status: 401, headers: {'Cache-Control': 'no-store'}});

export async function GET(req: Request) {
  if (!(await signedInUser())) return signedOut();
  const {searchParams} = new URL(req.url);
  const category = searchParams.get('category')?.slice(0, 64) || undefined;
  const mode = searchParams.get('mode');

  try {
    if (mode === 'anomalies') {
      const anomalies = await detectMarketAnomalies();
      return NextResponse.json({anomalies});
    }

    const signals = await getMarketSignals(category);
    return NextResponse.json({signals});
  } catch (err) {
    console.error('[GET /api/intelligence/market]', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({error: 'market_unavailable'}, {status: 500});
  }
}

const priceSchema = z.object({
  mode: z.literal('price'),
  item: z.object({
    title: z.string().trim().min(1).max(200),
    brand: z.string().trim().max(120).optional(),
    category: z.string().trim().min(1).max(64),
    condition: z.string().trim().min(1).max(32),
  }),
});

export async function POST(req: Request) {
  const user = await signedInUser();
  if (!user) return signedOut();

  const parsed = await parseBody(req, priceSchema);
  if (parsed.error) return parsed.error;

  const noConsent = await requireAiConsent(user.supabase, user.id);
  if (noConsent) return noConsent;
  const limited = await guardAiCall(user.id, 'nova');
  if (limited) return limited;

  try {
    const rec = await recommendListingPrice(parsed.data.item);
    return NextResponse.json(rec);
  } catch (err) {
    console.error('[POST /api/intelligence/market]', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({error: 'price_recommendation_unavailable'}, {status: 503});
  }
}
