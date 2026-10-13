// Nova — the concierge's private line (After Hours; mirrors web concierge-view.tsx). One request at a time
// goes to /api/nova as {prompt, persona:'concierge'} (the server owns Nova's instructions); only a 2xx with
// text is shown as Nova's reply, anything else is shown as not delivered. When Nova drafts a request
// (draft_request tool) it appears as a card to Confirm / Not now — nothing runs until the member confirms.
// Before the first message the member sees the AI disclosure and agrees (AIConsent.tsx → member_consents
// 'ai_processing'); every reply carries "Report this response" (NovaReport.tsx).
import {useId, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {CONSENT_DECLINED_TEXT, aiApi} from '@/lib/consents';
import {draftsFromToolCalls, type NovaRequest} from '@/lib/rooms/nova-requests';
import {AHEyebrow, AHLiveDot, AHTitle} from '@/components/ah';
import {radius} from '@/lib/ah';
import {ah, ahFonts, Pick, t} from './RoomKit';
import {RequestCard, RequestsPanel} from './RequestCard';
import {useAIConsent} from './AIConsent';
import {NovaReport} from './NovaReport';

type Docket = {id: number; ask: string; reply: string; at: string; failed: boolean; drafts: NovaRequest[]};

const QUICK: Array<[string, string]> = [
  ['A table for four tonight', 'A table for four tonight'],
  ['Pull a look', 'Pull a look for tonight — help me find something to wear'],
  ['Plan the route', 'Plan the route for my night'],
  ['A black car', 'I need a black car'],
  ['Plan a trip', 'Help me plan a trip'],
];

/** Nova's monogram in a chrome-to-rose ring. */
function NovaMark({size}: {size: number}) {
  const id = `nv${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{width: size, height: size}} aria-hidden>
      <Svg width={size} height={size} style={{position: 'absolute'}}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ah.rose2} /><Stop offset="0.5" stopColor={ah.blush} /><Stop offset="1" stopColor="#8E9298" />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={size / 2} fill={`url(#${id})`} />
      </Svg>
      <View style={{position: 'absolute', top: 1.5, left: 1.5, right: 1.5, bottom: 1.5, borderRadius: size, backgroundColor: '#140E10', alignItems: 'center', justifyContent: 'center'}}>
        <Text style={{fontFamily: ahFonts.serifItalic, fontSize: size * 0.5, lineHeight: size * 0.62, color: ah.blush}}>N</Text>
      </View>
    </View>
  );
}

function Bubble({text}: {text: string}) {
  return (
    <View style={{alignSelf: 'flex-end', maxWidth: '84%', paddingHorizontal: 18, paddingVertical: 13, borderRadius: 22, borderBottomRightRadius: 8, backgroundColor: 'rgba(183,110,121,0.16)', borderWidth: 1, borderColor: 'rgba(232,180,160,0.22)'}}>
      <Text style={t.body}>{text}</Text>
    </View>
  );
}

export function Concierge() {
  const [ask, setAsk] = useState('');
  const [busy, setBusy] = useState(false);
  const [dockets, setDockets] = useState<Docket[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const consent = useAIConsent();
  const send = async (override?: string) => {
    const prompt = (override ?? ask).trim();
    if (!prompt || busy) return;
    setBusy(true); setPending(prompt);
    const r = await aiApi<{text?: string; error?: string; tool_calls?: unknown}>('/api/nova', {method: 'POST', json: {prompt, persona: 'concierge'}});
    const drafts = draftsFromToolCalls(r.body.tool_calls);
    // Only a 2xx with text is Nova's reply. A 502/503 carries {error, text} where text explains Nova is
    // unreachable — shown as an error, never as if she had answered.
    const failed = !(r.ok && r.body.text);
    const reply = !failed ? r.body.text! : r.status === 0 ? 'The house line is offline. Nothing was sent; ask again when we are connected.'
      : r.status === 401 ? 'Sign in to ring for Nova. Nothing was sent.'
      : r.status === 403 && r.body.error === 'consent_required' ? CONSENT_DECLINED_TEXT
      : drafts.length > 0 ? 'Nova’s reply didn’t come through, but her draft is below. Nothing runs until you confirm it.'
      : r.body.text ?? 'Nova could not be reached. Nothing was arranged; please try again in a moment.';
    setDockets((d) => [{id: Date.now(), ask: prompt, reply, failed, drafts, at: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}, ...d]);
    if (override === undefined) setAsk('');
    setPending(null); setBusy(false);
  };
  // Nothing leaves the phone until the member has agreed to AI processing (asked once).
  const tapSend = (override?: string) => {
    if (busy || !(override ?? ask).trim()) return;
    void Haptics.selectionAsync().catch(() => {});
    void consent.ensure('ai_processing', () => void send(override));
  };
  const thread = [...dockets].reverse(); // stored newest-first; read top to bottom like a chat
  const first = dockets.length === 0 && !pending;
  const canSend = !busy && !!ask.trim();

  return (
    <View style={{gap: 26}}>
      {/* Who you are talking to */}
      <View style={{alignItems: 'center', paddingTop: 8}}>
        <NovaMark size={first ? 88 : 64} />
        <AHEyebrow style={{marginTop: 18}}>Your private line</AHEyebrow>
        <AHTitle size={first ? 60 : 42} style={{marginTop: 6, textAlign: 'center'}}>Nova</AHTitle>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10}} accessibilityLiveRegion="polite">
          {busy ? <AHLiveDot color={ah.rose} /> : <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: ah.rose2}} />}
          <Text style={t.eyebrow}>{busy ? 'Writing' : 'Concierge'}</Text>
        </View>
        {first ? <Text style={[t.body, {color: ah.mute, textAlign: 'center', marginTop: 16, maxWidth: 320}]}>Tables, cars, the route, the look. Text it the way you would at 1am.</Text> : null}
        <Pick label={showRequests ? 'Hide your requests' : 'Your requests'} on={showRequests} onPress={() => setShowRequests((v) => !v)} style={{marginTop: 16}}
          a11y={showRequests ? 'Hide your requests' : 'Show your requests'} />
      </View>

      {showRequests ? (
        <View style={{gap: 10}}>
          <AHEyebrow>Your requests</AHEyebrow>
          <RequestsPanel />
        </View>
      ) : null}

      {/* The thread */}
      <View style={{gap: 26}} accessibilityLabel="Conversation with Nova">
        <View style={{gap: 8}}>
          <AHEyebrow>Nova</AHEyebrow>
          <Text style={t.voice}>Good evening. I’m Nova, your concierge. What can I arrange for you tonight?</Text>
        </View>
        {thread.map((d) => (
          <Animated.View key={d.id} entering={FadeInDown.duration(420)} style={{gap: 22}}>
            <Bubble text={d.ask} />
            <View style={{gap: 8}} accessibilityLiveRegion={d.failed ? 'polite' : undefined}>
              <AHEyebrow color={d.failed ? ah.danger : ah.mute}>{d.failed ? `Not delivered · ${d.at}` : `Nova · ${d.at}`}</AHEyebrow>
              {d.failed ? (
                <View style={{padding: 16, borderRadius: radius.input, borderWidth: 1, borderColor: 'rgba(255,138,160,0.35)', backgroundColor: 'rgba(255,138,160,0.06)'}}>
                  <Text style={[t.body, {color: ah.danger}]}>{d.reply}</Text>
                </View>
              ) : <Text selectable style={t.voice}>{d.reply}</Text>}
              {d.drafts.map((r) => <RequestCard key={r.id} request={r} />)}
              {!d.failed ? <NovaReport targetId={`concierge:${d.id}`} text={d.reply} /> : null}
            </View>
          </Animated.View>
        ))}
        {pending ? (
          <Animated.View entering={FadeIn.duration(300)} style={{gap: 22}}>
            <Bubble text={pending} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}} accessibilityLabel="Nova is writing">
              <AHEyebrow>Nova</AHEyebrow>
              <ActivityIndicator size="small" color={ah.rose} />
            </View>
          </Animated.View>
        ) : null}
      </View>

      {/* Composer: quick asks + the line */}
      <View style={{gap: 12}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingRight: 8}} accessibilityLabel="Quick asks">
          {QUICK.map(([label, prompt]) => (
            <Pressable key={label} onPress={() => tapSend(prompt)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Ask Nova: ${label}`}
              style={({pressed}) => ({minHeight: 44, paddingHorizontal: 18, borderRadius: radius.pill, justifyContent: 'center', borderWidth: 1, borderColor: ah.line2, backgroundColor: 'rgba(22,22,24,0.78)', opacity: busy ? 0.45 : pressed ? 0.75 : 1})}>
              <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 18, color: ah.text}}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingLeft: 8, borderRadius: 30, borderWidth: 1, borderColor: ah.line2, backgroundColor: 'rgba(22,22,24,0.85)'}}>
          <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', borderWidth: 1, borderColor: ah.line2, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontFamily: ahFonts.sansBold, fontSize: 15, color: ah.white}}>N</Text>
          </View>
          <TextInput value={ask} onChangeText={setAsk} placeholder="Text Nova…" placeholderTextColor={ah.faint} selectionColor={ah.rose}
            multiline accessibilityLabel="Your request for Nova"
            style={{flex: 1, minWidth: 0, minHeight: 44, maxHeight: 140, paddingTop: 12, paddingBottom: 10, color: ah.text, fontFamily: ahFonts.sans, fontSize: 16, lineHeight: 21}} />
          <Pressable onPress={() => tapSend()} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send to Nova" accessibilityState={{disabled: !canSend, busy}}
            style={({pressed}) => ({width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? ah.white : 'rgba(255,255,255,0.1)', transform: [{scale: pressed ? 0.94 : 1}]})}>
            {busy ? <ActivityIndicator color={ah.rose} /> : <Text style={{fontFamily: ahFonts.sansBold, fontSize: 18, color: canSend ? '#000' : ah.faint}}>↑</Text>}
          </Pressable>
        </View>
        <Text style={[t.small, {textAlign: 'center', fontSize: 12, lineHeight: 17}]}>Nova is an AI concierge (powered by Anthropic Claude). Don’t share sensitive info. Replies can be wrong — nothing is booked, bought or sent until you confirm it.</Text>
      </View>
      {consent.sheet}
    </View>
  );
}
