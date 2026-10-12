// OutingPlanner: given two member profiles + occasion, generates a complete registry
// Knows what each member already HAS (wardrobe) vs NEEDS (registry suggestions)

import {type ScoutResult} from './scout';
import {askNova, NovaUnavailableError, stripFences, type AgentCtx} from './nova-call';

export interface OutingPlan {
  occasion_summary: string;
  items_for_member1: ScoutResult[];
  items_for_member2: ScoutResult[];
  shared_items: ScoutResult[]; // e.g., hotel booking, activity tickets
  nova_note: string; // Nova's message about the outing
}

const OUTING_INSTRUCTIONS = `You are the Finesse Outing Planner. Two members are planning an occasion together.
Build a complete registry plan: what each person should wear/bring, plus shared items (hotel, tickets, reservations) — suggestions only, nothing is booked.
Return ONLY a valid JSON object — no prose, no markdown fences — with this exact shape:
{
  "occasion_summary": "string — one punchy sentence describing the perfect version of this outing",
  "items_for_member1": [ ...ScoutResult objects ],
  "items_for_member2": [ ...ScoutResult objects ],
  "shared_items": [ ...ScoutResult objects ],
  "nova_note": "string — Nova's warm, personal message about the outing (2-3 sentences)"
}
Each ScoutResult: { title, brand, price_cents, source, image_url, purchase_url, partner, confidence }
source = "nova". price_cents = integer. confidence = 0.0–1.0. Nulls ok for unknown fields.
Generate 3–5 items per section. Keep shared_items to 2–3 (hotel, dinner res, activity).`;

/** Throws NovaUnavailableError when Nova can't produce a plan (the route returns 503/502). */
export async function planOuting(
  occasion: string,
  occasionType: string,
  member1Profile: {username: string; nightvision_data?: Record<string, unknown>},
  member2Profile: {username: string; nightvision_data?: Record<string, unknown>},
  ctx: AgentCtx = {},
): Promise<OutingPlan> {
  const userPrompt = `Occasion: ${JSON.stringify(occasion)}
Type: ${JSON.stringify(occasionType)}

Member 1 (${JSON.stringify(member1Profile.username)}): ${JSON.stringify(member1Profile.nightvision_data ?? {})}
Member 2 (${JSON.stringify(member2Profile.username)}): ${JSON.stringify(member2Profile.nightvision_data ?? {})}

Create the full outing plan.`;

  const raw = await askNova(OUTING_INSTRUCTIONS, userPrompt, {feature: 'agents.outing_planner', ctx, maxOutputTokens: 4000});

  try {
    const plan = JSON.parse(stripFences(raw)) as OutingPlan;
    // Stamp source = 'nova' on every item to be safe
    const stamp = (items: ScoutResult[]) =>
      (Array.isArray(items) ? items : []).map((i) => ({...i, source: 'nova' as const}));
    return {
      ...plan,
      items_for_member1: stamp(plan.items_for_member1),
      items_for_member2: stamp(plan.items_for_member2),
      shared_items: stamp(plan.shared_items),
    };
  } catch {
    // Unparseable plan: report honestly rather than inventing a placeholder plan.
    throw new NovaUnavailableError(502);
  }
}
