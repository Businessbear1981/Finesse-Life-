'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CollectionItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  value_est: number;
  color: string;
  acquired: string;
  photo: string | null;
  note: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const FINESSE_ITEMS: CollectionItem[] = [
  { id: '1', name: 'Birkin 25', brand: 'Hermès', category: 'bag', value_est: 38000, color: 'Gold', acquired: '2024', photo: null, note: 'My first Birkin. Never selling.' },
  { id: '2', name: 'Royal Oak 33mm', brand: 'Audemars Piguet', category: 'watch', value_est: 42000, color: 'Rose Gold', acquired: '2023', photo: null, note: '' },
  { id: '3', name: 'So Kate 120mm', brand: 'Christian Louboutin', category: 'shoes', value_est: 895, color: 'Nude Patent', acquired: '2025', photo: null, note: 'The ones.' },
];

const CARPE_DIEM_ITEMS: CollectionItem[] = [
  { id: '1', name: 'Submariner Date', brand: 'Rolex', category: 'watch', value_est: 16500, color: 'Black', acquired: '2023', photo: null, note: 'Daily driver.' },
  { id: '2', name: 'Air Jordan 1 Retro High', brand: 'Nike x Off-White', category: 'sneakers', value_est: 4200, color: 'Chicago', acquired: '2022', photo: null, note: 'DS. Never wearing.' },
  { id: '3', name: 'Daytona', brand: 'Rolex', category: 'watch', value_est: 52000, color: 'Panda', acquired: '2024', photo: null, note: 'Grail unlocked.' },
];

