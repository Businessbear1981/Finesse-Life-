'use client';

import {useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {PlateAction, RoomPlate, type LiveCtx} from '@/components/hotel/room-plate';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';

type Item = {id: string; viewUrl: string | null; label: string | null; category: string | null; brand_guess: string | null; confidence: number | null; model: string | null; state: string; routed_to: string | null};
type CameraData = {items: Item[]};
const CATS = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'bags', 'accessories', 'jewelry', 'beauty', 'home', 'other'];

function ItemCard({item, accent, reload}: {item: Item; accent: string; reload: () => void}) {
  const router = useRouter();
  const [label, setLabel] = useState(item.label ?? '');
  const [category, setCategory] = useState(item.category ?? 'other');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const call = async (url: string, init: Parameters<typeof roomCall>[1]) => {
    setBusy(true);
    const r = await roomCall<{href?: string}>(url, init);
    setBusy(false);
    if (!r.ok) setMsg(r.body.message ?? 'Nothing was changed.');
    return r;
  };
  return (
    <li className="grid gap-3 border border-brass/15 p-3 sm:grid-cols-[120px_1fr]">
      {item.viewUrl
        // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned private photo
        ? <img src={item.viewUrl} alt={item.label ?? 'Your photo'} className="aspect-square w-full object-cover" />
        : <div className="aspect-square w-full border border-dashed border-brass/20" />}
      <div className="space-y-2">
        <p className="font-label text-[9px] uppercase tracking-[0.3em] text-cream/60">
          {item.state}{item.confidence !== null ? ` · confidence ${(item.confidence * 100).toFixed(0)}%` : ''}{item.model ? ` · ${item.model}` : ''}
        </p>
        {item.state === 'uploaded' && (
          <button type="button" disabled={busy} onClick={async () => { if ((await call('/api/camera/identify', {method: 'POST', json: {itemId: item.id}})).ok) reload(); }} className={btnCls} style={{borderColor: accent, color: accent}}>Identify</button>
        )}
        {(item.state === 'identified' || item.state === 'unidentified' || item.state === 'uploaded') && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input aria-label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={item.state === 'unidentified' ? 'Not recognised — name it yourself' : 'Label'} className={fieldCls} maxLength={120} />
            <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className={`${fieldCls} sm:w-40`}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <button type="button" disabled={busy || !label.trim()} onClick={async () => { if ((await call('/api/camera/catalogue', {method: 'POST', json: {itemId: item.id, label, category}})).ok) reload(); }} className={`${btnCls} border-brass/60 text-brass-highlight`}>Catalogue</button>
          </div>
        )}
        {item.state === 'catalogued' && (
          <div className="flex flex-wrap gap-2">
            <span className="font-display text-lg italic">{item.label}</span>
            {(['closet', 'exchange', 'bag'] as const).map((to) => (
              <button key={to} type="button" disabled={busy} onClick={async () => { const r = await call(`/api/camera/items/${item.id}/route`, {method: 'POST', json: {to}}); if (r.ok && r.body.href) router.push(r.body.href); }} className={`${btnCls} border-brass/40 text-cream/80`}>
                {to === 'closet' ? 'Hang in the Closet' : to === 'exchange' ? 'Offer on the Exchange' : 'Find a match in the Bag'}
              </button>
            ))}
          </div>
        )}
        {item.state === 'routed' && <p className="font-body text-sm text-cream/75">{item.label} — sent to {item.routed_to}.</p>}
        <button type="button" disabled={busy} onClick={async () => { if ((await call(`/api/camera/items/${item.id}`, {method: 'DELETE'})).ok) reload(); }} className="min-h-9 font-label text-[9px] uppercase tracking-[0.25em] text-cream/50 hover:text-neon-pink">Delete photo and record</button>
        {msg && <p role="alert" className="font-body text-xs italic text-neon-pink/90">{msg}</p>}
      </div>
    </li>
  );
}

