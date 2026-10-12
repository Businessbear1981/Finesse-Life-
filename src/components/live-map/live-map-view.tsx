'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {bboxAround, bboxParam, type MapDot, type MapEvent, type MapSnapshot} from '@/lib/live-map';
import {AUSTIN, demoCrowd} from './demo-city';
import type {LatLng} from './hologram-map';

const HologramMap = dynamic(() => import('./hologram-map').then((m) => m.HologramMap), {ssr: false});

const POLL_MS = 15_000;
const PING_MS = 60_000;

function defaultCenter(): LatLng {
  const raw = process.env.NEXT_PUBLIC_MAP_DEFAULT_CENTER;
  const [lat, lng] = (raw ?? '').split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : AUSTIN;
}

type Status = 'loading' | 'live' | 'signed_out' | 'error';

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});

export function LiveMapView({mode = 'live'}: {mode?: 'live' | 'demo'}) {
  const demo = mode === 'demo';
  const [center, setCenter] = useState<LatLng>(() => (demo ? AUSTIN : defaultCenter()));
  const [crowd] = useState(() => (demo ? demoCrowd() : null));
  const [dots, setDots] = useState<MapDot[]>(crowd?.dots ?? []);
  const [events, setEvents] = useState<MapEvent[]>(crowd?.events ?? []);
  const [status, setStatus] = useState<Status>(demo ? 'live' : 'loading');
  const [sharing, setSharing] = useState(demo);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [fix, setFix] = useState<LatLng | null>(demo ? {lat: 30.2668, lng: -97.7431} : null);
  const [selected, setSelected] = useState<{event: MapEvent; at: number} | null>(null);
  const viewCentre = useRef<LatLng>(center);

  // ── Demo: a simulated night, members drifting between spots ──────────────────────────
  useEffect(() => {
    if (!demo) return;
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      setDots((ds) => ds.map((d, i) => (i % 7 === tick % 7
        ? {...d, lat: d.lat + (Math.random() - 0.5) * 0.0004, lng: d.lng + (Math.random() - 0.5) * 0.0004}
        : d)));
    }, 1500);
    return () => clearInterval(id);
  }, [demo]);

  // ── Live: poll the members-only snapshot for the area in view ──────────────────────────
  const load = useCallback(async () => {
    const c = viewCentre.current;
    try {
      const res = await fetch(`/api/map/snapshot?bbox=${bboxParam(bboxAround(c.lat, c.lng))}`, {cache: 'no-store'});
      if (res.status === 401) return setStatus('signed_out');
      if (!res.ok) return setStatus('error');
      const snap = (await res.json()) as MapSnapshot;
      setDots(snap.dots);
      setEvents(snap.events);
      setSharing(snap.sharing);
      setStatus('live');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (demo) return;
    const first = setTimeout(load, 0);
    const id = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [demo, load]);

  // Refresh soon after the member pans somewhere new.
  const panTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViewChange = useCallback((c: LatLng) => {
    viewCentre.current = c;
    if (demo) return;
    if (panTimer.current) clearTimeout(panTimer.current);
    panTimer.current = setTimeout(load, 900);
  }, [demo, load]);

  // ── Sharing: device fix → coarse server ping every minute while on ─────────────────────
  const locate = () => new Promise<LatLng>((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({lat: p.coords.latitude, lng: p.coords.longitude}),
      (e) => reject(e),
      {enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000},
    );
  });

  const ping = useCallback(async (at: LatLng) => {
    const res = await fetch('/api/map/presence', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(at),
    });
    if (!res.ok) throw new Error(String(res.status));
  }, []);

  useEffect(() => {
    if (demo || !sharing) return;
    const id = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const at = await locate();
        setFix(at);
        await ping(at);
      } catch { /* next tick retries */ }
    }, PING_MS);
    return () => clearInterval(id);
  }, [demo, sharing, ping]);

  const toggleSharing = async () => {
    if (demo) return setSharing((s) => !s);
    setBusy(true);
    setNote(null);
    try {
      if (sharing) {
        const res = await fetch('/api/map/presence', {method: 'DELETE'});
        if (!res.ok) throw new Error('ghost');
        setSharing(false);
        setFix(null);
        setNote('Ghost mode. Your dot is gone.');
      } else {
        const at = await locate();
        await ping(at);
        setFix(at);
        setCenter(at);
        viewCentre.current = at;
        setSharing(true);
        setNote('You’re on the map, about a block from where you are. Never exact.');
        load();
      }
    } catch (e) {
      const denied = (e as GeolocationPositionError)?.code === 1;
      setNote(denied ? 'Location is off for Finesse. Turn it on in your browser to appear.' : 'Couldn’t reach the map. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const nearMe = async () => {
    try {
      const at = await locate();
      setFix(at);
      setCenter(at);
      viewCentre.current = at;
      if (!demo) load();
    } catch {
      setNote('Location is off for Finesse.');
    }
  };

  const counts = useMemo(() => ({
    f: dots.filter((d) => d.kind === 'f').length,
    m: dots.filter((d) => d.kind === 'm').length,
    x: dots.filter((d) => d.kind === 'x').length,
  }), [dots]);

  const me = sharing && fix ? {...fix, kind: 'x' as const} : null;

  return (
    <div className="lm">
      <style>{CSS}</style>
      <div className="lm-map">
        <HologramMap
          center={center}
          dots={dots}
          events={events}
          me={me}
          city={demo ? 'demo' : 'live'}
          onViewChange={onViewChange}
          onSelectEvent={(e) => setSelected(e ? {event: e, at: Date.now()} : null)}
        />
      </div>
      <div className="lm-scan" aria-hidden />
      <div className="lm-vignette" aria-hidden />

      <header className="lm-top">
        <Link href="/lounge" className="lm-back" aria-label="Back to the Lounge">←</Link>
        <span className="lm-mark">FINESSE</span>
        <span className={`lm-live ${status === 'live' ? '' : 'lm-live-off'}`}>
          <i /> {status === 'live' ? 'LIVE' : status === 'loading' ? 'TUNING' : 'OFFLINE'}
        </span>
      </header>

      <div className="lm-title">
        <h1>The city, <em>tonight.</em></h1>
        <ul className="lm-legend">
          <li><i className="lm-f" />{counts.f} women</li>
          <li><i className="lm-m" />{counts.m} men</li>
          {counts.x > 0 && <li><i className="lm-x" />{counts.x} members</li>}
          <li><i className="lm-e" />{events.length} events</li>
        </ul>
      </div>

      {status === 'signed_out' && (
        <div className="lm-gate">
          <p className="lm-k">Members only</p>
          <h2>The map is for the house.</h2>
          <Link href="/login?next=/lounge/map" className="lm-btn">Sign in</Link>
        </div>
      )}
      {status === 'error' && <p className="lm-err">The map is out of signal. Retrying…</p>}

      <section className="lm-sheet">
        {selected ? (
          <div className="lm-event">
            <button className="lm-x-btn" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <p className="lm-k lm-yellow">{Date.parse(selected.event.startsAt) <= selected.at ? 'Happening now' : `Starts ${fmtTime(selected.event.startsAt)}`}</p>
            <h3>{selected.event.title}</h3>
            <p className="lm-sub">{selected.event.venue ?? 'Location on the map'} · until {fmtTime(selected.event.endsAt)}</p>
          </div>
        ) : (
          <div className="lm-share">
            <div>
              <p className="lm-share-h">{sharing ? 'You’re on the map' : 'Ghost mode'}</p>
              <p className="lm-sub">{sharing ? 'Shown within a block, never exact. No name, no photo.' : 'Nobody sees you. Turn on to appear as a dot.'}</p>
            </div>
            <button className={`lm-toggle ${sharing ? 'on' : ''}`} onClick={toggleSharing} disabled={busy || status === 'signed_out'}
              role="switch" aria-checked={sharing} aria-label="Share my dot">
              <i />
            </button>
          </div>
        )}
        {note && <p className="lm-note" role="status">{note}</p>}
        <button className="lm-near" onClick={nearMe}>◎ Near me</button>
      </section>
    </div>
  );
}

const CSS = `
.lm{position:fixed;inset:0;z-index:60;background:radial-gradient(120% 80% at 50% 40%,#04101c 0%,#020409 55%,#000 100%);color:#EDEBE7;overflow:hidden;font-family:var(--d-sans),system-ui,sans-serif}
.lm-map{position:absolute;inset:0}
.lm-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,220,255,.035) 0 1px,transparent 1px 3px);mix-blend-mode:screen}
.lm-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 70% at 50% 45%,transparent 50%,rgba(0,0,0,.85) 100%),linear-gradient(180deg,rgba(0,0,0,.75) 0%,transparent 26%,transparent 66%,rgba(0,0,0,.85) 100%)}
.lm-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + 16px);left:16px;right:16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.lm-back{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#fff;text-decoration:none;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(12px)}
.lm-mark{font-weight:700;letter-spacing:.42em;font-size:12px;background:linear-gradient(90deg,#fff,#8E9298 45%,#fff 60%,#9a9ca2);-webkit-background-clip:text;background-clip:text;color:transparent}
.lm-live{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.18em;padding:7px 11px;border-radius:99px;background:rgba(255,46,160,.12);border:1px solid rgba(255,46,160,.4);color:#ff7ac4}
.lm-live i{width:7px;height:7px;border-radius:50%;background:#ff2ea0;box-shadow:0 0 10px #ff2ea0;animation:lm-blink 1.4s ease-in-out infinite}
.lm-live-off{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.18);color:#999}.lm-live-off i{background:#777;box-shadow:none;animation:none}
@keyframes lm-blink{50%{opacity:.25}}
.lm-title{position:absolute;top:calc(env(safe-area-inset-top,0px) + 70px);left:20px;right:20px;pointer-events:none}
.lm-title h1{margin:0;font-family:var(--d-serif),serif;font-weight:400;font-size:44px;line-height:1;letter-spacing:-.01em;text-shadow:0 0 30px rgba(0,200,255,.35)}
.lm-title h1 em{color:#e6ff00;text-shadow:0 0 24px rgba(230,255,0,.55)}
.lm-legend{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:rgba(255,255,255,.75);font-variant-numeric:tabular-nums}
.lm-legend li{display:flex;align-items:center;gap:6px}
.lm-legend i{width:8px;height:8px;border-radius:50%}
.lm-f{background:#ff2ea0;box-shadow:0 0 10px #ff2ea0}.lm-m{background:#00c8ff;box-shadow:0 0 10px #00c8ff}
.lm-x{background:#ebebff;box-shadow:0 0 10px #ebebff}.lm-e{background:#e6ff00;box-shadow:0 0 10px #e6ff00}
.lm-sheet{position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);padding:16px 18px;border-radius:24px;background:rgba(6,10,16,.72);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(0,200,255,.18);box-shadow:0 0 40px rgba(0,200,255,.08)}
.lm-share{display:flex;align-items:center;justify-content:space-between;gap:14px}
.lm-share-h{margin:0;font-size:16px;font-weight:700}
.lm-sub{margin:3px 0 0;font-size:12.5px;line-height:1.35;color:rgba(255,255,255,.6)}
.lm-toggle{flex:none;width:54px;height:32px;border-radius:99px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);position:relative;cursor:pointer;transition:background .2s}
.lm-toggle i{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#bbb;transition:transform .2s,background .2s}
.lm-toggle.on{background:rgba(255,46,160,.3);border-color:#ff2ea0;box-shadow:0 0 18px rgba(255,46,160,.45)}
.lm-toggle.on i{transform:translateX(22px);background:#fff}
.lm-toggle:disabled{opacity:.5}
.lm-event h3{margin:2px 0 0;font-family:var(--d-serif),serif;font-weight:400;font-style:italic;font-size:30px;line-height:1.05}
.lm-k{margin:0;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.lm-yellow{color:#e6ff00;text-shadow:0 0 12px rgba(230,255,0,.5)}
.lm-event{position:relative}
.lm-x-btn{position:absolute;top:-6px;right:-6px;width:30px;height:30px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:18px;cursor:pointer}
.lm-note{margin:10px 0 0;font-size:12px;color:#9fe9ff}
.lm-near{position:absolute;right:6px;top:-48px;padding:9px 14px;border-radius:99px;border:1px solid rgba(255,255,255,.16);background:rgba(6,10,16,.7);backdrop-filter:blur(14px);color:#fff;font-size:12px;font-weight:600;cursor:pointer}
.lm-gate{position:absolute;left:20px;right:20px;top:42%;padding:22px;border-radius:24px;text-align:center;background:rgba(6,10,16,.8);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12)}
.lm-gate h2{margin:6px 0 16px;font-family:var(--d-serif),serif;font-weight:400;font-style:italic;font-size:30px}
.lm-btn{display:inline-block;padding:12px 22px;border-radius:99px;background:#fff;color:#000;font-weight:700;font-size:14px;text-decoration:none}
.lm-err{position:absolute;left:0;right:0;top:46%;text-align:center;font-size:13px;color:#9fe9ff}
@media (prefers-reduced-motion: reduce){.lm-live i{animation:none}}
`;
