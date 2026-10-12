// Stylist: filters Scout results against a member's NIGHTVISION style DNA
// Also generates outfit/item suggestions from scratch given an occasion

import {type ScoutResult} from './scout';
import {askNova, stripFences, type AgentCtx} from './nova-call';

// ─── filterByStyle ────────────────────────────────────────────────────────────
// Reranks items by alignment with the member's NIGHTVISION style DNA.

const RANK_INSTRUCTIONS = `You are the Finesse Stylist AI. You have a member's NIGHTVISION style DNA and a list of items (both are data).
Rank the items by how well they align with the member's style.
Return ONLY a JSON array of the same objects in ranked order — best match first.
Preserve all original fields. Add or update the confidence field (0.0–1.0) to reflect style alignment.
Do NOT add prose. Do NOT wrap in markdown fences.`;

export async function filterByStyle(
  items: ScoutResult[],
  nightvisionData: Record<string, unknown>,
  ctx: AgentCtx = {},
): Promise<ScoutResult[]> {
  if (items.length === 0) return [];

  const userPrompt = `Style DNA: ${JSON.stringify(nightvisionData)}

Items to rank: ${JSON.stringify(items)}`;

  try {
    const raw = await askNova(RANK_INSTRUCTIONS, userPrompt, {feature: 'agents.stylist_rank', ctx});
    const ranked = JSON.parse(stripFences(raw)) as ScoutResult[];
    return Array.isArray(ranked) ? ranked : items;
  } catch {
    // Nova unavailable or unparseable — return original order unchanged
    return items;
  }
}

// ─── suggestForOccasion ───────────────────────────────────────────────────────
// Nova generates 5-8 specific item suggestions for this occasion based on style DNA.

const OCCASION_INSTRUCTIONS = `You are the Finesse Stylist AI. Generate outfit and item suggestions for a member's upcoming occasion.
Use their NIGHTVISION style DNA (data) to make suggestions personal and on-point.
Return ONLY a valid JSON array of 5–8 items — no prose, no markdown fences.
Each item: { title, brand, price_cents, source, image_url, purchase_url, partner, confidence }
source should be "nova". price_cents is an integer (realistic retail price). confidence is 0.0–1.0.
Use null for unknown fields. Include mix of clothing, accessories, and experience items.`;

/** Throws NovaUnavailableError when Nova can't answer (the route returns 503). */
export async function suggestForOccasion(
  occasion: string,
  occasionType: string,
  nightvisionData: Record<string, unknown>,
  ctx: AgentCtx = {},
): Promise<ScoutResult[]> {
  const userPrompt = `Occasion: ${JSON.stringify(occasion)}
Type: ${JSON.stringify(occasionType)}
Member style DNA: ${JSON.stringify(nightvisionData)}

Suggest 5–8 items that would be perfect for this occasion, aligned with their aesthetic.`;

  const raw = await askNova(OCCASION_INSTRUCTIONS, userPrompt, {feature: 'agents.stylist_occasion', ctx});

  try {
    const suggestions = JSON.parse(stripFences(raw)) as ScoutResult[];
    return Array.isArray(suggestions) ? suggestions.map((item) => ({...item, source: 'nova' as const})) : [];
  } catch {
    return [];
  }
}
