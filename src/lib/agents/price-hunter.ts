// PriceHunter: given an item description, finds best available price
// Checks Scale, Embassy, then asks Nova for market knowledge

import {createClient} from '@supabase/supabase-js';

export interface PriceResult {
  source: string;
  price_cents: number;
  url: string | null;
  is_members_price: boolean;
  savings_cents: number; // vs retail
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

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function huntPrice(
  title: string,
  brand: string,
  category: string,
  retail_cents: number,
): Promise<PriceResult[]> {
  const results: PriceResult[] = [];

  // Always include retail baseline
  results.push({
    source: 'Retail (est.)',
    price_cents: retail_cents,
    url: null,
    is_members_price: false,
    savings_cents: 0,
  });

  const supabase = getServiceClient();

  // 1. Check Scale deals
  // Real schema (20260611_vault_exchange_scale.sql): group_price_cents,
  // status open|met|closed|cancelled. No purchase_url column — link to /scale.
  const {data: scaleData} = await supabase
    .from('scale_deals')
    .select('title,group_price_cents,brand')
    .eq('status', 'open')
    .or(`title.ilike.%${title}%,brand.ilike.%${brand}%`)
    .limit(3);

  if (scaleData) {
    for (const row of scaleData as Array<{
      title: string;
      group_price_cents: number;
      brand: string;
    }>) {
      results.push({
        source: `Finesse Scale — ${row.brand}`,
        price_cents: row.group_price_cents,
        url: '/scale',
        is_members_price: true,
        savings_cents: Math.max(0, retail_cents - row.group_price_cents),
      });
    }
  }

  // 2. Check Embassy deals
  // Real schema (20260609_embassy.sql): retail_price_cents / members_price_cents
  // are already in cents, status pending|review|live|rejected. No purchase_url.
  const {data: embassyData} = await supabase
    .from('embassy_deals')
    .select('brand,item,retail_price_cents,members_price_cents')
    .eq('status', 'live')
    .or(`item.ilike.%${title}%,brand.ilike.%${brand}%,category.ilike.%${category}%`)
    .limit(3);

  if (embassyData) {
    for (const row of embassyData as Array<{
      brand: string;
      item: string;
      retail_price_cents: number | null;
      members_price_cents: number | null;
    }>) {
      const membersCents = row.members_price_cents ?? 0;
      const retailCents = row.retail_price_cents ?? 0;
      results.push({
        source: `Embassy — ${row.brand}`,
        price_cents: membersCents,
        url: '/embassy',
        is_members_price: true,
        savings_cents: Math.max(0, retailCents - membersCents),
      });
    }
  }

  // 3. Ask Nova for market pricing context
  const system = `You are PriceHunter, Finesse's pricing intelligence agent.
Return ONLY a valid JSON array — no prose, no markdown fences.
Each object: { source, price_cents, url, is_members_price, savings_cents }
price_cents and savings_cents are integers. is_members_price is a boolean. url may be null.
Provide 1–3 real market price points (retailer name, realistic price). Do not fabricate URLs — use null if unsure.`;

  const novaRaw = await callNova(
    system,
    `Find market prices for: "${brand} ${title}" in category "${category}". Retail estimate: $${(retail_cents / 100).toFixed(2)}`,
  );

  try {
    const cleaned = novaRaw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const novaPrices = JSON.parse(cleaned) as PriceResult[];
    results.push(...novaPrices);
  } catch {
    // Nova didn't return parseable JSON — skip
  }

  // Sort by price ascending, deduplicate by source
  const seen = new Set<string>();
  const deduped = results
    .sort((a, b) => a.price_cents - b.price_cents)
    .filter((r) => {
      if (seen.has(r.source)) return false;
      seen.add(r.source);
      return true;
    });

  return deduped;
}
