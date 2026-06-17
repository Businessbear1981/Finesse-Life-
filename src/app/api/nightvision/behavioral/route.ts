import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {buildBehavioralProfile} from '@/lib/intelligence/behavioral';
import {getSignalCounts} from '@/lib/intelligence/bus';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const [profile, counts] = await Promise.all([
      buildBehavioralProfile(user.id),
      getSignalCounts(user.id, 90),
    ]);

    const signalCount = Object.values(counts).reduce((a, b) => a + b, 0);

    return NextResponse.json({profile, signal_count: signalCount});
  } catch (err) {
    console.error('[GET /api/nightvision/behavioral]', err);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
