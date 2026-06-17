'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Deal {
  id: string;
  brand: string;
  item: string;
  source: string;
  retail: number;
  members_price: number;
  status: 'live' | 'pending' | 'review';
  category: string;
  tier: 'budget' | 'mid' | 'contemporary' | 'premium' | 'factory';
  margin_pct: number;
}

interface Trend {
  category: string;
  trend: string;
  period: string;
  top_brand: string;
  insight: string;
}

interface BrandCard {
  name: string;
  tier: string;
  margin: string;
  opportunity: string;
  status: 'active' | 'prospect';
}

// ─── Fallback data (shown only if Nova call fails) ────────────────────────────
const FALLBACK_TRENDS: Trend[] = [
  { category: 'Bags', trend: '+34%', period: 'this week', top_brand: 'Bottega Veneta', insight: 'Members upgrading from mid-tier. Premium bag sourcing opportunity.' },
  { category: 'Fragrance', trend: '+28%', period: 'this week', top_brand: 'Le Labo', insight: 'Dark woody scents dominating. Members spending +$200 on fragrance.' },
  { category: 'Shoes', trend: '+19%', period: 'this week', top_brand: 'Amina Muaddi', insight: 'Heel moment. Mule and kitten heel demand spiking among 25-34 segment.' },
  { category: 'Streetwear', trend: '+41%', period: 'this week', top_brand: 'Off-White', insight: 'Male members 18-24 driving streetwear volume. Budget→premium crossover.' },
  { category: 'Watches', trend: '+22%', period: 'this week', top_brand: 'AP Royal Oak', insight: "Men's luxury watch demand up. AP and Rolex are the targets." },
  { category: 'Golf Gear', trend: '+67%', period: 'this week', top_brand: 'Titleist', insight: 'New Carpe Diem members indexing high on golf. Source premium clubs + apparel.' },
];

const FALLBACK_BRAND_RADAR: BrandCard[] = [
  { name: 'Jacquemus', tier: 'Premium', margin: '35%', opportunity: 'Limited drops, high demand. Direct contact: partnerships@jacquemus.com', status: 'active' },
  { name: 'Toteme', tier: 'Premium', margin: '42%', opportunity: 'Quiet luxury moment. Underserved in group buys. Stockholm + Paris drops.', status: 'prospect' },
  { name: 'Fashion Nova', tier: 'Mid', margin: '28%', opportunity: 'Highest volume. API available. Budget tier but massive scale.', status: 'active' },
  { name: 'Alibaba Verified Suppliers', tier: 'Factory', margin: '65%', opportunity: 'Factory direct = highest margins. White-label potential for Finesse house brand.', status: 'prospect' },
  { name: 'Amina Muaddi', tier: 'Premium', margin: '32%', opportunity: 'Shoe moment. Size-inclusive. Strong demographic alignment.', status: 'active' },
  { name: 'Cult Gaia', tier: 'Contemporary', margin: '38%', opportunity: 'Instagram-native. Member demographics aligned. LA-based = reachable.', status: 'prospect' },
  { name: 'Titleist / Callaway', tier: 'Sports', margin: '25%', opportunity: 'Carpe Diem golf segment growing 67% WoW. Source premium clubs.', status: 'prospect' },
  { name: 'Rolex Gray Market', tier: 'Luxury', margin: '8-15%', opportunity: "Men's watch demand high. Gray market arbitrage on AP/Rolex/IWC.", status: 'prospect' },
];

