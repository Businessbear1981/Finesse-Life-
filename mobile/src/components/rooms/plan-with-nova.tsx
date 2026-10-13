// "Ask Nova to plan it" — one button into the orchestrator hub (POST /api/nova/requests, kind 'plan', confirm:true)
// and the room's earlier plans. Nova drafts options with times; nothing is booked, and the plan also waits in the
// Diary. Members only — rooms render this inside their signed-in view.
import {useCallback, useEffect, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {AHCard, AHEyebrow, AHInput} from '@/components/ah';
import {ah, ahFonts} from '@/lib/ah';
import {REQUEST_STATUS, askNovaToPlan, closeRequest, listRequests, novaFailure, type NovaRequest, type PlanTopic} from '@/lib/rooms/nova-plan';
import {ActionBar, s} from './shared';
import {Meta, RowBtn, Status} from './live';
import {useAIConsent} from './AIConsent';
import {NovaReport} from './NovaReport';

const WHEN: Array<[string, () => Date | null]> = [
  ['Any time', () => null],
  ['Tonight', () => { const d = new Date(); d.setHours(20, 0, 0, 0); return d; }],
  ['Tomorrow', () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); return d; }],
  ['This weekend', () => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(12, 0, 0, 0); return d; }],
];

export function PlanWithNova({room, topic, title, label, placeholder, acc, withWhen, withParty}: {
  room: string; topic: PlanTopic; title: string; label: string; placeholder: string; acc: string; withWhen?: boolean; withParty?: boolean;
}) {
  const [items, setItems] = useState<NovaRequest[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [brief, setBrief] = useState('');
  const [when, setWhen] = useState(0);
  const [party, setParty] = useState(2);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const consent = useAIConsent();

  const load = useCallback(async () => {
    const r = await listRequests();
    if (r.ok) { setItems((r.body.requests ?? []).filter((q) => q.room === room)); setLoadErr(null); }
    else { setItems([]); setLoadErr(novaFailure(r.status, r.body).replace('Nothing was sent.', 'Earlier plans could not be loaded.')); }
  }, [room]);
  useEffect(() => { void load(); }, [load]);

  const ask = async () => {
    if (!brief.trim() || busy) return;
    setBusy(true); setMsg(null);
    const at = withWhen ? WHEN[when][1]() : null;
    const r = await askNovaToPlan({room, topic, title, brief, when: at ? at.toISOString() : undefined, partySize: withParty ? party : undefined});
    setBusy(false);
    if (r.ok && r.body.request) { setBrief(''); setOpen(r.body.request.id); setMsg({ok: true, text: 'Nova drafted a plan. Nothing is booked — it waits for you in the Diary too.'}); }
    else setMsg({ok: false, text: novaFailure(r.status, r.body)});
    void load();
  };
  const close = async (id: string, to: 'done' | 'cancel') => {
    setBusy(true);
    const r = await closeRequest(id, to);
    setBusy(false);
    if (!r.ok) setMsg({ok: false, text: 'Nothing was changed.'});
    void load();
  };

  return (
    <AHCard style={{gap: 12}}>
      <Meta color={acc === ah.rose ? ah.blush : ah.text}>{label}</Meta>
      <AHInput value={brief} onChangeText={(v) => setBrief(v.slice(0, 600))} placeholder={placeholder} accessibilityLabel="What should Nova plan?" multiline style={{minHeight: 70, paddingTop: 12}} />
      {withWhen ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {WHEN.map(([w], i) => <RowBtn key={w} label={w} tone={i === when ? ah.rose : undefined} onPress={() => setWhen(i)} a11y={`When: ${w}`} />)}
        </View>
      ) : null}
      {withParty ? (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <RowBtn label="−" a11y="Fewer guests" onPress={() => setParty((p) => Math.max(1, p - 1))} />
          <Text style={{flex: 1, textAlign: 'center', fontFamily: ahFonts.serif, fontSize: 22, color: ah.text}}>{party} {party === 1 ? 'guest' : 'guests'}</Text>
          <RowBtn label="+" a11y="More guests" onPress={() => setParty((p) => Math.min(40, p + 1))} />
        </View>
      ) : null}
      <ActionBar label={busy ? 'Nova is drafting…' : 'Ask Nova to plan it'} color={acc} onPress={() => { if (brief.trim() && !busy) void consent.ensure('ai_processing', () => void ask()); }} disabled={busy || !brief.trim()} />
      <Text style={s.small}>Nova drafts options with times. No booking partner is connected, so nothing is reserved until you arrange it.</Text>
      <Status msg={msg} />

      {items === null ? <Text style={s.small}>Loading Nova’s plans…</Text> : loadErr ? <Text style={s.small}>{loadErr}</Text> : items.length === 0 ? (
        <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 18, color: ah.mute}}>No plans yet — ask Nova above.</Text>
      ) : (
        <View style={{gap: 2}}>
          <AHEyebrow style={{marginTop: 4}}>Nova’s plans</AHEyebrow>
          {items.slice(0, 5).map((q) => {
            const on = open === q.id;
            return (
              <View key={q.id} style={{borderTopWidth: 1, borderColor: ah.line, paddingVertical: 10, gap: 8}}>
                <Pressable onPress={() => setOpen(on ? null : q.id)} accessibilityRole="button" accessibilityState={{expanded: on}} accessibilityLabel={`${q.details.brief ?? q.title}. ${REQUEST_STATUS[q.status] ?? q.status}`}
                  style={{minHeight: 44, gap: 2, justifyContent: 'center'}}>
                  <Text style={{fontFamily: ahFonts.serif, fontSize: 18, lineHeight: 22, color: ah.text}} numberOfLines={on ? undefined : 2}>{q.details.brief ?? q.title}</Text>
                  <Meta color={q.status === 'ready' ? ah.blush : ah.mute}>{REQUEST_STATUS[q.status] ?? q.status}</Meta>
                </Pressable>
                {on ? (
                  <Animated.View entering={FadeIn.duration(250)} style={{gap: 10}}>
                    <Text style={[s.body, {fontSize: 14}]}>{q.result?.plan ?? (q.status === 'failed' ? 'Nova could not finish this one. Nothing was booked.' : 'No plan yet.')}</Text>
                    {q.result?.plan ? <NovaReport targetId={`request:${q.id}`} text={q.result.plan} /> : null}
                    {q.status === 'ready' ? (
                      <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
                        <RowBtn label="I’ve arranged it" onPress={() => close(q.id, 'done')} disabled={busy} tone={ah.rose} />
                        <RowBtn label="Not needed" onPress={() => close(q.id, 'cancel')} disabled={busy} />
                      </View>
                    ) : null}
                  </Animated.View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </AHCard>
  );
}
