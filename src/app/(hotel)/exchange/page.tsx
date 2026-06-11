'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  brand?: string;
  size?: string;
  condition: string;
  asking_price_cents: number;
  platform_fee_cents: number;
  seller_receives_cents: number;
  photo_urls: string[];
  category?: string;
  status: string;
  views: number;
  created_at: string;
}

interface Offer {
  id: string;
  listing_id: string;
  offer_price_cents: number;
  message?: string;
  status: string;
  created_at: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ITEM_CATEGORIES = ['All', 'Sneakers', 'Fashion', 'Accessories', 'Tech', 'Collectibles'];

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: 0 },
  { label: 'Under $100', min: 0, max: 9999 },
  { label: '$100–$500', min: 10000, max: 50000 },
  { label: '$500+', min: 50000, max: 0 },
];

const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new_with_tags', label: 'New w/ Tags' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

const CONDITION_COLORS: Record<string, string> = {
  new_with_tags: '#C9A961',
  excellent: '#69C9D0',
  good: '#A8D5A2',
  fair: '#F4C87A',
};

const TABS = ['BROWSE', 'SELL', 'MY DEALS'] as const;
type Tab = (typeof TABS)[number];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function useAccent() {
  const [accent, setAccent] = useState('#FF4D7D');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAccent(
        localStorage.getItem('finesse_gender') === 'masculine' ? '#FFA96B' : '#FF4D7D',
      );
    }
  }, []);
  return accent;
}

