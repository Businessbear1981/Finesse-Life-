'use client';
import {useEffect, useState} from 'react';
import {RoomFrame, Card, Btn, api} from '@/components/rooms/room-frame';

type Level = 'public' | 'members' | 'private';
type Identity = {public_card: {display_name?: string; headline?: string}; visibility: {profile: Level; standing: Level; closet: Level}};
export default function ThisIsYouPage() {
  const [id, setId] = useState<Identity | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api<Identity>('/api/identity/context').then(setId, (e: Error) => setErr(e.message)); }, []);
  const save = async () => {
    if (!id) return;
    try {
      await api('/api/identity/projections', {method: 'PATCH', body: JSON.stringify({public_card: id.public_card})});
      setId(await api<Identity>('/api/identity/visibility', {method: 'PATCH', body: JSON.stringify(id.visibility)}));
      setSaved(true);
    } catch (e) { setErr((e as Error).message); }
  };
  const vis = (k: keyof Identity['visibility']) => (
    <label className="mr-3 text-xs">{k}{' '}
      <select value={id?.visibility[k]} onChange={(e) => id && setId({...id, visibility: {...id.visibility, [k]: e.target.value as Level}})} className="bg-transparent">
        <option value="public">public</option><option value="members">members</option><option value="private">private</option>
      </select>
    </label>
  );
  return (
    <RoomFrame title="This Is You" subtitle="Choose what others see. Export or erase your data any time." status={err ? {kind: 'error', text: err} : !id ? {kind: 'loading'} : {kind: 'ok'}}>
      {id && (
        <>
          <Card>
            <p className="text-[10px] uppercase tracking-widest" style={{color: '#C9A961'}}>Public Stage</p>
            <input value={id.public_card.display_name ?? ''} onChange={(e) => setId({...id, public_card: {...id.public_card, display_name: e.target.value}})} placeholder="Display name" aria-label="Display name" className="mt-2 block w-full bg-transparent text-sm" />
            <input value={id.public_card.headline ?? ''} onChange={(e) => setId({...id, public_card: {...id.public_card, headline: e.target.value}})} placeholder="Headline" aria-label="Headline" className="mt-2 block w-full bg-transparent text-sm" />
          </Card>
          <Card>{vis('profile')}{vis('standing')}{vis('closet')}</Card>
          <Btn onClick={save}>Save what others see</Btn>{saved && <span className="text-xs opacity-60">Saved.</span>}
          <Card><a href="/api/identity/export" className="text-xs underline">Download my data</a></Card>
        </>
      )}
    </RoomFrame>
  );
}
