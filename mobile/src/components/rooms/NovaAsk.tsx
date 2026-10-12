// One orchestrator button: the member presses it, the hub creates and runs the request in one step
// (POST /api/nova/requests confirm:true), and the answer shows as the shared RequestCard (RequestCard.tsx) —
// with its own retry / done / dismiss. Nothing is bought or booked; the result is also filed in the Diary.
import {useState} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {createRequest, requestErrorText, type NovaRequest, type RequestKind} from '@/lib/rooms/nova-requests';
import {ah, ahFonts} from '@/lib/ah';
import {ERR_PINK, RowBtn} from './live';
import {RequestCard} from './RequestCard';

export function NovaAskButton({label, kind, title, details, room, tone}: {label: string; kind: RequestKind; title: string; details: Record<string, unknown>; room: string; tone?: string}) {
  const [busy, setBusy] = useState(false);
  const [req, setReq] = useState<NovaRequest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setReq(null); setErr(null);
    const out = await createRequest({kind, title, details, room}, true);
    setBusy(false);
    if (out.ok) setReq(out.data);
    else setErr(requestErrorText(out.status, out.body));
  };
  return (
    <View style={{gap: 8}}>
      {req && req.status !== 'cancelled' ? null : <RowBtn label={busy ? 'Nova is on it…' : label} onPress={() => void run()} disabled={busy} tone={tone ?? ah.rose} />}
      {busy ? (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}} accessibilityLiveRegion="polite">
          <ActivityIndicator color={ah.rose} size="small" />
          <Text style={{fontFamily: ahFonts.sans, fontSize: 12.5, color: ah.mute}}>Working — this can take a few seconds.</Text>
        </View>
      ) : null}
      {err ? <Text style={{fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 19, color: ERR_PINK}} accessibilityLiveRegion="polite">{err}</Text> : null}
      {req && req.status !== 'cancelled' ? <RequestCard key={req.id} request={req} onChange={setReq} /> : null}
    </View>
  );
}
