// Nova request cards (mobile mirror of src/components/nova/request-card.tsx). A drafted request shows
// "Ready when you are" with Confirm / Not now; confirming runs the agent and shows its result. Plans always
// carry "Not booked — Nova drafted this". Nothing here buys or books anything. Every result Nova produced
// carries "Report this response" (NovaReport.tsx → POST /api/moderation/report, target_kind 'nova_reply').
import {useEffect, useState} from 'react';
import {ActivityIndicator, Linking, Pressable, Text, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {radius} from '@/lib/ah';
import {
  actionsFor, closeRequest, confirmRequest, formatCents, KIND_LABEL, listRequests, requestErrorText, resultView, sourceLabel,
  STATUS_LABEL, storedErrorText, type NovaRequest, type RequestStatus,
} from '@/lib/rooms/nova-requests';
import {ah, ahFonts, Fine, Pick, t} from './RoomKit';
import {NovaReport} from './NovaReport';

/** What Nova produced for a request, as plain text for a report. */
export function resultText(request: NovaRequest): string {
  const v = resultView(request.result);
  const body = v.type === 'plan' ? v.text
    : v.type === 'items' ? v.items.map((i) => [i.title, i.brand, formatCents(i.price_cents)].filter(Boolean).join(' ')).join('; ')
    : v.type === 'prices' ? v.prices.map((p) => `${p.source} ${formatCents(p.price_cents)}`).join('; ')
    : v.type === 'path' ? [v.path.method, v.path.partner, v.path.instructions].filter(Boolean).join(' · ')
    : 'empty result';
  return `${request.title}: ${body}`;
}

const STATUS_TONE: Record<RequestStatus, string> = {drafted: ah.rose, running: ah.warn, ready: ah.ok, failed: ah.danger, done: ah.text, cancelled: ah.faint};

export function StatusChip({status}: {status: RequestStatus}) {
  const tone = STATUS_TONE[status];
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: `${tone}66`}}
      accessibilityLabel={`Status: ${STATUS_LABEL[status]}`}>
      {status === 'running' ? <ActivityIndicator size="small" color={tone} style={{transform: [{scale: 0.6}], width: 10, height: 10}} /> : null}
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: tone}}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

function Link({label, url}: {label: string; url: string}) {
  return (
    <Pressable onPress={() => { void Linking.openURL(url).catch(() => {}); }} accessibilityRole="link" accessibilityLabel={`${label} (opens the retailer)`} hitSlop={8}>
      <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12.5, color: ah.rose, textDecorationLine: 'underline'}}>{label} ↗</Text>
    </Pressable>
  );
}

