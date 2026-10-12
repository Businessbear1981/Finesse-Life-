'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {RoomFrame, Card, Btn, api} from '@/components/rooms/room-frame';

// Jazz Club: Feed.fm Streaming API v3, played directly from the member's device (geo-IP licensing).
// The Worker only hands out the member's persistent client id and a short-lived access token.
type Creds = {client_id: string; token: string; secret: string; api_base: string; attribution: string; disclaimer: string};
type Station = {id: string; uuid: string; name: string};
type Play = {id: string; can_skip?: boolean; audio_file: {url: string; track: {title: string}; artist: {name: string}; release: {title: string}}};

export default function JazzClubPage() {
  const [creds, setCreds] = useState<Creds | null>(null);
  const [stations, setStations] = useState<Station[] | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [play, setPlay] = useState<Play | null>(null);
  const [canSkip, setCanSkip] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const invalidations = useRef(0);
  const started = useRef<string | null>(null);

  const feed = useCallback(async <T,>(path: string, body: Record<string, unknown> = {}): Promise<T> => {
    if (!creds) throw new Error('not connected');
    const r = await fetch(`${creds.api_base}${path}`, {
      method: 'POST',
      headers: {'X-Authorization': 'Basic ' + btoa(`${creds.token}:${creds.secret}`), 'Content-Type': 'application/json'},
      body: JSON.stringify({client_id: creds.client_id, ...body}),
    });
    const j = await r.json().catch(() => ({success: false}));
    if (!j.success) throw Object.assign(new Error(j.error?.message ?? 'Music unavailable'), {code: j.error?.code});
    return j as T;
  }, [creds]);

  useEffect(() => {
    api<Creds>('/api/jazz/session', {method: 'POST'}).then(setCreds, (e: Error) => setErr(e.message === 'music_not_configured' ? 'The Jazz Club opens once the music licence is switched on.' : e.message));
  }, []);

  useEffect(() => {
    if (!creds) return;
    feed<{session: {available: boolean}; stations?: Station[]}>('/session').then((r) => {
      if (!r.session.available) { setErr('Music is not available in your region.'); setStations([]); return; }
      setStations(r.stations ?? []);
    }, (e: Error) => setErr(e.message));
  }, [creds, feed]);

  const next = useCallback(async (st: Station) => {
    try {
      const r = await feed<{play: Play}>('/play', {station_id: st.id, formats: 'mp3,aac'});
      setPlay(r.play); setCanSkip(false);
    } catch (e) {
      const code = (e as {code?: number}).code;
      setPlay(null);
      setErr(code === 9 ? 'That set is over. Pick another room.' : (e as Error).message);
    }
  }, [feed]);

  useEffect(() => {
    if (!play || !audio.current) return;
    audio.current.src = play.audio_file.url;
    audio.current.play().catch(() => setErr('Tap play to start the music.'));
  }, [play]);

  // Report elapsed listening time every 20s while playing (Feed.fm: every 10–30s and on pause).
  useEffect(() => {
    const t = setInterval(() => {
      const a = audio.current;
      if (play && a && !a.paused && started.current === play.id) void feed(`/play/${play.id}/elapse`, {seconds: Math.floor(a.currentTime)}).catch(() => {});
    }, 20_000);
    return () => clearInterval(t);
  }, [play, feed]);

  const onPlaying = async () => {
    if (!play || started.current === play.id) return;
    started.current = play.id; invalidations.current = 0;
    setShowMeta(true); setTimeout(() => setShowMeta(false), 5000);
    try { const r = await feed<{can_skip?: boolean}>(`/play/${play.id}/start`); setCanSkip(r.can_skip !== false); } catch { /* reported below on next action */ }
  };
  const onPause = () => { if (play && audio.current && started.current === play.id) void feed(`/play/${play.id}/elapse`, {seconds: Math.floor(audio.current.currentTime)}).catch(() => {}); };
  const onEnded = async () => { if (!play || !station) return; await feed(`/play/${play.id}/complete`).catch(() => {}); await next(station); };
  const onError = async () => {
    if (!play || !station) return;
    const expired = (() => { try { const e = new URL(play.audio_file.url).searchParams.get('Expires'); return e ? Number(e) * 1000 < Date.now() : false; } catch { return false; } })();
    if (!expired) {
      if (++invalidations.current > 3) { setErr('Playback failed. Try again shortly.'); return; }
      await feed(`/play/${play.id}/invalidate`).catch(() => {});
    }
    await next(station);
  };
  const skip = async () => {
    if (!play || !station || !canSkip) return;
    try { await feed(`/play/${play.id}/skip`); await next(station); } catch (e) { setCanSkip(false); setErr((e as {code?: number}).code === 7 ? 'No more skips for now.' : (e as Error).message); }
  };

  return (
    <RoomFrame title="The Jazz Club" subtitle="Low light, live standards, no requests." status={err ? {kind: 'error', text: err} : stations === null ? {kind: 'loading'} : stations.length ? {kind: 'ok'} : {kind: 'empty', text: 'No sets tonight.'}}>
      {stations?.map((s) => (
        <Card key={s.uuid}>
          <div className="flex items-center justify-between"><span className="text-sm">{s.name}</span>
            <Btn onClick={() => { setErr(null); setStation(s); started.current = null; void next(s); }} aria-pressed={station?.uuid === s.uuid}>{station?.uuid === s.uuid ? 'Playing' : 'Play'}</Btn></div>
        </Card>
      ))}
      {play && (
        <Card>
          <p className="text-sm" aria-live="polite">{play.audio_file.track.title}</p>
          <p className={`text-xs transition-opacity ${showMeta ? 'opacity-90' : 'opacity-60'}`}>{play.audio_file.artist.name} · {play.audio_file.release.title}</p>
          <audio ref={audio} controls className="mt-3 w-full" onPlaying={onPlaying} onPause={onPause} onEnded={onEnded} onError={onError} />
          <Btn onClick={skip} disabled={!canSkip}>Skip</Btn>
        </Card>
      )}
      {creds && (
        <footer className="pt-4 text-center text-[10px] uppercase tracking-widest opacity-60">
          {creds.attribution} · <button type="button" className="underline" onClick={() => setShowDisclaimer((v) => !v)}>Music disclaimer</button>
          {showDisclaimer && <p className="mt-2 normal-case tracking-normal">{creds.disclaimer}</p>}
        </footer>
      )}
    </RoomFrame>
  );
}
