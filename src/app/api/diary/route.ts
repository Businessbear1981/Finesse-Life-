import {NextRequest} from 'next/server';
import {z} from 'zod';
import {dbFailure, json, requireMember} from '@/lib/api/room';

const query = z.object({day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()});

// GET /api/diary?day=YYYY-MM-DD — the member's page for one day (default: today, UTC).
export async function GET(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const q = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  const day = q.success && q.data.day ? q.data.day : new Date().toISOString().slice(0, 10);
  const from = `${day}T00:00:00.000Z`;
  const to = new Date(new Date(from).getTime() + 86_400_000).toISOString();

  const {data, error} = await ctx.supabase
    .from('diary_items')
    .select('id, title, starts_at, source_room, source_id, state, notes, updated_at')
    .eq('user_id', ctx.userId)
    .gte('starts_at', from)
    .lt('starts_at', to)
    .neq('state', 'cancelled')
    .order('starts_at');
  if (error) return dbFailure(error, ctx.traceId, 'diary');

  const items = data ?? [];
  const needsYou = items.filter((i) => i.state === 'needs_member_action');
  return json({day, items, nextDecision: needsYou[0] ?? null, counts: {
    done: items.filter((i) => i.state === 'done').length,
    needsYou: needsYou.length,
  }}, ctx.traceId);
}
