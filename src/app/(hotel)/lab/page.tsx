'use client';

// The Lab — real generation jobs (media_jobs) through the studio vendors (ElevenLabs, Higgsfield, Meshy, Suno).
// GET/POST /api/lab/jobs, GET /api/lab/jobs/:id (polls the vendor), POST …/approve | …/discard.
// When a studio's vendor key isn't configured on the server, the job is saved as "needs key" and the Lab says which
// studio isn't connected — nothing is sent or generated. Nova can draft the prompt (POST /api/nova, concierge).
// Signed out, the studios are shown but nothing can be created.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { roomCall } from '@/lib/room-client';
import { CONSENT_DECLINED_TEXT, ensureAiConsent } from '@/components/nova/ai-consent';

const TOOLS = [
  { id: 'voice', name: 'Voice Studio', sub: 'Text to speech', icon: '🎙', placeholder: 'Type what you want Nova to say...' },
  { id: 'video', name: 'Video Studio', sub: 'Text to video', icon: '▶', placeholder: 'Describe your cinematic shot...' },
  { id: 'image', name: 'Image Studio', sub: 'Text to image', icon: '◈', placeholder: 'Describe the image you see...' },
  { id: '3d', name: '3D Studio', sub: 'Text to 3D', icon: '△', placeholder: 'Describe your 3D object...' },
  { id: 'music', name: 'Music Studio', sub: 'Text to music', icon: '♫', placeholder: 'Describe the vibe, genre, or lyrics...' },
] as const;

type Tool = (typeof TOOLS)[number];
type StudioType = Tool['id'];
type Studio = { type: StudioType; name: string; vendor: string; connected: boolean };
type Job = {
  id: string; type: StudioType; prompt: string | null; style: string | null;
  status: 'queued' | 'needs_key' | 'processing' | 'complete' | 'failed' | 'approved' | 'discarded';
  result_url: string | null; result_mime: string | null; error_message: string | null; created_at: string;
};
type Mode = 'loading' | 'live' | 'signed_out' | 'closed' | 'error';

