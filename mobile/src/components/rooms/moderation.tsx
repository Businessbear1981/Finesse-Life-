// Member safety in the app (Apple 1.2 / Play UGC), After Hours: the "•••" menu with Report (reason picker)
// and Block on member posts, VIP posts, profiles, listings, outings and Game Room tables, the blocked
// confirmation, and the one-time "House rules & terms" sheet before a member's first post.
// Mirrors web src/components/moderation. Calls: lib/rooms/moderation.ts.
import {useCallback, useRef, useState, type ReactNode} from 'react';
import {Linking, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ah, ahFonts, radius} from '@/lib/ah';
import {failure} from '@/lib/live';
import {AHPill} from '@/components/ah';
import {
  REPORTED_MESSAGE, REPORT_REASONS, TERMS_URL, acceptTerms, blockMember, blockOwnerOf, readTerms, reportContent,
  type ReportKind, type ReportReason,
} from '@/lib/rooms/moderation';

const NOUN: Record<ReportKind, string> = {post: 'post', vip_post: 'post', profile: 'profile', listing: 'listing', club_table: 'table', outing: 'outing', look: 'look', nova_reply: 'reply'};

/* ───────────────────────── sheet shell ───────────────────────── */
function Sheet({visible, onClose, title, eyebrow, children}: {visible: boolean; onClose: () => void; title: string; eyebrow: string; children: ReactNode}) {
  const insets = useSafeAreaInsets();
  // Bounded so the actions stay reachable on small phones: the sheet scrolls instead of running off-screen.
  const maxH = useWindowDimensions().height - insets.top - insets.bottom - 36;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} accessibilityLabel="Close" style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end'}}>
        <Pressable onPress={() => {}} accessible={false} style={{width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 12, paddingBottom: insets.bottom + 12}}>
          <View accessibilityViewIsModal style={{maxHeight: maxH, borderRadius: 28, backgroundColor: '#161618', borderWidth: 1, borderColor: ah.line2, overflow: 'hidden'}}>
            <ScrollView contentContainerStyle={{padding: 22}} keyboardShouldPersistTaps="handled">
              <View style={{width: 40, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: -6, marginBottom: 16}} />
              <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: ah.mute}}>{eyebrow}</Text>
              <Text accessibilityRole="header" style={{marginTop: 6, fontFamily: ahFonts.serifItalic, fontSize: 30, lineHeight: 33, color: ah.text}}>{title}</Text>
              {children}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const body = {marginTop: 12, fontFamily: ahFonts.sans, fontSize: 14, lineHeight: 21, color: ah.text} as const;
const Row = ({children}: {children: ReactNode}) => <View style={{flexDirection: 'row', gap: 10, marginTop: 18}}>{children}</View>;
const Alert = ({text}: {text: string}) => <Text accessibilityLiveRegion="polite" style={{marginTop: 12, fontFamily: ahFonts.sans, fontSize: 13, color: ah.danger}}>{text}</Text>;

/* ───────────────────────── house rules & terms ───────────────────────── */
let termsAccepted: boolean | null = null;

const RULES = [
  'No harassment, hate, slurs, threats or bullying.',
  'No sexual content or solicitation, and nothing illegal.',
  'No spam, scams, or phone numbers and contact handles in public posts.',
  'Anyone can report a post, look, listing, table or profile from its ••• menu. The house reviews every report within 24 hours, removes what breaks the rules and removes members who break them.',
  'You can block any member at any time — you stop seeing each other everywhere in the house.',
];

