// "Report this response" under each of Nova's replies. Opens a short reason list inline, then
// POST /api/moderation/report {target_kind: 'nova_reply', …} (lib/rooms/nova-report.ts). Honest outcome only.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {REPLY_REASONS, reportNovaReply} from '@/lib/rooms/nova-report';
import {ah, ahFonts, Pick} from './RoomKit';

export function NovaReport({targetId, text}: {targetId: string; text: string}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ok: boolean; text: string} | null>(null);

  const send = async (reason: string, label: string) => {
    setBusy(true);
    const r = await reportNovaReply(targetId, reason, label, text);
    setBusy(false); setDone(r);
    if (r.ok) setOpen(false);
  };

  if (done?.ok) return <Text accessibilityLiveRegion="polite" style={{fontFamily: ahFonts.sans, fontSize: 12.5, color: ah.ok}}>{done.text}</Text>;
  return (
    <View style={{gap: 8}}>
      <Pressable onPress={() => { setOpen((v) => !v); setDone(null); }} accessibilityRole="button" accessibilityState={{expanded: open}}
        accessibilityLabel="Report this response" hitSlop={4} style={{minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start'}}>
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12.5, color: open ? ah.text : ah.mute}}>{open ? 'Cancel report' : 'Report this response'}</Text>
      </Pressable>
      {open ? (
        <View style={{gap: 8}} accessibilityLabel="Why are you reporting this reply?">
          <Text style={{fontFamily: ahFonts.sans, fontSize: 13, color: ah.mute}}>What’s wrong with this reply?</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            {REPLY_REASONS.map((r) => <Pick key={r.label} label={r.label} disabled={busy} onPress={() => void send(r.reason, r.label)} a11y={`Report: ${r.label}`} />)}
          </View>
        </View>
      ) : null}
      {done && !done.ok ? <Text accessibilityLiveRegion="polite" style={{fontFamily: ahFonts.sans, fontSize: 12.5, lineHeight: 18, color: ah.danger}}>{done.text}</Text> : null}
    </View>
  );
}
