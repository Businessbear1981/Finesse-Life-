import {NextResponse} from 'next/server';
import {complete} from '@/lib/ai';
import {createClient} from '@/lib/supabase/server';
import {buildBehavioralProfile, emit} from '@/lib/intelligence';

export async function POST(req: Request) {
  const {prompt, system} = await req.json() as {prompt: string; system?: string};

  // Pull behavioral profile to personalize Nova (non-blocking race with 800ms timeout)
  let profileContext = '';
  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (user) {
      const profile = await Promise.race([
        buildBehavioralProfile(user.id),
        new Promise<null>(r => setTimeout(() => r(null), 800)),
      ]);
      if (profile && typeof profile === 'object') {
        const topCats = Object.keys(profile.category_affinities).slice(0, 3).join(', ');
        const topBrands = Object.keys(profile.brand_affinities).slice(0, 3).join(', ');
        profileContext = [
          topCats   && `Member affinities: ${topCats}.`,
          topBrands && `Brand preferences: ${topBrands}.`,
          `Buying velocity: ${profile.buying_velocity}.`,
          profile.style_signals.length && `Style signals: ${profile.style_signals.slice(0,4).join(', ')}.`,
        ].filter(Boolean).join(' ');
      }
      // Emit agent_query signal (fire-and-forget)
      void emit({user_id: user.id, kind: 'agent_query', payload: {page: 'lobby', query_length: prompt.length}});
    }
  } catch {
    // Non-blocking — Nova works without profile context
  }

  const enrichedSystem = profileContext
    ? `${system ?? ''}\n\nMember intelligence: ${profileContext}`.trim()
    : system;

  try {
    const text = await complete(prompt, {
      system: enrichedSystem,
      model: 'anthropic/claude-sonnet-4-6',
    });
    return NextResponse.json({text});
  } catch {
    return NextResponse.json({
      text: "Consider it handled. I'll have that arranged shortly.",
    });
  }
}
