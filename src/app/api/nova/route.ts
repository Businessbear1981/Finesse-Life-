import {NextResponse} from 'next/server';
import {generateText, tool, stepCountIs} from 'ai';
import {model} from '@/lib/ai';
import {createClient} from '@/lib/supabase/server';
import {buildBehavioralProfile, predictNextAction, generatePersonalizedRecs, emit} from '@/lib/intelligence';
import {z} from 'zod';

// ─── Tool definitions ──────────────────────────────────────────────────────────

function buildNovaTools(userId: string | null) {
  return {
    check_vault_balance: tool({
      description: "Read the authenticated user's Finesse Vault balance from Supabase.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!userId) return {balance_cents: null, balance_display: 'unavailable', error: 'Not authenticated'};
        try {
          const supabase = await createClient();
          const {data} = await supabase
            .from('vault_accounts')
            .select('balance')
            .eq('user_id', userId)
            .maybeSingle();
          const cents = data?.balance ?? 0;
          return {
            balance_cents: cents,
            balance_display: `$${(Number(cents) / 100).toFixed(2)}`,
          };
        } catch {
          return {balance_cents: null, balance_display: 'unavailable', error: 'Query failed'};
        }
      },
    }),

    get_recommendations: tool({
      description: 'Generate personalized luxury item recommendations for the user based on their behavioral profile.',
      inputSchema: z.object({
        category: z.string().optional().describe('Optional category filter (e.g. Fashion, Watches, Sneakers)'),
        count: z.number().int().min(1).max(10).optional().describe('Number of recommendations to return (default 3)'),
      }),
      execute: async ({count}: {category?: string; count?: number}) => {
        if (!userId) return {recommendations: [] as Array<{title: string; category: string; price_range: string; why: string}>, error: 'Not authenticated'};
        try {
          const recs = await generatePersonalizedRecs(userId, count ?? 3);
          return {recommendations: recs};
        } catch {
          return {recommendations: [] as Array<{title: string; category: string; price_range: string; why: string}>, error: 'Could not generate recommendations'};
        }
      },
    }),

    get_next_action: tool({
      description: "Predict the single most useful next action for the user based on their behavioral profile.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!userId) return {action: null as string | null, reason: 'Not authenticated', confidence: 0};
        try {
          const result = await predictNextAction(userId, {page: 'concierge'});
          return result;
        } catch {
          return {action: null as string | null, reason: 'Could not predict next action', confidence: 0};
        }
      },
    }),

    log_intent: tool({
      description: "Log a purchase intent signal to the intelligence bus.",
      inputSchema: z.object({
        intent: z.string().describe('The intent category, e.g. car_service, dining, travel'),
        details: z.string().describe('Free-text description of the intent'),
      }),
      execute: async ({intent, details}: {intent: string; details: string}) => {
        if (!userId) return {logged: false, intent: '', details: ''};
        try {
          await emit({
            user_id: userId,
            kind: 'purchase_intent',
            payload: {intent, details},
            context: {page: 'concierge'},
          });
          return {logged: true, intent, details};
        } catch {
          return {logged: false, intent, details};
        }
      },
    }),
  };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const {prompt, system} = await req.json() as {prompt: string; system?: string};

  // Pull user + behavioral profile context (non-blocking, 800ms cap)
  let profileContext = '';
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
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
          profile.style_signals.length && `Style signals: ${profile.style_signals.slice(0, 4).join(', ')}.`,
        ].filter(Boolean).join(' ');
      }
      void emit({user_id: user.id, kind: 'agent_query', payload: {page: 'concierge', query_length: prompt.length}});
    }
  } catch {
    // Non-blocking — Nova works without profile context
  }

  const enrichedSystem = profileContext
    ? `${system ?? ''}\n\nMember intelligence: ${profileContext}`.trim()
    : system;

  const novaTools = buildNovaTools(userId);

  try {
    const result = await generateText({
      model: model('anthropic/claude-sonnet-4-6'),
      system: enrichedSystem,
      prompt,
      tools: novaTools,
      // Allow up to 3 steps: initial call + tool execution + follow-up prose
      stopWhen: stepCountIs(3),
    });

    // Collect all tool results across all steps
    const toolCalls: Array<{name: string; result: unknown}> = [];
    for (const step of result.steps) {
      for (const tr of step.toolResults) {
        toolCalls.push({
          name: tr.toolName,
          // v6: result property is 'output' on StaticToolResult
          result: 'output' in tr ? tr.output : undefined,
        });
      }
    }

    const text = result.text || "Consider it handled. I'll have that arranged shortly.";

    return NextResponse.json({
      text,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    });
  } catch {
    return NextResponse.json({
      text: "Consider it handled. I'll have that arranged shortly.",
    });
  }
}
