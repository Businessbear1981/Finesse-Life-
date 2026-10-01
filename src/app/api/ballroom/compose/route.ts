import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {dbFailure, json, requireMember} from '@/lib/api/room';
import {trackSchema} from '@/lib/contracts';
import {recordEngagement} from '@/lib/revenue/events';

const compose = z.object({
  title: z.string().trim().min(1).max(160),
  occasion: z.string().trim().max(120).optional(),
  startsAt: z.string().datetime(),
  partySize: z.number().int().min(1).max(40).default(2),
  track: trackSchema.optional(),
  components: z.array(z.object({
    kind: z.enum(['table', 'look', 'gift', 'route', 'salon', 'travel']),
    label: z.string().trim().min(1).max(160),
  })).min(1).max(8),
});

// POST /api/ballroom/compose — create a PROPOSAL. Nothing is booked or held.
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, compose);
  if (parsed.error) return parsed.error;
  const b = parsed.data;

  const {data: evening, error} = await ctx.supabase
    .from('ballroom_evenings')
    .insert({
      user_id: ctx.userId, title: b.title, occasion: b.occasion ?? null, starts_at: b.startsAt,
      party_size: b.partySize, track: b.track ?? null, trace_id: ctx.traceId, state: 'proposal',
      components: b.components.map((c) => ({...c, partner: null, state: 'proposed'})),
    })
    .select('id, title, starts_at, state, components')
    .single();
  if (error) return dbFailure(error, ctx.traceId, 'ballroom');

  // The Diary shows the one decision the member owes.
  await ctx.supabase.from('diary_items').insert({
    user_id: ctx.userId, title: `${b.title} — request holds?`, starts_at: b.startsAt,
    source_room: 'ballroom', source_id: evening.id, state: 'needs_member_action',
  });
  await recordEngagement('ballroom.composed', {traceId: ctx.traceId, roomId: 'ballroom', memberId: ctx.userId, track: b.track ?? null});
  return json({evening}, ctx.traceId, 201);
}
