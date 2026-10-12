import {NextResponse} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {createClient} from '@/lib/supabase/server';
import {guardAiCall} from '@/lib/ai-rate-limit';
import {MAX_IMAGES, runNova} from '@/lib/nova';

const answer = z.union([z.string().max(300), z.array(z.string().max(120)).max(12)]);

const analyzeSchema = z.object({
  answers: z.record(z.string().max(40), answer).refine((a) => Object.keys(a).length <= 20, 'too many answers').default({}),
  sources: z.object({
    instagram: z.boolean(),
    snapchat: z.boolean(),
    plaid: z.boolean(),
    spotify: z.boolean(),
  }).default({instagram: false, snapchat: false, plaid: false, spotify: false}),
  // Up to 6 accepted (page contract); the first MAX_IMAGES are sent to the model.
  photos: z.array(z.object({url: z.string().url().max(2048).startsWith('https://'), category: z.string().max(40)})).max(6).default([]),
});

interface NovaAnalysis {
  style_dna: string;
  brand_radar: string[];
  style_tags: string[];
}

const SYSTEM_PROMPT = `You are Nova, the intelligence engine for Finesse. Based on the profile data, generate:
1. A style_dna: a 3-4 sentence style profile paragraph. Be specific about brands, aesthetics, cultural context.
2. brand_radar: array of 10 specific brand names this person should know/buy
3. style_tags: array of 5-7 short descriptive tags

Respond ONLY with valid JSON: {"style_dna":"...","brand_radar":[...],"style_tags":[...]}

Cultural context matters. If the user identifies as Black/African American: include brands like FENTY, Pyer Moss, brands with inclusive shade ranges, natural hair brands if beauty is relevant. If Latina/Hispanic: include Maison Margiela (popular in Latina luxury), SKIMS, etc. If Asian/Pacific Islander: include Comme des Garçons, minimal Japanese aesthetics, Issey Miyake. This is accurate cultural market knowledge, not stereotyping.

Music intelligence: The user's Spotify data reveals their aesthetic identity faster than any questionnaire.
- R&B/Neo-soul listeners (SZA, Frank Ocean, Brent Faiyaz): soft luxury, Jacquemus, Celine, vintage finds
- Hip-hop/trap (Drake, Cardi B, Megan): bold luxury, Amiri, Alexander Wang, statement pieces
- Afrobeats/Dancehall: vibrant, Lagos+London aesthetic, rich colors, Ankara-influenced
- Latin/Reggaeton (Bad Bunny, J Balvin): Latin luxury, Versace, Dsquared2, flashy but intentional
- Pop/indie (Taylor Swift, Olivia Rodrigo): Reformation, vintage, cottagecore-luxury
Include music genre in style_tags if music data is available.

Photo intelligence: If style photos are attached (clothing, outfits, art, or
music/album art the member actually shot), look at them directly — read
silhouette, fabric, color palette, logo/brand cues, and aesthetic register from
the images themselves rather than guessing from text alone. Treat attached
photos as the strongest signal available, stronger than the questionnaire.

Be direct and confident. No hedging. Write the style_dna in second person ("You gravitate toward...").`;

function buildProfileSummary(
  answers: Record<string, string | string[]>,
  sources: z.infer<typeof analyzeSchema>['sources'],
  photos: z.infer<typeof analyzeSchema>['photos'],
): string {
  const lines: string[] = ['USER STYLE PROFILE:'];

  if (answers.movement) lines.push(`Movement/style: ${answers.movement}`);
  if (answers.spending) {
    const s = Array.isArray(answers.spending) ? answers.spending.join(', ') : answers.spending;
    lines.push(`Spends most on: ${s}`);
  }
  if (answers.age) lines.push(`Age range: ${answers.age}`);
  if (answers.identity) lines.push(`Cultural identity: ${answers.identity}`);
  if (answers.fragrance) lines.push(`Fragrance direction: ${answers.fragrance}`);
  if (answers.pricepoint) lines.push(`Price point per piece: ${answers.pricepoint}`);
  if (answers.cities) {
    const c = Array.isArray(answers.cities) ? answers.cities.join(', ') : answers.cities;
    lines.push(`Style cities: ${c}`);
  }

  // No real OAuth exists for any of instagram/snapchat/plaid/spotify yet — see
  // docs/decisions/2026-08-01_new-feature-concepts.json (nightvision-real-signal-ingestion).
  // Previously this told the LLM these were "Connected" based on a client-side
  // checkbox alone, which produced fabricated-but-plausible-sounding inferences.
  // Until real ingestion exists, be honest with the model: questionnaire only.
  if (photos.length > 0) {
    const byCategory = photos.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
    const summary = Object.entries(byCategory).map(([cat, n]) => `${n} ${cat}`).join(', ');
    lines.push(`Attached ${photos.length} member-captured style photo(s): ${summary}. Analyze the images directly.`);
  } else {
    lines.push('No style photos attached — questionnaire only.');
  }

  lines.push('Profile built from questionnaire answers' + (photos.length > 0 ? ' and attached photos' : '') + ' only — no external social/financial data sources are connected yet.');

  return lines.join('\n');
}

function parseNovaJson(text: string): NovaAnalysis | null {
  // Try to extract JSON block from the response
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('style_dna' in parsed) ||
      !('brand_radar' in parsed) ||
      !('style_tags' in parsed)
    ) {
      return null;
    }
    const p = parsed as {style_dna: unknown; brand_radar: unknown; style_tags: unknown};
    if (
      typeof p.style_dna !== 'string' ||
      !Array.isArray(p.brand_radar) ||
      !Array.isArray(p.style_tags)
    ) {
      return null;
    }
    return {
      style_dna: p.style_dna,
      brand_radar: (p.brand_radar as unknown[]).filter((b): b is string => typeof b === 'string'),
      style_tags: (p.style_tags as unknown[]).filter((t): t is string => typeof t === 'string'),
    };
  } catch {
    return null;
  }
}

// POST /api/nightvision/analyze — members only, rate limited. Calls Nova directly (runNova)
// instead of HTTP-fetching /api/nova via NEXT_PUBLIC_SITE_URL (localhost in production).
// → 200 NovaAnalysis | 401 | 400 | 429 | 502 analysis_unparseable | 503 nova_unavailable
export async function POST(req: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out'}, {status: 401, headers: {'Cache-Control': 'no-store'}});

  const parsed = await parseBody(req, analyzeSchema);
  if (parsed.error) return parsed.error;
  const {answers, sources, photos} = parsed.data;
  const modelPhotos = photos.slice(0, MAX_IMAGES);

  const limited = await guardAiCall(user.id, modelPhotos.length > 0 ? 'image' : 'nova');
  if (limited) return limited;

  const profileSummary = buildProfileSummary(answers, sources, modelPhotos);
  const result = await runNova({
    userId: user.id,
    prompt: profileSummary,
    instructions: SYSTEM_PROMPT,
    images: modelPhotos.map((p) => p.url),
    feature: modelPhotos.length > 0 ? 'nightvision.analyze_vision' : 'nightvision.analyze',
    maxOutputTokens: 1200,
  });

  if (!result.ok) {
    return NextResponse.json({error: result.error, message: 'Nova could not compile your Style DNA just now. Nothing was saved.'}, {status: result.status});
  }

  const analysis = parseNovaJson(result.text);
  if (!analysis) {
    // Honest failure — previously returned a canned Style DNA as if Nova had written it.
    return NextResponse.json({error: 'analysis_unparseable', message: 'Nova could not compile your Style DNA just now. Nothing was saved.'}, {status: 502});
  }
  return NextResponse.json(analysis);
}