export function RequestResult({request}: {request: NovaRequest}) {
  const v = resultView(request.result);
  if (v.type === 'items') {
    return (
      <View style={{gap: 2}}>
        {v.items.map((it, i) => (
          <View key={`${it.title}-${i}`} style={{flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: ah.line}}>
            <View style={{flex: 1, gap: 3}}>
              <Text style={t.name}>{it.title}</Text>
              <Text style={t.meta} numberOfLines={1}>{[it.brand, sourceLabel(it.source), it.partner].filter(Boolean).join(' · ')}</Text>
              {it.url ? <Link label="View" url={it.url} /> : null}
            </View>
            <Text style={t.num}>{formatCents(it.price_cents)}</Text>
          </View>
        ))}
        {v.items.some((i) => i.source === 'nova') ? <Fine style={{fontSize: 12}}>Nova’s picks are suggestions — prices and stock are the retailer’s to confirm.</Fine> : null}
      </View>
    );
  }
  if (v.type === 'prices') {
    return (
      <View>
        <View style={{flexDirection: 'row', paddingBottom: 6}}>
          <Text style={[t.eyebrow, {flex: 1, fontSize: 11}]}>Where</Text>
          <Text style={[t.eyebrow, {width: 84, textAlign: 'right', fontSize: 11}]}>Price</Text>
          <Text style={[t.eyebrow, {width: 84, textAlign: 'right', fontSize: 11}]}>You save</Text>
        </View>
        {v.prices.map((p, i) => (
          <View key={`${p.source}-${i}`} style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderColor: ah.line}}>
            <View style={{flex: 1, gap: 2}}>
              {p.url ? <Link label={p.source} url={p.url} /> : <Text style={t.name}>{p.source}</Text>}
              {p.members ? <Text style={[t.eyebrow, {color: ah.rose, fontSize: 11}]}>Members</Text> : null}
            </View>
            <Text style={[t.num, {width: 84, textAlign: 'right'}]}>{formatCents(p.price_cents)}</Text>
            <Text style={[t.num, {width: 84, textAlign: 'right', color: ah.mute}]}>{p.savings_cents > 0 ? formatCents(p.savings_cents) : '—'}</Text>
          </View>
        ))}
        <Fine style={{fontSize: 12, marginTop: 6}}>Market prices Nova found. Check the retailer before you buy.</Fine>
      </View>
    );
  }
  if (v.type === 'path') {
    const p = v.path;
    const how = p.method === 'scale' ? 'Through Scale (group buy)' : p.method === 'partner' ? `Through ${p.partner ?? 'a partner'}` : p.method === 'direct' ? 'Buy direct' : 'Sourced by hand';
    return (
      <View style={{gap: 6}}>
        <Text style={t.titleI}>{how}</Text>
        {p.instructions ? <Text style={t.body}>{p.instructions}</Text> : null}
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center'}}>
          {p.savings_cents > 0 ? <Text style={t.meta}>Est. savings <Text style={t.num}>{formatCents(p.savings_cents)}</Text></Text> : null}
          {p.token ? <Text selectable style={t.meta}>Code <Text style={[t.num, {fontSize: 13}]}>{p.token}</Text></Text> : null}
          {p.url ? <Link label={`Open ${p.partner ?? 'partner'}`} url={p.url} /> : null}
        </View>
        <Fine style={{fontSize: 12}}>Nova suggested the route. Nothing has been bought.</Fine>
      </View>
    );
  }
  if (v.type === 'plan') {
    return (
      <View style={{gap: 8}}>
        <Text selectable style={t.body}>{v.text}</Text>
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12.5, color: ah.warn}}>Not booked — Nova drafted this.</Text>
      </View>
    );
  }
  return <Fine>Nova came back empty-handed on this one. Try a broader ask.</Fine>;
}

