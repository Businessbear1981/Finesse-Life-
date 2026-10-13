'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { btnCls, fieldCls, roomCall } from '@/lib/room-client';
import { birthdayBrief, daysLabel, giftQuery, type EntourageGift, type EntouragePerson, type GiftStatus, type NextOccasion } from '@/lib/entourage';
import { formatCents, resultView, type ItemView } from '@/lib/nova-request-view';
import { failureText, runNovaRequest, today, useRoomData } from '@/lib/rooms/live-room';
import { LiveRoom, Notice, SampleLabel } from '@/components/live-room-states';
import { useLocalPref } from '@/components/after-hours';
import {ReportReply} from '@/components/nova/report-reply';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'crew' | 'find' | 'invite';
type Edition = 'finesse' | 'carpe_diem';


interface SearchResult {
  found: boolean;
  display_name?: string;
  gender?: string;
  vibe?: string;
  city?: string;
}

const VIBE_CHIPS = ['electric', 'luxe', 'mysterious', 'playful', 'intimate', 'untamed'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const VIBE_COLORS: Record<string, string> = {
  electric: '#FFD700',
  luxe: '#C9A961',
  mysterious: '#9B59B6',
  playful: '#FF4D7D',
  intimate: '#FF8FA3',
  untamed: '#69C9D0',
};

function vibeColor(vibe: string, edition: Edition): string {
  if (VIBE_COLORS[vibe]) return VIBE_COLORS[vibe];
  return edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';
}

// ── Tab: People (the member's own dossiers — entourage_people / entourage_gifts) ──────────

type Person = EntouragePerson & {next: NextOccasion | null; gifts: EntourageGift[]};
type PeopleData = {today: string; people: Person[]};

const SAMPLE_PEOPLE: Array<{name: string; relation: string; days: number; loves: string[]}> = [
  {name: 'Mum', relation: 'Family', days: 12, loves: ['Orchids', 'Hermès scarves', 'Earl Grey']},
  {name: 'Theo', relation: 'Partner', days: 31, loves: ['Vintage watches', 'Negronis', 'Jazz']},
];

function SamplePeople() {
  return (
    <div className="space-y-3">
      <SampleLabel>Sample dossiers · sign in to keep your own</SampleLabel>
      {SAMPLE_PEOPLE.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 border border-cream/8 bg-ink/40 p-4 opacity-70">
          <div>
            <p className="font-display text-lg text-cream/80">{p.name} <span className="font-label text-[8px] uppercase tracking-[0.2em] text-cream/30">{p.relation}</span></p>
            <p className="font-body text-xs italic text-cream/35">Loves {p.loves.join(', ')}</p>
          </div>
          <p className="whitespace-nowrap font-mono text-sm text-brass/70">{daysLabel(p.days)}</p>
        </div>
      ))}
    </div>
  );
}

const lovesFrom = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12);

