// Stylist: filters Scout results against a member's NIGHTVISION style DNA
// Also generates outfit/item suggestions from scratch given an occasion

import {type ScoutResult} from './scout';

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

// ─── filterByStyle ────────────────────────────────────────────────────────────
// Reranks items by alignment with the member's NIGHTVISION style DNA.

export async function filterByStyle(
  items: ScoutResult[],
  nightvisionData: Record<string, unknown>,
): Promise<ScoutResult[]> {
  if (items.length === 0) return [];

  const system = `You are the Finesse Stylist AI. You have a member's NIGHTVISION style DNA and a list of items.
Rank the items by how well they align with the member's style.
Return ONLY a JSON array of the same objects in ranked order — best match first.
Preserve all original fields. Add or update the confidence field (0.0–1.0) to reflect style alignment.
Do NOT add prose. Do NOT wrap in markdown fences.`;

  const userPrompt = `Style DNA: ${JSON.stringify(nightvisionData)}

Items to rank: ${JSON.stringify(items)}`;

  const raw = await callNova(system, userPrompt);

  try {
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const ranked = JSON.parse(cleaned) as ScoutResult[];
    return ranked;
  } catch {
    // Nova couldn't parse — return original order unchanged
    return items;
  }
}

// ─── suggestForOccasion ───────────────────────────────────────────────────────
// Nova generates 5-8 specific item suggestions for this occasion based on style DNA.

export async function suggestForOccasion(
  occasion: string,
  occasionType: string,
  nightvisionData: Record<string, unknown>,
): Promise<ScoutResult[]> {
  const system = `You are the Finesse Stylist AI. Generate outfit and item suggestions for a member's upcoming occasion.
Use their NIGHTVISION style DNA to make suggestions personal and on-point.
Return ONLY a valid JSON array of 5–8 items — no prose, no markdown fences.
Each item: { title, brand, price_cents, source, image_url, purchase_url, partner, confidence }
source should be "nova". price_cents is an integer (realistic retail price). confidence is 0.0–1.0.
Use null for unknown fields. Include mix of clothing, accessories, and experience items.`;

  const userPrompt = `Occasion: "${occasion}"
Type: "${occasionType}"
Member style DNA: ${JSON.stringify(nightvisionData)}

Suggest 5–8 items that would be perfect for this occasion, aligned with their aesthetic.`;

  const raw = await callNova(system, userPrompt);

  try {
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const suggestions = JSON.parse(cleaned) as ScoutResult[];
    return suggestions.map((item) => ({...item, source: 'nova' as const}));
  } catch {
    return [];
  }
}
