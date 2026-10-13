// One-time AI disclosure + consent (Apple 5.1.2(i): name the third party and get permission before personal data
// goes to an AI service; Google Play AI-generated content policy). `ai_processing` before the first message to
// Nova, `photo_ai` before the first photo Nova reads. The acceptance is stored server-side (member_consents)
// and cached on the phone (lib/consents.ts), so the sheet shows once per member.
//
// <AIConsentHost/> is mounted once (app/_layout.tsx). It shows the sheet for every `ensure()` and for every AI call
// the server refuses with 403 consent_required (lib/consents.ts aiApi/aiUpload), so rooms don't each re-implement it.
import {useCallback, useEffect, useRef, useState} from 'react';
import {Linking, Modal, Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AI_PROCESSOR, PRIVACY_URL, askForConsent, consentHostMounted, hasConsent, recordConsent, setConsentAsker, type ConsentKind} from '@/lib/consents';
import {AHPill} from '@/components/ah';
import {ah, ahFonts} from './RoomKit';

type AIKind = Extract<ConsentKind, 'ai_processing' | 'photo_ai'>;

const COPY: Record<AIKind, {title: string; lines: string[]; agree: string}> = {
  ai_processing: {
    title: 'Nova is an AI.',
    lines: [
      `Nova is an AI concierge powered by ${AI_PROCESSOR}. It is not a person.`,
      'What you type — and the details from your rooms Nova needs to answer — is sent to Anthropic, through our AI gateway (Vercel), to write each reply.',
      'Don’t share sensitive information: passwords, card or bank numbers, health details.',
      'Replies can be wrong. Nothing is booked or bought unless you confirm it and a partner confirms it.',
    ],
    agree: 'I understand — continue',
  },
  photo_ai: {
    title: 'Nova will look at this photo.',
    lines: [
      `To read a photo, Finesse sends it to ${AI_PROCESSOR}, through our AI gateway, which describes it for Nova. Only the photo you choose is sent, and only when you ask.`,
      'Avoid photos that show other people’s faces, documents or anything private.',
      'The read can be wrong — you review it before anything is saved.',
    ],
    agree: 'Agree and read the photo',
  },
};

/**
 * `ensure(kind, run)` runs `run` once the member has agreed (asking first if needed). With <AIConsentHost/> mounted
 * the host shows the sheet; `sheet` is then empty (rendering it anyway is harmless).
 */
export function useAIConsent() {
  const [open, setOpen] = useState<AIKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const next = useRef<(() => void) | null>(null);
  const known = useRef<Partial<Record<AIKind, boolean>>>({});

  const ensureOne = useCallback(async (kind: AIKind, run: () => void) => {
    if (known.current[kind] || (await hasConsent(kind))) { known.current[kind] = true; run(); return; }
    if (consentHostMounted()) {
      if (await askForConsent(kind)) { known.current[kind] = true; run(); }
      return;
    }
    next.current = run; setNote(null); setOpen(kind);
  }, []);
  // A photo read is still an AI call: the server wants ai_processing as well as photo_ai.
  const ensure = useCallback(async (kind: AIKind, run: () => void) => {
    if (kind === 'photo_ai') return ensureOne('ai_processing', () => void ensureOne('photo_ai', run));
    return ensureOne(kind, run);
  }, [ensureOne]);

  const agree = async () => {
    if (!open) return;
    setBusy(true);
    const r = await recordConsent(open);
    setBusy(false);
    if (!r.ok) { setNote('Sign in first — your agreement is kept with your account.'); return; }
    known.current[open] = true;
    setOpen(null);
    const run = next.current; next.current = null;
    run?.();
  };
  const decline = () => { next.current = null; setOpen(null); };

  const sheet = <ConsentSheet kind={open} busy={busy} note={note} onAgree={() => void agree()} onDecline={decline} />;
  return {ensure, sheet};
}

/** Mount once at the root. Answers every consent ask (ensure() and server refusals) with one sheet. */
export function AIConsentHost() {
  const [open, setOpen] = useState<AIKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const pending = useRef<{kind: AIKind; resolve: (ok: boolean) => void} | null>(null);

  useEffect(() => setConsentAsker((kind) => new Promise<boolean>((resolve) => {
    pending.current?.resolve(false); // a newer ask replaces an unanswered one
    pending.current = {kind, resolve};
    setNote(null); setOpen(kind);
  })), []);

  const settle = (ok: boolean) => {
    const p = pending.current; pending.current = null;
    setOpen(null);
    p?.resolve(ok);
  };
  const agree = async () => {
    if (!open) return;
    setBusy(true);
    const r = await recordConsent(open);
    setBusy(false);
    if (!r.ok) { setNote('Sign in first — your agreement is kept with your account.'); return; }
    // The house checks consent on every AI call, so it has to have heard the yes.
    if (!r.synced) { setNote('Your agreement couldn’t reach the house just now. Nothing was sent — try again.'); return; }
    settle(true);
  };

  return <ConsentSheet kind={open} busy={busy} note={note} onAgree={() => void agree()} onDecline={() => settle(false)} />;
}

function ConsentSheet({kind, busy, note, onAgree, onDecline}: {kind: AIKind | null; busy: boolean; note: string | null; onAgree: () => void; onDecline: () => void}) {
  const insets = useSafeAreaInsets();
  const c = kind ? COPY[kind] : null;
  return (
    <Modal visible={!!kind} transparent animationType="slide" onRequestClose={onDecline} statusBarTranslucent>
      <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end'}}>
        <View style={{width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 12, paddingBottom: insets.bottom + 12}}>
          {c ? (
            <View accessibilityViewIsModal style={{borderRadius: 28, padding: 22, gap: 12, backgroundColor: '#161618', borderWidth: 1, borderColor: ah.line2}}>
              <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: ah.rose}}>Before you start</Text>
              <Text accessibilityRole="header" style={{fontFamily: ahFonts.serifItalic, fontSize: 32, lineHeight: 35, color: ah.text}}>{c.title}</Text>
              {c.lines.map((l) => (
                <View key={l} style={{flexDirection: 'row', gap: 10}}>
                  <Text style={{color: ah.rose, fontSize: 15, lineHeight: 21}}>·</Text>
                  <Text style={{flex: 1, fontFamily: ahFonts.sans, fontSize: 14.5, lineHeight: 21, color: ah.text}}>{l}</Text>
                </View>
              ))}
              <Pressable onPress={() => void Linking.openURL(`${PRIVACY_URL}#ai`).catch(() => {})} accessibilityRole="link" style={{minHeight: 44, justifyContent: 'center'}}>
                <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 13.5, color: ah.rose, textDecorationLine: 'underline'}}>How your data is used (Privacy policy)</Text>
              </Pressable>
              {note ? <Text accessibilityLiveRegion="polite" style={{fontFamily: ahFonts.sans, fontSize: 13.5, color: ah.danger}}>{note}</Text> : null}
              <AHPill block label={busy ? 'One moment…' : c.agree} disabled={busy} onPress={onAgree} />
              <AHPill block variant="ghost" label="Not now" onPress={onDecline} accessibilityLabel="Not now — nothing is sent" />
              <Text style={{fontFamily: ahFonts.sans, fontSize: 12, lineHeight: 17, color: ah.mute, textAlign: 'center'}}>Not now sends nothing. You can change your mind any time from Support.</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
