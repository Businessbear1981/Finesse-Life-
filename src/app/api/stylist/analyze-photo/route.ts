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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    let imageContent: Anthropic.ImageBlockParam | null = null;

    if (file && file.size > 0) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
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

    // Persist style_dna to the caller's profile if authenticated
    try {
      const supabase = await createClient();
      const {data: {user}} = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({style_dna: result})
          .eq('id', user.id);
      }
    } catch {
      // non-blocking — save failure doesn't break the response
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
