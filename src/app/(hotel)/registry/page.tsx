'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = 'MY LIST' | 'OUTINGS' | 'VIP BOARD';
type AddSubTab = 'upload' | 'nova' | 'wardrobe';
type Gender = 'feminine' | 'masculine';

interface RegistryItem {
  id: string;
  title: string;
  brand: string;
  price_cents: number;
  pledged_cents: number;
  category: string;
  occasion: string;
  photo_url: string | null;
  source: 'upload' | 'nova' | 'wardrobe';
}

interface OutingCard {
  id: string;
  title: string;
  partner: string;
  occasion_type: string;
  date: string;
  note: string;
  status: 'proposed' | 'confirmed' | 'completed';
}

interface VipItem {
  id: string;
  title: string;
  brand: string;
  price_cents: number;
  pledged_cents: number;
  category: string;
  description: string;
  partner_logo: string;
}

const OCCASION_TYPES = ['Birthday', 'Anniversary', 'Milestone', 'Vacation', 'Cultural', 'Dining', 'Travel', 'Romance', 'No occasion'];
const CATEGORIES = ['Bags', 'Shoes', 'Jewelry', 'Clothing', 'Beauty', 'Home', 'Travel', 'Experience', 'Other'];

const WARDROBE_SUGGEST: Array<{ id: string; title: string; brand: string; price_cents: number }> = [
  { id: 'w1', title: 'Bottega Veneta Intrecciato', brand: 'Bottega Veneta', price_cents: 380000 },
  { id: 'w2', title: 'The Row Agnes Coat', brand: 'The Row', price_cents: 420000 },
  { id: 'w3', title: 'Jacquemus Le Chiquito', brand: 'Jacquemus', price_cents: 65000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

function pct(pledged: number, price: number): number {
  return Math.min(100, Math.round((pledged / price) * 100));
}

function statusColor(status: OutingCard['status']): string {
  if (status === 'confirmed') return 'rgba(0,255,136,0.6)';
  if (status === 'completed') return 'rgba(201,169,97,0.5)';
  return 'rgba(244,232,208,0.3)';
}

// ─── Category colors ──────────────────────────────────────────────────────────

const CAT_BG: Record<string, string> = {
  Bags: 'linear-gradient(135deg,#2A1A0E,#4A2810)',
  Shoes: 'linear-gradient(135deg,#0E1A2A,#1A2840)',
  Travel: 'linear-gradient(135deg,#0E1A1A,#183030)',
  Home: 'linear-gradient(135deg,#1A1A0E,#2A2A18)',
  Experience: 'linear-gradient(135deg,#1A0E2A,#2D1840)',
  Automotive: 'linear-gradient(135deg,#1A0E0E,#2A1818)',
};

// ─── RegistryItemCard ─────────────────────────────────────────────────────────

function RegistryItemCard({ item, accent, index }: { item: RegistryItem; accent: string; index: number }) {
  const funded = item.pledged_cents >= item.price_cents;
  const p = pct(item.pledged_cents, item.price_cents);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      style={{
        background: '#0D0508',
        border: funded ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(244,232,208,0.06)',
        marginBottom: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Photo strip */}
      <div
        style={{
          width: '100%',
          height: '120px',
          background: CAT_BG[item.category] ?? 'linear-gradient(135deg,#1A0E0A,#2A1810)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.15)' }}>
          {item.category}
        </span>
        {/* Source pill */}
        <div style={{ position: 'absolute', top: 10, left: 10, padding: '3px 9px', border: `1px solid ${accent}40`, background: `${accent}0F` }}>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: '7px', letterSpacing: '0.3em', textTransform: 'uppercase', color: accent }}>
            {item.source === 'nova' ? 'nova' : item.source === 'wardrobe' ? 'wardrobe' : 'upload'}
          </span>
        </div>
        {funded && (
          <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 9px', border: '1px solid rgba(0,255,136,0.35)', background: 'rgba(0,255,136,0.08)' }}>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: '7px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#00FF88' }}>FUNDED</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 18px' }}>
        {item.brand && (
          <p style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.25)', marginBottom: '4px' }}>
            {item.brand}
          </p>
        )}
        <h3 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '17px', color: '#F4E8D0', marginBottom: '10px', lineHeight: 1.25 }}>
          {item.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontFamily: 'Courier New,monospace', fontSize: '16px', color: accent }}>
            {fmt(item.price_cents)}
          </span>
          {item.occasion !== 'No occasion' && (
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.2)' }}>
              {item.occasion}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontFamily: 'Courier New,monospace', fontSize: '10px', color: 'rgba(244,232,208,0.35)' }}>
              {fmt(item.pledged_cents)} pledged
            </span>
            <span style={{ fontFamily: 'Courier New,monospace', fontSize: '10px', color: 'rgba(244,232,208,0.2)' }}>{p}%</span>
          </div>
          <div style={{ height: '2px', background: 'rgba(244,232,208,0.06)', width: '100%' }}>
            <div
              style={{
                height: '100%',
                width: `${p}%`,
                background: funded ? '#00FF88' : accent,
                transition: 'width 0.8s ease',
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── OutingItemCard ───────────────────────────────────────────────────────────

function OutingItemCard({ outing, accent, index }: { outing: OutingCard; accent: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 + 0.1, duration: 0.4 }}
      style={{
        background: '#0D0508',
        border: '1px solid rgba(244,232,208,0.06)',
        padding: '20px',
        marginBottom: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <p style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.25)', marginBottom: '4px' }}>
            {outing.occasion_type} &middot; {outing.partner}
          </p>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '19px', color: '#F4E8D0', lineHeight: 1.2 }}>
            {outing.title}
          </h3>
        </div>
        <div style={{ padding: '3px 10px', border: `1px solid ${statusColor(outing.status)}60`, background: `${statusColor(outing.status)}10`, flexShrink: 0, marginLeft: 12 }}>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: '7px', letterSpacing: '0.25em', textTransform: 'uppercase', color: statusColor(outing.status) }}>
            {outing.status}
          </span>
        </div>
      </div>

      <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontSize: '14px', color: 'rgba(244,232,208,0.4)', lineHeight: 1.6, marginBottom: '12px' }}>
        {outing.note}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '6px', height: '6px', background: accent, opacity: 0.6 }} />
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.2)' }}>
          {outing.date ? new Date(outing.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}
        </span>
      </div>
    </motion.div>
  );
}

