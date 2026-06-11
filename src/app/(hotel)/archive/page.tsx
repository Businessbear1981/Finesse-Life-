'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryType =
  | 'outing_complete'
  | 'registry_funded'
  | 'scale_win'
  | 'vault_milestone'
  | 'stylist_box'
  | 'nova_moment';

type VideoStatus = 'none' | 'pending' | 'ready' | 'failed';

interface ScrapbookEntry {
  id: string;
  entry_type: EntryType;
  title: string;
  description: string | null;
  photo_urls: string[];
  video_url: string | null;
  video_job_id: string | null;
  video_status: VideoStatus;
  season: string;
  created_at: string;
}

type Tab = 'seasons' | 'add';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  outing_complete: 'Date Night',
  registry_funded: 'Registry Win',
  scale_win: 'Group Victory',
  vault_milestone: 'Vault Moment',
  stylist_box: 'Style Drop',
  nova_moment: 'Nova Spark',
};

const ENTRY_TYPE_COLORS: Record<EntryType, string> = {
  outing_complete: '#C9A961',
  registry_funded: '#69C9D0',
  scale_win: '#FFA96B',
  vault_milestone: '#C9A961',
  stylist_box: '#FF4D7D',
  nova_moment: '#9B7EDE',
};

const SEASON_ORDER = ['Spring', 'Summer', 'Fall', 'Winter'];