const STYLE_OPTIONS: Record<string, string[]> = {
  voice: ['Warm', 'Confident', 'Dramatic', 'Playful'],
  video: ['Cinematic', 'Documentary', 'Fashion editorial', 'Lo-fi'],
  image: ['Editorial', 'Moody', 'Golden hour', 'Studio'],
  '3d': ['Realistic', 'Stylized', 'Minimal', 'Luxury'],
  music: ['Lo-fi', 'Hip-hop', 'Afrobeats', 'Cinematic', 'R&B'],
};
const STATUS_LABEL: Record<Job['status'], string> = {
  queued: 'Queued', needs_key: 'Studio not connected', processing: 'In the studio…', complete: 'Ready for your review',
  failed: 'The studio could not finish', approved: 'Kept in your library', discarded: 'Discarded',
};
const serif = { fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic' as const };
const garamond = { fontFamily: '"Cormorant Garamond", Georgia, serif' };
const cinzel = { fontFamily: '"Cinzel", serif' };

function ResultPreview({ job }: { job: Job }) {
  if (!job.result_url) return null;
  if (job.type === 'voice' || job.type === 'music') return <audio controls src={job.result_url} className="mt-3 w-full" />;
  if (job.type === 'video') return <video controls src={job.result_url} className="mt-3 w-full" />;
  // eslint-disable-next-line @next/next/no-img-element
  if (job.type === 'image') return <img src={job.result_url} alt={job.prompt ?? 'Generated image'} className="mt-3 w-full" />;
  return <a href={job.result_url} target="_blank" rel="noreferrer" className="mt-3 inline-block min-h-11 py-3 font-label text-[10px] uppercase tracking-[0.3em] text-brass">Open the 3D model ›</a>;
}

export default function Lab() {
  const [edition, setEdition] = useState<'finesse' | 'carpe_diem'>('finesse');
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [mode, setMode] = useState<Mode>('loading');
  const [studios, setStudios] = useState<Studio[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only side preference
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  const load = useCallback(async () => {
    const r = await roomCall<{ jobs?: Job[]; studios?: Studio[] }>('/api/lab/jobs');
    if (r.ok) { setJobs(r.body.jobs ?? []); setStudios(r.body.studios ?? []); setMode('live'); }
    else setMode(r.status === 401 ? 'signed_out' : r.status === 503 ? 'closed' : 'error');
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the awaited fetch
  useEffect(() => { void load(); }, [load]);

  // Jobs in the studio are polled (the vendor webhook may also finish them first).
  const processingIds = jobs.filter((j) => j.status === 'processing').map((j) => j.id).join(',');
  useEffect(() => {
    if (!processingIds) return;
    const t = setInterval(async () => {
      for (const id of processingIds.split(',')) {
        const r = await roomCall<{ job?: Job }>(`/api/lab/jobs/${id}`);
        if (r.ok && r.body.job) setJobs((js) => js.map((j) => (j.id === id ? r.body.job! : j)));
      }
    }, 8000);
    return () => clearInterval(t);
  }, [processingIds]);

  const accent = edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';
  const live = mode === 'live';
  const studioFor = (id: StudioType) => studios.find((s) => s.type === id);

  const openTool = (tool: Tool) => { setActiveTool(tool); setPrompt(''); setSelectedStyle(''); setMsg(null); };
  const closeTool = () => { setActiveTool(null); setPrompt(''); setSelectedStyle(''); setMsg(null); };

  const draftWithNova = async () => {
    if (!activeTool || busy) return;
    setMsg(null);
    if (!(await ensureAiConsent('ai_processing'))) { setMsg({ ok: false, text: CONSENT_DECLINED_TEXT }); return; }
    setBusy('nova');
    const idea = prompt.trim() || 'Surprise me with something on-brand for a members-only after-hours club.';
    const r = await roomCall<{ text?: string; error?: string }>('/api/nova', {
      method: 'POST',
      json: {
        persona: 'concierge',
        prompt: `Write one ready-to-use prompt for a ${activeTool.sub.toLowerCase()} generator (${activeTool.name}). ${selectedStyle ? `Style: ${selectedStyle}. ` : ''}The member's idea: ${JSON.stringify(idea)}. Reply with the prompt only — no preamble, no quotes, under 80 words.`,
      },
    });
    setBusy(null);
    if (r.ok && r.body.text) { setPrompt(r.body.text.trim().replace(/^["“]|["”]$/g, '').slice(0, 1000)); setMsg({ ok: true, text: 'Nova drafted this prompt. Edit it freely before you send it.' }); }
    else setMsg({ ok: false, text: r.status === 429 ? 'Nova needs a breather — try again in a minute.' : 'Nova could not draft a prompt right now. Nothing was sent.' });
  };

  const generate = async () => {
    if (!activeTool || !prompt.trim() || busy) return;
    setBusy('gen'); setMsg(null);
    const r = await roomCall<{ job?: Job; message?: string }>('/api/lab/jobs', { method: 'POST', json: { type: activeTool.id, prompt: prompt.trim(), style: selectedStyle || undefined } });
    setBusy(null);
    if (r.ok && r.body.job) {
      setJobs((js) => [r.body.job!, ...js]);
      setMsg({ ok: r.body.job.status !== 'failed', text: r.body.message ?? STATUS_LABEL[r.body.job.status] });
      if (r.body.job.status !== 'needs_key' && r.body.job.status !== 'failed') setPrompt('');
    } else setMsg({ ok: false, text: r.status === 401 ? 'Sign in to use the studios. Nothing was sent.' : r.status === 429 ? 'Too many in a row — try again in a minute. Nothing was sent.' : r.status === 400 ? 'Write a little more for the studio. Nothing was sent.' : 'The Lab did not answer. Nothing was sent.' });
  };

  const review = async (job: Job, verb: 'approve' | 'discard') => {
    setBusy(job.id); setMsg(null);
    const r = await roomCall<{ job?: Job; message?: string }>(`/api/lab/jobs/${job.id}/${verb}`, { method: 'POST' });
    setBusy(null);
    if (!r.ok) setMsg({ ok: false, text: r.body.message ?? 'Nothing was changed.' });
    void load();
  };

  const styles: string[] = activeTool ? (STYLE_OPTIONS[activeTool.id] ?? []) : [];
  const activeStudio = activeTool ? studioFor(activeTool.id) : undefined;
  const toolJobs = activeTool ? jobs.filter((j) => j.type === activeTool.id) : jobs;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="min-h-screen relative overflow-hidden" style={{ background: '#0A0406' }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] max-w-full h-[400px] transition-all duration-1000" style={{ background: `radial-gradient(ellipse at center, ${accent}10 0%, transparent 70%)` }} />
      </div>

      <header className="text-center pt-12 pb-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1 className="text-5xl tracking-[0.25em] mb-2" style={{ ...serif, color: '#C9A961' }}>THE LAB</h1>
          <p className="text-[10px] tracking-[0.5em] uppercase" style={{ ...cinzel, color: 'rgba(244,232,208,0.35)' }}>create. generate. drop.</p>
          <p className="mt-4 font-label text-[9px] uppercase tracking-[0.35em] text-cream/50">
            {mode === 'loading' ? 'Opening the studios…'
              : live ? `${studios.filter((s) => s.connected).length} of ${studios.length} studios connected`
                : mode === 'signed_out' ? 'Sign in to create · preview of the studios'
                  : mode === 'closed' ? 'The Lab opens once this room is fitted out' : 'The Lab did not answer'}
          </p>
        </motion.div>
      </header>

      <div className="max-w-xl mx-auto px-4 relative z-10 pb-16">
        {mode === 'error' && (
          <div role="alert" className="mb-6 border border-neon-pink/40 p-4 text-center">
            <p className="font-body text-sm text-cream/80">Nothing was changed.</p>
            <button type="button" onClick={() => { setMode('loading'); void load(); }} className="mt-2 min-h-11 font-label text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>Try again</button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {!activeTool && (
            <motion.div key="grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
              <div className="grid grid-cols-2 gap-4">
                {TOOLS.map((tool, i) => {
                  const isLast = i === TOOLS.length - 1;
                  const studio = studioFor(tool.id);
                  const tag = live ? (studio?.connected ? 'connected' : 'not connected yet') : mode === 'signed_out' ? 'sign in to create' : '';
                  return (
                    <motion.button key={tool.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }} onClick={() => openTool(tool)}
                      className={`flex flex-col items-center gap-3 p-6 border transition-all duration-300 active:scale-95${isLast ? ' col-span-2 max-w-[calc(50%-8px)] mx-auto w-full' : ''}`}
                      style={{ borderColor: studio?.connected ? `${accent}55` : 'rgba(201,169,97,0.2)', background: 'rgba(10,4,6,0.7)' }}>
                      <span className="text-4xl leading-none" aria-hidden="true">{tool.icon}</span>
                      <span className="text-lg text-center leading-snug" style={{ ...serif, color: '#C9A961' }}>{tool.name}</span>
                      <span className="text-xs text-center italic" style={{ ...garamond, color: 'rgba(244,232,208,0.5)' }}>{tool.sub}</span>
                      {tag && <span className="text-[8px] tracking-[0.25em] uppercase" style={{ ...cinzel, color: studio?.connected ? accent : 'rgba(244,232,208,0.45)' }}>{tag}</span>}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTool && (
            <motion.div key="studio" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
              <button onClick={closeTool} className="mb-8 min-h-11 text-sm transition-colors duration-200 hover:text-brass" style={{ ...garamond, color: 'rgba(244,232,208,0.55)' }}>← all tools</button>

              <div className="text-center mb-6">
                <span className="text-5xl mb-3 block" aria-hidden="true">{activeTool.icon}</span>
                <h2 className="text-3xl mb-1" style={{ ...serif, color: '#C9A961' }}>{activeTool.name}</h2>
                <p className="text-xs italic" style={{ ...garamond, color: 'rgba(244,232,208,0.5)' }}>{activeTool.sub}{activeStudio ? ` · ${activeStudio.vendor}` : ''}</p>
              </div>

              {live && activeStudio && !activeStudio.connected && (
                <p className="mb-5 border border-brass/25 p-3 text-center font-body text-sm italic text-cream/75">
                  The {activeStudio.name} isn&apos;t connected yet ({activeStudio.vendor}). You can still save a prompt — it waits here and nothing is sent or generated.
                </p>
              )}

              <div className="border p-5 mb-5" style={{ borderColor: 'rgba(201,169,97,0.25)', background: 'rgba(10,4,6,0.8)' }}>
                <label htmlFor="lab-prompt" className="sr-only">Prompt</label>
                <textarea id="lab-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={activeTool.placeholder} rows={4} maxLength={1000}
                  className="w-full bg-transparent focus:outline-none resize-none text-sm" style={{ ...garamond, color: '#F4E8D0', caretColor: accent }} />
              </div>

              {styles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {styles.map((s) => {
                    const isActive = selectedStyle === s;
                    return (
                      <button key={s} onClick={() => setSelectedStyle(isActive ? '' : s)} aria-pressed={isActive} className="min-h-9 px-3 py-1 text-[10px] tracking-[0.15em] uppercase transition-all duration-200"
                        style={{ ...cinzel, color: isActive ? '#0A0406' : 'rgba(244,232,208,0.5)', background: isActive ? accent : 'transparent', border: `1px solid ${isActive ? accent : 'rgba(244,232,208,0.12)'}` }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}

              {live ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={draftWithNova} disabled={!!busy} className="min-h-12 flex-1 border py-3 text-[11px] tracking-[0.3em] uppercase disabled:opacity-40" style={{ ...cinzel, borderColor: `${accent}80`, color: accent }}>
                    {busy === 'nova' ? 'Nova is writing…' : 'Draft with Nova'}
                  </button>
                  <button type="button" onClick={generate} disabled={!!busy || prompt.trim().length < 3} className="min-h-12 flex-1 py-3 text-[11px] tracking-[0.3em] uppercase disabled:opacity-30 disabled:cursor-not-allowed" style={{ ...cinzel, background: accent, color: '#0A0406', border: `1px solid ${accent}` }}>
                    {busy === 'gen' ? 'Sending…' : activeStudio?.connected ? 'Generate' : 'Save the prompt'}
                  </button>
                </div>
              ) : (
                <Link href="/login" className="block min-h-12 w-full py-4 text-center text-[11px] tracking-[0.35em] uppercase" style={{ ...cinzel, background: accent, color: '#0A0406' }}>
                  Sign in to create
                </Link>
              )}
              {msg && <p role="status" className="mt-4 text-center font-body text-sm italic" style={{ color: msg.ok ? 'rgba(244,232,208,0.75)' : `${accent}DD` }}>{msg.text}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {live && (
          <section aria-labelledby="lab-log" className="mt-10">
            <h2 id="lab-log" className="mb-3 text-center font-label text-[10px] uppercase tracking-[0.4em] text-brass/70">{activeTool ? `Your ${activeTool.name.toLowerCase()} log` : 'Your studio log'}</h2>
            {toolJobs.length === 0 ? (
              <p className="text-center font-body text-sm italic text-cream/55">Nothing created yet — pick a studio and write a prompt.</p>
            ) : (
              <ul className="space-y-3">
                {toolJobs.map((j) => (
                  <li key={j.id} className="border border-brass/15 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-body text-sm text-cream/85">{j.prompt}</p>
                      <span className="shrink-0 font-label text-[8px] uppercase tracking-[0.2em]" style={{ color: j.status === 'complete' || j.status === 'approved' ? '#7AF5B8' : 'rgba(244,232,208,0.55)' }}>{STATUS_LABEL[j.status]}</span>
                    </div>
                    <p className="mt-1 font-label text-[8px] uppercase tracking-[0.2em] text-cream/40">{TOOLS.find((t) => t.id === j.type)?.name}{j.style ? ` · ${j.style}` : ''} · {new Date(j.created_at).toLocaleString()}</p>
                    {(j.status === 'needs_key' || j.status === 'failed') && j.error_message && <p className="mt-2 font-body text-xs italic text-cream/60">{j.error_message}</p>}
                    <ResultPreview job={j} />
                    {j.status !== 'approved' && (
                      <div className="mt-3 flex gap-2">
                        {j.status === 'complete' && <button type="button" disabled={busy === j.id} onClick={() => review(j, 'approve')} className="min-h-10 border px-3 font-label text-[9px] uppercase tracking-[0.25em] disabled:opacity-40" style={{ borderColor: accent, color: accent }}>Keep it</button>}
                        <button type="button" disabled={busy === j.id} onClick={() => review(j, 'discard')} className="min-h-10 border border-brass/20 px-3 font-label text-[9px] uppercase tracking-[0.25em] text-cream/55 disabled:opacity-40">Discard</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <div className="text-center pb-10 relative z-10">
        <Link href="/lobby" className="text-sm transition-colors duration-200 hover:text-brass" style={{ ...garamond, color: 'rgba(244,232,208,0.35)' }}>return to the lobby</Link>
      </div>
    </motion.div>
  );
}
