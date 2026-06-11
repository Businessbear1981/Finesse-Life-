import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';

const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'FinesseVIPBot';

export async function POST(req: Request): Promise<NextResponse> {
  // Auth check
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  let telegram_username: string | undefined;
  try {
    const body = (await req.json()) as {telegram_username?: string};
    telegram_username = body.telegram_username;
  } catch {
    // body optional
  }

  // Store the handle if provided
  const service = createServiceClient();
  if (telegram_username) {
    await service
      .from('profiles')
      .update({telegram_handle: telegram_username})
      .eq('id', user.id);
  }

  return NextResponse.json({
    ok: true,
    instructions: [
      `1. Open Telegram and search @${BOT_USERNAME}`,
      `2. Start a chat and send: /link ${user.id}`,
      `3. You'll receive a confirmation message when linked.`,
    ].join('\n'),
    bot_username: BOT_USERNAME,
    user_id: user.id,
  });
}