// ─── VipItemCard ──────────────────────────────────────────────────────────────

function VipItemCard({ item, accent, index, onGenerate }: { item: VipItem; accent: string; index: number; onGenerate: (item: VipItem) => void }) {
  const funded = item.pledged_cents >= item.price_cents;
  const p = pct(item.pledged_cents, item.price_cents);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.15, duration: 0.45 }}
      style={{
        background: 'linear-gradient(135deg,rgba(74,25,34,0.12) 0%,#0D0508 100%)',
        border: funded ? '1px solid rgba(201,169,97,0.5)' : '1px solid rgba(201,169,97,0.15)',
        padding: '24px',
        marginBottom: '18px',
        boxShadow: funded ? '0 0 30px rgba(201,169,97,0.08)' : 'none',
      }}
    >
      {/* Partner label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#C9A961', opacity: 0.5 }}>
          {item.partner_logo}
        </span>
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.2)' }}>
          {item.category}
        </span>
      </div>

      <h3 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '22px', color: '#E8C87A', lineHeight: 1.2, marginBottom: '8px' }}>
        {item.title}
      </h3>
      <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontSize: '14px', color: 'rgba(244,232,208,0.4)', lineHeight: 1.65, marginBottom: '18px' }}>
        {item.description}
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
        <span style={{ fontFamily: 'Courier New,monospace', fontSize: '24px', color: '#C9A961' }}>
          {fmt(item.price_cents)}
        </span>
        <span style={{ fontFamily: 'Courier New,monospace', fontSize: '12px', color: 'rgba(244,232,208,0.25)' }}>
          {fmt(item.pledged_cents)} pledged
        </span>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ height: '3px', background: 'rgba(201,169,97,0.08)' }}>
          <div
            style={{
              height: '100%',
              width: `${p}%`,
              background: funded ? '#C9A961' : 'rgba(201,169,97,0.5)',
              transition: 'width 1s ease',
            }}
          />
        </div>
      </div>

      {/* Token generate button — only if funded */}
      {funded ? (
        <button
          onClick={() => onGenerate(item)}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg,#C9A961,#E8C87A)',
            color: '#0A0406',
            fontFamily: 'Cinzel,serif',
            fontSize: '10px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            border: 'none',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          GENERATE TOKEN
        </button>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px', border: '1px solid rgba(201,169,97,0.1)', background: 'rgba(201,169,97,0.04)' }}>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(201,169,97,0.3)' }}>
            {p}% funded — token available when fully pledged
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Add Item Sheet ───────────────────────────────────────────────────────────

