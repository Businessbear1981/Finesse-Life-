'use client';

import {useState, useEffect, useRef} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG = '#0A0406';
const BRASS = '#C9A961';
const CREAM = '#F4E8D0';

type Edition = 'finesse' | 'carpe_diem';
type Tab = 'looks' | 'box' | 'match';

// ─── Look Data ────────────────────────────────────────────────────────────────

interface Look {
  name: string;
  items: string;
  occasion: string;
  price: string;
}

const FEMININE_LOOKS: Look[] = [
  {
    name: 'Editorial Night',
    items: 'Jacquemus mini dress · Amina Muaddi heel · The Row micro bag · Mejuri ear cuff',
    occasion: 'Date night',
    price: '$3,200 total',
  },
  {
    name: 'Soft Luxe Sunday',
    items: 'Toteme wide-leg trouser · Khaite cashmere turtleneck · Bottega Veneta mule · Lemaire scarf',
    occasion: 'Statement lunch',
    price: '$2,800 total',
  },
  {
    name: 'ATL Night Energy',
    items: 'LaQuan Smith bodysuit · Rick Owens platform · Fendi Baguette · Messika diamond pavé ring',
    occasion: 'ATL night',
    price: '$4,100 total',
  },
  {
    name: 'Power Meeting',
    items: 'Max Mara blazer · Wolford bodysuit · Manolo Blahnik pump · Celine 16 bag',
    occasion: 'Power meeting',
    price: '$5,600 total',
  },
];

const MASCULINE_LOOKS: Look[] = [
  {
    name: 'Clean Luxury',
    items: 'Loro Piana cashmere knit · Tom Ford slim trouser · Santoni oxford · Cartier Santos',
    occasion: 'Power meeting',
    price: '$4,800 total',
  },
  {
    name: 'Business Power',
    items: 'Brunello Cucinelli suit · Tom Ford dress shirt · Ferragamo belt · Hermès Birkin briefcase',
    occasion: 'Statement lunch',
    price: '$7,200 total',
  },
  {
    name: 'Weekend Flex',
    items: 'Rhude shorts · Fear of God tee · Nike x sacai collab · Rolex Daytona',
    occasion: 'Weekend flex',
    price: '$2,400 total',
  },
  {
    name: 'ATL Dinner',
    items: 'Amiri jeans · Dior Men bomber · Christian Louboutin high-top · Goyard St. Louis tote',
    occasion: 'Date night',
    price: '$5,100 total',
  },
];

// ─── Box Data ─────────────────────────────────────────────────────────────────

interface Box {
  id: string;
  name: string;
  pieces: string;
  retailValue: string;
  memberPrice: string;
  description: string;
  contents: string[];
}

const BOXES: Box[] = [
  {
    id: 'essentials',
    name: 'The Essentials Box',
    pieces: '5 pieces',
    retailValue: '$180 value',
    memberPrice: '$89 members',
    description: 'Wardrobe basics curated to your DNA. Ships monthly.',
    contents: ['Ribbed tank (neutral)', 'Wide-leg trouser', 'Oversized blazer', 'White tee (heavy cotton)', 'Ankle sock set'],
  },
  {
    id: 'statement',
    name: 'Statement Drop',
    pieces: '3 pieces',
    retailValue: '$650 value',
    memberPrice: '$290 members',
    description: 'One luxury statement each month. Our edit, your closet.',
    contents: ['Designer jacket or blazer', 'Artisan footwear', 'Branded accessories'],
  },
  {
    id: 'fragrance',
    name: 'The Fragrance Edit',
    pieces: '4 scents',
    retailValue: '$340 value',
    memberPrice: '$140 members',
    description: 'Curated to your fragrance DNA. Discovery sizes + one full bottle.',
    contents: ['Maison Margiela Replica 10ml', 'Le Labo discovery set', 'Byredo 30ml', 'Frédéric Malle full bottle'],
  },
];

// ─── Style Match Types ─────────────────────────────────────────────────────────