function PersonForm({person, accent, onSaved, onCancel}: {person?: Person; accent: string; onSaved: () => void; onCancel?: () => void}) {
  const [name, setName] = useState(person?.name ?? '');
  const [relation, setRelation] = useState(person?.relation ?? '');
  const [city, setCity] = useState(person?.city ?? '');
  const [birthday, setBirthday] = useState(person?.birthday ?? '');
  const [loves, setLoves] = useState(person?.loves.join(', ') ?? '');
  const [notes, setNotes] = useState(person?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    const json = {name: name.trim(), relation: relation.trim() || 'friend', city: city.trim() || null, birthday: birthday || null, loves: lovesFrom(loves), notes: notes.trim() || null};
    const r = person
      ? await roomCall(`/api/entourage/${person.id}`, {method: 'PATCH', json})
      : await roomCall('/api/entourage', {method: 'POST', json});
    setBusy(false);
    if (r.ok) onSaved();
    else setMsg(failureText(r.status, r.body, person ? 'Nothing was changed.' : 'Nothing was added.'));
  };
  return (
    <form onSubmit={save} className="space-y-2 border border-brass/20 bg-ink/50 p-4">
      <p className="font-label text-[9px] uppercase tracking-[0.3em] text-brass/60">{person ? `Edit ${person.name}` : 'Add someone you love'}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={80} className={fieldCls} required />
        <input aria-label="Relation" value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="Relation (mum, partner, best friend…)" maxLength={40} className={fieldCls} />
        <input aria-label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" maxLength={80} className={fieldCls} />
        <label className="flex items-center gap-2 font-label text-[9px] uppercase tracking-[0.2em] text-cream/40">
          Birthday
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={fieldCls} />
        </label>
      </div>
      <input aria-label="Loves" value={loves} onChange={(e) => setLoves(e.target.value)} placeholder="Loves — orchids, jazz, first editions" className={fieldCls} />
      <textarea aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes only you will see" maxLength={2000} rows={2} className={`${fieldCls} py-2`} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !name.trim()} className={btnCls} style={{borderColor: accent, color: accent}}>{busy ? 'Saving…' : person ? 'Save' : 'Add to my people'}</button>
        {onCancel && <button type="button" onClick={onCancel} className={`${btnCls} border-cream/15 text-cream/50`}>Cancel</button>}
      </div>
      {msg && <Notice tone="error">{msg}</Notice>}
    </form>
  );
}

