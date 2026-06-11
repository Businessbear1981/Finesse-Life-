// OutingPlanner: given two member profiles + occasion, generates a complete registry
// Knows what each member already HAS (wardrobe) vs NEEDS (registry suggestions)

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

export interface OutingPlan {
  occasion_summary: string;
  items_for_member1: ScoutResult[];
  items_for_member2: ScoutResult[];
  shared_items: ScoutResult[]; // e.g., hotel booking, activity tickets
  nova_note: string; // Nova's message about the outing
}

export async function planOuting(
  occasion: string,
  occasionType: string,
  member1Profile: {username: string; nightvision_data?: Record<string, unknown>},
  member2Profile: {username: string; nightvision_data?: Record<string, unknown>},
): Promise<OutingPlan> {
  const system = `You are the Finesse Outing Planner. Two members are planning an occasion together.
Build a complete registry plan: what each person should wear/bring, plus shared items (hotel, tickets, reservations).
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

  const userPrompt = `Occasion: "${occasion}"
Type: "${occasionType}"

Member 1 (${member1Profile.username}): ${JSON.stringify(member1Profile.nightvision_data ?? {})}
Member 2 (${member2Profile.username}): ${JSON.stringify(member2Profile.nightvision_data ?? {})}

Create the full outing plan.`;

  const raw = await callNova(system, userPrompt);

  try {
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const plan = JSON.parse(cleaned) as OutingPlan;
    // Stamp source = 'nova' on every item to be safe
    const stamp = (items: ScoutResult[]) =>
      (items ?? []).map((i) => ({...i, source: 'nova' as const}));
    return {
      ...plan,
      items_for_member1: stamp(plan.items_for_member1),
      items_for_member2: stamp(plan.items_for_member2),
      shared_items: stamp(plan.shared_items),
    };
  } catch {
    // Graceful fallback so the frontend never gets a crash
    return {
      occasion_summary: `A curated ${occasionType} experience for ${member1Profile.username} and ${member2Profile.username}.`,
      items_for_member1: [],
      items_for_member2: [],
      shared_items: [],
      nova_note: "I'm putting together the perfect plan for your outing. Check back in a moment.",
    };
  }
}
