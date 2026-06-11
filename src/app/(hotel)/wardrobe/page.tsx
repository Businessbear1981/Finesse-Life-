'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Edition = 'finesse' | 'carpe_diem';
type TabId = 'closet' | 'feed' | 'wishlist';

interface Look {
  id: string;
  url: string | null;
  brands: string[];
  caption: string;
}

interface FeedEntry {
  id: string;
  member: string;
  city: string;
  brands: string[];
  caption: string;
  likes: number;
}

interface WishItem {
  id: string;
  brand: string;
  item: string;
  price_est: number;
  added: string;
}

const FEED: FeedEntry[] = [
  { id: '1', member: 'Amara K.', city: 'ATL', brands: ['Jacquemus', 'Bottega Veneta'], caption: 'Sunday brunch fit', likes: 34 },
  { id: '2', member: 'Marcus V.', city: 'MIA', brands: ['Loro Piana', 'Common Projects'], caption: 'Nothing loud. Everything right.', likes: 51 },
  { id: '3', member: 'Simone R.', city: 'NYC', brands: ['The Row', 'Manolo Blahnik'], caption: 'She moves different.', likes: 89 },
  { id: '4', member: 'Dev T.', city: 'LA', brands: ['Rick Owens', 'Dior Men'], caption: 'Drip or drown.', likes: 42 },
];

const WISHLIST_INIT: WishItem[] = [
  { id: '1', brand: 'Bottega Veneta', item: 'Intrecciato Bag', price_est: 3800, added: 'Jun 5' },
  { id: '2', brand: 'Amina Muaddi', item: 'Gilda Mule', price_est: 750, added: 'May 28' },
];

function PhotoPlaceholder() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg,rgba(74,25,34,0.6),rgba(10,4,6,0.9))',
        width: '100%',
        aspectRatio: '3/4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          color: 'rgba(201,169,97,0.15)',
          fontFamily: 'var(--font-label)',
          fontSize: '9px',
          letterSpacing: '0.4em',
        }}
      >
        LOOK
      </span>
    </div>
  );
}

function formatPrice(n: number): string {
  return `~$${n.toLocaleString('en-US')}`;
}

