import {NextResponse} from 'next/server';

interface AnalyzeBody {
  answers: Record<string, string | string[]>;
  sources: {
    instagram: boolean;
    snapchat: boolean;
    plaid: boolean;
    spotify: boolean;
  };
}

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

Be direct and confident. No hedging. Write the style_dna in second person ("You gravitate toward...").`;

function buildProfileSummary(
  answers: Record<string, string | string[]>,
  sources: AnalyzeBody['sources'],
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

  const connectedSources: string[] = [];
  if (sources.instagram) connectedSources.push('Instagram (visual identity, brand tags, aesthetic)');
  if (sources.snapchat) connectedSources.push('Snapchat (social graph, story patterns)');
  if (sources.plaid) connectedSources.push('Plaid (real transaction data, brand spend)');
  lines.push(`spotify: ${sources.spotify ? 'Connected — music taste feeds style DNA' : 'Not connected'}`);

  if (connectedSources.length > 0) {
    lines.push(`Connected data sources: ${connectedSources.join('; ')}`);
  } else {
    lines.push('No data sources connected — profile built from questionnaire only.');
  }

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeBody;
    const {answers, sources} = body;

    const profileSummary = buildProfileSummary(answers ?? {}, sources ?? {instagram: false, snapchat: false, plaid: false, spotify: false});

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const novaRes = await fetch(`${siteUrl}/api/nova`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({prompt: profileSummary, system: SYSTEM_PROMPT}),
    });

    if (!novaRes.ok) {
      throw new Error(`Nova returned ${novaRes.status}`);
    }

    const novaData = (await novaRes.json()) as {text: string};
    const analysis = parseNovaJson(novaData.text);

    if (!analysis) {
      // Graceful fallback — still return something
      return NextResponse.json({
        style_dna: 'Your intelligence file is being compiled. Nova has noted your profile and will refine your Style DNA as you connect more sources.',
        brand_radar: ['Bottega Veneta', 'Jacquemus', 'The Row', 'Amina Muaddi', 'Toteme', 'Loro Piana', 'Staud', 'Khaite', 'Officine Générale', 'A.P.C.'],
        style_tags: ['Luxury · Minimal · Curated'],
      } satisfies NovaAnalysis);
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error('[POST /api/nightvision/analyze]', err);
    return NextResponse.json(
      {error: 'Analysis failed. Check Nova connection.'},
      {status: 500},
    );
  }
}
