'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { NovaAction } from '@/components/nova/request-card';
import { useSignedIn } from '@/components/nova/requests-api';
import {
  brandSignals, categoryTrends, fromEmbassy, fromScale,
  type BrandSignal, type CategoryTrend, type PipelineDeal,
} from '@/lib/embassy-insights';

// ─── Types ───────────────────────────────────────────────────────────────────
type Deal = PipelineDeal;

// Sources a member can name when submitting a deal. Only real channels — we have no retailer APIs wired.
const SOURCES = ['Direct', 'Brand partnership', 'Alibaba', 'Factory Direct', 'Other'];
const CATEGORIES = ['Bags', 'Clothes', 'Shoes', 'Accessories', 'Outerwear', 'Fragrance', 'Jewelry', 'Other'];
// /api/embassy/deals (and the embassy_deals check) accept these four.
const SUBMIT_TIERS = ['budget', 'mid', 'contemporary', 'premium'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function savings(retail: number, members: number): string {
  return retail > 0 ? `${Math.round(((retail - members) / retail) * 100)}%` : '—';
}

function statusConfig(status: string): { dot: string; label: string } {
  if (status === 'live') return { dot: 'bg-green-500', label: 'text-green-400' };
  if (status === 'pending') return { dot: 'bg-amber-400', label: 'text-amber-400' };
  return { dot: 'bg-cream/20', label: 'text-cream/30' };
}

function tierColor(tier: string): string {
  if (tier === 'premium') return '#C9A961';
  if (tier === 'contemporary') return '#69C9D0';
  if (tier === 'mid') return '#A0A0A8';
  if (tier === 'factory') return '#9B7FD4';
  return '#604040';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SubmitDealSheet({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [form, setForm] = useState({
    brand: '',
    item: '',
    source: 'Direct',
    retail_price: '',
    members_price: '',
    category: 'Bags',
    tier: 'mid' as typeof SUBMIT_TIERS[number],
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.brand.trim() || !form.item.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/embassy/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: form.brand,
          item: form.item,
          source: form.source,
          retail_price: parseFloat(form.retail_price) > 0 ? parseFloat(form.retail_price) : undefined,
          members_price: parseFloat(form.members_price) > 0 ? parseFloat(form.members_price) : undefined,
          category: form.category,
          tier: form.tier,
        }),
      });
      // Only a saved row counts as submitted.
      if (!res.ok) {
        setError(res.status === 401 ? 'Sign in to submit a deal.' : 'This deal couldn’t be submitted just now. Nothing was saved — try again.');
        return;
      }
      onSubmitted?.();
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
        setForm({ brand: '', item: '', source: 'Direct', retail_price: '', members_price: '', category: 'Bags', tier: 'mid' });
      }, 2500);
    } catch {
      setError('This deal couldn’t be submitted just now. Nothing was saved — try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0406] border-t border-[#C9A961]/20 p-6 max-w-2xl mx-auto rounded-t-2xl"
          >
            <div className="w-10 h-0.5 bg-cream/20 rounded-full mx-auto mb-6" />
            <h3 className="font-display text-2xl italic text-[#C9A961] tracking-wide mb-1">Submit a Deal</h3>
            <p className="font-body text-xs text-cream/30 italic mb-6">Our team reviews within 24 hours.</p>

            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center">
                <p className="font-display text-xl italic text-[#69C9D0]">Deal submitted for review.</p>
                <p className="font-body text-xs text-cream/30 mt-2 italic">Our team will assess within 24h.</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label text-[8px] tracking-[0.3em] text-cream/25 uppercase block mb-1">Brand</label>
                    <input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Jacquemus"
                      className="w-full px-3 py-2.5 bg-ink border border-cream/10 text-cream font-body text-sm placeholder:text-cream/15 focus:border-[#C9A961] focus:outline-none" />
                  </div>
                  <div>
                    <label className="font-label text-[8px] tracking-[0.3em] text-cream/25 uppercase block mb-1">Item</label>
                    <input value={form.item} onChange={(e) => set('item', e.target.value)} placeholder="Item name"
                      className="w-full px-3 py-2.5 bg-ink border border-cream/10 text-cream font-body text-sm placeholder:text-cream/15 focus:border-[#C9A961] focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="font-label text-[8px] tracking-[0.3em] text-cream/25 uppercase block mb-1">Source</label>
                  <select value={form.source} onChange={(e) => set('source', e.target.value)}
                    className="w-full px-3 py-2.5 bg-ink border border-cream/10 text-cream font-body text-sm focus:border-[#C9A961] focus:outline-none">
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label text-[8px] tracking-[0.3em] text-cream/25 uppercase block mb-1">Retail Price ($)</label>
                    <input type="number" value={form.retail_price} onChange={(e) => set('retail_price', e.target.value)} placeholder="0.00"
                      className="w-full px-3 py-2.5 bg-ink border border-cream/10 text-cream font-mono text-sm placeholder:text-cream/15 focus:border-[#C9A961] focus:outline-none" />
                  </div>
                  <div>
                    <label className="font-label text-[8px] tracking-[0.3em] text-cream/25 uppercase block mb-1">Members Price ($)</label>
                    <input type="number" value={form.members_price} onChange={(e) => set('members_price', e.target.value)} placeholder="0.00"
                      className="w-full px-3 py-2.5 bg-ink border border-cream/10 text-cream font-mono text-sm placeholder:text-cream/15 focus:border-[#C9A961] focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label text-[8px] tracking-[0.3em] text-cream/25 uppercase block mb-1">Category</label>
                    <select value={form.category} onChange={(e) => set('category', e.target.value)}
                      className="w-full px-3 py-2.5 bg-ink border border-cream/10 text-cream font-body text-sm focus:border-[#C9A961] focus:outline-none">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-label text-[8px] tracking-[0.3em] text-cream/25 uppercase block mb-1">Tier</label>
                    <select value={form.tier} onChange={(e) => set('tier', e.target.value as typeof SUBMIT_TIERS[number])}
                      className="w-full px-3 py-2.5 bg-ink border border-cream/10 text-cream font-body text-sm capitalize focus:border-[#C9A961] focus:outline-none">
                      {SUBMIT_TIERS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={!form.brand.trim() || !form.item.trim() || loading}
                  className="w-full py-3 mt-2 font-label text-[10px] tracking-[0.3em] uppercase text-ink bg-[#C9A961] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
                  {loading ? 'Submitting...' : 'Submit for Review'}
                </button>
                {error && <p role="alert" className="font-body text-xs italic text-red-300/80 text-center">{error}</p>}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type LoadState = 'loading' | 'ready' | 'signed_out' | 'error';

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center font-display text-lg italic text-cream/35">{children}</p>;
}

// ─── Tab 1: Deal Pipeline ─────────────────────────────────────────────────────
function DealPipeline({ deals, state, onSubmitted }: { deals: Deal[]; state: LoadState; onSubmitted: () => void }) {
  const [filter, setFilter] = useState<'all' | 'live' | 'pending' | 'premium' | 'mid' | 'budget'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const filtered = deals.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'live') return d.status === 'live';
    if (filter === 'pending') return d.status === 'pending';
    return d.tier === filter;
  });

  return (
    <>
      <SubmitDealSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSubmitted={onSubmitted} />

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-2xl italic text-[#C9A961] tracking-wide">Deal Pipeline</h2>
          <p className="font-label text-[8px] tracking-[0.4em] text-[#69C9D0]/60 uppercase mt-0.5">sourced · reviewed · live</p>
        </div>
        {state !== 'signed_out' && (
          <button onClick={() => setSheetOpen(true)}
            className="px-4 py-2 font-label text-[9px] tracking-[0.25em] uppercase text-ink bg-[#C9A961] hover:opacity-90 transition-opacity">
            + Submit Deal
          </button>
        )}
      </div>

      {/* Filter chips */}
      {deals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {(['all', 'live', 'premium', 'mid', 'budget'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-[9px] font-label tracking-[0.2em] uppercase transition-all duration-200 capitalize ${
                filter === f ? 'bg-[#C9A961] text-ink' : 'border border-cream/10 text-cream/30 hover:border-[#C9A961]/30'
              }`}>
              {f}
            </button>
          ))}
        </div>
      )}

      {state === 'loading' ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 border border-cream/6 bg-ink/40 animate-pulse" />)}</div>
      ) : state === 'signed_out' ? (
        <EmptyNote>Sign in to see the deal pipeline. <Link href="/login" className="text-[#C9A961] not-italic font-label text-[10px] tracking-[0.2em] uppercase ml-1">Sign in</Link></EmptyNote>
      ) : state === 'error' ? (
        <EmptyNote>The pipeline couldn’t be loaded just now. Try again in a moment.</EmptyNote>
      ) : deals.length === 0 ? (
        <EmptyNote>No deals in the pipeline yet — submit the first one.</EmptyNote>
      ) : filtered.length === 0 ? (
        <EmptyNote>Nothing matches this filter.</EmptyNote>
      ) : (
      <div className="space-y-2">
        {filtered.map((deal, i) => {
          const sc = statusConfig(deal.status);
          const query = `${deal.brand} ${deal.item}`.trim().slice(0, 200);
          return (
            <motion.div key={deal.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.04 }}
              className="p-4 border border-cream/6 bg-ink/40 hover:border-cream/12 transition-colors">
              <div className="flex items-start justify-between gap-3">
                {/* Left: brand + item */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-sm italic text-cream/80 tracking-wide">{deal.brand}</span>
                    <span className="font-label text-[7px] tracking-[0.2em] uppercase px-1.5 py-0.5 border"
                      style={{ borderColor: `${tierColor(deal.tier)}40`, color: tierColor(deal.tier) }}>
                      {deal.tier}
                    </span>
                  </div>
                  <p className="font-body text-xs text-cream/40 italic mt-0.5 truncate">{deal.item}</p>
                  <p className="font-label text-[7px] tracking-[0.15em] text-cream/20 uppercase mt-1">{deal.source} · {deal.category}</p>
                </div>

                {/* Right: pricing + status */}
                <div className="text-right shrink-0">
                  {deal.retail > 0 && deal.members_price > 0 ? (
                    <>
                      <div className="flex items-baseline gap-2 justify-end">
                        <span className="font-mono text-xs text-cream/25 line-through">${deal.retail}</span>
                        <span className="font-mono text-sm text-[#C9A961]">${deal.members_price}</span>
                      </div>
                      <p className="font-mono text-[9px] text-[#69C9D0] mt-0.5">{savings(deal.retail, deal.members_price)} off</p>
                    </>
                  ) : <p className="font-mono text-[10px] text-cream/25">price tbc</p>}
                  <div className="flex items-center gap-1.5 justify-end mt-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    <span className={`font-label text-[7px] tracking-[0.2em] uppercase ${sc.label}`}>{deal.status}</span>
                  </div>
                </div>
              </div>
              {open === deal.id ? (
                <NovaAction label="Find similar" accent="#69C9D0"
                  build={() => ({ kind: 'find_item', title: `Similar to ${query}`.slice(0, 140), details: { query }, room: 'embassy' })} />
              ) : (
                <button type="button" onClick={() => setOpen(deal.id)}
                  className="mt-3 font-label text-[8px] tracking-[0.2em] uppercase text-[#69C9D0]/70 hover:text-[#69C9D0]">
                  ✦ Find similar
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
      )}
    </>
  );
}

/** /api/nova sign-in (401) and rate-limit (429) copy; null for any other failure. */
function novaLimitMessage(status: number, body: {retryAfterS?: unknown} | null | undefined): string | null {
  if (status === 401) return 'Sign in to ask Nova.';
  if (status !== 429) return null;
  const s = Number(body?.retryAfterS);
  return Number.isFinite(s) && s > 0 ? `Nova needs a moment — try again in ${Math.ceil(s)} s.` : 'Nova needs a moment — try again shortly.';
}

function DerivedNote() {
  return (
    <p className="mb-4 font-label text-[9px] uppercase tracking-[0.35em] text-cream/40">
      From live Scale + Embassy deals — not outside market data
    </p>
  );
}

// ─── Tab 2: Buying Trends (derived from the pipeline) ─────────────────────────
function BuyingTrends({ trends, state }: { trends: CategoryTrend[]; state: LoadState }) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getIntel() {
    if (trends.length === 0) return;
    setLoading(true);
    try {
      const trendSummary = trends.map((t) => `- ${t.category}: ${t.deals} deals (${t.live} live), avg member savings ${t.avg_savings_pct}%, ${t.joins} group-buy joins, most deals from ${t.top_brand}`).join('\n');
      const prompt = `These are the categories in our Embassy deal pipeline right now (real counts):\n${trendSummary}\n\nGive 2-3 specific sourcing recommendations for the team. Be concise and actionable. Don't invent statistics beyond these.`;
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, persona: 'embassy' }),
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; retryAfterS?: unknown };
      if (!res.ok || !data.text) {
        setBriefing((!res.ok && novaLimitMessage(res.status, data)) || 'Intelligence feed unavailable. Check back shortly.');
        return;
      }
      setBriefing(data.text);
    } catch {
      setBriefing('Intelligence feed unavailable. Check back shortly.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl italic text-[#C9A961] tracking-wide">Buying Trends</h2>
        <p className="font-label text-[8px] tracking-[0.4em] text-[#69C9D0]/60 uppercase mt-0.5">what&apos;s moving in the pipeline</p>
      </div>

      {state === 'loading' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-5 border border-cream/6 bg-ink/40 animate-pulse" style={{ height: '120px' }} />
          ))}
        </div>
      ) : state === 'signed_out' ? (
        <EmptyNote>Sign in to see what members are buying.</EmptyNote>
      ) : state === 'error' ? (
        <EmptyNote>Trends couldn’t be loaded just now.</EmptyNote>
      ) : trends.length === 0 ? (
        <EmptyNote>No deals yet, so no trends to read. They appear as deals come in.</EmptyNote>
      ) : (
      <>
      <DerivedNote />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {trends.map((t, i) => (
          <motion.div key={t.category}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="p-5 border border-cream/6 bg-ink/40">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-display text-xl italic text-cream/80 tracking-wide">{t.category}</h3>
              <span className="font-mono text-sm text-green-400">{t.deals} {t.deals === 1 ? 'deal' : 'deals'}</span>
            </div>
            {t.top_brand && <p className="font-label text-[8px] tracking-[0.2em] text-[#C9A961]/70 uppercase mb-2">{t.top_brand}</p>}
            <p className="font-body text-xs text-cream/40 italic leading-relaxed">
              {t.live} live{t.avg_savings_pct > 0 ? ` · avg ${t.avg_savings_pct}% member savings` : ''}{t.joins > 0 ? ` · ${t.joins} group-buy ${t.joins === 1 ? 'join' : 'joins'}` : ''}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Source Intel button */}
      <div className="border border-[#69C9D0]/15 bg-[#69C9D0]/3 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-label text-[9px] tracking-[0.35em] text-[#69C9D0]/80 uppercase">Source Intel</p>
            <p className="font-body text-xs text-cream/30 italic mt-0.5">Nova reads these numbers and suggests where to source next</p>
          </div>
          <button onClick={getIntel} disabled={loading}
            className="px-4 py-2 font-label text-[9px] tracking-[0.2em] uppercase border border-[#69C9D0]/40 text-[#69C9D0] hover:bg-[#69C9D0]/10 transition-colors disabled:opacity-40">
            {loading ? 'Analyzing...' : 'Run Intel'}
          </button>
        </div>

        <AnimatePresence>
          {briefing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="h-px bg-[#69C9D0]/10 mb-4" />
              <p className="mb-2 font-label text-[8px] uppercase tracking-[0.3em] text-cream/40">Nova&apos;s read, not market data</p>
              <p className="font-body text-sm text-cream/60 italic leading-relaxed whitespace-pre-wrap">{briefing}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </>
      )}
    </div>
  );
}

// ─── Tab 3: Brand Radar (derived from the pipeline) ───────────────────────────
function BrandRadar({ brands, state }: { brands: BrandSignal[]; state: LoadState }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl italic text-[#C9A961] tracking-wide">Brand Radar</h2>
        <p className="font-label text-[8px] tracking-[0.4em] text-[#69C9D0]/60 uppercase mt-0.5">brands in the pipeline</p>
      </div>

      {state === 'loading' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-5 border border-cream/6 bg-ink/40 animate-pulse" style={{ height: '140px' }} />
          ))}
        </div>
      ) : state === 'signed_out' ? (
        <EmptyNote>Sign in to see the brand radar.</EmptyNote>
      ) : state === 'error' ? (
        <EmptyNote>The radar couldn’t be loaded just now.</EmptyNote>
      ) : brands.length === 0 ? (
        <EmptyNote>No brands on the radar yet. Every submitted deal adds one.</EmptyNote>
      ) : (
      <>
      <DerivedNote />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {brands.map((b, i) => (
          <motion.div key={b.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 border border-cream/6 bg-ink/40 hover:border-cream/12 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-display text-base italic text-cream/80 tracking-wide">{b.name}</p>
                <p className="font-label text-[7px] tracking-[0.25em] text-cream/25 uppercase mt-0.5">{b.categories.join(' · ')}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-[#C9A961]">{b.avg_savings_pct > 0 ? `${b.avg_savings_pct}%` : '—'}</p>
                <p className="font-label text-[7px] tracking-[0.15em] text-cream/20 uppercase">avg member savings</p>
              </div>
            </div>

            <p className="font-body text-xs text-cream/40 italic leading-relaxed mb-3">
              {b.deals} {b.deals === 1 ? 'deal' : 'deals'} · {b.live} live
            </p>

            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'active' ? 'bg-green-500' : 'bg-amber-400'}`} />
              <span className={`font-label text-[7px] tracking-[0.2em] uppercase ${b.status === 'active' ? 'text-green-400' : 'text-amber-400'}`}>
                {b.status === 'active' ? 'live deals' : 'in review'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EmbassyPage() {
  const [tab, setTab] = useState<'pipeline' | 'trends' | 'radar'>('pipeline');
  const signedIn = useSignedIn();

  // Real data: scale_deals (group buys) + embassy_deals (submitted/sourced). Trends + radar derive from these.
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loaded, setLoaded] = useState<'ready' | 'error' | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    import('@/lib/supabase/client').then(async ({ createClient }) => {
      try {
        const sb = createClient();
        const [scale, embassy] = await Promise.all([
          sb.from('scale_deals')
            .select('id, title, brand, original_price_cents, group_price_cents, goal_count, current_count, category, status')
            .order('created_at', { ascending: false }).limit(100),
          sb.from('embassy_deals')
            .select('id, brand, item, source, retail_price_cents, members_price_cents, category, tier, status')
            .neq('status', 'rejected')
            .order('created_at', { ascending: false }).limit(100),
        ]);
        if (!alive) return;
        if (scale.error && embassy.error) { setLoaded('error'); return; }
        setDeals([...(embassy.data ?? []).map(fromEmbassy), ...(scale.data ?? []).map(fromScale)]);
        setLoaded('ready');
      } catch {
        if (alive) setLoaded('error');
      }
    });
    return () => { alive = false; };
  }, [signedIn, reload]);

  const state: LoadState = signedIn === false ? 'signed_out' : signedIn === null || loaded === null ? 'loading' : loaded;
  const trends = categoryTrends(deals);
  const brands = brandSignals(deals);

  const TABS = [
    { id: 'pipeline' as const, label: 'Deal Pipeline' },
    { id: 'trends' as const, label: 'Buying Trends' },
    { id: 'radar' as const, label: 'Brand Radar' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: '#0A0406' }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(105,201,208,0.06) 0%, transparent 65%)' }} />
        <div className="absolute top-0 right-0 w-[400px] h-[300px]"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(201,169,97,0.05) 0%, transparent 65%)' }} />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="font-label text-[8px] tracking-[0.6em] text-[#69C9D0]/50 uppercase mb-3">brand intelligence · deal sourcing</p>
          <h1 className="font-display text-5xl italic text-[#C9A961] tracking-[0.15em]">EMBASSY</h1>
          <div className="w-16 h-px bg-[#C9A961]/20 mx-auto mt-4" />
        </motion.div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 mb-8 relative z-10">
        <div className="flex gap-1 border-b border-cream/6">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-[9px] font-label tracking-[0.2em] uppercase transition-all duration-200 relative ${
                tab === t.id ? 'text-[#C9A961]' : 'text-cream/25 hover:text-cream/50'
              }`}>
              {t.label}
              {tab === t.id && (
                <motion.div layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-px bg-[#C9A961]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-2xl mx-auto px-4 relative z-10 pb-16">
        <AnimatePresence mode="wait">
          {tab === 'pipeline' && (
            <motion.div key="pipeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}>
              <DealPipeline deals={deals} state={state} onSubmitted={() => setReload((n) => n + 1)} />
            </motion.div>
          )}
          {tab === 'trends' && (
            <motion.div key="trends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}>
              <BuyingTrends trends={trends} state={state} />
            </motion.div>
          )}
          {tab === 'radar' && (
            <motion.div key="radar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}>
              <BrandRadar brands={brands} state={state} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Back link */}
      <div className="text-center pb-10 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-[#C9A961] transition-colors italic">
          return to the lobby
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0A0406] to-transparent pointer-events-none" />
    </motion.div>
  );
}
