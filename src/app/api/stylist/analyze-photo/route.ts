import {NextResponse} from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {createClient} from '@/lib/supabase/server';

const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});

const FALLBACK = {
  style_archetype: 'Dark Luxe Editorial',
  style_labels: ['Dark luxury', 'Sculptural silhouette', 'Minimalist'],
  similar_brands: ['The Row', 'Bottega Veneta', 'Toteme', 'Lemaire'],
  price_range: '$800–$3,200',
  buying_tendencies: ['designer ready-to-wear', 'luxury leather goods', 'fine jewelry', 'high-end skincare'],
};

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_BYTES = 5 * 1024 * 1024;

// Best-effort per-member throttle (per server instance) so one account cannot run up model spend.
// A shared store (e.g. Upstash/Redis) is the durable fix; this caps bursts in the meantime.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();
function throttled(userId: string) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(userId, recent); return true; }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

// POST /api/stylist/analyze-photo — members only. Previously unauthenticated, which let anyone
// call the model on our key.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out'}, {status: 401});
  if (throttled(user.id)) {
    return NextResponse.json({error: 'rate_limited', message: 'Give Nova a minute between looks.'}, {status: 429, headers: {'Retry-After': '60'}});
  }
  try {
    const formData = await req.formData();
    const entry = formData.get('file');
    const file = entry instanceof File ? entry : null;
    if (file && file.size > 0) {
      if (!(ALLOWED as readonly string[]).includes(file.type)) return NextResponse.json({error: 'unsupported_type'}, {status: 415});
      if (file.size > MAX_BYTES) return NextResponse.json({error: 'too_large'}, {status: 413});
    }

    let imageContent: Anthropic.ImageBlockParam | null = null;

    if (file && file.size > 0) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mediaType = file.type as (typeof ALLOWED)[number];
      imageContent = {
        type: 'image',
        source: {type: 'base64', media_type: mediaType, data: base64},
      };
    }

    const textPrompt = `You are Nova, a luxury personal stylist AI with deep knowledge of fashion, consumer psychology, and buying behavior.
${imageContent ? 'Analyze this photo for style cues.' : 'Provide a general luxury style analysis.'}
Return ONLY valid JSON with these exact keys:
{
  "style_archetype": "2-4 word label (e.g. Dark Luxe Editorial, Quiet Money, Street Luxe)",
  "style_labels": ["3 specific style descriptors"],
  "similar_brands": ["4 luxury/premium brands that match this aesthetic"],
  "price_range": "$X–$Y typical spend per piece",
  "buying_tendencies": ["4-6 product categories this person most likely buys (e.g. designer bags, fine jewelry, luxury skincare, tailored suits, sneaker culture, home decor)"]
}`;

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: imageContent
          ? [imageContent, {type: 'text', text: textPrompt}]
          : [{type: 'text', text: textPrompt}],
      },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages,
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    const result = JSON.parse(cleaned) as typeof FALLBACK;

    // Persist style_dna to the caller's own profile (RLS-scoped client).
    try {
      await supabase.from('profiles').update({style_dna: result}).eq('id', user.id);
    } catch {
      // non-blocking — save failure doesn't break the response
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