function Dossier({person, accent, reload}: {person: Person; accent: string; reload: () => void}) {
  const [editing, setEditing] = useState(false);
  const [budget, setBudget] = useState('150');
  const [busy, setBusy] = useState<'gifts' | 'plan' | 'save' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<ItemView[] | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const giftIdeas = async () => {
    setBusy('gifts'); setMsg(null); setIdeas(null);
    const cents = Math.round(Number(budget) * 100);
    const r = await runNovaRequest({kind: 'find_item', title: `Gift ideas for ${person.name}`, room: 'entourage',
      details: {query: giftQuery(person), ...(Number.isFinite(cents) && cents > 0 ? {budget_cents: cents} : {})}});
    setBusy(null);
    if (!r.ok) { setMsg(r.message); return; }
    const view = resultView(r.request.result);
    setIdeas(view.type === 'items' ? view.items : []);
  };
  const planBirthday = async () => {
    setBusy('plan'); setMsg(null); setPlan(null);
    const when = person.next ? new Date(`${person.next.date}T19:00:00`).toISOString() : undefined;
    const r = await runNovaRequest({kind: 'plan', title: `${person.name}’s birthday`, room: 'entourage',
      details: {topic: 'evening', brief: birthdayBrief(person, person.next?.turning ?? null), ...(when ? {when} : {})}});
    setBusy(null);
    if (!r.ok) { setMsg(r.message); return; }
    const view = resultView(r.request.result);
    setPlan(view.type === 'plan' ? view.text : 'Nova returned an empty plan. Nothing was booked.');
  };
  const saveIdea = async (i: ItemView) => {
    setBusy('save');
    const r = await roomCall(`/api/entourage/${person.id}/gifts`, {method: 'POST', json: {title: [i.brand, i.title].filter(Boolean).join(' — ').slice(0, 160), price_cents: i.price_cents, url: i.url, source: 'nova', occasion: person.next ? 'Birthday' : null}});
    setBusy(null);
    if (r.ok) { setIdeas((xs) => xs?.filter((x) => x !== i) ?? null); reload(); } else setMsg(failureText(r.status, r.body, 'Nothing was saved.'));
  };
  const setGift = async (g: EntourageGift, status: GiftStatus | 'delete') => {
    const r = status === 'delete'
      ? await roomCall(`/api/entourage/${person.id}/gifts?gift_id=${g.id}`, {method: 'DELETE'})
      : await roomCall(`/api/entourage/${person.id}/gifts`, {method: 'PATCH', json: {gift_id: g.id, status}});
    if (r.ok) reload(); else setMsg(failureText(r.status, r.body));
  };
  const remove = async () => {
    const r = await roomCall(`/api/entourage/${person.id}`, {method: 'DELETE'});
    if (r.ok) reload(); else setMsg(failureText(r.status, r.body));
  };

  if (editing) return <PersonForm person={person} accent={accent} onSaved={() => { setEditing(false); reload(); }} onCancel={() => setEditing(false)} />;

  return (
    <div className="space-y-5 border border-brass/20 bg-ink/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-label text-[8px] uppercase tracking-[0.3em] text-cream/35">{person.relation}{person.city ? ` · ${person.city}` : ''}</p>
          <h2 className="font-display text-3xl italic text-cream/90">{person.name}</h2>
        </div>
        <div className="text-right">
          {person.next ? (
            <>
              <p className="font-display text-3xl" style={{color: person.next.days <= 14 ? accent : '#C9A961'}}>{person.next.days}</p>
              <p className="font-label text-[8px] uppercase tracking-[0.2em] text-cream/40">{person.next.days === 1 ? 'day' : 'days'} to their birthday{person.next.turning ? ` · ${person.next.turning}` : ''}</p>
            </>
          ) : <p className="font-body text-xs italic text-cream/35">No birthday on file</p>}
        </div>
      </div>

      {person.loves.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {person.loves.map((l) => <span key={l} className="rounded-full border border-cream/15 px-3 py-1 font-body text-xs text-cream/70">{l}</span>)}
        </div>
      )}
      {person.notes && <p className="border-l-2 pl-3 font-body text-sm italic text-cream/55" style={{borderColor: accent}}>{person.notes}</p>}

      <div>
        <p className="mb-2 font-label text-[9px] uppercase tracking-[0.3em] text-brass/60">Gifts on record · {person.gifts.length}</p>
        {person.gifts.length === 0 ? <Notice>No gifts on record yet.</Notice> : (
          <ul className="space-y-1">
            {person.gifts.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-cream/6 py-2 font-body text-sm">
                <span className="text-cream/75">
                  {g.url ? <a href={g.url} target="_blank" rel="noopener noreferrer" className="underline decoration-cream/20">{g.title}</a> : g.title}
                  {g.price_cents != null && <span className="ml-2 font-mono text-xs text-cream/40">{formatCents(g.price_cents)}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-label text-[8px] uppercase tracking-[0.2em] text-cream/40">{g.status}{g.source === 'nova' ? ' · nova' : ''}</span>
                  {g.status === 'idea' && <button type="button" onClick={() => setGift(g, 'purchased')} className="min-h-9 px-2 font-label text-[8px] uppercase tracking-[0.2em] text-brass/80">Bought it</button>}
                  {g.status === 'purchased' && <button type="button" onClick={() => setGift(g, 'given')} className="min-h-9 px-2 font-label text-[8px] uppercase tracking-[0.2em] text-brass/80">Given</button>}
                  <button type="button" onClick={() => setGift(g, 'delete')} aria-label={`Remove ${g.title}`} className="min-h-9 px-2 font-label text-[8px] uppercase tracking-[0.2em] text-cream/30">Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-cream/8 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 font-label text-[9px] uppercase tracking-[0.2em] text-cream/40">
            Budget $
            <input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, '').slice(0, 7))} className={`${fieldCls} w-24`} aria-label="Gift budget in dollars" />
          </label>
          <button type="button" disabled={!!busy} onClick={giftIdeas} className={btnCls} style={{borderColor: accent, color: accent}}>{busy === 'gifts' ? 'Nova is looking…' : 'Gift ideas'}</button>
          <button type="button" disabled={!!busy} onClick={planBirthday} className={`${btnCls} border-brass/40 text-brass`}>{busy === 'plan' ? 'Nova is planning…' : 'Plan their birthday'}</button>
        </div>
        <p className="font-body text-[11px] italic text-cream/30">Nova suggests; nothing is bought or booked. Plans land in your Diary for approval.</p>
        {msg && <Notice tone="error">{msg}</Notice>}
        {ideas && (ideas.length === 0 ? <Notice>Nova didn’t find anything that fits — try a different budget, or add more of what they love.</Notice> : (
          <ul className="space-y-2">
            {ideas.map((i, k) => (
              <li key={`${i.title}-${k}`} className="flex flex-wrap items-center justify-between gap-2 border border-cream/8 p-3">
                <span className="font-body text-sm text-cream/80">
                  {i.brand && <span className="mr-1 font-label text-[8px] uppercase tracking-[0.2em] text-cream/40">{i.brand}</span>}
                  {i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer" className="underline decoration-cream/20">{i.title}</a> : i.title}
                  <span className="ml-2 font-mono text-xs text-cream/40">{formatCents(i.price_cents)}</span>
                </span>
                <button type="button" disabled={busy === 'save'} onClick={() => saveIdea(i)} className="min-h-9 px-3 font-label text-[8px] uppercase tracking-[0.2em] text-brass">Save as idea</button>
              </li>
            ))}
            <li><ReportReply targetId={`entourage-ideas:${person.id}:${ideas.length}:${ideas[0]?.title.slice(0, 40) ?? ''}`} text={ideas.map((i) => [i.brand, i.title].filter(Boolean).join(' ')).join('; ')} /></li>
          </ul>
        ))}
        {plan && (
          <div className="border-t border-brass/10 pt-3">
            <p className="mb-2 font-label text-[8px] uppercase tracking-[0.3em] text-brass/50">Nova’s plan · in your Diary · nothing is booked</p>
            <p className="whitespace-pre-line font-body text-sm leading-relaxed text-cream/70">{plan}</p>
            <ReportReply key={plan} targetId={`entourage-plan:${person.id}:${plan.length}`} text={plan} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-cream/8 pt-3">
        <button type="button" onClick={() => setEditing(true)} className={`${btnCls} border-cream/15 text-cream/60`}>Edit</button>
        {confirmDelete ? (
          <>
            <button type="button" onClick={remove} className={`${btnCls} border-neon-pink/50 text-neon-pink`}>Delete {person.name} and their gifts</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={`${btnCls} border-cream/15 text-cream/50`}>Keep</button>
          </>
        ) : <button type="button" onClick={() => setConfirmDelete(true)} className={`${btnCls} border-cream/10 text-cream/35`}>Delete</button>}
      </div>
    </div>
  );
}

function PeopleTab({edition}: {edition: Edition}) {
  const accent = edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';
  const [day] = useState(() => today());
  const {data: room, reload} = useRoomData<PeopleData>(`/api/entourage?today=${day}`);
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const quiet = () => void reload(true);
  return (
    <LiveRoom room={room} what="your Entourage" reload={() => void reload()} signedOut={<SamplePeople />}>
      {(d) => {
        const current = d.people.find((p) => p.id === sel) ?? d.people[0] ?? null;
        return (
          <div className="space-y-5">
            <p className="font-label text-[9px] uppercase tracking-[0.35em] text-brass/50">Your people · only you see these dossiers</p>
            {d.people.length === 0 && !adding && (
              <div className="py-8 text-center">
                <p className="mb-2 font-display text-lg italic text-cream/40">No one here yet.</p>
                <p className="mb-5 font-body text-sm text-cream/30">Add the people you love — Nova will count down to their day and help with gifts.</p>
              </div>
            )}
            {d.people.length > 0 && (
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Your people">
                {d.people.map((p) => {
                  const on = current?.id === p.id;
                  return (
                    <button key={p.id} type="button" role="tab" aria-selected={on} onClick={() => { setSel(p.id); setAdding(false); }}
                      className="min-h-10 rounded-full border px-4 font-body text-sm transition-colors"
                      style={{borderColor: on ? accent : 'rgba(244,232,208,0.15)', color: on ? accent : 'rgba(244,232,208,0.6)'}}>
                      {p.name}{p.next && p.next.days <= 30 ? ` · ${daysLabel(p.next.days).toLowerCase()}` : ''}
                    </button>
                  );
                })}
              </div>
            )}
            {adding ? <PersonForm accent={accent} onSaved={() => { setAdding(false); quiet(); }} onCancel={() => setAdding(false)} />
              : <button type="button" onClick={() => setAdding(true)} className={`${btnCls} border-brass/40 text-brass`}>Add someone</button>}
            {current && !adding && <Dossier key={current.id} person={current} accent={accent} reload={quiet} />}
          </div>
        );
      }}
    </LiveRoom>
  );
}

// ── Tab: Find ────────────────────────────────────────────────────────────────

function FindTab({ edition }: { edition: Edition }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResult(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/member?username=${encodeURIComponent(q)}`);
      const data: SearchResult = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  return (
    <div className="space-y-5">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="search by name or vibe..."
          className="w-full px-4 py-3 bg-ink border border-cream/12 text-cream font-body text-sm placeholder:text-cream/20 focus:border-brass focus:outline-none transition-colors"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label text-[8px] tracking-[0.2em] text-brass/50 uppercase">
            searching
          </span>
        )}
      </div>

      {/* Vibe filter chips */}
      <div className="flex flex-wrap gap-2">
        {VIBE_CHIPS.map((vibe) => {
          const active = activeVibe === vibe;
          const color = vibeColor(vibe, edition);
          return (
            <button
              key={vibe}
              onClick={() => {
                setActiveVibe(active ? null : vibe);
                setQuery(active ? '' : vibe);
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => search(active ? '' : vibe), 400);
              }}
              className="font-label text-[8px] tracking-[0.2em] uppercase px-3 py-1.5 border transition-all duration-200"
              style={{
                color: active ? '#0A0406' : color,
                borderColor: active ? color : `${color}40`,
                background: active ? color : `${color}10`,
              }}
            >
              {vibe}
            </button>
          );
        })}
      </div>

      {/* Search result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.found ? 'found' : 'notfound'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {result.found && result.display_name ? (
              <div className="p-4 border border-cream/10 bg-ink/50 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #1A0A0D, #2A1020)',
                    border: '1px solid rgba(201,169,97,0.3)',
                  }}
                >
                  <span className="font-display text-lg" style={{ color: '#C9A961' }}>
                    {result.display_name[0]}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <span className="font-display text-base text-cream/90">{result.display_name}</span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {result.vibe && (
                      <span
                        className="font-label text-[7px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full border"
                        style={{
                          color: vibeColor(result.vibe, edition),
                          borderColor: `${vibeColor(result.vibe, edition)}35`,
                          background: `${vibeColor(result.vibe, edition)}10`,
                        }}
                      >
                        {result.vibe}
                      </span>
                    )}
                    {result.city && (
                      <span className="font-label text-[9px] tracking-[0.1em] text-cream/25">{result.city}</span>
                    )}
                  </div>
                </div>

                {/* No connection requests exist yet — never claim one was sent. */}
                <span
                  className="font-label text-[8px] tracking-[0.25em] uppercase px-4 py-2 border whitespace-nowrap"
                  style={{ color: 'rgba(244,232,208,0.35)', borderColor: 'rgba(244,232,208,0.12)' }}
                >
                  Connect · soon
                </span>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="font-display text-base text-cream/30 italic mb-2">No member found.</p>
                <p className="font-label text-[9px] tracking-[0.25em] uppercase text-cream/20">
                  Send them an invite.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Invite ───────────────────────────────────────────────────────────────

function InviteTab({ edition }: { edition: Edition }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [tgHandle, setTgHandle] = useState('');

  const accent = edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';
  // No referral tracking exists yet, so the link is the plain sign-up page.
  const inviteLink = 'finesselife.vip/signup';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  const shareText = `Join me on Finesse — the members-only lifestyle app. ${inviteLink}`;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="font-display text-2xl text-cream/80 italic tracking-wide mb-1">Bring your people in.</p>
        <p className="font-body text-sm text-cream/30">Your crew elevates the room.</p>
      </div>

      {/* Invite link */}
      <div>
        <p className="font-label text-[8px] tracking-[0.3em] uppercase text-brass/40 mb-2">Your invite link</p>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 px-4 py-3 border border-cream/10 bg-ink/50 font-mono text-xs text-cream/50 truncate"
          >
            {inviteLink}
          </div>
          <button
            onClick={handleCopy}
            className="px-5 py-3 font-label text-[8px] tracking-[0.25em] uppercase border transition-all duration-300 whitespace-nowrap"
            style={
              copied
                ? { color: '#00FF88', borderColor: '#00FF8840', background: '#00FF8812' }
                : { color: accent, borderColor: `${accent}40`, background: `${accent}12` }
            }
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        {copyFailed && (
          <p className="font-body text-xs text-cream/30 mt-2">Couldn&apos;t copy — select the link and copy it by hand.</p>
        )}
      </div>

      {/* Telegram field */}
      <div>
        <p className="font-label text-[8px] tracking-[0.3em] uppercase text-brass/40 mb-1">Telegram invite</p>
        <p className="font-body text-xs text-cream/25 mb-3">Telegram invites are coming soon — for now, share your link directly.</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tgHandle}
            onChange={(e) => setTgHandle(e.target.value)}
            placeholder="@theirhandle"
            className="flex-1 px-4 py-3 bg-ink border border-cream/12 text-cream font-body text-sm placeholder:text-cream/20 focus:border-brass focus:outline-none transition-colors"
          />
          <button
            disabled
            className="px-5 py-3 font-label text-[8px] tracking-[0.25em] uppercase border transition-all duration-300 disabled:opacity-30 whitespace-nowrap"
            style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}
          >
            Soon
          </button>
        </div>
      </div>

      {/* Social share text */}
      <div>
        <p className="font-label text-[8px] tracking-[0.3em] uppercase text-brass/40 mb-2">Share text</p>
        <div
          className="p-4 border border-cream/8 bg-ink/30 font-body text-sm text-cream/40 italic leading-relaxed"
        >
          {shareText}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EntouragePage() {
  const [tab, setTab] = useState<Tab>('crew');
  const edition = useLocalPref<Edition>('finesse_gender', (g) => (g === 'masculine' ? 'carpe_diem' : 'finesse'), 'finesse');

  const accent = edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'crew', label: 'People' },
    { key: 'find', label: 'Find' },
    { key: 'invite', label: 'Invite' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen relative"
      style={{ background: '#0A0406' }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]"
          style={{ background: `radial-gradient(ellipse at center, ${accent}08 0%, transparent 65%)` }}
        />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-6 relative z-10 px-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1
            className="font-display text-4xl tracking-[0.15em] italic mb-2"
            style={{ color: '#C9A961' }}
          >
            Entourage
          </h1>
          <p className="font-label text-[9px] tracking-[0.45em] uppercase" style={{ color: 'rgba(244,232,208,0.2)' }}>
            your inner circle
          </p>
        </motion.div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 relative z-10">
        <div className="flex border-b border-cream/8 mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300 relative"
              style={{ color: tab === t.key ? accent : 'rgba(244,232,208,0.3)' }}
            >
              {t.label}
              {tab === t.key && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-px"
                  style={{ background: accent }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="pb-20"
          >
            {tab === 'crew' && (
              <PeopleTab edition={edition} />
            )}
            {tab === 'find' && <FindTab edition={edition} />}
            {tab === 'invite' && <InviteTab edition={edition} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="text-center pb-8 relative z-10">
        <Link
          href="/lobby"
          className="font-body text-sm transition-colors"
          style={{ color: 'rgba(244,232,208,0.2)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#C9A961')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(244,232,208,0.2)')}
        >
          return to the lobby
        </Link>
      </div>

      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(74,25,34,0.12), transparent)' }}
      />
    </motion.div>
  );
}