function AddItemSheet({ accent, onClose, onAdded }: { accent: string; onClose: () => void; onAdded: (item: RegistryItem) => void }) {
  const [subTab, setSubTab] = useState<AddSubTab>('upload');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [novaPrompt, setNovaPrompt] = useState('');
  const [novaSuggesting, setNovaSuggesting] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('Bags');
  const [formOccasion, setFormOccasion] = useState('No occasion');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // suppress unused warning
  void photoFile;

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setIdentifying(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/registry/identify', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json() as { title: string; brand: string; estimated_price_cents: number; category: string };
        setFormTitle(data.title ?? '');
        setFormBrand(data.brand ?? '');
        setFormPrice(data.estimated_price_cents ? String(data.estimated_price_cents / 100) : '');
        setFormCategory(data.category ?? 'Other');
        setIdentified(true);
      }
    } finally {
      setIdentifying(false);
    }
  }

  async function handleNovaSuggest() {
    if (!novaPrompt.trim()) return;
    setNovaSuggesting(true);
    try {
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Registry item suggestion: "${novaPrompt}"`,
          system: 'You are a luxury personal shopper. Return ONLY JSON: {"title":"...","brand":"...","estimated_price_cents":number,"category":"Bags|Shoes|Jewelry|Clothing|Beauty|Home|Travel|Experience|Other"}',
        }),
      });
      if (res.ok) {
        const raw = await res.json() as { text: string };
        try {
          const match = raw.text.match(/\{[\s\S]*\}/);
          if (match) {
            const data = JSON.parse(match[0]) as { title: string; brand: string; estimated_price_cents: number; category: string };
            setFormTitle(data.title ?? '');
            setFormBrand(data.brand ?? '');
            setFormPrice(data.estimated_price_cents ? String(data.estimated_price_cents / 100) : '');
            setFormCategory(data.category ?? 'Other');
          }
        } catch { /* ignore parse error */ }
      }
    } finally {
      setNovaSuggesting(false);
    }
  }

  async function handleSubmit() {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        title: formTitle,
        brand: formBrand,
        price_cents: Math.round(parseFloat(formPrice || '0') * 100),
        category: formCategory,
        occasion: formOccasion,
        source: subTab,
        photo_url: photoPreview,
      };
      const res = await fetch('/api/registry/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json() as { id: string };
        setDone(true);
        onAdded({
          id: data.id ?? String(Date.now()),
          title: formTitle,
          brand: formBrand,
          price_cents: body.price_cents,
          pledged_cents: 0,
          category: formCategory,
          occasion: formOccasion,
          photo_url: photoPreview,
          source: subTab,
        });
        setTimeout(onClose, 1200);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Cinzel,serif',
    fontSize: '8px',
    letterSpacing: '0.35em',
    textTransform: 'uppercase' as const,
    color: 'rgba(244,232,208,0.3)',
    display: 'block',
    marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(244,232,208,0.04)',
    border: '1px solid rgba(244,232,208,0.1)',
    color: '#F4E8D0',
    padding: '10px 12px',
    fontFamily: '"Cormorant Garamond",serif',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const SUB_TABS: Array<{ key: AddSubTab; label: string }> = [
    { key: 'upload', label: 'Upload Photo' },
    { key: 'nova', label: 'Nova Suggest' },
    { key: 'wardrobe', label: 'From Wardrobe' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,4,6,0.88)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{
          width: '100%',
          maxWidth: '672px',
          margin: '0 auto',
          background: '#0D0508',
          border: '1px solid rgba(244,232,208,0.08)',
          borderBottom: 'none',
          padding: '28px 24px 40px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: '40px', height: '3px', background: 'rgba(244,232,208,0.12)', borderRadius: 2, margin: '0 auto 24px' }} />

        {/* Title */}
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '22px', color: '#F4E8D0', marginBottom: '20px', textAlign: 'center' }}>
          Add to Registry
        </h2>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {SUB_TABS.map(s => (
            <button
              key={s.key}
              onClick={() => setSubTab(s.key)}
              style={{
                flex: 1,
                padding: '8px 4px',
                fontFamily: 'Cinzel,serif',
                fontSize: '8px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: subTab === s.key ? accent : 'transparent',
                color: subTab === s.key ? '#0A0406' : 'rgba(244,232,208,0.3)',
                border: subTab === s.key ? 'none' : '1px solid rgba(244,232,208,0.08)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Sub-tab content */}
        <AnimatePresence mode="wait">
          {subTab === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              {photoPreview ? (
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                  {identifying && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,4,6,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: accent }}>
                        identifying...
                      </span>
                    </div>
                  )}
                  {identified && !identifying && (
                    <div style={{ position: 'absolute', bottom: 10, right: 10, padding: '3px 10px', background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)' }}>
                      <span style={{ fontFamily: 'Cinzel,serif', fontSize: '7px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#00FF88' }}>auto-filled</span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%',
                    height: '140px',
                    background: 'rgba(244,232,208,0.03)',
                    border: `1px dashed ${accent}40`,
                    color: 'rgba(244,232,208,0.3)',
                    fontFamily: 'Cinzel,serif',
                    fontSize: '9px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    marginBottom: '16px',
                  }}
                >
                  TAP TO UPLOAD PHOTO
                </button>
              )}
            </motion.div>
          )}

          {subTab === 'nova' && (
            <motion.div key="nova" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>describe what you want</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={novaPrompt}
                  onChange={e => setNovaPrompt(e.target.value)}
                  placeholder="e.g. designer bag under $3k, perfect for dinner"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') handleNovaSuggest(); }}
                />
                <button
                  onClick={handleNovaSuggest}
                  disabled={novaSuggesting || !novaPrompt.trim()}
                  style={{
                    padding: '10px 16px',
                    background: accent,
                    color: '#0A0406',
                    fontFamily: 'Cinzel,serif',
                    fontSize: '8px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    cursor: novaSuggesting ? 'not-allowed' : 'pointer',
                    border: 'none',
                    opacity: novaSuggesting || !novaPrompt.trim() ? 0.5 : 1,
                  }}
                >
                  {novaSuggesting ? '...' : 'ASK'}
                </button>
              </div>
            </motion.div>
          )}

          {subTab === 'wardrobe' && (
            <motion.div key="wardrobe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginBottom: '16px' }}>
              <p style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.25)', marginBottom: '12px' }}>
                from your wishlist
              </p>
              {WARDROBE_SUGGEST.map(w => (
                <div
                  key={w.id}
                  onClick={() => { setFormTitle(w.title); setFormBrand(w.brand); setFormPrice(String(w.price_cents / 100)); }}
                  style={{
                    padding: '12px 14px',
                    border: formTitle === w.title ? `1px solid ${accent}80` : '1px solid rgba(244,232,208,0.06)',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    background: formTitle === w.title ? `${accent}0A` : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '15px', color: '#F4E8D0', marginBottom: '2px' }}>{w.title}</p>
                  <p style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.3)' }}>
                    {w.brand} &middot; {fmt(w.price_cents)}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form fields — always visible */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>item title</label>
            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Chanel Classic Flap" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>brand</label>
              <input value={formBrand} onChange={e => setFormBrand(e.target.value)} placeholder="optional" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>price ($)</label>
              <input value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0.00" type="number" min="0" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>category</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={selectStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>occasion</label>
              <select value={formOccasion} onChange={e => setFormOccasion(e.target.value)} style={selectStyle}>
                {OCCASION_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !formTitle.trim() || done}
          style={{
            width: '100%',
            padding: '15px',
            marginTop: '22px',
            background: done ? 'rgba(0,255,136,0.12)' : submitting ? 'rgba(201,169,97,0.2)' : accent,
            color: done ? '#00FF88' : submitting ? '#C9A961' : '#0A0406',
            fontFamily: 'Cinzel,serif',
            fontSize: '10px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            cursor: submitting || done ? 'not-allowed' : 'pointer',
            border: done ? '1px solid rgba(0,255,136,0.3)' : submitting ? '1px solid rgba(201,169,97,0.3)' : 'none',
            transition: 'all 0.3s',
          }}
        >
          {done ? 'Added ✓' : submitting ? 'Adding...' : 'Add to Registry'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── New Outing Sheet ─────────────────────────────────────────────────────────

function NewOutingSheet({ accent, onClose, onAdded }: { accent: string; onClose: () => void; onAdded: (outing: OutingCard) => void }) {
  const [partner, setPartner] = useState('');
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState('Dining');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !partner.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/registry/outings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, partner, occasion_type: occasion, date, note }),
      });
      if (res.ok) {
        setDone(true);
        onAdded({ id: String(Date.now()), title, partner, occasion_type: occasion, date, note, status: 'proposed' });
        setTimeout(onClose, 1200);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Cinzel,serif',
    fontSize: '8px',
    letterSpacing: '0.35em',
    textTransform: 'uppercase' as const,
    color: 'rgba(244,232,208,0.3)',
    display: 'block',
    marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(244,232,208,0.04)',
    border: '1px solid rgba(244,232,208,0.1)',
    color: '#F4E8D0',
    padding: '10px 12px',
    fontFamily: '"Cormorant Garamond",serif',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,4,6,0.88)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{
          width: '100%',
          maxWidth: '672px',
          margin: '0 auto',
          background: '#0D0508',
          border: '1px solid rgba(244,232,208,0.08)',
          borderBottom: 'none',
          padding: '28px 24px 40px',
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: '40px', height: '3px', background: 'rgba(244,232,208,0.12)', borderRadius: 2, margin: '0 auto 24px' }} />
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '22px', color: '#F4E8D0', marginBottom: '24px', textAlign: 'center' }}>
          New Outing
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>going with</label>
            <input
              value={partner}
              onChange={e => setPartner(e.target.value)}
              placeholder="@username"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>outing title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Omakase at Masa"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>occasion type</label>
              <select value={occasion} onChange={e => setOccasion(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {OCCASION_TYPES.filter(o => o !== 'No occasion').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="private note..."
              rows={3}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !partner.trim() || done}
          style={{
            width: '100%',
            padding: '15px',
            marginTop: '22px',
            background: done ? 'rgba(0,255,136,0.12)' : submitting ? 'rgba(201,169,97,0.2)' : accent,
            color: done ? '#00FF88' : submitting ? '#C9A961' : '#0A0406',
            fontFamily: 'Cinzel,serif',
            fontSize: '10px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            cursor: submitting || done ? 'not-allowed' : 'pointer',
            border: done ? '1px solid rgba(0,255,136,0.3)' : submitting ? '1px solid rgba(201,169,97,0.3)' : 'none',
            transition: 'all 0.3s',
          }}
        >
          {done ? 'Created ✓' : submitting ? 'Creating...' : 'Create Outing'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Token Modal ──────────────────────────────────────────────────────────────

function TokenModal({ item, onClose }: { item: VipItem; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/registry/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, title: item.title }),
      });
      if (res.ok) {
        const data = await res.json() as { token: string; instructions: string };
        setToken(data.token);
        setInstructions(data.instructions);
      }
    } finally {
      setLoading(false);
    }
  }

  function copyToken() {
    if (!token) return;
    navigator.clipboard.writeText(token).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,4,6,0.92)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(160deg,rgba(74,25,34,0.2),#0D0508)',
          border: '1px solid rgba(201,169,97,0.4)',
          padding: '36px 28px',
          boxShadow: '0 0 60px rgba(201,169,97,0.12)',
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Diamond ornament */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '1px', background: 'rgba(201,169,97,0.2)' }} />
          <div style={{ width: '8px', height: '8px', background: '#C9A961', transform: 'rotate(45deg)', opacity: 0.6 }} />
          <div style={{ width: '40px', height: '1px', background: 'rgba(201,169,97,0.2)' }} />
        </div>

        <p style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(201,169,97,0.4)', marginBottom: '10px' }}>
          VIP Access Token
        </p>
        <h3 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '20px', color: '#F4E8D0', marginBottom: '24px' }}>
          {item.title}
        </h3>

        {token ? (
          <>
            <div
              onClick={copyToken}
              style={{
                padding: '18px',
                background: 'rgba(201,169,97,0.06)',
                border: '1px solid rgba(201,169,97,0.35)',
                marginBottom: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontFamily: 'Courier New,monospace', fontSize: '20px', letterSpacing: '0.15em', color: '#E8C87A' }}>
                {token}
              </span>
            </div>
            <p style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.25em', color: copied ? '#00FF88' : 'rgba(201,169,97,0.35)', marginBottom: '20px', textTransform: 'uppercase', transition: 'color 0.3s' }}>
              {copied ? 'Copied to clipboard' : 'Tap to copy'}
            </p>
            {instructions && (
              <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontSize: '14px', color: 'rgba(244,232,208,0.4)', lineHeight: 1.7, marginBottom: '24px' }}>
                {instructions}
              </p>
            )}
          </>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontSize: '15px', color: 'rgba(244,232,208,0.4)', lineHeight: 1.7, marginBottom: '20px' }}>
              Generate your exclusive access token to present to the partner.
            </p>
            <button
              onClick={generate}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                background: loading ? 'rgba(201,169,97,0.2)' : 'linear-gradient(135deg,#C9A961,#E8C87A)',
                color: loading ? '#C9A961' : '#0A0406',
                fontFamily: 'Cinzel,serif',
                fontSize: '10px',
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: loading ? '1px solid rgba(201,169,97,0.3)' : 'none',
                transition: 'all 0.3s',
              }}
            >
              {loading ? 'Generating...' : 'GENERATE TOKEN'}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Cinzel,serif',
            fontSize: '8px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: 'rgba(244,232,208,0.2)',
            padding: '8px',
          }}
        >
          close
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MAIN_TABS: MainTab[] = ['MY LIST', 'OUTINGS', 'VIP BOARD'];

export default function RegistryPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('MY LIST');
  const [accent, setAccent] = useState('#FF4D7D');
  const [isVip, setIsVip] = useState<boolean | null>(null); // null = loading
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [outings, setOutings] = useState<OutingCard[]>([]);
  const [vipExclusives, setVipExclusives] = useState<VipItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingOutings, setLoadingOutings] = useState(true);
  const [loadingVip, setLoadingVip] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showNewOuting, setShowNewOuting] = useState(false);
  const [tokenItem, setTokenItem] = useState<VipItem | null>(null);

  // Gender accent
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const g = localStorage.getItem('finesse_gender') as Gender | null;
    setAccent(g === 'masculine' ? '#FFA96B' : '#FF4D7D');
  }, []);

  // Load profile (for is_vip)
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then((d: { profile: { is_vip?: boolean; vip_expires_at?: string | null } | null }) => {
        const p = d.profile;
        if (!p) {
          setIsVip(false);
          return;
        }
        const active =
          p.is_vip === true &&
          (p.vip_expires_at == null || new Date(p.vip_expires_at) > new Date());
        setIsVip(active);
      })
      .catch(() => setIsVip(false));
  }, []);

  // Load registry items
  useEffect(() => {
    setLoadingItems(true);
    fetch('/api/registry/items')
      .then(r => r.json())
      .then((d: { items: RegistryItem[] }) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false));
  }, []);

  // Load outings
  useEffect(() => {
    setLoadingOutings(true);
    fetch('/api/registry/outings')
      .then(r => r.json())
      .then((d: { outings: OutingCard[] }) => setOutings(d.outings ?? []))
      .catch(() => setOutings([]))
      .finally(() => setLoadingOutings(false));
  }, []);

  // Load VIP exclusives (only when on VIP BOARD tab and VIP confirmed)
  useEffect(() => {
    if (activeTab !== 'VIP BOARD' || isVip !== true) return;
    setLoadingVip(true);
    fetch('/api/registry/vip')
      .then(r => r.json())
      .then((d: { exclusives: VipItem[] }) => setVipExclusives(d.exclusives ?? []))
      .catch(() => setVipExclusives([]))
      .finally(() => setLoadingVip(false));
  }, [activeTab, isVip]);

  const totalPledged = items.reduce((s, i) => s + i.pledged_cents, 0);
  const fundedCount = items.filter(i => i.pledged_cents >= i.price_cents).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      style={{ minHeight: '100vh', background: '#0A0406', position: 'relative' }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '380px',
          background: `radial-gradient(ellipse at top, ${accent}12 0%, rgba(74,25,34,0.06) 40%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Header ── */}
      <header style={{ textAlign: 'center', paddingTop: '52px', paddingBottom: '8px', position: 'relative', zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {/* Ornament */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '32px', height: '1px', background: 'rgba(201,169,97,0.2)' }} />
            <div style={{ width: '6px', height: '6px', background: '#C9A961', transform: 'rotate(45deg)', opacity: 0.4 }} />
            <div style={{ width: '32px', height: '1px', background: 'rgba(201,169,97,0.2)' }} />
          </div>

          <h1
            style={{
              fontFamily: '"Playfair Display",serif',
              fontStyle: 'italic',
              fontSize: '38px',
              letterSpacing: '0.12em',
              color: '#F4E8D0',
              marginBottom: '4px',
              textShadow: '0 0 40px rgba(201,169,97,0.15)',
            }}
          >
            the registry
          </h1>
          <p style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.5em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.18)' }}>
            curated desires
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', justifyContent: 'center', gap: '36px', marginTop: '20px' }}
        >
          {[
            { label: 'items', value: String(items.length) },
            { label: 'funded', value: String(fundedCount) },
            { label: 'pledged', value: fmt(totalPledged) },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Courier New,monospace', fontSize: '16px', color: accent, marginBottom: '2px' }}>{stat.value}</p>
              <p style={{ fontFamily: 'Cinzel,serif', fontSize: '7px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.18)' }}>{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </header>

      {/* ── Main Tabs ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{
          maxWidth: '672px',
          margin: '24px auto 0',
          padding: '0 16px',
          display: 'flex',
          gap: '2px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {MAIN_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '11px 6px',
              fontFamily: 'Cinzel,serif',
              fontSize: '8px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.25s',
              background: activeTab === tab ? accent : 'transparent',
              color: activeTab === tab ? '#0A0406' : 'rgba(244,232,208,0.3)',
              border: activeTab === tab ? 'none' : '1px solid rgba(244,232,208,0.08)',
              borderBottom: activeTab === tab ? 'none' : '1px solid rgba(244,232,208,0.08)',
            }}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      {/* ── Tab Content ── */}
      <div style={{ maxWidth: '672px', margin: '0 auto', padding: '24px 16px 64px', position: 'relative', zIndex: 10 }}>
        <AnimatePresence mode="wait">

          {/* ── MY LIST ── */}
          {activeTab === 'MY LIST' && (
            <motion.div key="mylist" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3 }}>
              {loadingItems ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <span style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.2)' }}>
                    loading...
                  </span>
                </div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontSize: '17px', color: 'rgba(244,232,208,0.3)', marginBottom: '6px' }}>
                    Your registry is empty.
                  </p>
                  <p style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.15)' }}>
                    Add your first item below.
                  </p>
                </div>
              ) : (
                items.map((item, i) => (
                  <RegistryItemCard key={item.id} item={item} accent={accent} index={i} />
                ))
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ textAlign: 'center', marginTop: '8px' }}>
                <button
                  onClick={() => setShowAddItem(true)}
                  style={{
                    padding: '11px 28px',
                    background: 'transparent',
                    border: `1px solid ${accent}40`,
                    color: `${accent}80`,
                    fontFamily: 'Cinzel,serif',
                    fontSize: '9px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.25s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.color = `${accent}80`; }}
                >
                  + Add Item
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── OUTINGS ── */}
          {activeTab === 'OUTINGS' && (
            <motion.div key="outings" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3 }}>
              {/* Divider label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(244,232,208,0.05)' }} />
                <span style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.2)' }}>
                  linked plans
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(244,232,208,0.05)' }} />
              </div>

              {loadingOutings ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <span style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.2)' }}>
                    loading...
                  </span>
                </div>
              ) : outings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontSize: '17px', color: 'rgba(244,232,208,0.3)', marginBottom: '6px' }}>
                    No outings planned yet.
                  </p>
                  <p style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.15)' }}>
                    Create your first outing below.
                  </p>
                </div>
              ) : (
                outings.map((outing, i) => (
                  <OutingItemCard key={outing.id} outing={outing} accent={accent} index={i} />
                ))
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  onClick={() => setShowNewOuting(true)}
                  style={{
                    padding: '11px 28px',
                    background: 'transparent',
                    border: `1px solid ${accent}40`,
                    color: `${accent}80`,
                    fontFamily: 'Cinzel,serif',
                    fontSize: '9px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.25s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.color = `${accent}80`; }}
                >
                  + New Outing
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── VIP BOARD ── */}
          {activeTab === 'VIP BOARD' && (
            <motion.div key="vipboard" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3 }}>
              {isVip === null ? (
                /* Profile still loading */
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <span style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.2)' }}>
                    loading...
                  </span>
                </div>
              ) : !isVip ? (
                /* Lock screen */
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: 'center', paddingTop: '48px', paddingBottom: '48px' }}
                >
                  {/* Lock glyph */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: '1px solid rgba(201,169,97,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}
                  >
                    <span style={{ fontSize: '28px', lineHeight: 1 }}>◆</span>
                  </div>
                  <p style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(201,169,97,0.4)', marginBottom: '10px' }}>
                    VIP Members Only
                  </p>
                  <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontSize: '16px', color: 'rgba(244,232,208,0.35)', maxWidth: '300px', margin: '0 auto 28px', lineHeight: 1.7 }}>
                    Big-ticket items, Carvana access, private studio sessions, and exclusive travel. Upgrade to unlock.
                  </p>
                  <Link
                    href="/profile?upgrade=true"
                    style={{
                      display: 'inline-block',
                      padding: '12px 28px',
                      background: 'linear-gradient(135deg,#C9A961,#E8C87A)',
                      color: '#0A0406',
                      fontFamily: 'Cinzel,serif',
                      fontSize: '9px',
                      letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                    }}
                  >
                    Upgrade to VIP
                  </Link>
                </motion.div>
              ) : (
                <>
                  {/* VIP welcome bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg,rgba(201,169,97,0.08),rgba(74,25,34,0.06))',
                      border: '1px solid rgba(201,169,97,0.2)',
                      marginBottom: '20px',
                    }}
                  >
                    <span style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(201,169,97,0.6)' }}>◆ VIP</span>
                    <span style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontSize: '13px', color: 'rgba(244,232,208,0.35)' }}>
                      Your big-ticket board. Token required to activate with partners.
                    </span>
                  </div>

                  {loadingVip ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <span style={{ fontFamily: 'Cinzel,serif', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.2)' }}>
                        loading...
                      </span>
                    </div>
                  ) : vipExclusives.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontSize: '17px', color: 'rgba(244,232,208,0.3)', marginBottom: '6px' }}>
                        No VIP exclusives available yet.
                      </p>
                      <p style={{ fontFamily: 'Cinzel,serif', fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(244,232,208,0.15)' }}>
                        Check back soon.
                      </p>
                    </div>
                  ) : (
                    vipExclusives.map((v, i) => (
                      <VipItemCard key={v.id} item={v} accent="#C9A961" index={i} onGenerate={setTokenItem} />
                    ))
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{ textAlign: 'center', paddingBottom: '36px', position: 'relative', zIndex: 10 }}
      >
        <Link
          href="/lobby"
          style={{
            fontFamily: '"Cormorant Garamond",serif',
            fontSize: '13px',
            color: 'rgba(244,232,208,0.2)',
            textDecoration: 'none',
          }}
        >
          return to the lobby
        </Link>
      </motion.div>

      {/* Bottom gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '33%',
          background: 'linear-gradient(to top,rgba(74,25,34,0.06),transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Sheets / Modals ── */}
      <AnimatePresence>
        {showAddItem && (
          <AddItemSheet
            key="add-item"
            accent={accent}
            onClose={() => setShowAddItem(false)}
            onAdded={item => setItems(prev => [item, ...prev])}
          />
        )}
        {showNewOuting && (
          <NewOutingSheet
            key="new-outing"
            accent={accent}
            onClose={() => setShowNewOuting(false)}
            onAdded={outing => setOutings(prev => [outing, ...prev])}
          />
        )}
        {tokenItem && (
          <TokenModal
            key="token-modal"
            item={tokenItem}
            onClose={() => setTokenItem(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