function CameraLive({data, accent, reload}: LiveCtx<CameraData>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const upload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f || !consent) return;
    const fd = new FormData();
    fd.set('file', f);
    fd.set('consent', 'true');
    setBusy(true);
    const r = await roomCall('/api/camera/uploads', {method: 'POST', body: fd});
    setBusy(false);
    setMsg(r.ok ? null : r.body.message ?? 'Nothing was stored.');
    if (r.ok) { if (fileRef.current) fileRef.current.value = ''; reload(); }
  };
  return (
    <div className="space-y-4">
      <div className="space-y-2 border border-brass/20 p-3">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Photo of an item" className="block w-full font-body text-sm text-cream/80" />
        <label className="flex min-h-11 items-center gap-3 font-body text-sm text-cream/80">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Store this photo privately and let the model describe it. I can delete it at any time.
        </label>
        <button type="button" disabled={busy || !consent} onClick={upload} className={btnCls} style={{borderColor: accent, color: accent}}>Scan the rest of the closet</button>
      </div>
      <ul className="space-y-3">{data.items.map((i) => <ItemCard key={i.id} item={i} accent={accent} reload={reload} />)}</ul>
      {msg && <p role="alert" className="font-body text-sm italic text-neon-pink/90">{msg}</p>}
    </div>
  );
}

export default function CameraPage() {
  return (
    <RoomPlate
      roomId="camera"
      liveEndpoint="/api/camera/items"
      isEmpty={(d: CameraData) => d.items.length === 0}
      live={(ctx) => <CameraLive {...ctx} />}
      lede={{
        finesse: 'Point, and the reticle finds the piece — then asks before anything is catalogued or shared.',
        carpe_diem: 'Point, and the reticle finds the object — then asks before anything is catalogued or routed.',
      }}
      emptyCopy="Nothing scanned yet. Your photos stay private until you confirm what happens to them."
      actionConsequence="upload with consent, identify with a confidence score, and catalogue only after you review."
      scene={({accent, reduce, state}) => {
        const resolved = state === 'confirmed';
        return (
          <svg viewBox="0 0 1600 900" className="absolute inset-0 h-full w-full" role="img" aria-label="Dark viewfinder with a calibrated brass reticle">
            <rect width="1600" height="900" fill="#050304" />
            <rect x="100" y="80" width="1400" height="740" fill="none" stroke="#C9A961" strokeOpacity="0.25" />
            {[[100, 80], [1500, 80], [100, 820], [1500, 820]].map(([x, y]) => (
              <path key={`${x}${y}`} d={`M${x + (x > 800 ? -60 : 60)} ${y} H${x} V${y + (y > 450 ? -60 : 60)}`} stroke="#E8C87A" strokeWidth="3" fill="none" />
            ))}
            <motion.g
              initial={false}
              animate={{scale: resolved ? 1 : 1.25, opacity: resolved ? 1 : 0.55, rotate: resolved || reduce ? 0 : 8}}
              transition={{duration: reduce ? 0 : 1}}
              style={{transformOrigin: '800px 450px'}}
            >
              <circle cx="800" cy="450" r="170" fill="none" stroke={resolved ? accent : '#C9A961'} strokeWidth="2" />
              <circle cx="800" cy="450" r="6" fill={resolved ? accent : '#C9A961'} />
              {[0, 90, 180, 270].map((a) => (
                <line key={a} x1={800 + 190 * Math.cos((a * Math.PI) / 180)} y1={450 + 190 * Math.sin((a * Math.PI) / 180)}
                  x2={800 + 230 * Math.cos((a * Math.PI) / 180)} y2={450 + 230 * Math.sin((a * Math.PI) / 180)} stroke="#E8C87A" strokeWidth="3" />
              ))}
            </motion.g>
            <text x="140" y="790" fill="#C9A961" fillOpacity="0.7" fontSize="18" letterSpacing="6">
              {resolved ? 'SAMPLE · CONFIDENCE SHOWN ONLY FROM REAL MODEL OUTPUT' : 'AWAITING MODEL OUTPUT — NEVER GUESSES SILENTLY'}
            </text>
          </svg>
        );
      }}
      preview={({accent, act, acted}) => (
        <div className="space-y-3">
          <p className="font-body text-sm text-cream/80">
            Today, photo intake runs through <Link href="/nightvision" className="underline decoration-brass/50">NightVision</Link> and the
            {' '}<Link href="/stylist" className="underline decoration-brass/50">Stylist</Link>. The Camera will unify them with consent, retention and deletion controls.
          </p>
          <PlateAction label="Scan the rest of the closet" onClick={act} accent={accent} done={acted} />
        </div>
      )}
    />
  );
}
