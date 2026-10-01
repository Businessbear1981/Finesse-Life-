/**
 * Shared helpers for room API routes: member auth, trace IDs and honest
 * "room not opened yet" answers when a migration has not been applied.
 */
import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {newTraceId} from '@/lib/keylock-server';

export type MemberCtx = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  traceId: string;
};

export async function requireMember(): Promise<MemberCtx | NextResponse> {
  const traceId = newTraceId();
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'signed_out', traceId}, {status: 401});
  return {supabase, userId: user.id, traceId};
}

type PgError = {code?: string; message?: string} | null | undefined;

/** Missing table / relation → 503 with truthState so the plate falls back to preview. */
export function dbFailure(error: PgError, traceId: string, roomId: string) {
  const missing = error?.code === '42P01' || error?.code === 'PGRST205' || /does not exist|schema cache/i.test(error?.message ?? '');
  if (missing) {
    return NextResponse.json(
      {error: 'room_not_open', truthState: 'specified', message: 'This room opens once its migration is applied.', roomId, traceId},
      {status: 503},
    );
  }
  console.error(`[room:${roomId}]`, error?.message, traceId);
  return NextResponse.json({error: 'room_error', message: 'Nothing was changed.', roomId, traceId}, {status: 500});
}

export const json = (body: unknown, traceId: string, status = 200) =>
  NextResponse.json(typeof body === 'object' && body !== null ? {...body, traceId} : {data: body, traceId}, {
    status,
    headers: {'Cache-Control': 'no-store'},
  });
