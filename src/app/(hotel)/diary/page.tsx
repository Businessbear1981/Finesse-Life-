'use client';
import {useCallback, useEffect, useState} from 'react';
import {RoomFrame, Card, Btn, api} from '@/components/rooms/room-frame';

type Item = {id: string; title: string; room: string | null; status: string};
export default function DiaryPage() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => api<{items: Item[]}>(`/api/diary?day=${day}`).then((r) => { setItems(r.items); setErr(null); }, (e: Error) => setErr(e.message)), [day]);
  useEffect(() => { void load(); }, [load]);
  const act = async (id: string, v: 'approve' | 'hold') => { try { await api(`/api/diary/items/${id}/${v}`, {method: 'POST'}); await load(); } catch (e) { setErr((e as Error).message); } };
  const shift = (n: number) => { const d = new Date(day); d.setUTCDate(d.getUTCDate() + n); setDay(d.toISOString().slice(0, 10)); };
  return (
    <RoomFrame title="The Diary" subtitle="What was done, and the one thing that needs you." status={err ? {kind: 'error', text: err} : items === null ? {kind: 'loading'} : items.length ? {kind: 'ok'} : {kind: 'empty', text: 'A quiet day. Nothing logged.'}}>
      <div className="flex items-center justify-between text-xs"><Btn onClick={() => shift(-1)}>‹ Prev</Btn><span>{day}</span><Btn onClick={() => shift(1)}>Next ›</Btn></div>
      {items?.map((i) => (
        <Card key={i.id}>
          <p className="text-sm">{i.title}</p>
          <p className="text-[10px] uppercase tracking-widest opacity-50">{i.room ?? 'diary'} · {i.status.replace('_', ' ')}</p>
          {(i.status === 'needs_you' || i.status === 'held') && (<><Btn onClick={() => act(i.id, 'approve')}>Approve</Btn>{i.status !== 'held' && <Btn onClick={() => act(i.id, 'hold')}>Hold</Btn>}</>)}
        </Card>
      ))}
    </RoomFrame>
  );
}