// ── Listing Card ─────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  accent,
  onOffer,
}: {
  listing: Listing;
  accent: string;
  onOffer: (listing: Listing) => void;
}) {
  const condColor = CONDITION_COLORS[listing.condition] ?? '#C9A961';
  const photo = listing.photo_urls?.[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="border border-cream/8 bg-ink/40 hover:border-cream/15 transition-all duration-300 group cursor-pointer"
    >
      {/* Photo */}
      <div className="aspect-square relative overflow-hidden bg-cream/3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-20">🏷️</span>
          </div>
        )}
        {listing.condition && (
          <span
            className="absolute top-2 left-2 font-label text-[7px] tracking-[0.2em] uppercase px-2 py-1"
            style={{ background: `${condColor}20`, color: condColor, border: `1px solid ${condColor}40` }}
          >
            {CONDITIONS.find((c) => c.value === listing.condition)?.label ?? listing.condition}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {listing.brand && (
          <p className="font-label text-[8px] tracking-[0.2em] uppercase text-brass/60 mb-0.5">
            {listing.brand}
          </p>
        )}
        <p className="font-body text-sm text-cream/80 leading-tight line-clamp-2">{listing.title}</p>
        {listing.size && (
          <p className="font-label text-[8px] tracking-[0.15em] uppercase text-cream/30 mt-1">
            Size {listing.size}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <p className="font-display text-lg italic text-brass">{fmt(listing.asking_price_cents)}</p>
          <button
            onClick={() => onOffer(listing)}
            className="font-label text-[8px] tracking-[0.2em] uppercase px-3 py-1.5 border transition-all"
            style={{ borderColor: `${accent}40`, color: accent }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = `${accent}15`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            Offer
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Offer Modal ───────────────────────────────────────────────────────────────

function OfferModal({
  listing,
  accent,
  onClose,
}: {
  listing: Listing;
  accent: string;
  onClose: () => void;
}) {
  const [offerDollars, setOfferDollars] = useState(
    String(Math.floor(listing.asking_price_cents / 100)),
  );
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    setErr('');
    const cents = Math.round(parseFloat(offerDollars) * 100);
    if (!cents || cents < 100) { setErr('Minimum offer is $1.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/exchange/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id, offer_price_cents: cents, message }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? 'Error sending offer.'); }
      else setDone(true);
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0A0406] border border-cream/10 p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-4">✓</p>
            <h3 className="font-display text-xl italic text-brass mb-2">Offer Sent</h3>
            <p className="font-body text-sm text-cream/50">
              The seller will be notified. You&apos;ll hear back in My Deals.
            </p>
            <button
              onClick={onClose}
              className="mt-6 font-label text-[9px] tracking-[0.3em] uppercase text-cream/40 hover:text-cream/70"
            >
              CLOSE
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-display text-lg italic text-brass mb-1">Make an Offer</h3>
            <p className="font-body text-xs text-cream/40 mb-4 leading-relaxed">
              {listing.title} · Listed at {fmt(listing.asking_price_cents)}
            </p>

            <label className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/30 block mb-1">
              Your Offer (USD)
            </label>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-cream/30">$</span>
              <input
                type="number"
                value={offerDollars}
                onChange={(e) => setOfferDollars(e.target.value)}
                className="w-full bg-cream/5 border border-cream/10 pl-7 pr-3 py-2.5 font-body text-sm text-cream focus:outline-none focus:border-brass/40"
                min="1"
                step="1"
              />
            </div>

            <label className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/30 block mb-1">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Introduce yourself..."
              className="w-full bg-cream/5 border border-cream/10 px-3 py-2 font-body text-sm text-cream/80 placeholder-cream/15 focus:outline-none focus:border-brass/40 resize-none mb-4"
            />

            {err && <p className="font-body text-xs text-red-400/80 mb-3">{err}</p>}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 font-label text-[8px] tracking-[0.2em] uppercase border border-cream/8 text-cream/30 hover:border-cream/20"
              >
                CANCEL
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 py-2.5 font-label text-[8px] tracking-[0.2em] uppercase transition-all"
                style={{ background: accent, color: '#0A0406', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'SENDING…' : 'SEND OFFER'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Browse Tab ────────────────────────────────────────────────────────────────

function BrowseTab({ accent }: { accent: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('All');
  const [priceRange, setPriceRange] = useState(PRICE_RANGES[0]);
  const [loading, setLoading] = useState(true);
  const [offerTarget, setOfferTarget] = useState<Listing | null>(null);

  const load = useCallback(async (pg: number, cat: string, pr: (typeof PRICE_RANGES)[0]) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg) });
      if (cat !== 'All') params.set('category', cat);
      if (pr.min > 0) params.set('min', String(pr.min));
      if (pr.max > 0) params.set('max', String(pr.max));
      const res = await fetch(`/api/exchange/listings?${params}`);
      const json = await res.json();
      setListings(json.listings ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, category, priceRange);
  }, [load, page, category, priceRange]);

  function handleCategory(cat: string) {
    setCategory(cat);
    setPage(1);
  }
  function handlePrice(pr: (typeof PRICE_RANGES)[0]) {
    setPriceRange(pr);
    setPage(1);
  }

  return (
    <>
      {/* Category chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {ITEM_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategory(cat)}
            className="px-4 py-1.5 font-label text-[8px] tracking-[0.2em] uppercase transition-all"
            style={
              category === cat
                ? { background: accent, color: '#0A0406' }
                : { border: '1px solid rgba(244,232,208,0.08)', color: 'rgba(244,232,208,0.3)' }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Price filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {PRICE_RANGES.map((pr) => (
          <button
            key={pr.label}
            onClick={() => handlePrice(pr)}
            className="px-3 py-1 font-label text-[7px] tracking-[0.15em] uppercase transition-all"
            style={
              priceRange.label === pr.label
                ? { background: '#C9A961', color: '#0A0406' }
                : { border: '1px solid rgba(201,169,97,0.15)', color: 'rgba(201,169,97,0.4)' }
            }
          >
            {pr.label}
          </button>
        ))}
        {total > 0 && (
          <span className="font-label text-[7px] tracking-[0.1em] uppercase text-cream/15 self-center ml-2">
            {total} items
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20">
          <p className="font-label text-[9px] tracking-[0.3em] uppercase text-cream/15 animate-pulse">
            LOADING THE EXCHANGE…
          </p>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 border border-cream/5">
          <p className="text-4xl mb-4 opacity-20">🏷️</p>
          <p className="font-display text-xl italic text-cream/20">Nothing here yet.</p>
          <p className="font-body text-sm text-cream/15 mt-2">
            Be the first to list something.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} accent={accent} onOffer={setOfferTarget} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {total > 24 && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/25 hover:text-cream/50 disabled:opacity-20"
          >
            ← PREV
          </button>
          <span className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/20 self-center">
            {page} / {Math.ceil(total / 24)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 24)}
            className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/25 hover:text-cream/50 disabled:opacity-20"
          >
            NEXT →
          </button>
        </div>
      )}

      <AnimatePresence>
        {offerTarget && (
          <OfferModal
            listing={offerTarget}
            accent={accent}
            onClose={() => setOfferTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sell Tab ──────────────────────────────────────────────────────────────────

function SellTab({ accent }: { accent: string }) {
  const [form, setForm] = useState({
    title: '',
    brand: '',
    size: '',
    condition: 'excellent',
    asking_price: '',
    category: 'Fashion',
    description: '',
  });
  const [novaLoading, setNovaLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const askingCents = Math.round(parseFloat(form.asking_price || '0') * 100);
  const feeCents = Math.floor(askingCents * 0.08);
  const receiveCents = askingCents - feeCents;

  function setField(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function priceWithNova() {
    if (!form.brand && !form.title) return;
    setNovaLoading(true);
    try {
      const prompt = `A member is selling "${form.title}"${form.brand ? ` by ${form.brand}` : ''} in ${form.condition.replace('_', ' ')} condition on a members-only resale platform. Suggest a fair asking price in USD as a single number with no explanation. Just the number.`;
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      const match = String(json.text ?? '').match(/[\d,]+(\.\d{1,2})?/);
      if (match) setField('asking_price', match[0].replace(',', ''));
    } catch {
      // silent
    } finally {
      setNovaLoading(false);
    }
  }

  async function submit() {
    setErr('');
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    if (!askingCents || askingCents < 100) { setErr('Enter a valid price.'); return; }
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/exchange/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          brand: form.brand || undefined,
          size: form.size || undefined,
          condition: form.condition,
          asking_price_cents: askingCents,
          category: form.category,
          description: form.description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? 'Failed to list.'); }
      else setDone(true);
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setSubmitLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">✓</p>
        <h3 className="font-display text-2xl italic text-brass mb-2">Listed.</h3>
        <p className="font-body text-sm text-cream/50 mb-6">
          Your item is live on The Exchange.
        </p>
        <button
          onClick={() => { setDone(false); setForm({ title: '', brand: '', size: '', condition: 'excellent', asking_price: '', category: 'Fashion', description: '' }); }}
          className="font-label text-[9px] tracking-[0.3em] uppercase text-brass/60 hover:text-brass border border-brass/20 px-6 py-2"
        >
          LIST ANOTHER
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/30 block mb-1">Title *</label>
          <input
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="What are you selling?"
            className="w-full bg-cream/5 border border-cream/10 px-3 py-2.5 font-body text-sm text-cream placeholder-cream/15 focus:outline-none focus:border-brass/40"
          />
        </div>
        <div>
          <label className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/30 block mb-1">Brand</label>
          <input
            value={form.brand}
            onChange={(e) => setField('brand', e.target.value)}
            placeholder="Nike, Chanel…"
            className="w-full bg-cream/5 border border-cream/10 px-3 py-2.5 font-body text-sm text-cream placeholder-cream/15 focus:outline-none focus:border-brass/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/30 block mb-1">Size</label>
          <input
            value={form.size}
            onChange={(e) => setField('size', e.target.value)}
            placeholder="M / 10 / 32×30…"
            className="w-full bg-cream/5 border border-cream/10 px-3 py-2.5 font-body text-sm text-cream placeholder-cream/15 focus:outline-none focus:border-brass/40"
          />
        </div>
        <div>
          <label className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/30 block mb-1">Condition</label>
          <select
            value={form.condition}
            onChange={(e) => setField('condition', e.target.value)}
            className="w-full bg-cream/5 border border-cream/10 px-3 py-2.5 font-body text-sm text-cream focus:outline-none focus:border-brass/40 appearance-none"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value} style={{ background: '#0A0406' }}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/30 block mb-1">Category</label>
        <div className="flex gap-2 flex-wrap">
          {ITEM_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
            <button
              key={cat}
              onClick={() => setField('category', cat)}
              className="px-3 py-1 font-label text-[7px] tracking-[0.15em] uppercase transition-all"
              style={
                form.category === cat
                  ? { background: accent, color: '#0A0406' }
                  : { border: '1px solid rgba(244,232,208,0.08)', color: 'rgba(244,232,208,0.3)' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Price + Nova */}
      <div>
        <label className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/30 block mb-1">
          Asking Price (USD) *
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-cream/30">$</span>
            <input
              type="number"
              value={form.asking_price}
              onChange={(e) => setField('asking_price', e.target.value)}
              placeholder="0.00"
              min="1"
              step="0.01"
              className="w-full bg-cream/5 border border-cream/10 pl-7 pr-3 py-2.5 font-body text-sm text-cream placeholder-cream/15 focus:outline-none focus:border-brass/40"
            />
          </div>
          <button
            onClick={priceWithNova}
            disabled={novaLoading || (!form.brand && !form.title)}
            className="px-4 py-2 font-label text-[7px] tracking-[0.15em] uppercase border border-brass/20 text-brass/60 hover:text-brass hover:border-brass/40 disabled:opacity-30 transition-all whitespace-nowrap"
          >
            {novaLoading ? '…' : 'PRICE W/ NOVA'}
          </button>
        </div>

        {/* Fee calculator */}
        {askingCents > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-3 border border-brass/10 bg-brass/3"
          >
            <div className="flex justify-between font-label text-[8px] tracking-[0.15em] uppercase text-cream/30">
              <span>Asking price</span><span>{fmt(askingCents)}</span>
            </div>
            <div className="flex justify-between font-label text-[8px] tracking-[0.15em] uppercase text-cream/25 mt-1">
              <span>Finesse fee (8%)</span><span>−{fmt(feeCents)}</span>
            </div>
            <div className="flex justify-between font-label text-[9px] tracking-[0.2em] uppercase text-brass mt-2 pt-2 border-t border-brass/10">
              <span>You receive</span><span>{fmt(receiveCents)}</span>
            </div>
          </motion.div>
        )}
      </div>

      <div>
        <label className="font-label text-[8px] tracking-[0.2em] uppercase text-cream/30 block mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          rows={3}
          placeholder="Condition details, measurements, story…"
          className="w-full bg-cream/5 border border-cream/10 px-3 py-2 font-body text-sm text-cream/80 placeholder-cream/15 focus:outline-none focus:border-brass/40 resize-none"
        />
      </div>

      {/* Photo note */}
      <div className="p-3 border border-cream/5 bg-cream/2">
        <p className="font-label text-[7px] tracking-[0.15em] uppercase text-cream/20">
          📎 Up to 4 photos · use upload tab in your profile or paste URLs in description
        </p>
      </div>

      {err && <p className="font-body text-xs text-red-400/80">{err}</p>}

      <button
        onClick={submit}
        disabled={submitLoading}
        className="w-full py-3.5 font-label text-[9px] tracking-[0.3em] uppercase transition-all"
        style={{ background: accent, color: '#0A0406', opacity: submitLoading ? 0.6 : 1 }}
      >
        {submitLoading ? 'LISTING…' : 'LIST ITEM'}
      </button>
    </div>
  );
}

// ── My Deals Tab ──────────────────────────────────────────────────────────────

function MyDealsTab({ accent }: { accent: string }) {
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<'listings' | 'offers'>('listings');

  useEffect(() => {
    async function fetchMyData() {
      setLoading(true);
      try {
        // Fetch my listings (seller view — needs auth cookie, no public API yet)
        const [listRes, offerRes] = await Promise.all([
          fetch('/api/exchange/listings?mine=1'),
          fetch('/api/exchange/listings?offers=1'),
        ]);
        const listJson = await listRes.json();
        const offerJson = await offerRes.json();
        setMyListings(listJson.listings ?? []);
        setMyOffers(offerJson.offers ?? []);
      } catch {
        // Silently degrade
      } finally {
        setLoading(false);
      }
    }
    void fetchMyData();
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    active: '#A8D5A2',
    reserved: '#F4C87A',
    sold: '#C9A961',
    pulled: 'rgba(244,232,208,0.2)',
    pending: '#69C9D0',
    accepted: '#A8D5A2',
    declined: 'rgba(255,100,100,0.5)',
    withdrawn: 'rgba(244,232,208,0.15)',
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-0 mb-6 border-b border-cream/8">
        {(['listings', 'offers'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className="px-6 py-2.5 font-label text-[8px] tracking-[0.25em] uppercase transition-all"
            style={
              sub === s
                ? { borderBottom: `2px solid ${accent}`, color: accent }
                : { color: 'rgba(244,232,208,0.2)' }
            }
          >
            MY {s.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="font-label text-[9px] tracking-[0.3em] uppercase text-cream/15 animate-pulse">LOADING…</p>
        </div>
      ) : sub === 'listings' ? (
        myListings.length === 0 ? (
          <div className="text-center py-16 border border-cream/5">
            <p className="font-display text-xl italic text-cream/20">No listings yet.</p>
            <p className="font-body text-sm text-cream/15 mt-2">Switch to SELL to post your first item.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myListings.map((l) => (
              <div key={l.id} className="flex items-center gap-4 p-4 border border-cream/8 bg-ink/30">
                <div className="w-12 h-12 bg-cream/5 flex items-center justify-center shrink-0">
                  {l.photo_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.photo_urls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl opacity-20">🏷️</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-cream/80 truncate">{l.title}</p>
                  <p className="font-label text-[7px] tracking-[0.15em] uppercase text-brass/50 mt-0.5">
                    {fmt(l.asking_price_cents)} · {l.views} views
                  </p>
                </div>
                <span
                  className="font-label text-[7px] tracking-[0.15em] uppercase px-2 py-1 shrink-0"
                  style={{ color: STATUS_COLORS[l.status] ?? '#C9A961', border: `1px solid ${STATUS_COLORS[l.status] ?? '#C9A961'}30` }}
                >
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        )
      ) : myOffers.length === 0 ? (
        <div className="text-center py-16 border border-cream/5">
          <p className="font-display text-xl italic text-cream/20">No offers made yet.</p>
          <p className="font-body text-sm text-cream/15 mt-2">Browse items and make your first offer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myOffers.map((o) => (
            <div key={o.id} className="flex items-center gap-4 p-4 border border-cream/8 bg-ink/30">
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-cream/80">{fmt(o.offer_price_cents)}</p>
                {o.message && (
                  <p className="font-body text-xs text-cream/35 mt-0.5 truncate">{o.message}</p>
                )}
              </div>
              <span
                className="font-label text-[7px] tracking-[0.15em] uppercase px-2 py-1 shrink-0"
                style={{ color: STATUS_COLORS[o.status] ?? '#C9A961', border: `1px solid ${STATUS_COLORS[o.status] ?? '#C9A961'}30` }}
              >
                {o.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExchangePage() {
  const accent = useAccent();
  const [tab, setTab] = useState<Tab>('BROWSE');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px]"
          style={{ background: `radial-gradient(ellipse at center, ${accent}06 0%, transparent 65%)` }}
        />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="text-3xl mb-3 inline-block">🏷️</span>
          <h1 className="font-display text-4xl italic text-brass tracking-[0.15em]">The Exchange</h1>
          <p className="font-label text-[9px] tracking-[0.5em] text-cream/20 uppercase mt-2">
            PEER-TO-PEER · 8% PLATFORM FEE · MEMBERS ONLY
          </p>
        </motion.div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mb-8 relative z-10">
        <div className="flex border-b border-cream/8">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-all"
              style={
                tab === t
                  ? { borderBottom: `2px solid ${accent}`, color: accent }
                  : { color: 'rgba(244,232,208,0.2)', borderBottom: '2px solid transparent' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 relative z-10 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {tab === 'BROWSE' && <BrowseTab accent={accent} />}
            {tab === 'SELL' && <SellTab accent={accent} />}
            {tab === 'MY DEALS' && <MyDealsTab accent={accent} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="text-center pb-8 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">
          return to the lobby
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </motion.div>
  );
}
