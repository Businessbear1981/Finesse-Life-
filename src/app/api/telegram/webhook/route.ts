import {NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/service';
import {verifyLinkToken, webhookAuthorised} from '@/lib/telegram-link';
import {resolvePersona, runNova} from '@/lib/nova';
import {takeAiRateLimit} from '@/lib/ai-rate-limit';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_BASE = `https://api.telegram.org/bot${TOKEN}`;

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: {id: number};
    from?: {username?: string; id: number};
    text?: string;
  };
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`${TG_BASE}/sendMessage`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({chat_id: chatId, text, parse_mode: 'Markdown'}),
  });
}

// Never claim an action was taken when Nova did not answer.
const NOVA_UNAVAILABLE = "Nova couldn't be reached just now. Nothing has been arranged — please try again shortly.";

// Calls Nova in-process (runNova) — no HTTP hop to the now members-only /api/nova. The legacy
// `system` text only selects the server-owned 'telegram' persona; it is never sent as instructions.
// Pass the linked member's profile id as `userId` for usage attribution + the per-member limit.
async function callNova(prompt: string, system?: string, userId?: string | null): Promise<string> {
  try {
    const {persona} = resolvePersona({persona: 'telegram', system});
    if (userId) {
      const gate = await takeAiRateLimit(userId, 'nova');
      if (!gate.allowed) return `You've reached Nova's limit for now. Try again in about ${Math.ceil(gate.retryAfterS / 60)} min.`;
    }
    const result = await runNova({userId: userId ?? null, prompt: prompt.slice(0, 4000), persona, feature: 'nova.telegram'});
    return result.ok ? result.text : NOVA_UNAVAILABLE;
  } catch {
    return NOVA_UNAVAILABLE;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  // Only Telegram knows the secret_token registered with setWebhook. Without it anyone could
  // post fake updates and drive the service-role lookups below.
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ok: false, error: 'telegram not configured'}, {status: 503});
  }
  if (!webhookAuthorised(req.headers.get('x-telegram-bot-api-secret-token'))) {
    return NextResponse.json({ok: false}, {status: 401});
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ok: true});
  }

  const message = update.message;
  if (!message?.text) return NextResponse.json({ok: true});

  const chatId = message.chat.id;
  const text = message.text.trim();
  const telegramUserId = message.from?.id;

  // Look up profile by telegram_chat_id
  const supabase = createServiceClient();
  const {data: profile} = await supabase
    .from('profiles')
    .select('id, username, telegram_handle, telegram_chat_id')
    .eq('telegram_chat_id', String(chatId))
    .maybeSingle();

  // Handle /link <signed token> issued by /api/telegram/link (never a bare user id)
  if (text.startsWith('/link ')) {
    const userId = verifyLinkToken(TOKEN, text.slice(6));
    if (!userId) {
      await sendMessage(chatId, "That link code is invalid or has expired. Get a fresh one from *finesselife.vip/vip*.");
      return NextResponse.json({ok: true});
    }
    if (telegramUserId) {
      const {error} = await supabase
        .from('profiles')
        .update({
          telegram_chat_id: String(chatId),
          telegram_handle: message.from?.username ?? null,
        })
        .eq('id', userId);

      if (error) {
        await sendMessage(chatId, "Linking failed. Get a fresh link code from *finesselife.vip/vip* and try again.");
      } else {
        await sendMessage(
          chatId,
          `*Linked.* Welcome to your private channel. Type /start to see what I can do.`,
        );
      }
    } else {
      await sendMessage(chatId, "Usage: `/link <code from finesselife.vip/vip>`");
    }
    return NextResponse.json({ok: true});
  }

  // All other commands require a linked account
  if (!profile) {
    if (text === '/start') {
      await sendMessage(
        chatId,
        `*Welcome to Finesse VIP.*\n\nTo use this bot, link your account:\n\n1. Open *finesselife.vip/vip*\n2. Tap *Connect Telegram*\n3. Come back and send the /link code it shows you`,
      );
    } else {
      await sendMessage(
        chatId,
        `Link your Telegram in the Finesse app first: *finesselife.vip/vip*`,
      );
    }
    return NextResponse.json({ok: true});
  }

  // Routed commands for linked users
  if (text === '/start') {
    await sendMessage(
      chatId,
      `*Finesse VIP — your private channel.*\n\nCommands:\n/nova {message} — ask Nova anything\n/vault — your Vault balance\n/registry — your registry status\n/vip — your VIP status\n\nOr just message me — I route everything to Nova.`,
    );
    return NextResponse.json({ok: true});
  }

  if (text === '/vip') {
    const {data: vipData} = await supabase
      .from('profiles')
      .select('is_vip, vip_expires_at, display_name')
      .eq('id', profile.id)
      .single();

    const name = vipData?.display_name ?? profile.username ?? 'Member';
    const active = vipData?.is_vip ? 'Active' : 'Inactive';
    const expires = vipData?.vip_expires_at
      ? `Expires: ${new Date(vipData.vip_expires_at).toLocaleDateString()}`
      : '';

    await sendMessage(
      chatId,
      `*VIP Status for ${name}*\nStatus: ${active}\n${expires}\n\nWelcome to the inner room.`,
    );
    return NextResponse.json({ok: true});
  }

  if (text === '/vault') {
    const {data: vault} = await supabase
      .from('vault_accounts')
      .select('balance_cents')
      .eq('user_id', profile.id)
      .maybeSingle();

    const balance = vault?.balance_cents != null ? `$${(Number(vault.balance_cents) / 100).toFixed(2)}` : '$0.00';
    await sendMessage(chatId, `*Your Vault Balance*\n${balance}`);
    return NextResponse.json({ok: true});
  }

  if (text === '/registry') {
    const {count} = await supabase
      .from('registry_items')
      .select('id', {count: 'exact', head: true})
      .eq('user_id', profile.id)
      .eq('status', 'active');

    const n = count ?? 0;
    await sendMessage(chatId, `*Your Registry*\n${n} active item${n === 1 ? '' : 's'}.\n\nView at: finesselife.vip/registry`);
    return NextResponse.json({ok: true});
  }

  if (text.startsWith('/nova ')) {
    const userPrompt = text.slice(6).trim();
    const reply = await callNova(userPrompt, 'You are Nova, a luxury AI lifestyle concierge for Finesse. Be warm, direct, and elevated.', profile.id);
    await sendMessage(chatId, reply);
    return NextResponse.json({ok: true});
  }

  // Default: route everything else to Nova
  const reply = await callNova(
    text,
    'You are Nova, a luxury AI lifestyle concierge for Finesse. The user is a VIP member messaging via Telegram. Be warm, direct, and elevated. Keep responses concise for mobile.',
    profile.id,
  );
  await sendMessage(chatId, reply);
  return NextResponse.json({ok: true});
}
