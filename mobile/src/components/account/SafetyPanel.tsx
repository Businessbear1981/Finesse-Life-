// "AI & safety" under This Is You → Your key (Apple 1.2 + 5.1.2(i), Google Play UGC / AI-generated content):
//   · who processes Nova's prompts and photos (Anthropic, through Vercel AI Gateway — src/lib/ai.ts on the server)
//   · each consent the member gave, with Withdraw (DELETE /api/account/consents) — the device copy is cleared too
//   · the member's own reports and where each stands (GET /api/moderation/reports)
//   · members they blocked, with Unblock (GET /api/moderation/blocks, DELETE /api/moderation/block)
// Twin of the web panel on /account (src/components/account/ai-safety-panel.tsx).
import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {Linking, Pressable, Text, View} from 'react-native';
import {ah, ahFonts} from '@/lib/ah';
import {failure} from '@/lib/live';
import {AHCard, AHEyebrow} from '@/components/ah';
import {AI_PROCESSOR, VIDEO_PROCESSOR, PRIVACY_URL, listConsents, withdrawConsent, type ConsentKind, type ConsentRow} from '@/lib/consents';
import {REPORT_NOUN, REPORT_REASONS, readBlocks, readMyReports, unblockMember, type MyReport} from '@/lib/rooms/moderation';

const CONSENT_COPY: Record<ConsentKind, {title: string; body: string; after: string}> = {
  ai_processing: {
    title: 'Nova may send what I type to the AI provider',
    body: `What you type to Nova goes to ${AI_PROCESSOR} to write the reply.`,
    after: 'Withdrawn. Nova won’t send anything until you agree again — she’ll ask before your next message.',
  },
  photo_ai: {
    title: 'Nova may send photos I choose to the AI provider',
    body: `Photos you ask Nova or the Camera to read go to ${AI_PROCESSOR}.`,
    after: 'Withdrawn. No photo goes to the AI provider until you agree again.',
  },
  video_ai: {
    title: 'Nova may send a memory to the video provider',
    body: `The title and description of a memory you turn into a Scrapbook film go to ${VIDEO_PROCESSOR}.`,
    after: 'Withdrawn. No memory goes to the video provider until you agree again.',
  },
  // A confirmation, not a permission to process anything — shown, not withdrawable (delete the account instead).
  age_18: {title: 'I confirmed I am 18 or older', body: 'Recorded when you first signed in.', after: ''},
};
const REASON_LABEL = Object.fromEntries(REPORT_REASONS) as Record<string, string>;

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
};

type Load<T> = {state: 'loading'} | {state: 'error'; text: string} | {state: 'ok'; data: T};
type BlockRow = {member_id: string; name: string; blocked_at: string};

const body = {fontFamily: ahFonts.sans, fontSize: 14, lineHeight: 20, color: ah.text} as const;
const small = {fontFamily: ahFonts.sans, fontSize: 12, lineHeight: 17, color: ah.faint} as const;

function Part({title, children}: {title: string; children: ReactNode}) {
  return (
    <View style={{gap: 8, borderTopWidth: 1, borderColor: ah.line, paddingTop: 12}}>
      <Text accessibilityRole="header" style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: ah.mute}}>{title}</Text>
      {children}
    </View>
  );
}

