'use client';
import {useRef, useState} from 'react';
import {RoomFrame, Card, Btn, api} from '@/components/rooms/room-frame';

type Result = {title: string; brand: string; category: string; confidence: number; evidence: string; estimated_price_cents: number};
export default function CameraPage() {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'working' | 'review' | 'saved' | 'error'>('idle');
  const [scan, setScan] = useState<{id: string; result: Result; unsure: boolean} | null>(null);
  const [msg, setMsg] = useState('');
  const identify = async () => {
    const f = input.current?.files?.[0]; if (!f) return;
    setState('working');
    try {
      const {id} = await api<{id: string}>('/api/camera/uploads', {method: 'POST'});
      const fd = new FormData(); fd.append('scan_id', id); fd.append('file', f);
      const r = await fetch('/api/camera/identify', {method: 'POST', body: fd});
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'identification unavailable');
      setScan({id, result: j.result, unsure: j.unsure}); setState('review');
    } catch (e) { setMsg((e as Error).message); setState('error'); }
  };
  const catalogue = async () => {
    if (!scan) return;
    try { await api('/api/camera/catalogue', {method: 'POST', body: JSON.stringify({scan_id: scan.id})}); setState('saved'); } catch (e) { setMsg((e as Error).message); setState('error'); }
  };
  return (
    <RoomFrame title="The Camera" subtitle="Scan a piece. Nothing is saved until you confirm." status={state === 'working' ? {kind: 'loading', text: 'Reading the piece…'} : state === 'error' ? {kind: 'error', text: msg} : {kind: 'ok'}}>
      <Card>
        <input ref={input} type="file" accept="image/*" capture="environment" aria-label="Photo of an item" className="text-xs" />
        <Btn onClick={identify} disabled={state === 'working'}>Identify</Btn>
      </Card>
      {scan && state !== 'idle' && (
        <Card>
          <p className="text-sm">{scan.result.brand} {scan.result.title}</p>
          <p className="text-[10px] uppercase tracking-widest opacity-60">{scan.result.category} · confidence {Math.round(scan.result.confidence * 100)}%{scan.unsure ? ' · unsure, please check' : ''}</p>
          <p className="mt-1 text-xs opacity-60">{scan.result.evidence}</p>
          {state === 'review' && <Btn onClick={catalogue}>Add to my closet</Btn>}
          {state === 'saved' && <p className="mt-2 text-xs">Saved to your closet. Scan the rest.</p>}
        </Card>
      )}
    </RoomFrame>
  );
}
