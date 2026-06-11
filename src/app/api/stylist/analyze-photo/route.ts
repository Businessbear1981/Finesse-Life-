import {NextResponse} from 'next/server';

const MOCK: {style_labels: string[]; similar_brands: string[]; price_range: string} = {
  style_labels: ['Dark luxury', 'Sculptural silhouette', 'Minimalist'],
  similar_brands: ['The Row', 'Bottega Veneta', 'Toteme', 'Lemaire'],
  price_range: '$800–$3,200',
};

export async function POST(req: Request) {
  try {
    // Parse FormData — file field present but not sent to a vision API in MVP
    await req.formData();

    const prompt = `You are Nova, a luxury personal stylist AI. Based on a fashion photo uploaded by a client, provide a style analysis. Generate a realistic analysis as if you had seen the image. The client's style DNA says: [luxury/editorial, 25-34, ATL]. Respond ONLY with valid JSON: {"style_labels":["...","...","..."],"similar_brands":["...","...","...","..."],"price_range":"$X–$Y"}`;

    const novaRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/nova`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        prompt,
        system: 'You are Nova, a luxury personal stylist AI. Always respond with valid JSON only, no markdown, no explanation.',
      }),
    });

    if (!novaRes.ok) {
      return NextResponse.json(MOCK);
    }

    const {text} = (await novaRes.json()) as {text: string};

    // Strip markdown code fences if present
    const cleaned = text.replace(/```(?:json)?/gi, '').trim();
    const parsed = JSON.parse(cleaned) as {
      style_labels: string[];
      similar_brands: string[];
      price_range: string;
    };

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(MOCK);
  }
}