export default function WardrobePage() {
  const [edition, setEdition] = useState<Edition>('finesse');
  const [tab, setTab] = useState<TabId>('closet');
  const [userId, setUserId] = useState<string | null>(null);

  // Closet state
  const [looks, setLooks] = useState<Look[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [brandInput, setBrandInput] = useState('');
  const [brandTags, setBrandTags] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feed state
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [feedLikes, setFeedLikes] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    FEED.forEach((f) => { m[f.id] = f.likes; });
    return m;
  });

  // Wishlist state
  const [wishlist, setWishlist] = useState<WishItem[]>(WISHLIST_INIT);
  const [wBrand, setWBrand] = useState('');
  const [wItem, setWItem] = useState('');
  const [wPrice, setWPrice] = useState('');

  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

  const accent = edition === 'finesse' ? '#FF4D7D' : '#69C9D0';

  // ── upload handlers ──────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setUploadFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function addBrandTag() {
    const trimmed = brandInput.trim();
    if (!trimmed || brandTags.length >= 5) return;
    setBrandTags((prev) => [...prev, trimmed]);
    setBrandInput('');
  }

  function removeBrandTag(idx: number) {
    setBrandTags((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handlePost() {
    if (posting) return;
    setPosting(true);
    let url: string | null = null;
    if (uploadFile && userId) {
      try {
        const fd = new FormData();
        fd.append('file', uploadFile);
        fd.append('type', 'photo');
        fd.append('userId', userId);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json() as { url: string };
        url = data.url;
      } catch {
        // gracefully fall through with no url
      }
    }
    const newLook: Look = {
      id: Date.now().toString(),
      url,
      brands: [...brandTags],
      caption: caption.slice(0, 120),
    };
    setLooks((prev) => [newLook, ...prev]);
    // reset
    setUploadFile(null);
    setPreviewUrl(null);
    setBrandTags([]);
    setBrandInput('');
    setCaption('');
    setShowUpload(false);
    setPosting(false);
  }

  // ── feed handlers ────────────────────────────────────────────────
  function toggleLike(id: string) {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setFeedLikes((l) => ({ ...l, [id]: (l[id] ?? 0) - 1 }));
      } else {
        next.add(id);
        setFeedLikes((l) => ({ ...l, [id]: (l[id] ?? 0) + 1 }));
      }
      return next;
    });
  }

  // ── wishlist handlers ────────────────────────────────────────────
  function addWish() {
    const b = wBrand.trim();
    const it = wItem.trim();
    const p = parseInt(wPrice, 10);
    if (!b || !it || isNaN(p)) return;
    const now = new Date();
    const added = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setWishlist((prev) => [
      { id: Date.now().toString(), brand: b, item: it, price_est: p, added },
      ...prev,
    ]);
    setWBrand('');
    setWItem('');
    setWPrice('');
  }

  function removeWish(id: string) {
    setWishlist((prev) => prev.filter((w) => w.id !== id));
  }

  // ── styles ───────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'rgba(244,232,208,0.03)',
    border: '1px solid rgba(201,169,97,0.15)',
    color: '#F4E8D0',
    padding: '10px 14px',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: 'closet', label: 'My Closet' },
    { id: 'feed', label: 'Style Feed' },
    { id: 'wishlist', label: 'Wishlist' },
  ];

  return (
    <div
      className="min-h-screen relative"
      style={{ background: '#0A0406', color: '#F4E8D0' }}
    >
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}0A 0%, transparent 55%)`,
          transition: 'background 0.8s',
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-20">
        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center pt-14 pb-8"
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 'clamp(28px, 8vw, 42px)',
              color: '#C9A961',
              letterSpacing: '0.12em',
              marginBottom: '8px',
            }}
          >
            THE WARDROBE
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontSize: '13px',
              color: 'rgba(244,232,208,0.35)',
              letterSpacing: '0.08em',
            }}
          >
            dress like you mean it
          </p>
          <div
            style={{
              width: '40px',
              height: '1px',
              background: 'rgba(201,169,97,0.3)',
              margin: '14px auto 0',
            }}
          />
        </motion.header>

        {/* ── Tabs ── */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(201,169,97,0.12)',
            marginBottom: '28px',
            gap: '0',
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '12px 4px',
                fontFamily: 'var(--font-label)',
                fontSize: '9px',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: tab === t.id ? accent : 'rgba(244,232,208,0.25)',
                marginBottom: '-1px',
                background: 'none',
                border: 'none',
                borderBottom: tab === t.id ? `2px solid ${accent}` : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 0.3s, border-color 0.3s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {/* ═══════════════════ MY CLOSET ═══════════════════ */}
          {tab === 'closet' && (
            <motion.div
              key="closet"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              {/* Add Look button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button
                  onClick={() => setShowUpload(true)}
                  style={{
                    background: accent,
                    color: '#0A0406',
                    fontFamily: 'var(--font-label)',
                    fontSize: '9px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    padding: '10px 20px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Add Look
                </button>
              </div>

              {/* Looks grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                {looks.length === 0 && (
                  <p
                    style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      fontFamily: 'var(--font-body)',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      color: 'rgba(244,232,208,0.2)',
                      padding: '48px 0',
                    }}
                  >
                    your closet is empty — post your first look.
                  </p>
                )}
                {looks.map((look) => (
                  <div
                    key={look.id}
                    style={{
                      border: '1px solid rgba(201,169,97,0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    {look.url ? (
                      <img
                        src={look.url}
                        alt="look"
                        style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <PhotoPlaceholder />
                    )}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                        {look.brands.map((b) => (
                          <span
                            key={b}
                            style={{
                              fontFamily: 'var(--font-label)',
                              fontSize: '7px',
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              color: accent,
                              border: `1px solid ${accent}33`,
                              padding: '2px 6px',
                            }}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                      {look.caption && (
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontStyle: 'italic',
                            fontSize: '12px',
                            color: 'rgba(244,232,208,0.55)',
                            margin: 0,
                          }}
                        >
                          {look.caption}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════ STYLE FEED ═══════════════════ */}
          {tab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {FEED.map((entry) => {
                const liked = likedIds.has(entry.id);
                const initial = entry.member.charAt(0).toUpperCase();
                return (
                  <div
                    key={entry.id}
                    style={{
                      border: '1px solid rgba(201,169,97,0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    <PhotoPlaceholder />
                    <div style={{ padding: '14px 16px' }}>
                      {/* Avatar + name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: `${accent}22`,
                            border: `1px solid ${accent}44`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-label)',
                            fontSize: '11px',
                            color: accent,
                            flexShrink: 0,
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <p
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '14px',
                              color: '#F4E8D0',
                              margin: 0,
                              lineHeight: 1.2,
                            }}
                          >
                            {entry.member}
                          </p>
                          <p
                            style={{
                              fontFamily: 'var(--font-label)',
                              fontSize: '8px',
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              color: 'rgba(244,232,208,0.3)',
                              margin: 0,
                            }}
                          >
                            {entry.city}
                          </p>
                        </div>
                      </div>

                      {/* Brand chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                        {entry.brands.map((b) => (
                          <span
                            key={b}
                            style={{
                              fontFamily: 'var(--font-label)',
                              fontSize: '7px',
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              color: 'rgba(244,232,208,0.45)',
                              border: '1px solid rgba(201,169,97,0.15)',
                              padding: '3px 8px',
                            }}
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      {/* Caption */}
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontStyle: 'italic',
                          fontSize: '13px',
                          color: 'rgba(244,232,208,0.6)',
                          marginBottom: '12px',
                        }}
                      >
                        {entry.caption}
                      </p>

                      {/* Like button */}
                      <button
                        onClick={() => toggleLike(entry.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '16px',
                            color: liked ? accent : 'rgba(244,232,208,0.2)',
                            transition: 'color 0.2s',
                          }}
                        >
                          {liked ? '♥' : '♡'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '8px',
                            letterSpacing: '0.15em',
                            color: liked ? accent : 'rgba(244,232,208,0.3)',
                            transition: 'color 0.2s',
                          }}
                        >
                          {feedLikes[entry.id] ?? entry.likes}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ═══════════════════ WISHLIST ═══════════════════ */}
          {tab === 'wishlist' && (
            <motion.div
              key="wishlist"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              {/* Wish items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '32px' }}>
                {wishlist.length === 0 && (
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      color: 'rgba(244,232,208,0.2)',
                      textAlign: 'center',
                      padding: '32px 0',
                    }}
                  >
                    wishlist is empty.
                  </p>
                )}
                {wishlist.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      border: '1px solid rgba(201,169,97,0.08)',
                      background: 'rgba(244,232,208,0.015)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: '15px',
                          color: '#C9A961',
                          margin: '0 0 2px',
                          lineHeight: 1.2,
                        }}
                      >
                        {w.brand}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          color: 'rgba(244,232,208,0.6)',
                          margin: '0 0 4px',
                        }}
                      >
                        {w.item}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-label)',
                          fontSize: '8px',
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: 'rgba(244,232,208,0.25)',
                          margin: 0,
                        }}
                      >
                        {formatPrice(w.price_est)} · added {w.added}
                      </p>
                    </div>
                    <button
                      onClick={() => removeWish(w.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(244,232,208,0.2)',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0 0 0 16px',
                        flexShrink: 0,
                        lineHeight: 1,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#FF4D7D')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(244,232,208,0.2)')}
                      aria-label="remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add form */}
              <div
                style={{
                  border: '1px solid rgba(201,169,97,0.15)',
                  padding: '20px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-label)',
                    fontSize: '8px',
                    letterSpacing: '0.35em',
                    textTransform: 'uppercase',
                    color: 'rgba(201,169,97,0.5)',
                    marginBottom: '14px',
                  }}
                >
                  Add to Wishlist
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    value={wBrand}
                    onChange={(e) => setWBrand(e.target.value)}
                    placeholder="Brand"
                    style={inputStyle}
                  />
                  <input
                    value={wItem}
                    onChange={(e) => setWItem(e.target.value)}
                    placeholder="Item name"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    value={wPrice}
                    onChange={(e) => setWPrice(e.target.value)}
                    placeholder="Est. price ($)"
                    style={inputStyle}
                  />
                  <button
                    onClick={addWish}
                    style={{
                      background: accent,
                      color: '#0A0406',
                      fontFamily: 'var(--font-label)',
                      fontSize: '9px',
                      letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                      padding: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Return link ── */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <Link
            href="/lobby"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: 'rgba(244,232,208,0.2)',
              textDecoration: 'none',
              letterSpacing: '0.05em',
              transition: 'color 0.2s',
            }}
          >
            ← return to lobby
          </Link>
        </div>
      </div>

      {/* ── Upload Sheet (bottom slide-up) ── */}
      <AnimatePresence>
        {showUpload && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpload(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(10,4,6,0.75)',
                zIndex: 40,
              }}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: '#0F070A',
                border: '1px solid rgba(201,169,97,0.15)',
                borderBottom: 'none',
                padding: '28px 24px 40px',
                zIndex: 50,
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '3px',
                  background: 'rgba(201,169,97,0.2)',
                  borderRadius: '2px',
                  margin: '0 auto 24px',
                }}
              />

              <p
                style={{
                  fontFamily: 'var(--font-label)',
                  fontSize: '9px',
                  letterSpacing: '0.35em',
                  textTransform: 'uppercase',
                  color: 'rgba(201,169,97,0.5)',
                  textAlign: 'center',
                  marginBottom: '22px',
                }}
              >
                Post a Look
              </p>

              {/* File input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  cursor: 'pointer',
                  marginBottom: '16px',
                  border: `1px dashed ${previewUrl ? accent : 'rgba(201,169,97,0.2)'}`,
                  overflow: 'hidden',
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      padding: '40px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-body)',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      color: 'rgba(244,232,208,0.2)',
                    }}
                  >
                    tap to choose photo
                  </div>
                )}
              </div>

              {/* Brand tags */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    value={brandInput}
                    onChange={(e) => setBrandInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBrandTag(); } }}
                    placeholder="Brand name"
                    style={{ ...inputStyle, flex: 1 }}
                    disabled={brandTags.length >= 5}
                  />
                  <button
                    onClick={addBrandTag}
                    disabled={brandTags.length >= 5}
                    style={{
                      background: 'none',
                      border: `1px solid ${accent}`,
                      color: accent,
                      fontFamily: 'var(--font-label)',
                      fontSize: '9px',
                      letterSpacing: '0.2em',
                      padding: '0 14px',
                      cursor: brandTags.length >= 5 ? 'not-allowed' : 'pointer',
                      opacity: brandTags.length >= 5 ? 0.4 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    + Add
                  </button>
                </div>
                {brandTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {brandTags.map((b, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontFamily: 'var(--font-label)',
                          fontSize: '8px',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          color: accent,
                          border: `1px solid ${accent}44`,
                          padding: '3px 8px',
                        }}
                      >
                        {b}
                        <button
                          onClick={() => removeBrandTag(i)}
                          style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', padding: 0, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Caption */}
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 120))}
                  placeholder="Caption…"
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'none',
                    lineHeight: 1.5,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '12px',
                    fontFamily: 'var(--font-label)',
                    fontSize: '7px',
                    letterSpacing: '0.1em',
                    color: caption.length >= 100 ? '#FF4D7D' : 'rgba(244,232,208,0.2)',
                  }}
                >
                  {caption.length}/120
                </span>
              </div>

              {/* Post button */}
              <button
                onClick={handlePost}
                disabled={posting}
                style={{
                  width: '100%',
                  background: posting ? 'rgba(201,169,97,0.3)' : accent,
                  color: '#0A0406',
                  fontFamily: 'var(--font-label)',
                  fontSize: '10px',
                  letterSpacing: '0.35em',
                  textTransform: 'uppercase',
                  padding: '14px',
                  border: 'none',
                  cursor: posting ? 'not-allowed' : 'pointer',
                }}
              >
                {posting ? 'Posting…' : 'Post to Closet'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
