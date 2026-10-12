// Scout: given text description OR image URL/base64, searches for matching items
// Sources: Scale campaigns (Supabase), Embassy deals (Supabase), Nova AI web knowledge

import {createClient} from '@supabase/supabase-js';
import {askNova, orFilterSafe, stripFences, type AgentCtx} from './nova-call';

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

// ─── Supabase queries ────────────────────────────────────────────────────────

async function queryScaleDeals(rawQuery: string): Promise<ScoutResult[]> {
  const query = orFilterSafe(rawQuery);
  if (!query) return [];
  const supabase = getServiceClient();
  // Full text search on title + brand; fall back to ilike if no ts vector
  // Real schema (20260611_vault_exchange_scale.sql): original_price_cents /
  // group_price_cents, status open|met|closed|cancelled. No purchase_url column
  // exists on this table — deals are joined in-app via /scale, not an outbound link.
  const {data, error} = await supabase
    .from('scale_deals')
    .select('id,title,brand,group_price_cents,image_url,category,status')
    .eq('status', 'open')
    .or(`title.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(6);

  if (error || !data) return [];

  return (data as Array<{
    id: string;
    title: string;
    brand: string;
    group_price_cents: number;
    image_url: string | null;
    category: string | null;
  }>).map((row) => ({
    title: row.title,
    brand: row.brand,
    price_cents: row.group_price_cents,
    source: 'scale' as const,
    image_url: row.image_url,
    purchase_url: '/scale',
    partner: null,
    confidence: 0.85,
  }));
}

async function queryEmbassyDeals(rawQuery: string): Promise<ScoutResult[]> {
  const query = orFilterSafe(rawQuery);
  if (!query) return [];
  const supabase = getServiceClient();
  // Real schema (20260609_embassy.sql): item / retail_price_cents /
  // members_price_cents / tier, status pending|review|live|rejected.
  // No image_url or purchase_url columns on this table.
  const {data, error} = await supabase
    .from('embassy_deals')
    .select('id,brand,item,members_price_cents,category,tier')
    .eq('status', 'live')
    .or(`item.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(6);

  if (error || !data) return [];

  return (data as Array<{
    id: string;
    brand: string;
    item: string;
    members_price_cents: number;
    category: string | null;
    tier: string | null;
  }>).map((row) => ({
    title: row.item,
    brand: row.brand,
    price_cents: row.members_price_cents,
    source: 'embassy' as const,
    image_url: null,
    purchase_url: '/embassy',
    partner: row.tier,
    confidence: 0.8,
  }));
}

// ─── Nova suggestions ────────────────────────────────────────────────────────

const SCOUT_ITEMS_INSTRUCTIONS = `You are Scout, Finesse's item-search intelligence.
Return ONLY a valid JSON array of objects — no prose, no markdown fences.
Each object: { title, brand, price_cents, image_url, purchase_url, partner, confidence }
price_cents is an integer. confidence is 0.0–1.0. Use null for unknown fields.
Suggest 4–6 real, purchasable luxury/lifestyle items that match the query.
If a member style DNA is given, use it only as a taste signal.`;

async function askNovaForItems(query: string, styleDna: string | undefined, ctx: AgentCtx): Promise<ScoutResult[]> {
  // Member-supplied text (query, style DNA) goes in the prompt as quoted data, never the instructions.
  const prompt = `Find items matching: ${JSON.stringify(query)}` +
    (styleDna ? `\nMember style DNA (data): ${JSON.stringify(styleDna.slice(0, 1000))}` : '');
  const raw = await askNova(SCOUT_ITEMS_INSTRUCTIONS, prompt, {feature: 'agents.scout', ctx});
  try {
    const parsed = JSON.parse(stripFences(raw)) as ScoutResult[];
    return Array.isArray(parsed) ? parsed.map((item) => ({...item, source: 'nova' as const})) : [];
  } catch {
    return [];
  }
}

// ─── Public exports ───────────────────────────────────────────────────────────

export async function scoutByText(
  query: string,
  userStyleDna?: string,
  ctx: AgentCtx = {},
): Promise<ScoutResult[]> {
  const [scaleResults, embassyResults, novaResults] = await Promise.allSettled([
    queryScaleDeals(query),
    queryEmbassyDeals(query),
    askNovaForItems(query, userStyleDna, ctx),
  ]);

  const all: ScoutResult[] = [
    ...(scaleResults.status === 'fulfilled' ? scaleResults.value : []),
    ...(embassyResults.status === 'fulfilled' ? embassyResults.value : []),
    ...(novaResults.status === 'fulfilled' ? novaResults.value : []),
  ];

  // Sort by confidence descending
  return all.sort((a, b) => b.confidence - a.confidence);
}

const SCOUT_IMAGE_INSTRUCTIONS = `You are Scout. The member has shared a product image.
Analyze it and respond with ONLY a JSON object (no prose): { description: string, brand_guess: string, category: string }`;

export async function scoutByImage(image: string, ctx: AgentCtx = {}): Promise<ScoutResult[]> {
  // Sends the actual image as a multimodal content part. Throws NovaUnavailableError when Nova
  // can't answer — an empty description would otherwise match every deal.
  const raw = await askNova(SCOUT_IMAGE_INSTRUCTIONS, 'Describe this product image and identify brand/category.', {
    feature: 'agents.scout_image',
    image,
    ctx,
  });

  let description = '';
  let brandGuess = '';
  try {
    const parsed = JSON.parse(stripFences(raw)) as {description?: string; brand_guess?: string; category?: string};
    description = parsed.description ?? '';
    brandGuess = parsed.brand_guess ?? '';
  } catch {
    description = raw.slice(0, 120);
  }

  const query = [brandGuess, description].filter(Boolean).join(' ').trim();
  if (!query) return [];
  return scoutByText(query, undefined, ctx);
}