const SOURCES = ['Direct', 'Fashion Nova API', 'Shein API', 'Temu API', 'Alibaba', 'Factory Direct', 'Other'];
const CATEGORIES = ['Bags', 'Clothes', 'Shoes', 'Accessories', 'Outerwear', 'Fragrance', 'Jewelry', 'Other'];
const TIERS = ['budget', 'mid', 'contemporary', 'premium', 'factory'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function savings(retail: number, members: number): string {
  return `${Math.round(((retail - members) / retail) * 100)}%`;
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
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    brand: '',
    item: '',
    source: 'Direct',
    retail_price: '',
    members_price: '',
    category: 'Bags',
    tier: 'mid' as typeof TIERS[number],
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.brand.trim() || !form.item.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/embassy/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: form.brand,
          item: form.item,
          source: form.source,
          retail_price: parseFloat(form.retail_price) || 0,
          members_price: parseFloat(form.members_price) || 0,
          category: form.category,
          tier: form.tier,
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
        setForm({ brand: '', item: '', source: 'Direct', retail_price: '', members_price: '', category: 'Bags', tier: 'mid' });
      }, 2500);
    } catch {
      // graceful fail
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
                    <select value={form.tier} onChange={(e) => set('tier', e.target.value as typeof TIERS[number])}
                      className="w-full px-3 py-2.5 bg-ink border border-cream/10 text-cream font-body text-sm capitalize focus:border-[#C9A961] focus:outline-none">
                      {TIERS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={!form.brand.trim() || !form.item.trim() || loading}
                  className="w-full py-3 mt-2 font-label text-[10px] tracking-[0.3em] uppercase text-ink bg-[#C9A961] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
                  {loading ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Tab 1: Deal Pipeline ─────────────────────────────────────────────────────
function DealPipeline({ deals }: { deals: Deal[] }) {
  const [filter, setFilter] = useState<'all' | 'live' | 'pending' | 'premium' | 'mid' | 'budget'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = deals.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'live') return d.status === 'live';
    if (filter === 'pending') return d.status === 'pending';
    return d.tier === filter;
  });

  return (
    <>
      <SubmitDealSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-2xl italic text-[#C9A961] tracking-wide">Deal Pipeline</h2>
          <p className="font-label text-[8px] tracking-[0.4em] text-[#69C9D0]/60 uppercase mt-0.5">sourced · reviewed · live</p>
        </div>
        <button onClick={() => setSheetOpen(true)}
          className="px-4 py-2 font-label text-[9px] tracking-[0.25em] uppercase text-ink bg-[#C9A961] hover:opacity-90 transition-opacity">
          + Submit Deal
        </button>
      </div>

      {/* Filter chips */}
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

      {/* Deal rows */}
      <div className="space-y-2">
        {filtered.map((deal, i) => {
          const sc = statusConfig(deal.status);
          return (
            <motion.div key={deal.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
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
                  <div className="flex items-baseline gap-2 justify-end">
                    <span className="font-mono text-xs text-cream/25 line-through">${deal.retail}</span>
                    <span className="font-mono text-sm text-[#C9A961]">${deal.members_price}</span>
                  </div>
                  <p className="font-mono text-[9px] text-[#69C9D0] mt-0.5">{savings(deal.retail, deal.members_price)} off</p>
                  <div className="flex items-center gap-1.5 justify-end mt-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    <span className={`font-label text-[7px] tracking-[0.2em] uppercase ${sc.label}`}>{deal.status}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

// ─── Tab 2: Buying Trends ─────────────────────────────────────────────────────
function BuyingTrends({ trends, trendsLoading }: { trends: Trend[]; trendsLoading: boolean }) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getIntel() {
    setLoading(true);
    try {
      const trendSummary = trends.map((t) => `- ${t.category} ${t.trend} (top: ${t.top_brand})`).join('\n');
      const prompt = `Based on these Finesse platform buying trends this week:\n${trendSummary}\n\nGenerate 2-3 specific deal recommendations for our sourcing team. Be concise and actionable. Format as a brief intelligence memo.`;
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, system: 'You are the Embassy intelligence engine for Finesse, a luxury lifestyle platform. Provide sharp, actionable deal sourcing recommendations based on member buying data.' }),
      });
      const data = await res.json();
      setBriefing(data.text || null);
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
        <p className="font-label text-[8px] tracking-[0.4em] text-[#69C9D0]/60 uppercase mt-0.5">client intelligence · what&apos;s moving this week</p>
      </div>

      {trendsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-5 border border-cream/6 bg-ink/40 animate-pulse" style={{ height: '120px' }} />
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {trends.map((t, i) => (
          <motion.div key={t.category}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="p-5 border border-cream/6 bg-ink/40">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-display text-xl italic text-cream/80 tracking-wide">{t.category}</h3>
              <span className="font-mono text-sm text-green-400">{t.trend}</span>
            </div>
            <p className="font-label text-[8px] tracking-[0.2em] text-[#C9A961]/70 uppercase mb-2">{t.top_brand}</p>
            <p className="font-body text-xs text-cream/40 italic leading-relaxed">{t.insight}</p>
          </motion.div>
        ))}
      </div>
      )}

      {/* Source Intel button */}
      <div className="border border-[#69C9D0]/15 bg-[#69C9D0]/3 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-label text-[9px] tracking-[0.35em] text-[#69C9D0]/80 uppercase">Source Intel</p>
            <p className="font-body text-xs text-cream/30 italic mt-0.5">Nova generates deal recommendations from trend data</p>
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
              <p className="font-body text-sm text-cream/60 italic leading-relaxed whitespace-pre-wrap">{briefing}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Tab 3: Brand Radar ───────────────────────────────────────────────────────
function BrandRadar({ brands, brandsLoading }: { brands: BrandCard[]; brandsLoading: boolean }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl italic text-[#C9A961] tracking-wide">Brand Radar</h2>
        <p className="font-label text-[8px] tracking-[0.4em] text-[#69C9D0]/60 uppercase mt-0.5">brands worth chasing right now</p>
      </div>

      {brandsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-5 border border-cream/6 bg-ink/40 animate-pulse" style={{ height: '140px' }} />
          ))}
        </div>
      ) : (
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
                <p className="font-label text-[7px] tracking-[0.25em] text-cream/25 uppercase mt-0.5">{b.tier}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-[#C9A961]">{b.margin}</p>
                <p className="font-label text-[7px] tracking-[0.15em] text-cream/20 uppercase">margin</p>
              </div>
            </div>

            <p className="font-body text-xs text-cream/40 italic leading-relaxed mb-3">{b.opportunity}</p>

            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'active' ? 'bg-green-500' : 'bg-amber-400'}`} />
              <span className={`font-label text-[7px] tracking-[0.2em] uppercase ${b.status === 'active' ? 'text-green-400' : 'text-amber-400'}`}>
                {b.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      )}
    </div>
  );
}

// ─── Helpers for parsing Nova intelligence response ────────────────────────────
function parseTrendsFromNova(text: string): Trend[] | null {
  try {
    const lines = text.split('\n').filter(Boolean);
    const trends: Trend[] = [];
    for (const line of lines) {
      // Look for lines like: "Category: +N% | Top brand: X | Insight: Y"
      // or any structured list format — extract what we can
      const catMatch = line.match(/\*?\*?([A-Za-z &]+)\*?\*?[:\s]+([+-]?\d+%)/);
      const brandMatch = line.match(/(?:top[:\s]+|brand[:\s]+)([A-Za-z ]+)/i);
      const insightMatch = line.match(/(?:insight[:\s]+|[-–]\s*)(.{20,})/i);
      if (catMatch) {
        trends.push({
          category: catMatch[1].trim(),
          trend: catMatch[2].trim(),
          period: 'this week',
          top_brand: brandMatch ? brandMatch[1].trim() : '',
          insight: insightMatch ? insightMatch[1].trim() : line.slice(line.indexOf('%') + 1).trim() || '',
        });
      }
    }
    return trends.length >= 3 ? trends : null;
  } catch {
    return null;
  }
}

function parseBrandsFromNova(text: string): BrandCard[] | null {
  try {
    const lines = text.split('\n').filter(Boolean);
    const brands: BrandCard[] = [];
    for (const line of lines) {
      const brandMatch = line.match(/\*?\*?([A-Za-z /&]+)\*?\*?[:\s]/);
      const marginMatch = line.match(/(\d+(?:\.\d+)?(?:-\d+)?%)/);
      if (brandMatch && brands.length < 8) {
        brands.push({
          name: brandMatch[1].trim(),
          tier: marginMatch && parseInt(marginMatch[1]) >= 40 ? 'Premium' : 'Contemporary',
          margin: marginMatch ? marginMatch[1] : '--',
          opportunity: line.replace(brandMatch[0], '').replace(marginMatch?.[0] ?? '', '').trim() || line,
          status: 'prospect',
        });
      }
    }
    return brands.length >= 4 ? brands : null;
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EmbassyPage() {
  const [tab, setTab] = useState<'pipeline' | 'trends' | 'radar'>('pipeline');

  // Real data state
  const [deals, setDeals] = useState<Deal[]>([]);
  const [trends, setTrends] = useState<Trend[]>(FALLBACK_TRENDS);
  const [brands, setBrands] = useState<BrandCard[]>(FALLBACK_BRAND_RADAR);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);

  useEffect(() => {
    // ── 1. Load scale_deals from Supabase ──────────────────────────────────
    import('@/lib/supabase/client').then(async ({ createClient }) => {
      try {
        const sb = createClient();
        const { data } = await sb.from('scale_deals')
          .select('id, title, brand, description, original_price_cents, group_price_cents, goal_count, current_count, category, status')
          .order('created_at', { ascending: false });
        if (data && data.length > 0) {
          const mapped: Deal[] = data.map((d) => {
            const tier: Deal['tier'] =
              d.original_price_cents >= 100000 ? 'premium' :
              d.original_price_cents >= 30000  ? 'contemporary' :
              d.original_price_cents >= 5000   ? 'mid' : 'budget';
            const pipelineStatus: Deal['status'] =
              d.status === 'met' ? 'live' :
              d.status === 'open' ? (d.current_count >= d.goal_count * 0.5 ? 'live' : 'pending') :
              'review';
            const savingsRate = ((d.original_price_cents - d.group_price_cents) / d.original_price_cents) * 100;
            return {
              id: d.id,
              brand: d.brand,
              item: d.title,
              source: 'Scale Direct',
              retail: d.original_price_cents / 100,
              members_price: d.group_price_cents / 100,
              status: pipelineStatus,
              category: d.category ?? 'Accessories',
              tier,
              margin_pct: Math.round(savingsRate),
            };
          });
          setDeals(mapped);
        }
      } catch { /* deals stay empty */ }
    });

    // ── 2. One Nova call for trends + brand radar (10s timeout) ────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    fetch('/api/nova', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        prompt: `Generate a luxury fashion market intelligence report for the Finesse platform. Include:

1. BUYING TRENDS (6 categories): For each, give category name, week-over-week percentage change, the top brand driving it, and a 1-sentence sourcing insight. Format each line as:
Category: +XX% | Top: BrandName | Insight text here

2. BRAND RADAR (8 brands): For each, give brand name, tier (Premium/Contemporary/Mid/Factory), estimated margin percentage, and a sourcing opportunity note. Format each line as:
BrandName | Tier | Margin% | Opportunity note here

Focus on what's actually moving in luxury streetwear, handbags, footwear, fragrance, and menswear right now.`,
        system: 'You are the Embassy intelligence engine for Finesse, a luxury lifestyle group-buying platform. Provide sharp, structured market intelligence. Be specific about brand names, percentages, and actionable opportunities. Always follow the exact format requested.',
      }),
    })
      .then((res) => res.json())
      .then((data: { text?: string }) => {
        clearTimeout(timeout);
        if (!data.text) return;

        const text = data.text;

        // Split on the BRAND RADAR header to separate the two sections
        const splitIdx = text.search(/brand radar|BRAND RADAR/i);
        const trendsSection = splitIdx > 0 ? text.slice(0, splitIdx) : text;
        const brandsSection = splitIdx > 0 ? text.slice(splitIdx) : '';

        const parsedTrends = parseTrendsFromNova(trendsSection);
        if (parsedTrends) setTrends(parsedTrends);

        const parsedBrands = parseBrandsFromNova(brandsSection || text);
        if (parsedBrands) setBrands(parsedBrands);
      })
      .catch(() => {
        // Nova failed — fallbacks already set as initial state
      })
      .finally(() => {
        clearTimeout(timeout);
        setTrendsLoading(false);
        setBrandsLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

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
              <DealPipeline deals={deals} />
            </motion.div>
          )}
          {tab === 'trends' && (
            <motion.div key="trends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}>
              <BuyingTrends trends={trends} trendsLoading={trendsLoading} />
            </motion.div>
          )}
          {tab === 'radar' && (
            <motion.div key="radar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}>
              <BrandRadar brands={brands} brandsLoading={brandsLoading} />
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
