'use client';

/**
 * "Ask Nova to plan it" — one button into the orchestrator hub (POST /api/nova/requests, kind 'plan', confirm:true)
 * plus the room's earlier plans (GET /api/nova/requests, filtered to this room). Nova drafts options; nothing is
 * booked — the plan also lands in the Diary as an item that needs the member.
 */
import {useCallback, useEffect, useState} from 'react';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';
import {CONSENT_DECLINED_TEXT, isConsentRefusal, useAiGate} from '@/components/nova/ai-consent';
import {ReportReply} from '@/components/nova/report-reply';

export type PlanTopic = 'table' | 'ride' | 'trip' | 'evening' | 'appointment' | 'other';
export type NovaRequest = {
  id: string; kind: string; title: string; room: string | null; status: string; error: string | null;
  details: {brief?: string; when?: string; party_size?: number; topic?: string};
  result: {plan?: string; booked?: boolean} | null; diary_item_id: string | null; created_at: string;
};

const STATUS: Record<string, string> = {drafted: 'Draft', running: 'Nova is working…', ready: 'Plan ready · nothing booked', failed: 'Nova could not finish', done: 'Done', cancelled: 'Cancelled'};

export function novaError(status: number, body: {error?: string; message?: string}) {
  if (status === 401) return 'Sign in to ask Nova. Nothing was sent.';
  if (isConsentRefusal(status, body)) return CONSENT_DECLINED_TEXT;
  if (status === 429) return 'Nova needs a breather — try again in a minute. Nothing was sent.';
  if (body.error === 'nova_unavailable') return 'Nova is unavailable right now. Your request is saved as failed — nothing was booked.';
  if (status === 0) return body.message ?? 'The house line is down. Nothing was sent.';
  return 'Nova could not draft that. Nothing was booked.';
}

/** Loads this room's Nova requests. `null` while loading; `[]` when signed out or none. */
export function useRoomRequests(room: string) {
  const [items, setItems] = useState<NovaRequest[] | null>(null);
  const load = useCallback(async () => {
    const r = await roomCall<{requests?: NovaRequest[]}>('/api/nova/requests');
    setItems(r.ok ? (r.body.requests ?? []).filter((q) => q.room === room) : []);
  }, [room]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the awaited fetch
  useEffect(() => { void load(); }, [load]);
  return {items, reload: load};
}

export function NovaPlanText({text}: {text: string}) {
  return <div className="whitespace-pre-wrap font-body text-sm leading-relaxed text-cream/85">{text}</div>;
}

export function NovaPlan({room, topic, title, label, placeholder, accent, withWhen, withParty}: {
  room: string; topic: PlanTopic; title: string; label: string; placeholder: string; accent: string; withWhen?: boolean; withParty?: boolean;
}) {
  const {items, reload} = useRoomRequests(room);
  const [brief, setBrief] = useState('');
  const [when, setWhen] = useState('');
  const [party, setParty] = useState('2');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const gate = useAiGate();

  // Nothing is sent until the member has agreed to AI processing (ai-consent.tsx).
  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim() || busy) return;
    gate(() => void send());
  };
  const send = async () => {
    setBusy(true); setMsg(null);
    const details: Record<string, unknown> = {topic, brief: brief.trim()};
    if (withWhen && when) details.when = new Date(when).toISOString();
    if (withParty && Number(party) > 0) details.party_size = Math.min(40, Number(party));
    const r = await roomCall<{request?: NovaRequest; error?: string}>('/api/nova/requests', {method: 'POST', json: {kind: 'plan', title: `${title}: ${brief.trim()}`.slice(0, 140), details, room, confirm: true}});
    setBusy(false);
    if (r.ok && r.body.request) { setBrief(''); setOpen(r.body.request.id); setMsg('Nova drafted a plan. Nothing is booked — it is waiting for you in the Diary too.'); }
    else setMsg(novaError(r.status, r.body));
    void reload();
  };
  const close = async (id: string, to: 'done' | 'cancel') => {
    const r = await roomCall(`/api/nova/requests/${id}/${to}`, {method: 'POST'});
    if (!r.ok) setMsg('Nothing was changed.');
    void reload();
  };

  return (
    <section aria-label={label} className="mb-8 border p-4" style={{borderColor: `${accent}40`}}>
      <h2 className="font-label text-[11px] uppercase tracking-[0.4em]" style={{color: accent}}>{label}</h2>
      <form onSubmit={ask} className="mt-3 flex flex-col gap-2">
        <label className="sr-only" htmlFor={`nova-${room}-brief`}>What should Nova plan?</label>
        <textarea id={`nova-${room}-brief`} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={placeholder} maxLength={600} rows={2} className={`${fieldCls} py-2`} />
        {(withWhen || withParty) && (
          <div className="flex gap-2">
            {withWhen && <input aria-label="When" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={fieldCls} style={{colorScheme: 'dark'}} />}
            {withParty && <input aria-label="Party size" inputMode="numeric" value={party} onChange={(e) => setParty(e.target.value.replace(/\D/g, '').slice(0, 2))} className={`${fieldCls} w-24`} />}
          </div>
        )}
        <button type="submit" disabled={busy || !brief.trim()} className={btnCls} style={{borderColor: accent, color: accent}}>{busy ? 'Nova is drafting…' : 'Ask Nova to plan it'}</button>
      </form>
      <p className="mt-2 font-body text-[11px] italic text-cream/45">Nova drafts options with times. No booking partner is connected, so nothing is reserved until you arrange it.</p>
      {msg && <p role="status" className="mt-2 font-body text-sm italic text-cream/80">{msg}</p>}

      {items === null ? (
        <div className="mt-4 h-10 animate-pulse border border-brass/10" role="status" aria-label="Loading Nova's plans" />
      ) : items.length === 0 ? (
        <p className="mt-4 font-body text-sm italic text-cream/55">No plans yet — ask Nova above.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.slice(0, 6).map((q) => (
            <li key={q.id} id={`request-${q.id}`} className="border border-brass/15 p-3">
              <button type="button" onClick={() => setOpen(open === q.id ? null : q.id)} className="flex w-full items-start justify-between gap-3 text-left" aria-expanded={open === q.id}>
                <span className="font-body text-sm text-cream/85">{q.details.brief ?? q.title}</span>
                <span className="shrink-0 font-label text-[11px] uppercase tracking-[0.2em] text-cream/55">{STATUS[q.status] ?? q.status}</span>
              </button>
              {open === q.id && (
                <div className="mt-3 space-y-3">
                  {q.result?.plan ? <><NovaPlanText text={q.result.plan} /><ReportReply targetId={`request:${q.id}`} text={q.result.plan} /></> : <p className="font-body text-sm italic text-cream/55">{q.status === 'failed' ? 'Nova could not finish this one. Nothing was booked.' : 'No plan yet.'}</p>}
                  {q.status === 'ready' && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => close(q.id, 'done')} className={`${btnCls} border-brass/40 text-cream/80`}>I&apos;ve arranged it</button>
                      <button type="button" onClick={() => close(q.id, 'cancel')} className={`${btnCls} border-brass/20 text-cream/55`}>Not needed</button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
