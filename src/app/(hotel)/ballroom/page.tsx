'use client';
import {useCallback, useEffect, useState} from 'react';
import {RoomFrame, Card, Btn, api} from '@/components/rooms/room-frame';

type Proposal = {id: string; starts_at: string; stage: string; venue: {name?: string}; partner_disclosure: string | null};
export default function BallroomPage() {
  const [items, setItems] = useState<Proposal[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [when, setWhen] = useState(''); const [venue, setVenue] = useState('');
  const load = useCallback(() => api<{proposals: Proposal[]}>('/api/ballroom/context').then((r) => setItems(r.proposals), (e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load]);
  const compose = async () => {
    if (!when || !venue) return;
    try { await api('/api/ballroom/compose', {method: 'POST', body: JSON.stringify({starts_at: new Date(when).toISOString(), venue: {name: venue}})}); setWhen(''); setVenue(''); await load(); } catch (e) { setErr((e as Error).message); }
  };
  const step = async (id: string, v: 'hold' | 'confirm') => { try { await api(`/api/ballroom/${v}`, {method: 'POST', body: JSON.stringify({id})}); await load(); } catch (e) { setErr((e as Error).message); } };
  return (
    <RoomFrame title="The Ballroom" subtitle="Compose an evening: venue, look, gift, route." status={err ? {kind: 'error', text: err} : items === null ? {kind: 'loading'} : items.length ? {kind: 'ok'} : {kind: 'empty', text: 'No evenings planned.'}}>
      <Card>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="When" className="mr-2 bg-transparent text-xs" />
        <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue" aria-label="Venue" className="bg-transparent text-xs" />
        <Btn onClick={compose}>Compose an evening</Btn>
      </Card>
      {items?.map((p) => (
        <Card key={p.id}>
          <p className="text-sm">{p.venue.name ?? 'Evening'} — {new Date(p.starts_at).toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-widest opacity-60">{p.stage}</p>
          {p.partner_disclosure && <p className="text-[10px] opacity-50">Partner: {p.partner_disclosure}</p>}
          {p.stage === 'proposal' && <Btn onClick={() => step(p.id, 'hold')}>Hold</Btn>}
          {p.stage !== 'confirmed' && <Btn onClick={() => step(p.id, 'confirm')}>Confirm</Btn>}
        </Card>
      ))}
    </RoomFrame>
  );
}
