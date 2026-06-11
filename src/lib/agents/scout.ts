// Scout: given text description OR image URL/base64, searches for matching items
// Sources: Scale campaigns (Supabase), Embassy deals (Supabase), Nova AI web knowledge

import {createClient} from '@supabase/supabase-js';

export interface ScoutResult {
  title: string;
  brand: string;
  price_cents: number;
  source: 'scale' | 'embassy' | 'nova' | 'web';
  image_url: string | null;
  purchase_url: string | null;
  partner: string | null;
  confidence: number; // 0-1
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function callNova(systemPrompt: string, userPrompt: string): Promise<string> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/nova`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({system: systemPrompt, prompt: userPrompt}),
  });
  const data = (await res.json()) as {text?: string; error?: string};
  return data.text ?? '';
}

// ─── Supabase queries ────────────────────────────────────────────────────────

async function queryScaleDeals(query: string): Promise<ScoutResult[]> {
  const supabase = getServiceClient();
  // Full text search on title + brand; fall back to ilike if no ts vector
  const {data, error} = await supabase
    .from('scale_deals')
    .select('id,title,brand,price_cents,image_url,purchase_url,category,status')
    .eq('status', 'live')
    .or(`title.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(6);

  if (error || !data) return [];

  return (data as Array<{
    id: string;
    title: string;
    brand: string;
    price_cents: number;
    image_url: string | null;
    purchase_url: string | null;
    category: string | null;
  }>).map((row) => ({
    title: row.title,
    brand: row.brand,
    price_cents: row.price_cents,
    source: 'scale' as const,
    image_url: row.image_url,
    purchase_url: row.purchase_url,
    partner: null,
    confidence: 0.85,
  }));
}

async function queryEmbassyDeals(query: string): Promise<ScoutResult[]> {
  const supabase = getServiceClient();
  const {data, error} = await supabase
    .from('embassy_deals')
    .select('id,brand,item,retail_price,members_price,category,image_url,purchase_url,tier')
    .eq('status', 'active')
    .or(`item.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(6);

  if (error || !data) return [];

  return (data as Array<{
    id: string;
    brand: string;
    item: string;
    retail_price: number;
    members_price: number;
    category: string | null;
    image_url: string | null;
    purchase_url: string | null;
    tier: string | null;
  }>).map((row) => ({
    title: row.item,
    brand: row.brand,
    price_cents: Math.round(row.members_price * 100),
    source: 'embassy' as const,
    image_url: row.image_url,
    purchase_url: row.purchase_url,
    partner: row.tier,
    confidence: 0.8,
  }));
}

// ─── Nova suggestions ────────────────────────────────────────────────────────

async function askNovaForItems(query: string, styleDna?: string): Promise<ScoutResult[]> {
  const system = `You are Scout, Finesse's item-search intelligence.
Return ONLY a valid JSON array of objects — no prose, no markdown fences.
Each object: { title, brand, price_cents, image_url, purchase_url, partner, confidence }
price_cents is an integer. confidence is 0.0–1.0. Use null for unknown fields.
Suggest 4–6 real, purchasable luxury/lifestyle items that match the query.
${styleDna ? `Style DNA context: ${styleDna}` : ''}`;

  const raw = await callNova(system, `Find items matching: "${query}"`);

  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as ScoutResult[];
    return parsed.map((item) => ({...item, source: 'nova' as const}));
  } catch {
    return [];
  }
}

// ─── Public exports ───────────────────────────────────────────────────────────

export async function scoutByText(
  query: string,
  userStyleDna?: string,
): Promise<ScoutResult[]> {
  const [scaleResults, embassyResults, novaResults] = await Promise.allSettled([
    queryScaleDeals(query),
    queryEmbassyDeals(query),
    askNovaForItems(query, userStyleDna),
  ]);

  const all: ScoutResult[] = [
    ...(scaleResults.status === 'fulfilled' ? scaleResults.value : []),
    ...(embassyResults.status === 'fulfilled' ? embassyResults.value : []),
    ...(novaResults.status === 'fulfilled' ? novaResults.value : []),
  ];

  // Sort by confidence descending
  return all.sort((a, b) => b.confidence - a.confidence);
}

export async function scoutByImage(imageBase64: string): Promise<ScoutResult[]> {
  // Ask Nova to describe the image and extract item details
  const system = `You are Scout. The user has shared a product image encoded as base64.
Analyze it and respond with ONLY a JSON object (no prose): { description: string, brand_guess: string, category: string }`;

  const raw = await callNova(
    system,
    `Describe this product image and identify brand/category. Base64 data: ${imageBase64.slice(0, 200)}... [truncated for prompt]`,
  );

  let description = '';
  let brandGuess = '';
  try {
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as {description?: string; brand_guess?: string; category?: string};
    description = parsed.description ?? '';
    brandGuess = parsed.brand_guess ?? '';
  } catch {
    description = raw.slice(0, 120);
  }

  const query = [brandGuess, description].filter(Boolean).join(' ');
  return scoutByText(query);
}