function seasonSortKey(season: string): number {
  const [name, year] = season.split(' ');
  const y = parseInt(year ?? '0', 10);
  const s = SEASON_ORDER.indexOf(name);
  return y * 10 + (s === -1 ? 0 : s);
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onGenerateVideo,
  onVideoReady,
}: {
  entry: ScrapbookEntry;
  onGenerateVideo: (id: string) => void;
  onVideoReady: (id: string, url: string) => void;
}) {
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(entry.video_status);
  const [videoUrl, setVideoUrl] = useState<string | null>(entry.video_url);
  const [polling, setPolling] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Poll when pending
  useEffect(() => {
    if (videoStatus !== 'pending') return;
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scrapbook/video-status?entry_id=${entry.id}`);
        const data = await res.json();
        if (data.status === 'ready' && data.video_url) {
          setVideoStatus('ready');
          setVideoUrl(data.video_url);
          onVideoReady(entry.id, data.video_url);
          setPolling(false);
          clearInterval(interval);
        } else if (data.status === 'failed') {
          setVideoStatus('failed');
          setPolling(false);
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [videoStatus, entry.id, onVideoReady]);

  const typeColor = ENTRY_TYPE_COLORS[entry.entry_type] ?? '#C9A961';
  const typeLabel = ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type;
  const dateStr = new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-lamp/10 bg-ink/40 overflow-hidden"
    >
      {/* Video player */}
      <AnimatePresence>
        {showVideo && videoUrl && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full aspect-[9/16] object-cover max-h-64"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display text-base text-cream italic leading-tight flex-1">{entry.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="font-label text-[8px] tracking-[0.2em] uppercase px-2 py-0.5"
              style={{ color: typeColor, border: `1px solid ${typeColor}40`, backgroundColor: `${typeColor}10` }}
            >
              {typeLabel}
            </span>
            <span className="font-mono text-[9px] text-cream/20">{dateStr}</span>
          </div>
        </div>

        {/* Description */}
        {entry.description && (
          <p className="font-body text-xs text-cream/40 italic leading-relaxed mb-3 line-clamp-2">
            {entry.description}
          </p>
        )}

        {/* Video controls */}
        <div className="flex items-center gap-3">
          {videoStatus === 'ready' && videoUrl && (
            <button
              onClick={() => setShowVideo((p) => !p)}
              className="flex items-center gap-1.5 text-lamp/70 hover:text-lamp transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                {showVideo
                  ? <rect x="6" y="4" width="4" height="16" />
                  : <polygon points="5,3 19,12 5,21" />}
              </svg>
              <span className="font-label text-[9px] tracking-[0.2em] uppercase">
                {showVideo ? 'Hide' : 'Play'}
              </span>
            </button>
          )}

          {videoStatus === 'none' && (
            <button
              onClick={() => {
                setVideoStatus('pending');
                onGenerateVideo(entry.id);
              }}
              className="flex items-center gap-1.5 text-cream/30 hover:text-lamp transition-colors group"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="23,7 16,12 23,17" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              <span className="font-label text-[9px] tracking-[0.2em] text-cream/30 group-hover:text-lamp uppercase transition-colors">
                Generate Video
              </span>
            </button>
          )}

          {videoStatus === 'pending' && (
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-lamp"
              />
              <span className="font-label text-[9px] tracking-[0.2em] text-lamp/50 uppercase">
                {polling ? 'Generating…' : 'Queued'}
              </span>
            </div>
          )}

          {videoStatus === 'failed' && (
            <button
              onClick={() => {
                setVideoStatus('pending');
                onGenerateVideo(entry.id);
              }}
              className="font-label text-[9px] tracking-[0.2em] text-red-400/60 hover:text-red-400 uppercase transition-colors"
            >
              Retry video
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Add Moment Form ──────────────────────────────────────────────────────────

function AddMomentTab({ userId, onAdded }: { userId: string | null; onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [entryType, setEntryType] = useState<EntryType>('nova_moment');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [novaLoading, setNovaLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleNovaWrite() {
    if (!title.trim()) return;
    setNovaLoading(true);
    try {
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'You are Nova, a warm, cinematic AI companion. Write a single short diary-style description (2-3 sentences, past tense, intimate tone) for a Finesse life milestone. Keep it under 60 words.',
          prompt: `Write a description for this moment: "${title}" — type: ${ENTRY_TYPE_LABELS[entryType]}`,
        }),
      });
      const data = await res.json();
      if (data.text) setDescription(data.text);
    } catch {
      // no-op
    } finally {
      setNovaLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !userId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/scrapbook/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          entry_type: entryType,
          title: title.trim(),
          description: description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setTitle('');
      setDescription('');
      setEntryType('nova_moment');
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onAdded(); }, 1200);
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2">
      {!userId && (
        <p className="font-body text-xs text-cream/30 italic text-center py-4">
          Sign in to log your moments.
        </p>
      )}

      <div>
        <label className="font-label text-[9px] tracking-[0.3em] text-cream/30 uppercase block mb-2">
          What happened
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="First dinner at Nobu…"
          disabled={!userId}
          className="w-full bg-transparent border border-lamp/20 px-4 py-2.5 font-body text-sm text-cream/80 placeholder-cream/20 focus:outline-none focus:border-lamp/50 transition-colors disabled:opacity-30"
        />
      </div>

      <div>
        <label className="font-label text-[9px] tracking-[0.3em] text-cream/30 uppercase block mb-2">
          Milestone type
        </label>
        <select
          value={entryType}
          onChange={(e) => setEntryType(e.target.value as EntryType)}
          disabled={!userId}
          className="w-full bg-ink border border-lamp/20 px-4 py-2.5 font-body text-sm text-cream/70 focus:outline-none focus:border-lamp/50 transition-colors disabled:opacity-30"
        >
          {Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-label text-[9px] tracking-[0.3em] text-cream/30 uppercase">
            Description
          </label>
          <button
            type="button"
            onClick={handleNovaWrite}
            disabled={!title.trim() || novaLoading || !userId}
            className="font-label text-[9px] tracking-[0.2em] uppercase transition-colors disabled:opacity-30"
            style={{ color: '#9B7EDE' }}
          >
            {novaLoading ? 'Nova writing…' : 'Let Nova write it'}
          </button>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="The details you want to remember…"
          rows={4}
          disabled={!userId}
          className="w-full bg-transparent border border-lamp/20 px-4 py-3 font-body text-sm text-cream/70 placeholder-cream/20 focus:outline-none focus:border-lamp/50 transition-colors resize-none italic disabled:opacity-30"
        />
      </div>

      {error && (
        <p className="font-label text-[9px] text-red-400/70 uppercase tracking-[0.2em]">{error}</p>
      )}

      <button
        type="submit"
        disabled={!title.trim() || submitting || !userId}
        className="w-full py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-all disabled:opacity-30"
        style={{
          background: title.trim() && userId ? '#C9A961' : 'rgba(201,169,97,0.1)',
          color: title.trim() && userId ? '#0A0406' : '#F4E8D0',
        }}
      >
        {success ? 'Saved to your seasons ✓' : submitting ? 'Saving…' : 'Log this moment'}
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArchivePage() {
  const [tab, setTab] = useState<Tab>('seasons');
  const [entries, setEntries] = useState<ScrapbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Auth init
  useEffect(() => {
    async function initAuth() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
      } catch {
        // no-op — unauthenticated
      }
    }
    initAuth();
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('scrapbook_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setEntries((data as ScrapbookEntry[]) ?? []);
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleGenerateVideo(entryId: string) {
    try {
      await fetch('/api/scrapbook/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId }),
      });
    } catch {
      // polling will surface the status
    }
  }

  function handleVideoReady(entryId: string, url: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, video_url: url, video_status: 'ready' } : e
      )
    );
  }

  // Group by season, sorted newest first
  const seasonMap: Record<string, ScrapbookEntry[]> = {};
  entries.forEach((e) => {
    if (!seasonMap[e.season]) seasonMap[e.season] = [];
    seasonMap[e.season].push(e);
  });
  const seasons = Object.keys(seasonMap).sort((a, b) => seasonSortKey(b) - seasonSortKey(a));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#0A0406' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] opacity-15"
        style={{ background: 'radial-gradient(ellipse at top, #C9A961 0%, transparent 65%)' }}
      />

      <div className="max-w-lg mx-auto px-4 relative z-10">
        {/* Header */}
        <header className="pt-12 pb-8 text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1
              className="font-display text-4xl text-lamp italic tracking-[0.1em]"
              style={{ textShadow: '0 0 50px rgba(201,169,97,0.25)' }}
            >
              Seasons of Your Life
            </h1>
            <p className="font-label text-[9px] tracking-[0.45em] text-cream/25 uppercase mt-2">
              milestones, memories, moments
            </p>
          </motion.div>
        </header>

        {/* Tabs */}
        <div className="flex gap-px mb-8 border border-lamp/15">
          {(['seasons', 'add'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 font-label text-[9px] tracking-[0.3em] uppercase transition-colors"
              style={{
                background: tab === t ? '#C9A961' : 'transparent',
                color: tab === t ? '#0A0406' : 'rgba(244,232,208,0.3)',
              }}
            >
              {t === 'seasons' ? 'Seasons' : 'Add Moment'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── SEASONS TAB ─────────────────────────────────────────────── */}
          {tab === 'seasons' && (
            <motion.div
              key="seasons"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {loading ? (
                <div className="text-center py-16">
                  <motion.div
                    animate={{ opacity: [0.2, 0.7, 0.2] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="font-label text-[9px] tracking-[0.4em] text-lamp/30 uppercase"
                  >
                    Loading your seasons…
                  </motion.div>
                </div>
              ) : !userId ? (
                <div className="text-center py-16">
                  <p className="font-body text-sm text-cream/25 italic mb-4">
                    Sign in to see your life&apos;s archive.
                  </p>
                  <Link
                    href="/login"
                    className="font-label text-[9px] tracking-[0.3em] text-lamp/60 uppercase hover:text-lamp transition-colors"
                  >
                    Sign in →
                  </Link>
                </div>
              ) : seasons.length === 0 ? (
                <div className="text-center py-16">
                  <p className="font-body text-sm text-cream/25 italic mb-4">
                    No moments logged yet.
                  </p>
                  <button
                    onClick={() => setTab('add')}
                    className="font-label text-[9px] tracking-[0.3em] text-lamp/50 uppercase hover:text-lamp transition-colors"
                  >
                    Add your first moment →
                  </button>
                </div>
              ) : (
                <div className="space-y-10 pb-20">
                  {seasons.map((season) => (
                    <div key={season}>
                      {/* Season header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-lamp/10" />
                        <div className="text-center">
                          <span
                            className="font-display text-lg text-lamp italic"
                            style={{ textShadow: '0 0 20px rgba(201,169,97,0.2)' }}
                          >
                            {season}
                          </span>
                          <span className="font-label text-[8px] text-cream/20 tracking-[0.2em] uppercase ml-2">
                            {seasonMap[season].length} {seasonMap[season].length === 1 ? 'moment' : 'moments'}
                          </span>
                        </div>
                        <div className="h-px flex-1 bg-lamp/10" />
                      </div>

                      {/* Entry cards */}
                      <div className="space-y-3">
                        {seasonMap[season].map((entry) => (
                          <EntryCard
                            key={entry.id}
                            entry={entry}
                            onGenerateVideo={handleGenerateVideo}
                            onVideoReady={handleVideoReady}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── ADD MOMENT TAB ───────────────────────────────────────────── */}
          {tab === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="pb-20"
            >
              <AddMomentTab userId={userId} onAdded={() => { setTab('seasons'); fetchEntries(); }} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Lobby link */}
      <div className="text-center pb-8 pt-4 relative z-10">
        <Link
          href="/lobby"
          className="font-body text-xs text-cream/15 hover:text-cream/40 transition-colors italic"
        >
          return to the lobby
        </Link>
      </div>

      {/* Bottom vignette */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-ink to-transparent" />
    </motion.div>
  );
}