export function RequestCard({request, onChange}: {request: NovaRequest; onChange?: (r: NovaRequest) => void}) {
  const [req, setReq] = useState(request);
  const [busy, setBusy] = useState<null | 'confirm' | 'cancel' | 'done'>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async (what: 'confirm' | 'cancel' | 'done') => {
    if (busy) return;
    setBusy(what); setErr(null);
    const prev = req;
    if (what === 'confirm') setReq({...req, status: 'running'});
    const out = what === 'confirm' ? await confirmRequest(req.id) : await closeRequest(req.id, what);
    if (out.ok) { setReq(out.data); onChange?.(out.data); }
    else {
      const failedOnServer = what === 'confirm' && (out.status === 502 || out.status === 503);
      setReq(failedOnServer ? {...prev, status: 'failed', error: out.body?.error ?? 'agent_failed'} : prev);
      setErr(requestErrorText(out.status, out.body));
    }
    setBusy(null);
  };

  const acts = actionsFor(req.status);
  const drafted = req.status === 'drafted';
  return (
    <Animated.View entering={FadeIn.duration(260)} accessibilityLabel={`${KIND_LABEL[req.kind]}: ${req.title}, ${STATUS_LABEL[req.status]}`}
      style={{gap: 10, padding: 16, borderRadius: radius.input, borderWidth: 1,
        borderColor: drafted ? 'rgba(232,180,160,0.45)' : ah.line2, backgroundColor: drafted ? 'rgba(232,180,160,0.06)' : 'rgba(255,255,255,0.03)'}}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
        <Text style={[t.eyebrow, {fontSize: 11, flexShrink: 1}]}>{drafted ? 'Ready when you are' : KIND_LABEL[req.kind]}</Text>
        <StatusChip status={req.status} />
      </View>
      <Text style={t.titleI}>{req.title}</Text>
      {req.status === 'running' ? <Text style={t.small} accessibilityLiveRegion="polite">Nova is on it…</Text> : null}
      {req.status === 'failed' && !err ? <Text style={[t.small, {color: ah.danger}]}>{storedErrorText(req.error)}</Text> : null}
      {req.status === 'cancelled' ? <Fine>Set aside. Nothing ran.</Fine> : null}
      {(req.status === 'ready' || req.status === 'done') && req.result ? <RequestResult request={req} /> : null}
      {(req.status === 'ready' || req.status === 'done') && req.result ? <NovaReport targetId={`request:${req.id}`} text={resultText(req)} /> : null}
      {err ? <Text style={[t.small, {color: ah.danger}]} accessibilityLiveRegion="polite">{err}</Text> : null}
      {acts.confirm || acts.retry || acts.done || acts.cancel ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {acts.confirm ? <Pick rose on label={busy === 'confirm' ? 'Working…' : 'Confirm'} disabled={!!busy} onPress={() => void run('confirm')} a11y={`Confirm: ${req.title}`} /> : null}
          {acts.retry ? <Pick rose on label={busy === 'confirm' ? 'Working…' : 'Try again'} disabled={!!busy} onPress={() => void run('confirm')} /> : null}
          {acts.done ? <Pick on label={busy === 'done' ? 'Saving…' : 'Done'} disabled={!!busy} onPress={() => void run('done')} /> : null}
          {acts.cancel ? <Pick label={drafted ? 'Not now' : 'Dismiss'} disabled={!!busy} onPress={() => void run('cancel')} a11y={`${drafted ? 'Not now' : 'Dismiss'}: ${req.title}`} /> : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

/** "Your requests": every request the member has asked Nova for, newest first. */
export function RequestsPanel() {
  const [rows, setRows] = useState<NovaRequest[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    void listRequests().then((out) => {
      if (!alive) return;
      if (out.ok) { setRows(out.data); setErr(null); }
      else { setRows(null); setErr(out.status === 401 ? 'Sign in to see your requests.' : out.status === 0 ? 'The house line is offline.' : 'Your requests couldn’t be loaded just now.'); }
    });
    return () => { alive = false; };
  }, [tick]);

  const shown = (rows ?? []).filter((r) => !openOnly || r.status === 'drafted' || r.status === 'running' || r.status === 'ready' || r.status === 'failed');
  return (
    <View style={{gap: 12}}>
      <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
        <Pick label="Open" on={openOnly} role="tab" onPress={() => setOpenOnly(true)} />
        <Pick label="All" on={!openOnly} role="tab" onPress={() => setOpenOnly(false)} />
        <View style={{flex: 1}} />
        <Pick label="Refresh" onPress={() => { setRows(null); setErr(null); setTick((n) => n + 1); }} />
      </View>
      {err ? <Text style={[t.small, {color: ah.danger}]}>{err}</Text>
        : rows === null ? <ActivityIndicator color={ah.rose} accessibilityLabel="Loading your requests" />
        : shown.length === 0 ? <Text style={[t.voice, {color: ah.mute, fontSize: 18}]}>{openOnly ? 'Nothing open. Ask Nova to find, price, style, source or plan something.' : 'No requests yet.'}</Text>
        : shown.map((r) => <RequestCard key={r.id} request={r} onChange={(n) => setRows((p) => (p ?? []).map((x) => (x.id === n.id ? n : x)))} />)}
    </View>
  );
}