interface AnalysisResult {
  style_labels: string[];
  similar_brands: string[];
  price_range: string;
}

const MOCK_ANALYSIS: AnalysisResult = {
  style_labels: ['Dark luxury', 'Sculptural silhouette', 'Minimalist'],
  similar_brands: ['The Row', 'Bottega Veneta', 'Toteme', 'Lemaire'],
  price_range: '$800–$3,200',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  label,
  active,
  onClick,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${active ? accent : 'transparent'}`,
        color: active ? accent : 'rgba(244,232,208,0.3)',
        fontFamily: 'var(--font-label)',
        fontSize: '8px',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        padding: '10px 16px',
        cursor: 'pointer',
        transition: 'all 0.25s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function LookCard({look, accent, index}: {look: Look; accent: string; index: number}) {
  return (
    <motion.div
      initial={{opacity: 0, y: 18}}
      animate={{opacity: 1, y: 0}}
      transition={{delay: index * 0.07, duration: 0.45}}
      style={{
        border: `1px solid rgba(201,169,97,0.15)`,
        background: 'rgba(244,232,208,0.018)',
        padding: '22px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Corner accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '48px',
          height: '48px',
          background: `linear-gradient(225deg, ${accent}10 0%, transparent 65%)`,
        }}
      />

      {/* Occasion tag */}
      <span
        style={{
          display: 'inline-block',
          fontFamily: 'var(--font-label)',
          fontSize: '7px',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: `${accent}99`,
          border: `1px solid ${accent}33`,
          padding: '3px 8px',
          marginBottom: '10px',
        }}
      >
        {look.occasion}
      </span>

      {/* Look name */}
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: '20px',
          color: CREAM,
          marginBottom: '10px',
          lineHeight: 1.2,
        }}
      >
        {look.name}
      </h3>

      {/* Items */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'rgba(244,232,208,0.55)',
          lineHeight: 1.65,
          marginBottom: '16px',
        }}
      >
        {look.items}
      </p>

      {/* Footer row */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <span
          style={{
            fontFamily: 'var(--font-mono, Courier New)',
            fontSize: '13px',
            color: BRASS,
            letterSpacing: '0.04em',
          }}
        >
          {look.price}
        </span>
        <Link
          href="/scale"
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '8px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: accent,
            textDecoration: 'none',
            borderBottom: `1px solid ${accent}44`,
            paddingBottom: '1px',
          }}
        >
          Find on Scale →
        </Link>
      </div>
    </motion.div>
  );
}

function BoxCard({box, accent, index}: {box: Box; accent: string; index: number}) {
  const [reserving, setReserving] = useState(false);
  const [reserved, setReserved] = useState(false);

  async function handleReserve() {
    setReserving(true);
    try {
      await fetch('/api/stylist/reserve', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({box_id: box.id}),
      });
      setReserved(true);
    } catch {
      setReserved(true); // optimistic
    } finally {
      setReserving(false);
    }
  }

  return (
    <motion.div
      initial={{opacity: 0, y: 18}}
      animate={{opacity: 1, y: 0}}
      transition={{delay: index * 0.08, duration: 0.45}}
      style={{
        border: `1px solid ${BRASS}33`,
        background: `${BRASS}05`,
        padding: '22px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top brass line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${BRASS}55, transparent)`,
        }}
      />

      {/* Header row */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: '19px',
            color: CREAM,
            lineHeight: 1.2,
          }}
        >
          {box.name}
        </h3>
        <span
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: '7px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: `${BRASS}88`,
            whiteSpace: 'nowrap',
            marginLeft: '12px',
          }}
        >
          {box.pieces}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          fontSize: '12px',
          color: 'rgba(244,232,208,0.4)',
          marginBottom: '14px',
          lineHeight: 1.6,
        }}
      >
        {box.description}
      </p>

      {/* Contents — blurred/locked */}
      <div style={{marginBottom: '16px', filter: reserved ? 'none' : 'blur(4px)', transition: 'filter 0.5s', userSelect: 'none'}}>
        {box.contents.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '5px',
            }}
          >
            <span style={{width: '4px', height: '4px', background: `${BRASS}55`, display: 'inline-block', transform: 'rotate(45deg)', flexShrink: 0}} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'rgba(244,232,208,0.5)',
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>

      {/* Pricing row + CTA */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div>
          <span
            style={{
              fontFamily: 'var(--font-mono, Courier New)',
              fontSize: '11px',
              color: 'rgba(244,232,208,0.3)',
              textDecoration: 'line-through',
              marginRight: '8px',
            }}
          >
            {box.retailValue}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono, Courier New)',
              fontSize: '14px',
              color: BRASS,
              letterSpacing: '0.04em',
            }}
          >
            {box.memberPrice}
          </span>
        </div>

        {reserved ? (
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '8px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#4ADE80',
            }}
          >
            RESERVED ✓
          </span>
        ) : (
          <button
            onClick={handleReserve}
            disabled={reserving}
            style={{
              background: reserving ? 'rgba(201,169,97,0.1)' : 'none',
              border: `1px solid ${BRASS}`,
              color: BRASS,
              fontFamily: 'var(--font-label)',
              fontSize: '8px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              padding: '8px 18px',
              cursor: reserving ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              opacity: reserving ? 0.6 : 1,
            }}
          >
            {reserving ? 'RESERVING...' : 'RESERVE BOX'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StylistPage() {
  const [edition, setEdition] = useState<Edition>('finesse');
  const [activeTab, setActiveTab] = useState<Tab>('looks');
  const [refreshing, setRefreshing] = useState(false);
  const [looks, setLooks] = useState<Look[]>([]);

  // Upload / match state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // SSR-safe gender detection
  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  // Set initial looks based on edition
  useEffect(() => {
    setLooks(edition === 'carpe_diem' ? MASCULINE_LOOKS : FEMININE_LOOKS);
  }, [edition]);

  const isMasc = edition === 'carpe_diem';
  const accent = isMasc ? '#FFA96B' : '#FF4D7D';

  // ── Refresh Looks ──
  async function handleRefreshLooks() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: `Generate ${isMasc ? '4 masculine luxury looks' : '4 feminine luxury looks'} for a style-forward client. Each look should have a name, 4-5 specific brand items (e.g. "Jacquemus mini · Amina Muaddi heel"), an occasion tag (Date night/Statement lunch/Power meeting/Weekend flex/ATL night), and a realistic total price. Respond ONLY with valid JSON array: [{"name":"...","items":"brand · brand · brand","occasion":"...","price":"$X,XXX total"}]`,
          system: 'You are Nova, a luxury personal stylist AI. Always respond with valid JSON only, no markdown.',
        }),
      });
      const data = await res.json() as {text: string};
      const parsed = JSON.parse(data.text) as Look[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setLooks(parsed);
      }
    } catch {
      // On error, shuffle the default looks
      const defaults = isMasc ? MASCULINE_LOOKS : FEMININE_LOOKS;
      setLooks([...defaults].sort(() => Math.random() - 0.5));
    } finally {
      setRefreshing(false);
    }
  }

  // ── Photo Upload ──
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadPreview(ev.target?.result as string);
      setAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!fileInputRef.current?.files?.[0]) return;
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Get userId
      const supabase = createClient();
      const {data: {user}} = await supabase.auth.getUser();

      const formData = new FormData();
      formData.append('file', fileInputRef.current.files[0]);
      if (user?.id) formData.append('userId', user.id);

      const res = await fetch('/api/stylist/analyze-photo', {method: 'POST', body: formData});
      if (!res.ok) throw new Error('analyze failed');
      const result = await res.json() as AnalysisResult;
      setAnalysisResult(result);
    } catch {
      setAnalysisResult(MOCK_ANALYSIS);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div
      className="min-h-screen relative"
      style={{background: BG, color: CREAM}}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}08 0%, transparent 55%)`,
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-24">

        {/* ── Header ── */}
        <motion.header
          initial={{opacity: 0, y: -12}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.6}}
          className="text-center pt-14 pb-8"
        >
          {/* Scissors icon — inline SVG */}
          <div style={{marginBottom: '14px'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{display: 'inline-block'}}>
              <circle cx="6" cy="6" r="3" stroke={accent} strokeWidth="1.2" opacity="0.7" />
              <circle cx="6" cy="18" r="3" stroke={accent} strokeWidth="1.2" opacity="0.7" />
              <line x1="8.6" y1="7.5" x2="21" y2="3" stroke={accent} strokeWidth="1.2" opacity="0.55" />
              <line x1="8.6" y1="16.5" x2="21" y2="21" stroke={accent} strokeWidth="1.2" opacity="0.55" />
              <line x1="8.6" y1="7.5" x2="14.5" y2="11.5" stroke={accent} strokeWidth="1.2" opacity="0.4" />
              <line x1="8.6" y1="16.5" x2="14.5" y2="12.5" stroke={accent} strokeWidth="1.2" opacity="0.4" />
            </svg>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 'clamp(28px, 8vw, 42px)',
              color: accent,
              letterSpacing: '0.18em',
              marginBottom: '8px',
            }}
          >
            Stylist
          </h1>

          {/* Nova greeting */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontSize: '13px',
              color: 'rgba(244,232,208,0.4)',
              letterSpacing: '0.06em',
              maxWidth: '320px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Nova · your personal stylist
          </p>

          <div
            style={{
              width: '40px',
              height: '1px',
              background: `${accent}44`,
              margin: '14px auto 0',
            }}
          />
        </motion.header>

        {/* ── Nova Intro card ── */}
        <motion.div
          initial={{opacity: 0, y: 12}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.15, duration: 0.5}}
          style={{
            border: `1px solid ${accent}22`,
            background: `${accent}06`,
            padding: '18px 20px',
            marginBottom: '28px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '7px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: `${accent}66`,
              marginBottom: '8px',
            }}
          >
            NOVA · PERSONAL STYLIST
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontSize: '14px',
              color: 'rgba(244,232,208,0.65)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Based on what I know about you, here&apos;s what I&apos;d put you in tonight.
          </p>
        </motion.div>

        {/* ── Tab Bar ── */}
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{delay: 0.2}}
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(201,169,97,0.1)',
            marginBottom: '28px',
            gap: '0',
          }}
        >
          <TabButton label="My Looks" active={activeTab === 'looks'} onClick={() => setActiveTab('looks')} accent={accent} />
          <TabButton label="My Box" active={activeTab === 'box'} onClick={() => setActiveTab('box')} accent={accent} />
          <TabButton label="Style Match" active={activeTab === 'match'} onClick={() => setActiveTab('match')} accent={accent} />
        </motion.div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">

          {/* ── TAB 1: MY LOOKS ── */}
          {activeTab === 'looks' && (
            <motion.div
              key="looks"
              initial={{opacity: 0, y: 14}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -10}}
              transition={{duration: 0.35}}
            >
              <div style={{display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px'}}>
                {looks.map((look, i) => (
                  <LookCard key={look.name + i} look={look} accent={accent} index={i} />
                ))}
              </div>

              {/* Refresh button */}
              <div style={{textAlign: 'center'}}>
                <button
                  onClick={handleRefreshLooks}
                  disabled={refreshing}
                  style={{
                    background: 'none',
                    border: `1px solid ${accent}55`,
                    color: accent,
                    fontFamily: 'var(--font-label)',
                    fontSize: '8px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    padding: '12px 32px',
                    cursor: refreshing ? 'not-allowed' : 'pointer',
                    opacity: refreshing ? 0.5 : 1,
                    transition: 'all 0.2s',
                    width: '100%',
                    maxWidth: '280px',
                  }}
                >
                  {refreshing ? 'NOVA IS THINKING...' : 'REFRESH LOOKS'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── TAB 2: MY BOX ── */}
          {activeTab === 'box' && (
            <motion.div
              key="box"
              initial={{opacity: 0, y: 14}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -10}}
              transition={{duration: 0.35}}
            >
              {/* Sub-heading */}
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontStyle: 'italic',
                  fontSize: '13px',
                  color: 'rgba(244,232,208,0.35)',
                  marginBottom: '20px',
                  lineHeight: 1.6,
                }}
              >
                Curated drops, sourced for you. New boxes open weekly.
              </p>

              <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
                {BOXES.map((box, i) => (
                  <BoxCard key={box.id} box={box} accent={accent} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── TAB 3: STYLE MATCH ── */}
          {activeTab === 'match' && (
            <motion.div
              key="match"
              initial={{opacity: 0, y: 14}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -10}}
              transition={{duration: 0.35}}
            >
              {/* Sub-heading */}
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontStyle: 'italic',
                  fontSize: '13px',
                  color: 'rgba(244,232,208,0.35)',
                  marginBottom: '20px',
                  lineHeight: 1.6,
                }}
              >
                See something you like? Upload it. Nova finds it.
              </p>

              {/* Upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${BRASS}44`,
                  background: uploadPreview ? 'transparent' : 'rgba(201,169,97,0.03)',
                  minHeight: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${BRASS}88`;
                  e.currentTarget.style.background = 'rgba(201,169,97,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${BRASS}44`;
                  e.currentTarget.style.background = uploadPreview ? 'transparent' : 'rgba(201,169,97,0.03)';
                }}
              >
                {uploadPreview ? (
                  // Preview
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadPreview}
                    alt="Style upload preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '340px',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                ) : (
                  // Placeholder
                  <div style={{textAlign: 'center', padding: '32px'}}>
                    {/* Camera icon */}
                    <svg
                      width="36"
                      height="30"
                      viewBox="0 0 36 30"
                      fill="none"
                      style={{display: 'inline-block', marginBottom: '12px'}}
                    >
                      <rect x="1" y="7" width="34" height="22" rx="2" stroke={`${BRASS}55`} strokeWidth="1.2" />
                      <circle cx="18" cy="18" r="6" stroke={`${BRASS}55`} strokeWidth="1.2" />
                      <circle cx="18" cy="18" r="2.5" fill={`${BRASS}33`} />
                      <path d="M12 7 L14 3 L22 3 L24 7" stroke={`${BRASS}55`} strokeWidth="1.2" fill="none" />
                      <rect x="27" y="11" width="4" height="2.5" rx="0.5" fill={`${BRASS}33`} />
                    </svg>
                    <p
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '8px',
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        color: `${BRASS}55`,
                        marginBottom: '6px',
                      }}
                    >
                      TAP TO UPLOAD PHOTO
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontStyle: 'italic',
                        fontSize: '11px',
                        color: 'rgba(244,232,208,0.2)',
                      }}
                    >
                      JPG, PNG, WEBP accepted
                    </p>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{display: 'none'}}
                onChange={handleFileSelect}
              />

              {/* Analyze button */}
              {uploadPreview && !analysisResult && (
                <motion.div
                  initial={{opacity: 0, y: 8}}
                  animate={{opacity: 1, y: 0}}
                  style={{marginBottom: '20px'}}
                >
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    style={{
                      width: '100%',
                      background: analyzing ? `${accent}22` : accent,
                      color: analyzing ? accent : BG,
                      border: `1px solid ${accent}`,
                      fontFamily: 'var(--font-label)',
                      fontSize: '9px',
                      letterSpacing: '0.35em',
                      textTransform: 'uppercase',
                      padding: '14px',
                      cursor: analyzing ? 'not-allowed' : 'pointer',
                      transition: 'all 0.25s',
                      opacity: analyzing ? 0.7 : 1,
                    }}
                  >
                    {analyzing ? 'NOVA IS READING THE LOOK...' : 'ANALYZE STYLE'}
                  </button>
                </motion.div>
              )}

              {/* Reset button (small) */}
              {uploadPreview && (
                <div style={{textAlign: 'center', marginBottom: '20px'}}>
                  <button
                    onClick={() => {
                      setUploadPreview(null);
                      setAnalysisResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(244,232,208,0.2)',
                      fontFamily: 'var(--font-body)',
                      fontStyle: 'italic',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Clear and try another
                  </button>
                </div>
              )}

              {/* Analysis result */}
              <AnimatePresence>
                {analysisResult && (
                  <motion.div
                    key="result"
                    initial={{opacity: 0, y: 14}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.4}}
                    style={{
                      border: `1px solid ${accent}33`,
                      background: `${accent}06`,
                      padding: '22px 20px',
                      marginBottom: '16px',
                    }}
                  >
                    {/* Label */}
                    <p
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '7px',
                        letterSpacing: '0.4em',
                        textTransform: 'uppercase',
                        color: `${accent}66`,
                        marginBottom: '14px',
                      }}
                    >
                      NOVA STYLE ANALYSIS
                    </p>

                    {/* Style labels */}
                    <div style={{marginBottom: '14px'}}>
                      <p
                        style={{
                          fontFamily: 'var(--font-label)',
                          fontSize: '7px',
                          letterSpacing: '0.3em',
                          textTransform: 'uppercase',
                          color: 'rgba(244,232,208,0.3)',
                          marginBottom: '8px',
                        }}
                      >
                        STYLE LABELS
                      </p>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                        {analysisResult.style_labels.map((label) => (
                          <span
                            key={label}
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontStyle: 'italic',
                              fontSize: '12px',
                              color: accent,
                              border: `1px solid ${accent}44`,
                              background: `${accent}08`,
                              padding: '4px 12px',
                            }}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Similar brands */}
                    <div style={{marginBottom: '14px'}}>
                      <p
                        style={{
                          fontFamily: 'var(--font-label)',
                          fontSize: '7px',
                          letterSpacing: '0.3em',
                          textTransform: 'uppercase',
                          color: 'rgba(244,232,208,0.3)',
                          marginBottom: '8px',
                        }}
                      >
                        SIMILAR BRANDS
                      </p>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                        {analysisResult.similar_brands.map((brand) => (
                          <span
                            key={brand}
                            style={{
                              fontFamily: 'var(--font-label)',
                              fontSize: '8px',
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              color: BRASS,
                              border: `1px solid ${BRASS}33`,
                              background: `${BRASS}06`,
                              padding: '5px 12px',
                            }}
                          >
                            {brand}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Price range */}
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(201,169,97,0.1)'}}>
                      <div>
                        <p
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '7px',
                            letterSpacing: '0.3em',
                            textTransform: 'uppercase',
                            color: 'rgba(244,232,208,0.25)',
                            marginBottom: '4px',
                          }}
                        >
                          PRICE RANGE
                        </p>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, Courier New)',
                            fontSize: '15px',
                            color: BRASS,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {analysisResult.price_range}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div style={{display: 'flex', gap: '8px'}}>
                        <Link
                          href="/wardrobe"
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '7px',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: 'rgba(244,232,208,0.4)',
                            border: '1px solid rgba(244,232,208,0.15)',
                            padding: '7px 12px',
                            textDecoration: 'none',
                          }}
                        >
                          WARDROBE
                        </Link>
                        <Link
                          href="/scale"
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '7px',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: accent,
                            border: `1px solid ${accent}55`,
                            background: `${accent}08`,
                            padding: '7px 12px',
                            textDecoration: 'none',
                          }}
                        >
                          FIND ON SCALE
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Footer link ── */}
        <div style={{textAlign: 'center', marginTop: '40px'}}>
          <Link
            href="/lobby"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: 'rgba(244,232,208,0.2)',
              textDecoration: 'none',
              letterSpacing: '0.05em',
            }}
          >
            ← return to lobby
          </Link>
        </div>

      </div>
    </div>
  );
}