function SmallBtn({label, a11y, onPress, disabled, danger}: {label: string; a11y: string; onPress: () => void; disabled?: boolean; danger?: boolean}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{disabled: !!disabled}}
      style={({pressed}) => ({minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
        borderColor: danger ? 'rgba(255,138,160,0.4)' : ah.line2, opacity: disabled ? 0.4 : 1, backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent'})}>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 13, color: danger ? ah.danger : ah.text}}>{label}</Text>
    </Pressable>
  );
}

function Loading<T>({load, empty, children}: {load: Load<T>; empty?: string | false; children: (data: T) => ReactNode}) {
  if (load.state === 'loading') return <Text style={small}>Loading…</Text>;
  if (load.state === 'error') return <Text accessibilityLiveRegion="polite" style={[small, {color: ah.danger}]}>{load.text}</Text>;
  if (empty) return <Text style={small}>{empty}</Text>;
  return <>{children(load.data)}</>;
}

export function SafetyPanel() {
  const [consents, setConsents] = useState<Load<ConsentRow[]>>({state: 'loading'});
  const [reports, setReports] = useState<Load<MyReport[]>>({state: 'loading'});
  const [blocks, setBlocks] = useState<Load<BlockRow[]>>({state: 'loading'});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ok: boolean; text: string} | null>(null);

  const loadConsents = useCallback(async () => {
    const r = await listConsents();
    setConsents(r.ok ? {state: 'ok', data: r.consents} : {state: 'error', text: failure(r.status, {message: r.message}, '')});
  }, []);
  const loadReports = useCallback(async () => {
    const r = await readMyReports();
    setReports(r.ok ? {state: 'ok', data: r.body.reports ?? []} : {state: 'error', text: failure(r.status, r.body, '')});
  }, []);
  const loadBlocks = useCallback(async () => {
    const r = await readBlocks();
    setBlocks(r.ok ? {state: 'ok', data: r.body.blocks ?? []} : {state: 'error', text: failure(r.status, r.body, '')});
  }, []);
  useEffect(() => { void loadConsents(); void loadReports(); void loadBlocks(); }, [loadConsents, loadReports, loadBlocks]);

  const withdraw = async (kind: ConsentKind) => {
    setBusy(`c:${kind}`); setNote(null);
    const r = await withdrawConsent(kind);
    setBusy(null);
    if (!r.ok) { setNote({ok: false, text: failure(r.status, {message: r.message})}); return; }
    setNote({ok: true, text: CONSENT_COPY[kind].after});
    await loadConsents();
  };
  const unblock = async (b: BlockRow) => {
    setBusy(`b:${b.member_id}`); setNote(null);
    const r = await unblockMember(b.member_id);
    setBusy(null);
    if (!r.ok) { setNote({ok: false, text: failure(r.status, r.body)}); return; }
    setNote({ok: true, text: `${b.name} is unblocked. You’ll see each other’s posts, looks, listings and profile again.`});
    await loadBlocks();
  };

  return (
    <AHCard style={{marginTop: 6, gap: 12}} pad={16}>
      <AHEyebrow>{'AI & safety'}</AHEyebrow>
      <Text style={body}>
        Nova is an AI concierge powered by <Text style={{fontFamily: ahFonts.sansBold}}>Anthropic’s Claude</Text>. What you type — and any photo you ask
        Nova or the Camera to read — is sent to Anthropic through our AI gateway (Vercel AI Gateway) to write the reply. Nothing goes until you agree,
        and you can withdraw below. Replies can be wrong; nothing is booked unless a partner confirms it.
      </Text>
      <Pressable onPress={() => { void Linking.openURL(`${PRIVACY_URL}#ai`).catch(() => setNote({ok: false, text: 'The privacy policy couldn’t be opened on this phone.'})); }}
        accessibilityRole="link" accessibilityLabel="How AI uses your data — privacy policy" style={{minHeight: 44, justifyContent: 'center'}}>
        <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 14, color: ah.rose, textDecorationLine: 'underline'}}>How AI uses your data →</Text>
      </Pressable>
      {note ? <Text accessibilityLiveRegion="polite" style={[small, {fontSize: 13, color: note.ok ? ah.ok : ah.danger}]}>{note.text}</Text> : null}

      <Part title="Your consents">
        <Loading load={consents}>
          {(rows) => (['ai_processing', 'photo_ai', 'video_ai', 'age_18'] as ConsentKind[]).map((kind) => {
            const row = rows.find((c) => c.kind === kind);
            return (
              <View key={kind} style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4}}>
                <View style={{flex: 1, gap: 2}}>
                  <Text style={body}>{CONSENT_COPY[kind].title}</Text>
                  <Text style={small}>
                    {row ? `${kind === 'age_18' ? 'Confirmed' : 'Agreed'} ${when(row.accepted_at)} · ${CONSENT_COPY[kind].body}`
                      : kind === 'age_18' ? 'Not recorded yet.' : 'Not given — nothing is sent for this.'}
                  </Text>
                </View>
                {row && kind !== 'age_18' ? (
                  <SmallBtn label={busy === `c:${kind}` ? 'Withdrawing…' : 'Withdraw'} a11y={`Withdraw: ${CONSENT_COPY[kind].title}`} danger
                    disabled={busy !== null} onPress={() => void withdraw(kind)} />
                ) : null}
              </View>
            );
          })}
        </Loading>
      </Part>

      <Part title="My reports">
        <Loading load={reports} empty={reports.state === 'ok' && reports.data.length === 0 && 'You haven’t reported anything. Use the ••• menu on any post, look, listing, table or profile.'}>
          {(rows) => rows.map((r) => (
            <View key={r.id} style={{gap: 2, paddingVertical: 2}}>
              <Text style={body}>{REPORT_NOUN[r.target_kind] ?? 'Item'} · {REASON_LABEL[r.reason] ?? r.reason}</Text>
              <Text style={small}>{when(r.created_at)} · {r.status_label}</Text>
            </View>
          ))}
        </Loading>
        <Text style={small}>The house reviews every report within 24 hours. The member you reported is never told who reported them.</Text>
      </Part>

      <Part title="Blocked members">
        <Loading load={blocks} empty={blocks.state === 'ok' && blocks.data.length === 0 && 'You haven’t blocked anyone.'}>
          {(rows) => rows.map((b) => (
            <View key={b.member_id} style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2}}>
              <View style={{flex: 1, gap: 2}}>
                <Text style={body} numberOfLines={1}>{b.name}</Text>
                <Text style={small}>Blocked {when(b.blocked_at)}</Text>
              </View>
              <SmallBtn label={busy === `b:${b.member_id}` ? 'Unblocking…' : 'Unblock'} a11y={`Unblock ${b.name}`} disabled={busy !== null} onPress={() => void unblock(b)} />
            </View>
          ))}
        </Loading>
      </Part>
    </AHCard>
  );
}