function HouseRulesSheet({visible, onAccept, onCancel}: {visible: boolean; onAccept: () => void; onCancel: () => void}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const agree = async () => {
    setBusy(true); setErr('');
    const r = await acceptTerms();
    setBusy(false);
    if (!r.ok) { setErr(failure(r.status, r.body, 'Nothing was saved.')); return; }
    termsAccepted = true;
    onAccept();
  };
  return (
    <Sheet visible={visible} onClose={onCancel} eyebrow="Before your first post" title="House rules & terms.">
      <Text style={body}>Finesse has <Text style={{fontFamily: ahFonts.sansBold}}>zero tolerance for objectionable content or abusive members</Text>. Posting, listing or hosting means you agree:</Text>
      <View style={{gap: 10, marginTop: 14}}>
        {RULES.map((r) => (
          <View key={r} style={{flexDirection: 'row'}}>
            <Text style={{width: 22, fontFamily: ahFonts.sans, fontSize: 14, color: ah.rose}}>—</Text>
            <Text style={{flex: 1, fontFamily: ahFonts.sans, fontSize: 14, lineHeight: 20, color: ah.text}}>{r}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={() => { void Linking.openURL(TERMS_URL).catch(() => setErr('The terms couldn’t be opened on this phone.')); }} accessibilityRole="link" accessibilityLabel="Read the Terms of Use"
        style={{minHeight: 44, justifyContent: 'center', marginTop: 8}}>
        <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 14, color: ah.rose, textDecorationLine: 'underline'}}>These rules are part of the Terms of Use →</Text>
      </Pressable>
      {err ? <Alert text={err} /> : null}
      <Row>
        <AHPill label="Not now" variant="ghost" onPress={onCancel} style={{flex: 1}} block />
        <AHPill label={busy ? 'Saving…' : 'I agree'} onPress={() => void agree()} disabled={busy} style={{flex: 1}} block />
      </Row>
    </Sheet>
  );
}

/**
 * `ensure()` resolves true once the member has accepted the house rules (asking once with the sheet),
 * false if they close it; `require()` asks again after a 403 terms_required. Render `sheet` in the room.
 */
export function useHouseRules() {
  const [open, setOpen] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const ask = useCallback(() => new Promise<boolean>((resolve) => { resolver.current = resolve; setOpen(true); }), []);
  const ensure = useCallback(async () => {
    if (termsAccepted) return true;
    const r = await readTerms();
    if (r.ok && r.body.accepted) { termsAccepted = true; return true; }
    if (!r.ok) return true; // the write itself gives the honest answer (offline, signed out, not open yet)
    return ask();
  }, [ask]);
  const require = useCallback(() => { termsAccepted = false; return ask(); }, [ask]);
  const done = (ok: boolean) => { setOpen(false); resolver.current?.(ok); resolver.current = null; };
  const sheet = <HouseRulesSheet visible={open} onAccept={() => done(true)} onCancel={() => done(false)} />;
  return {ensure, require, sheet};
}

/* ───────────────────────── report / block ───────────────────────── */
type View_ = 'closed' | 'menu' | 'report' | 'reported' | 'block' | 'blocked';

export function ModerationMenu({kind, targetId, memberId, name, own, onBlocked, onReported}: {
  kind: ReportKind; targetId: string;
  /** Author / seller / host id when known; tables block through their id instead. */
  memberId?: string | null;
  name?: string | null;
  /** Your own content — no menu. */
  own?: boolean;
  onBlocked?: () => void;
  onReported?: () => void;
}) {
  const [view, setView] = useState<View_>('closed');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(REPORTED_MESSAGE);
  if (own) return null;
  const who = name?.trim() || 'this member';
  const blockable = kind !== 'nova_reply' && (!!memberId || kind !== 'profile');
  const close = () => {
    const wasBlocked = view === 'blocked';
    setView('closed'); setErr(''); setReason(null); setNote('');
    if (wasBlocked) onBlocked?.();
  };
  const report = async () => {
    if (!reason || busy) return;
    setBusy(true); setErr('');
    const r = await reportContent(kind, targetId, reason, note);
    setBusy(false);
    if (!r.ok) { setErr(failure(r.status, r.body, 'Nothing was reported.')); return; }
    setSent(r.body.message ?? REPORTED_MESSAGE);
    setView('reported');
    onReported?.();
  };
  const block = async () => {
    setBusy(true); setErr('');
    const r = memberId ? await blockMember(memberId) : await blockOwnerOf(kind as Exclude<ReportKind, 'nova_reply'>, targetId);
    setBusy(false);
    if (!r.ok) { setErr(failure(r.status, r.body)); return; }
    setView('blocked');
  };

  const item = (label: string, onPress: () => void, danger?: boolean) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({pressed}) => ({minHeight: 52, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: ah.line, backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent'})}>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: danger ? ah.danger : ah.text}}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <Pressable onPress={() => setView('menu')} accessibilityRole="button" accessibilityLabel={`More options for this ${NOUN[kind]}`} hitSlop={4}
        style={({pressed}) => ({width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, marginRight: -10, backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent'})}>
        <Text style={{fontFamily: ahFonts.sansBold, fontSize: 14, letterSpacing: 1, color: ah.mute}}>•••</Text>
      </Pressable>
      <Sheet visible={view === 'menu'} onClose={close} eyebrow={`This ${NOUN[kind]}`} title="What would you like to do?">
        <View style={{gap: 8, marginTop: 16}}>
          {item(`Report ${NOUN[kind]}`, () => setView('report'))}
          {blockable ? item(`Block ${who}`, () => setView('block'), true) : null}
          {item('Cancel', close)}
        </View>
      </Sheet>
      <Sheet visible={view === 'report' || view === 'reported'} onClose={close} eyebrow="Report" title={view === 'reported' ? 'Report sent.' : `What’s wrong with this ${NOUN[kind]}?`}>
        {view === 'reported' ? (
          <>
            <Text accessibilityLiveRegion="polite" style={[body, {color: ah.ok}]}>{sent}</Text>
            <Row>
              {blockable ? <AHPill label={`Also block ${who}`} variant="ghost" onPress={() => setView('block')} style={{flex: 1}} block /> : null}
              <AHPill label="Done" onPress={close} style={{flex: 1}} block />
            </Row>
          </>
        ) : (
          <>
            <Text style={[body, {color: ah.mute}]}>Your report is private — {who} isn’t told who sent it.</Text>
            <View accessibilityRole="radiogroup" style={{gap: 6, marginTop: 12}}>
              {REPORT_REASONS.map(([k, label]) => {
                const on = reason === k;
                return (
                  <Pressable key={k} onPress={() => setReason(k)} accessibilityRole="radio" accessibilityState={{checked: on}} accessibilityLabel={label}
                    style={{minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1,
                      borderColor: on ? ah.rose : ah.line, backgroundColor: on ? 'rgba(183,110,121,0.14)' : 'transparent'}}>
                    <View style={{width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? ah.rose : ah.mute, alignItems: 'center', justifyContent: 'center'}}>
                      {on ? <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: ah.rose}} /> : null}
                    </View>
                    <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 14, color: ah.text}}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 500))} placeholder="Anything else the house should know (optional)" placeholderTextColor={ah.mute}
              multiline accessibilityLabel="Anything else the house should know (optional)" selectionColor={ah.rose}
              style={{marginTop: 10, minHeight: 72, padding: 12, borderRadius: radius.input, borderWidth: 1, borderColor: ah.line2, color: ah.text, fontFamily: ahFonts.sans, fontSize: 14, textAlignVertical: 'top'}} />
            {err ? <Alert text={err} /> : null}
            <Row>
              <AHPill label="Cancel" variant="ghost" onPress={close} style={{flex: 1}} block />
              <AHPill label={busy ? 'Sending…' : 'Send report'} variant="rose" onPress={() => void report()} disabled={!reason || busy} style={{flex: 1}} block />
            </Row>
          </>
        )}
      </Sheet>
      <Sheet visible={view === 'block' || view === 'blocked'} onClose={close} eyebrow="Block" title={view === 'blocked' ? 'Blocked.' : `Block ${who}?`}>
        <Text accessibilityLiveRegion="polite" style={[body, view === 'blocked' ? {color: ah.ok} : null]}>
          {view === 'blocked'
            ? 'You won’t see each other’s posts, looks, listings, tables or profile anywhere in the house. They aren’t told. If they broke the rules, report them too.'
            : 'You won’t see each other’s posts, looks, listings, tables or profile anywhere in the house. They aren’t told you blocked them.'}
        </Text>
        {err ? <Alert text={err} /> : null}
        <Row>
          {view === 'blocked' ? <AHPill label="Done" onPress={close} style={{flex: 1}} block /> : (
            <>
              <AHPill label="Cancel" variant="ghost" onPress={close} style={{flex: 1}} block />
              <AHPill label={busy ? 'Blocking…' : 'Block'} variant="rose" onPress={() => void block()} disabled={busy} style={{flex: 1}} block />
            </>
          )}
        </Row>
      </Sheet>
    </>
  );
}
