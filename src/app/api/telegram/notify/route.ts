import {NextResponse} from 'next/server';
import {isAdmin} from '@/lib/admin';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_BASE = `https://api.telegram.org/bot${TOKEN}`;

type NotifyType = 'registry_funded' | 'scale_goal_reached' | 'vip_message' | 'nova_briefing';

interface NotifyBody {
  user_id: string;
  type: NotifyType;
  data?: Record<string, string>;
}

async function sendTelegram(chatId: string, text: string): Promise<void> {
  await fetch(`${TG_BASE}/sendMessage`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({chat_id: chatId, text, parse_mode: 'Markdown'}),
  });
}

function buildMessage(type: NotifyType, data?: Record<string, string>): string | null {
  switch (type) {
    case 'registry_funded':
      return `*Registry Fully Funded!*\n\nYour item "${data?.title ?? 'Registry Item'}" is fully funded!\n\nGenerate your partner token at: finesselife.vip/registry`;

    case 'scale_goal_reached':
      return `*Scale Goal Reached!*\n\nScale goal for "${data?.item ?? 'your item'}" is complete.\nYour partner token is ready.\n\nfinesselife.vip/scale`;

    case 'vip_message':
      return data?.message ?? null;

    case 'nova_briefing':
      return `*Nova's Daily Briefing*\n\n${data?.content ?? 'Your lifestyle intel is ready.'}`;

    default:
      return null;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  // Members may notify only themselves; staff (profiles.role admin/owner) may notify anyone.
  // Free-text `vip_message` is staff-only — it used to let any member message any member.
  const session = await createClient();
  const {
    data: {user},
  } = await session.auth.getUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const staff = await isAdmin(session, user);

  let body: NotifyBody;
  try {
    body = (await req.json()) as NotifyBody;
  } catch {
    return NextResponse.json({error: 'Invalid JSON'}, {status: 400});
  }

  const {user_id, type, data} = body;
  if (!user_id || !type) {
    return NextResponse.json({error: 'user_id and type required'}, {status: 400});
  }
  if (!staff && (user_id !== user.id || type === 'vip_message')) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }
  if (!TOKEN) {
    return NextResponse.json({ok: false, sent: false, reason: 'telegram_not_configured'}, {status: 503});
  }

  // Look up telegram_chat_id
  const supabase = createServiceClient();
  const {data: profile} = await supabase
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', user_id)
    .maybeSingle();

  const chatId = profile?.telegram_chat_id;
  if (!chatId) {
    // User hasn't linked Telegram — skip silently
    return NextResponse.json({ok: true, sent: false, reason: 'not_linked'});
  }

  const text = buildMessage(type, data);
  if (!text) {
    return NextResponse.json({error: 'Unknown notification type'}, {status: 400});
  }

  await sendTelegram(chatId, text);
  return NextResponse.json({ok: true, sent: true});
}
