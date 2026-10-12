'use client';
import {useEffect, useState} from 'react';
import {RoomFrame, Card, Btn, api} from '@/components/rooms/room-frame';

type Rotation = {id: string; week_start: string; status: string; looks: {day: number; item_ids: string[]; held?: boolean}[]; missing: {category: string; reason?: string}[]};
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export default function ClosetPage() {
  const [rot, setRot] = useState<Rotation | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Rotation>('/api/closet/rotation').then(setRot, (e: Error) => setErr(e.message));
    api<{looks: {id: string; name: string}[]}>('/api/ballroom/context').then((c) => setNames(Object.fromEntries(c.looks.map((l) => [l.id, l.name]))), () => {});
  }, []);
  const approve = async () => { if (rot) try { setRot(await api<Rotation>('/api/closet/approve-week', {method: 'POST', body: JSON.stringify({week_start: rot.week_start})})); } catch (e) { setErr((e as Error).message); } };
  const hold = async (day: number) => { if (rot) try { setRot(await api<Rotation>(`/api/closet/looks/${rot.id}/hold`, {method: 'POST', body: JSON.stringify({day})})); } catch (e) { setErr((e as Error).message); } };
  return (
    <RoomFrame title="The Closet" subtitle="This week, from what you already own." status={err ? {kind: 'error', text: err} : !rot ? {kind: 'loading'} : rot.looks.length ? {kind: 'ok'} : {kind: 'empty', text: 'Add pieces with The Camera to build a rotation.'}}>
      {rot?.looks.map((l) => (
        <Card key={l.day}>
          <p className="text-[10px] uppercase tracking-widest" style={{color: '#C9A961'}}>{DAYS[l.day]} {l.held ? '· held' : ''}</p>
          <p className="text-sm">{l.item_ids.map((id) => names[id] ?? 'Owned piece').join(' · ')}</p>
          {!l.held && rot.status !== 'approved' && <Btn onClick={() => hold(l.day)}>Hold</Btn>}
        </Card>
      ))}
      {!!rot?.missing.length && <Card><p className="text-xs opacity-70">Missing pieces (not in your closet): {rot.missing.map((m) => m.category).join(', ')}</p></Card>}
      {rot && rot.looks.length > 0 && (rot.status === 'approved' ? <p className="text-center text-xs opacity-60">Week approved.</p> : <Btn onClick={approve}>Approve the week</Btn>)}
    </RoomFrame>
  );
}