const FINESSE_CATEGORIES = ['All', 'Bags', 'Shoes', 'Watches', 'Jewelry'];
const CARPE_DIEM_CATEGORIES = ['All', 'Watches', 'Sneakers', 'Cars', 'Other'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

function categoryMatch(item: CollectionItem, filter: string): boolean {
  if (filter === 'All') return true;
  const map: Record<string, string[]> = {
    Bags: ['bag'],
    Shoes: ['shoes'],
    Watches: ['watch'],
    Jewelry: ['jewelry'],
    Sneakers: ['sneakers'],
    Cars: ['car'],
    Other: ['other'],
  };
  return (map[filter] ?? []).includes(item.category.toLowerCase());
}

// ─── Item Card Photo Placeholder ─────────────────────────────────────────────

function PhotoPlaceholder({ category }: { category: string }) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '1',
        background: 'linear-gradient(135deg, rgba(74,25,34,0.5), rgba(10,4,6,0.95))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          color: 'rgba(201,169,97,0.1)',
          fontFamily: 'var(--font-label)',
          fontSize: '8px',
          letterSpacing: '0.5em',
          textTransform: 'uppercase',
        }}
      >
        {category.toUpperCase()}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BagPage() {
  const [edition, setEdition] = useState<'finesse' | 'carpe_diem'>('finesse');
  const [items, setItems] = useState<CollectionItem[]>(FINESSE_ITEMS);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [detailItem, setDetailItem] = useState<CollectionItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState('');

  // Add sheet state
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newAcquired, setNewAcquired] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // SSR-safe gender detection + load from DB
  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    const ed: 'finesse' | 'carpe_diem' = g === 'masculine' ? 'carpe_diem' : 'finesse';
    setEdition(ed);
    // Load real items from DB; fall back to demo data if unauthenticated
    fetch(`/api/bag/items?edition=${ed}`)
      .then((r) => r.json())
      .then((d: { items?: CollectionItem[] }) => {
        const dbItems = (d.items ?? []).map((i) => ({
          ...i,
          value_est: Math.round((i as unknown as { value_est_cents: number }).value_est_cents / 100),
          acquired: (i as unknown as { acquired_year?: string }).acquired_year ?? '',
          photo: (i as unknown as { photo_url?: string }).photo_url ?? null,
        }));
        setItems(dbItems.length > 0 ? dbItems : []);
      })
      .catch(() => setItems([]));
  }, []);

  const accentColor = edition === 'finesse' ? '#FF4D7D' : '#69C9D0';
  const categories = edition === 'finesse' ? FINESSE_CATEGORIES : CARPE_DIEM_CATEGORIES;

  const filteredItems = items.filter((item) => categoryMatch(item, categoryFilter));
  const portfolioTotal = items.reduce((sum, i) => sum + i.value_est, 0);
  const pieceLabel = items.length === 1 ? 'piece' : 'pieces';

  function openDetail(item: CollectionItem) {
    setDetailItem(item);
    setDraftNote(item.note);
    setEditingNote(false);
  }

  async function saveNote() {
    if (!detailItem) return;
    // Optimistic update
    const updated = items.map((i) => i.id === detailItem.id ? { ...i, note: draftNote } : i);
    setItems(updated);
    setDetailItem({ ...detailItem, note: draftNote });
    setEditingNote(false);
    // Persist to DB
    fetch(`/api/bag/items/${detailItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: draftNote }),
    }).catch(() => {});
  }

  function resetAddSheet() {
    setNewName('');
    setNewBrand('');
    setNewCategory('');
    setNewValue('');
    setNewColor('');
    setNewAcquired('');
    setNewNote('');
    setNewPhotoUrl(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'photo');
      formData.append('userId', 'local');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setNewPhotoUrl(data.url ?? null);
      } else {
        // Fallback: use local object URL for preview
        setNewPhotoUrl(URL.createObjectURL(file));
      }
    } catch {
      setNewPhotoUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  }

  async function addToCollection() {
    if (!newName.trim() || !newBrand.trim()) return;
    const value_est = parseFloat(newValue.replace(/[^0-9.]/g, '')) || 0;
    try {
      const res = await fetch('/api/bag/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          brand: newBrand.trim(),
          category: newCategory || 'other',
          value_est_cents: Math.round(value_est * 100),
          color: newColor.trim() || null,
          acquired_year: newAcquired.trim() || new Date().getFullYear().toString(),
          photo_url: newPhotoUrl,
          note: newNote.trim() || null,
          edition,
        }),
      });
      const data = await res.json() as { item?: { id: string } };
      const item: CollectionItem = {
        id: data.item?.id ?? crypto.randomUUID(),
        name: newName.trim(),
        brand: newBrand.trim(),
        category: newCategory || 'other',
        value_est,
        color: newColor.trim(),
        acquired: newAcquired.trim() || new Date().getFullYear().toString(),
        photo: newPhotoUrl,
        note: newNote.trim(),
      };
      setItems((prev) => [item, ...prev]);
    } catch {
      // Optimistic add even on error
      const item: CollectionItem = {
        id: crypto.randomUUID(),
        name: newName.trim(),
        brand: newBrand.trim(),
        category: newCategory || 'other',
        value_est,
        color: newColor.trim(),
        acquired: newAcquired.trim() || new Date().getFullYear().toString(),
        photo: newPhotoUrl,
        note: newNote.trim(),
      };
      setItems((prev) => [item, ...prev]);
    }
    resetAddSheet();
    setAddOpen(false);
  }

  // Category chips for the add sheet
  const addCategories =
    edition === 'finesse'
      ? ['bag', 'shoes', 'watch', 'jewelry', 'other']
      : ['watch', 'sneakers', 'car', 'jewelry', 'other'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#0A0406' }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]"
          style={{
            background: `radial-gradient(ellipse at center, ${accentColor}0D 0%, transparent 65%)`,
          }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 relative z-10 pb-24">

        {/* ── Header ── */}
        <header className="text-center pt-12 pb-6">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h1
              className="font-display italic text-5xl tracking-wide"
              style={{ color: '#C9A961' }}
            >
              THE BAG
            </h1>
            <p
              className="font-label uppercase mt-2"
              style={{ fontSize: '9px', letterSpacing: '0.45em', color: 'rgba(244,232,208,0.2)' }}
            >
              what you carry says everything
            </p>
          </motion.div>
        </header>

        {/* ── Portfolio total ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-center mb-8"
          style={{
            fontFamily: 'Courier New, monospace',
            fontSize: '11px',
            color: 'rgba(201,169,97,0.45)',
            letterSpacing: '0.1em',
          }}
        >
          {items.length} {pieceLabel} &middot; est. {formatValue(portfolioTotal)}
        </motion.p>

        {/* ── Category filter ── */}
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          <AnimatePresence initial={false}>
            {categories.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <motion.button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  layout
                  className="relative px-4 py-1.5 font-label uppercase transition-colors duration-200"
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.25em',
                    color: active ? '#0A0406' : 'rgba(244,232,208,0.3)',
                    background: active ? accentColor : 'transparent',
                    border: active ? `1px solid ${accentColor}` : '1px solid rgba(244,232,208,0.1)',
                  }}
                >
                  {cat}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Collection grid ── */}
        <div className="grid grid-cols-2 gap-3 mb-12">
          <AnimatePresence>
            {filteredItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.07 }}
                className="cursor-pointer group"
                style={{
                  border: '1px solid rgba(244,232,208,0.06)',
                  background: 'rgba(10,4,6,0.6)',
                  backdropFilter: 'blur(8px)',
                }}
                onClick={() => openDetail(item)}
                whileHover={{ borderColor: 'rgba(201,169,97,0.2)' }}
              >
                {/* Photo */}
                {item.photo ? (
                  <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.photo}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <PhotoPlaceholder category={item.category} />
                )}

                <div className="p-3">
                  {/* Brand */}
                  <p
                    className="font-label uppercase mb-0.5"
                    style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(201,169,97,0.35)' }}
                  >
                    {item.brand}
                  </p>

                  {/* Name */}
                  <p
                    className="font-display leading-snug mb-1"
                    style={{ fontSize: '13px', color: '#F4E8D0' }}
                  >
                    {item.name}
                  </p>

                  {/* Value + category row */}
                  <div className="flex items-center justify-between">
                    <span
                      className="font-label uppercase"
                      style={{
                        fontSize: '7px',
                        letterSpacing: '0.2em',
                        color: 'rgba(244,232,208,0.2)',
                        background: 'rgba(244,232,208,0.04)',
                        padding: '2px 6px',
                      }}
                    >
                      {item.category}
                    </span>
                    <span
                      style={{
                        fontFamily: 'Courier New, monospace',
                        fontSize: '11px',
                        color: accentColor,
                      }}
                    >
                      {formatValue(item.value_est)}
                    </span>
                  </div>

                  {/* Note */}
                  {item.note ? (
                    <p
                      className="font-body italic mt-1.5 leading-tight"
                      style={{ fontSize: '10px', color: 'rgba(244,232,208,0.25)' }}
                    >
                      {item.note}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <div className="col-span-2 text-center py-16">
              <p
                className="font-label uppercase"
                style={{ fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(244,232,208,0.15)' }}
              >
                nothing in this category yet
              </p>
            </div>
          )}
        </div>

        {/* ── Lobby link ── */}
        <div className="text-center">
          <Link
            href="/lobby"
            className="font-body text-sm transition-colors"
            style={{ color: 'rgba(244,232,208,0.2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#C9A961')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(244,232,208,0.2)')}
          >
            return to the lobby
          </Link>
        </div>
      </div>

      {/* ── FAB: Add to Collection ── */}
      <motion.button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-8 right-6 z-30 flex items-center gap-2 px-5 py-3 font-label uppercase"
        style={{
          fontSize: '9px',
          letterSpacing: '0.25em',
          background: accentColor,
          color: '#0A0406',
          boxShadow: `0 0 24px ${accentColor}55`,
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        <span style={{ fontSize: '14px', fontWeight: 300 }}>+</span>
        Add to Collection
      </motion.button>

      {/* ── Detail modal ── */}
      <AnimatePresence>
        {detailItem && (
          <motion.div
            key="detail-overlay"
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ background: 'rgba(10,4,6,0.88)', backdropFilter: 'blur(12px)' }}
            onClick={() => setDetailItem(null)}
          >
            <motion.div
              className="w-full max-w-md relative"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.3 }}
              style={{
                background: '#0A0406',
                border: '1px solid rgba(201,169,97,0.18)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Large photo or placeholder */}
              {detailItem.photo ? (
                <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', maxHeight: '300px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detailItem.photo}
                    alt={detailItem.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div style={{ maxHeight: '220px', overflow: 'hidden' }}>
                  <PhotoPlaceholder category={detailItem.category} />
                </div>
              )}

              <div className="p-6">
                {/* Brand + category */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-label uppercase"
                    style={{ fontSize: '8px', letterSpacing: '0.35em', color: 'rgba(201,169,97,0.5)' }}
                  >
                    {detailItem.brand}
                  </span>
                  <span
                    className="font-label uppercase"
                    style={{
                      fontSize: '7px',
                      letterSpacing: '0.2em',
                      color: 'rgba(244,232,208,0.2)',
                      background: 'rgba(244,232,208,0.04)',
                      padding: '2px 6px',
                    }}
                  >
                    {detailItem.category}
                  </span>
                </div>

                {/* Name */}
                <h2
                  className="font-display italic mb-1"
                  style={{ fontSize: '22px', color: '#F4E8D0' }}
                >
                  {detailItem.name}
                </h2>

                {/* Color + acquired */}
                <p
                  className="font-label uppercase mb-4"
                  style={{ fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(244,232,208,0.25)' }}
                >
                  {detailItem.color && `${detailItem.color} · `}acquired {detailItem.acquired}
                </p>

                {/* Est. Value */}
                <div
                  className="py-3 px-4 mb-4 text-center"
                  style={{ background: 'rgba(201,169,97,0.06)', border: `1px solid ${accentColor}30` }}
                >
                  <p
                    className="font-label uppercase mb-0.5"
                    style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}
                  >
                    Est. Value
                  </p>
                  <p
                    style={{
                      fontFamily: 'Courier New, monospace',
                      fontSize: '26px',
                      color: accentColor,
                    }}
                  >
                    {formatValue(detailItem.value_est)}
                  </p>
                </div>

                {/* Personal note (editable inline) */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="font-label uppercase"
                      style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.25)' }}
                    >
                      personal note
                    </span>
                    <button
                      onClick={() => setEditingNote(!editingNote)}
                      className="font-label uppercase"
                      style={{ fontSize: '7px', letterSpacing: '0.2em', color: accentColor }}
                    >
                      {editingNote ? 'cancel' : 'edit'}
                    </button>
                  </div>
                  {editingNote ? (
                    <div>
                      <textarea
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 font-body text-sm resize-none focus:outline-none"
                        style={{
                          background: 'rgba(244,232,208,0.04)',
                          border: '1px solid rgba(201,169,97,0.2)',
                          color: '#F4E8D0',
                          fontSize: '13px',
                        }}
                        placeholder="Add a personal note..."
                        autoFocus
                      />
                      <button
                        onClick={saveNote}
                        className="mt-2 px-4 py-1.5 font-label uppercase text-xs"
                        style={{ background: accentColor, color: '#0A0406', fontSize: '8px', letterSpacing: '0.2em' }}
                      >
                        Save Note
                      </button>
                    </div>
                  ) : (
                    <p
                      className="font-body italic"
                      style={{ fontSize: '13px', color: detailItem.note ? 'rgba(244,232,208,0.5)' : 'rgba(244,232,208,0.15)' }}
                    >
                      {detailItem.note || 'No note yet.'}
                    </p>
                  )}
                </div>

                {/* Close */}
                <button
                  onClick={() => setDetailItem(null)}
                  className="w-full py-2.5 font-label uppercase transition-colors"
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.3em',
                    border: '1px solid rgba(244,232,208,0.12)',
                    color: 'rgba(244,232,208,0.35)',
                    background: 'transparent',
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Sheet (slide up) ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            key="add-overlay"
            className="fixed inset-0 z-40 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ background: 'rgba(10,4,6,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setAddOpen(false)}
          >
            <motion.div
              className="w-full max-w-2xl relative overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{
                maxHeight: '90vh',
                background: '#0A0406',
                border: '1px solid rgba(201,169,97,0.15)',
                borderBottom: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 pb-10">
                {/* Sheet header */}
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="font-display italic"
                    style={{ fontSize: '20px', color: '#C9A961' }}
                  >
                    Add to Collection
                  </h3>
                  <button
                    onClick={() => setAddOpen(false)}
                    className="font-label uppercase"
                    style={{ fontSize: '8px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Item name + Brand */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-label uppercase block mb-1.5" style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}>
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Birkin 25"
                        className="w-full px-3 py-2 font-body text-sm focus:outline-none"
                        style={{
                          background: 'rgba(244,232,208,0.03)',
                          border: '1px solid rgba(244,232,208,0.1)',
                          color: '#F4E8D0',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div>
                      <label className="font-label uppercase block mb-1.5" style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}>
                        Brand *
                      </label>
                      <input
                        type="text"
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        placeholder="Hermès"
                        className="w-full px-3 py-2 font-body text-sm focus:outline-none"
                        style={{
                          background: 'rgba(244,232,208,0.03)',
                          border: '1px solid rgba(244,232,208,0.1)',
                          color: '#F4E8D0',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Category chips */}
                  <div>
                    <label className="font-label uppercase block mb-2" style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}>
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {addCategories.map((cat) => {
                        const active = newCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setNewCategory(cat)}
                            className="px-3 py-1.5 font-label uppercase transition-all duration-200"
                            style={{
                              fontSize: '8px',
                              letterSpacing: '0.2em',
                              background: active ? accentColor : 'transparent',
                              color: active ? '#0A0406' : 'rgba(244,232,208,0.3)',
                              border: active ? `1px solid ${accentColor}` : '1px solid rgba(244,232,208,0.1)',
                            }}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Value + Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-label uppercase block mb-1.5" style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}>
                        Est. Value ($)
                      </label>
                      <input
                        type="number"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="38000"
                        className="w-full px-3 py-2 font-mono text-sm focus:outline-none"
                        style={{
                          background: 'rgba(244,232,208,0.03)',
                          border: '1px solid rgba(244,232,208,0.1)',
                          color: accentColor,
                          fontSize: '13px',
                          fontFamily: 'Courier New, monospace',
                        }}
                      />
                    </div>
                    <div>
                      <label className="font-label uppercase block mb-1.5" style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}>
                        Color / Finish
                      </label>
                      <input
                        type="text"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        placeholder="Gold"
                        className="w-full px-3 py-2 font-body text-sm focus:outline-none"
                        style={{
                          background: 'rgba(244,232,208,0.03)',
                          border: '1px solid rgba(244,232,208,0.1)',
                          color: '#F4E8D0',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Year acquired */}
                  <div>
                    <label className="font-label uppercase block mb-1.5" style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}>
                      Year Acquired
                    </label>
                    <input
                      type="text"
                      value={newAcquired}
                      onChange={(e) => setNewAcquired(e.target.value)}
                      placeholder="2024"
                      maxLength={4}
                      className="w-full px-3 py-2 font-mono text-sm focus:outline-none"
                      style={{
                        background: 'rgba(244,232,208,0.03)',
                        border: '1px solid rgba(244,232,208,0.1)',
                        color: '#F4E8D0',
                        fontSize: '13px',
                        fontFamily: 'Courier New, monospace',
                      }}
                    />
                  </div>

                  {/* Personal note */}
                  <div>
                    <label className="font-label uppercase block mb-1.5" style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}>
                      Personal Note
                    </label>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      placeholder="My first Birkin. Never selling."
                      className="w-full px-3 py-2 font-body text-sm resize-none focus:outline-none"
                      style={{
                        background: 'rgba(244,232,208,0.03)',
                        border: '1px solid rgba(244,232,208,0.1)',
                        color: '#F4E8D0',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Photo upload */}
                  <div>
                    <label className="font-label uppercase block mb-1.5" style={{ fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.3)' }}>
                      Photo (optional)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-2.5 font-label uppercase transition-colors"
                      style={{
                        fontSize: '8px',
                        letterSpacing: '0.25em',
                        border: '1px solid rgba(244,232,208,0.1)',
                        color: newPhotoUrl ? accentColor : 'rgba(244,232,208,0.25)',
                        background: 'transparent',
                      }}
                    >
                      {uploading ? 'Uploading...' : newPhotoUrl ? 'Photo added ✓' : 'Upload photo'}
                    </button>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={addToCollection}
                    disabled={!newName.trim() || !newBrand.trim()}
                    className="w-full py-3 font-label uppercase transition-opacity"
                    style={{
                      fontSize: '10px',
                      letterSpacing: '0.3em',
                      background: accentColor,
                      color: '#0A0406',
                      opacity: !newName.trim() || !newBrand.trim() ? 0.25 : 1,
                      cursor: !newName.trim() || !newBrand.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Add to Collection
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
