import {NextRequest} from 'next/server';
import {z} from 'zod';
import {parseBody} from '@/lib/api/validate';
import {json, requireMember} from '@/lib/api/room';

const body = z.object({seconds: z.number().int().min(10).max(600)});

// POST /api/gym/rest-timer — server timestamp for a rest period (timer runs on device
// local time; the server only stamps start/end so a resumed screen stays accurate).
export async function POST(req: NextRequest) {
  const ctx = await requireMember();
  if (!('userId' in ctx)) return ctx;
  const parsed = await parseBody(req, body);
  if (parsed.error) return parsed.error;
  const startedAt = new Date();
  return json({startedAt: startedAt.toISOString(), endsAt: new Date(startedAt.getTime() + parsed.data.seconds * 1000).toISOString()}, ctx.traceId);
}
