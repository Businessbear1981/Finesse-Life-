'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Wine, ChefHat, Calendar, ShoppingBag, MapPin, Clock, Users } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Restaurant {
  name: string;
  cuisine: string;
  neighborhood: string;
  price: string;
  nova: string;
}

interface Reservation {
  restaurant: string;
  datetime: string;
  party: number;
  confirmation: string;
}

interface WinePairing {
  label: string;
  vintage: string;
  notes: string;
}

interface CookingClass {
  title: string;
  chef: string;
  date: string;
  price: string;
}

interface Spot {
  name: string;
  category: string;
  nova: string;
}

interface Order {
  restaurant: string;
  items: string;
  total: string;
  date: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const NOVAS_TABLE: Restaurant[] = [
  {
    name: 'Nobu Downtown',
    cuisine: 'Japanese Omakase',
    neighborhood: 'TriBeCa',
    price: '$$$$',
    nova: 'Where the fish speaks first. Reservation for two, 8pm Friday — I already checked availability.',
  },
  {
    name: 'Carbone',
    cuisine: 'Italian-American',
    neighborhood: 'Greenwich Village',
    price: '$$$',
    nova: 'The sauce remembers everyone who ever sat there.',
  },
  {
    name: 'Tatiana by Kwame Onwuachi',
    cuisine: 'Contemporary American',
    neighborhood: 'Lincoln Center',
    price: '$$$',
    nova: 'The room where culture comes to eat.',
  },
];

const RESERVATIONS: Reservation[] = [
  { restaurant: 'Nobu Downtown', datetime: 'Fri Jun 20 · 8:00 PM', party: 2, confirmation: 'NB-884721' },
  { restaurant: 'Carbone', datetime: 'Sat Jun 28 · 7:30 PM', party: 4, confirmation: 'CB-203948' },
];

const WINE: WinePairing = {
  label: 'Domaine Leflaive Puligny-Montrachet',
  vintage: '2021',
  notes: 'Crisp minerality, white peach, subtle oak. Nova says: pair this with the sashimi course. Trust.',
};

const COOKING_CLASSES: CookingClass[] = [
  { title: 'Knife Skills & French Technique', chef: 'Chef Marie Laurent', date: 'Sun Jun 22 · 11:00 AM', price: '$185' },
  { title: 'Omakase at Home: Sushi Fundamentals', chef: 'Chef Kenji Mori', date: 'Sat Jun 28 · 2:00 PM', price: '$240' },
];

const THE_SPOTS: Spot[] = [
  { name: 'STK Steakhouse', category: 'Modern Steakhouse · Midtown', nova: 'Where the deal gets closed over a tomahawk.' },
  { name: 'Le Bernardin', category: 'French Seafood · Midtown West', nova: 'The move when she needs to know you\'re serious.' },
  { name: 'The Smith', category: 'American Brasserie · Midtown East', nova: 'Post-game brunch. Always the right call.' },
];

const DINNER_INTEL =
  'Omakase is still the power move. Book 3 weeks out. My top pick right now: Shoji at 69 Leonard.';

const RECENT_ORDERS: Order[] = [
  { restaurant: 'STK Steakhouse', items: 'Tomahawk (2 lb) · Truffle Fries · Lobster Bisque', total: '$348', date: 'Jun 14' },
  { restaurant: 'Nobu Delivery', items: 'Black Cod Miso · Yellowtail Jalapeño · Edamame', total: '$187', date: 'Jun 10' },
];

// ─── Divider ──────────────────────────────────────────────────────────────────

function GoldDivider() {
  return (
    <div className="flex items-center justify-center gap-3 my-10">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(201,169,97,0.3))' }} />
      <div style={{ color: 'rgba(201,169,97,0.5)', fontSize: '10px' }}>◆</div>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(201,169,97,0.3))' }} />
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1" style={{ background: 'rgba(201,169,97,0.12)' }} />
      <div className="flex items-center gap-2">
        <Icon size={10} style={{ color: 'rgba(201,169,97,0.5)' }} />
        <span
          className="font-label text-[9px] tracking-[0.5em] uppercase"
          style={{ color: 'rgba(201,169,97,0.45)' }}
        >
          {label}
        </span>
      </div>
      <div className="h-px flex-1" style={{ background: 'rgba(201,169,97,0.12)' }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const [gender, setGender] = useState<string | null>(null);

  useEffect(() => {
    setGender(localStorage.getItem('finesse_gender'));
  }, []);

  const isMasc = gender === 'masculine';
  const accent = isMasc ? '#FFA96B' : '#FF4D7D';
  const accentDim = isMasc ? 'rgba(255,169,107,0.08)' : 'rgba(255,77,125,0.06)';
  const ctaLabel = isMasc ? 'Order Now' : 'Reserve a Table';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: '#0A0406' }}
    >
      {/* ── Ambient lights */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute"
          style={{
            top: '-40px', left: '50%', transform: 'translateX(-50%)',
            width: '500px', height: '400px',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(201,169,97,0.07) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute"
          style={{
            top: '30%', right: '-80px', width: '360px', height: '360px',
            background: `radial-gradient(circle at 70% 40%, ${isMasc ? 'rgba(255,169,107,0.04)' : 'rgba(255,77,125,0.04)'} 0%, transparent 65%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2"
          style={{ background: 'linear-gradient(to top, rgba(60,0,20,0.14) 0%, transparent 100%)' }}
        />
      </div>

      {/* ── Header */}
      <header className="relative z-10 pt-14 pb-8 text-center">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-6 pointer-events-none"
            style={{
              width: '320px', height: '160px',
              background: 'radial-gradient(ellipse at 50% 0%, rgba(201,169,97,0.1) 0%, transparent 70%)',
            }}
          />

          <p
            className="font-label text-[8px] tracking-[0.6em] uppercase mb-3"
            style={{ color: 'rgba(201,169,97,0.35)' }}
          >
            The Hotel
          </p>

          <h1
            className="font-display text-5xl md:text-6xl tracking-[0.3em] uppercase relative"
            style={{ color: '#E8C87A', textShadow: '0 0 40px rgba(201,169,97,0.3), 0 0 80px rgba(201,169,97,0.1)' }}
          >
            The Kitchen
          </h1>

          <p
            className="font-label text-[10px] tracking-[0.4em] uppercase mt-3"
            style={{ color: 'rgba(201,169,97,0.35)' }}
          >
            {isMasc ? 'Nova knows where to eat' : 'Food is culture. Nova curates yours.'}
          </p>

          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, rgba(201,169,97,0.25))' }} />
            <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(201,169,97,0.4)' }} />
            <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, rgba(201,169,97,0.25))' }} />
          </div>
        </motion.div>
      </header>

      {/* ── Main content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-32">

        {/* ════════════════════ FEMININE ════════════════════ */}
        {!isMasc && (
          <>
            {/* Nova's Table */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <SectionLabel icon={UtensilsCrossed} label="Nova's Table This Week" />
              <div className="space-y-4">
                {NOVAS_TABLE.map((r, i) => (
                  <motion.div
                    key={r.name}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.1 }}
                    style={{
                      background: 'rgba(14,6,8,0.8)',
                      border: '1px solid rgba(201,169,97,0.14)',
                      backdropFilter: 'blur(12px)',
                    }}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-display text-lg" style={{ color: '#E8C87A' }}>{r.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-label text-[8px] tracking-[0.3em] uppercase" style={{ color: 'rgba(201,169,97,0.45)' }}>{r.cuisine}</span>
                          <span style={{ color: 'rgba(201,169,97,0.2)', fontSize: '8px' }}>·</span>
                          <div className="flex items-center gap-1">
                            <MapPin size={8} style={{ color: 'rgba(201,169,97,0.35)' }} />
                            <span className="font-label text-[8px] tracking-[0.2em]" style={{ color: 'rgba(201,169,97,0.35)' }}>{r.neighborhood}</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className="font-mono text-xs shrink-0"
                        style={{ color: '#FF4D7D', opacity: 0.8 }}
                      >
                        {r.price}
                      </span>
                    </div>
                    <p className="font-body text-sm italic leading-relaxed" style={{ color: 'rgba(244,232,208,0.5)' }}>
                      "{r.nova}"
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <GoldDivider />

            {/* Reservations */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <SectionLabel icon={Calendar} label="Your Reservations" />
              <div className="space-y-3">
                {RESERVATIONS.map((res, i) => (
                  <motion.div
                    key={res.confirmation}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.09 }}
                    className="flex items-center gap-4 p-4"
                    style={{ background: accentDim, border: '1px solid rgba(255,77,125,0.15)' }}
                  >
                    <div
                      className="shrink-0 w-10 h-10 flex items-center justify-center"
                      style={{ background: 'rgba(255,77,125,0.1)', border: '1px solid rgba(255,77,125,0.2)' }}
                    >
                      <Calendar size={14} style={{ color: '#FF4D7D' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm" style={{ color: '#E8C87A' }}>{res.restaurant}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="font-label text-[8px] tracking-[0.2em]" style={{ color: 'rgba(244,232,208,0.4)' }}>{res.datetime}</span>
                        <div className="flex items-center gap-1">
                          <Users size={8} style={{ color: 'rgba(244,232,208,0.3)' }} />
                          <span className="font-label text-[8px]" style={{ color: 'rgba(244,232,208,0.3)' }}>{res.party}</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[9px] shrink-0" style={{ color: 'rgba(201,169,97,0.3)' }}>
                      #{res.confirmation}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <GoldDivider />

            {/* Wine Pairing */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
              <SectionLabel icon={Wine} label="Nova's Wine Pairing" />
              <div
                className="p-6"
                style={{
                  background: 'rgba(74,25,34,0.25)',
                  border: '1px solid rgba(74,25,34,0.6)',
                  borderLeft: '3px solid rgba(201,169,97,0.4)',
                }}
              >
                <div className="flex items-start gap-4">
                  <Wine size={20} style={{ color: 'rgba(201,169,97,0.5)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <h3 className="font-display text-base" style={{ color: '#E8C87A' }}>{WINE.label}</h3>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(201,169,97,0.4)' }}>{WINE.vintage}</p>
                    <p className="font-body text-sm italic mt-3 leading-relaxed" style={{ color: 'rgba(244,232,208,0.5)' }}>
                      "{WINE.notes}"
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            <GoldDivider />

            {/* Cooking Classes */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              <SectionLabel icon={ChefHat} label="Cooking Classes" />
              <div className="space-y-3">
                {COOKING_CLASSES.map((cls, i) => (
                  <motion.div
                    key={cls.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.09 }}
                    className="flex items-start gap-4 p-5"
                    style={{ background: 'rgba(14,6,8,0.7)', border: '1px solid rgba(201,169,97,0.1)' }}
                  >
                    <ChefHat size={16} style={{ color: 'rgba(201,169,97,0.4)', marginTop: '2px', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm" style={{ color: '#E8C87A' }}>{cls.title}</p>
                      <p className="font-label text-[8px] tracking-[0.25em] uppercase mt-1" style={{ color: 'rgba(244,232,208,0.35)' }}>{cls.chef}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Clock size={8} style={{ color: 'rgba(201,169,97,0.35)' }} />
                          <span className="font-label text-[8px]" style={{ color: 'rgba(244,232,208,0.3)' }}>{cls.date}</span>
                        </div>
                        <span className="font-mono text-[10px]" style={{ color: '#FF4D7D' }}>{cls.price}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </>
        )}

        {/* ════════════════════ MASCULINE ════════════════════ */}
        {isMasc && (
          <>
            {/* The Spot */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <SectionLabel icon={UtensilsCrossed} label="The Spot" />
              <div className="space-y-4">
                {THE_SPOTS.map((s, i) => (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.1 }}
                    className="p-5"
                    style={{
                      background: 'rgba(14,6,8,0.8)',
                      border: '1px solid rgba(201,169,97,0.12)',
                      borderLeft: `3px solid rgba(255,169,107,${0.3 + i * 0.12})`,
                    }}
                  >
                    <h3 className="font-display text-lg" style={{ color: '#E8C87A' }}>{s.name}</h3>
                    <p className="font-label text-[8px] tracking-[0.3em] uppercase mt-1" style={{ color: 'rgba(201,169,97,0.4)' }}>{s.category}</p>
                    <p className="font-body text-sm italic mt-3 leading-relaxed" style={{ color: 'rgba(244,232,208,0.5)' }}>
                      "{s.nova}"
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <GoldDivider />

            {/* Dinner Intel */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <SectionLabel icon={MapPin} label="Dinner Intel · NYC" />
              <div
                className="p-6"
                style={{
                  background: 'rgba(255,169,107,0.05)',
                  border: '1px solid rgba(255,169,107,0.18)',
                  borderLeft: '3px solid rgba(255,169,107,0.5)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="shrink-0 w-7 h-7 flex items-center justify-center"
                    style={{ background: 'rgba(255,169,107,0.12)', border: '1px solid rgba(255,169,107,0.25)' }}
                  >
                    <span style={{ fontSize: '10px', color: '#FFA96B' }}>N</span>
                  </div>
                  <p className="font-body text-sm italic leading-relaxed" style={{ color: 'rgba(244,232,208,0.6)' }}>
                    "{DINNER_INTEL}"
                  </p>
                </div>
              </div>
            </motion.section>

            <GoldDivider />

            {/* Recent Orders */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <SectionLabel icon={ShoppingBag} label="Recent Orders" />
              <div className="space-y-3">
                {RECENT_ORDERS.map((ord, i) => (
                  <motion.div
                    key={ord.restaurant + ord.date}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 + i * 0.09 }}
                    className="flex items-start gap-4 p-5"
                    style={{ background: accentDim, border: '1px solid rgba(255,169,107,0.12)' }}
                  >
                    <ShoppingBag size={14} style={{ color: '#FFA96B', marginTop: '2px', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm" style={{ color: '#E8C87A' }}>{ord.restaurant}</p>
                        <span className="font-mono text-xs shrink-0" style={{ color: '#FFA96B' }}>{ord.total}</span>
                      </div>
                      <p className="font-label text-[8px] tracking-[0.15em] uppercase mt-1" style={{ color: 'rgba(244,232,208,0.3)' }}>{ord.items}</p>
                      <p className="font-mono text-[9px] mt-1" style={{ color: 'rgba(201,169,97,0.3)' }}>{ord.date}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <GoldDivider />

            {/* Your Chef */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              <SectionLabel icon={ChefHat} label="Your Chef" />
              <div
                className="p-6 text-center"
                style={{
                  background: 'rgba(14,6,8,0.8)',
                  border: '1px solid rgba(201,169,97,0.14)',
                }}
              >
                <ChefHat size={28} className="mx-auto mb-4" style={{ color: 'rgba(201,169,97,0.4)' }} />
                <h3 className="font-display text-xl mb-2" style={{ color: '#E8C87A' }}>Private Chef On Demand</h3>
                <p className="font-body text-sm italic leading-relaxed mb-5" style={{ color: 'rgba(244,232,208,0.45)' }}>
                  Book a private chef for your next dinner party. Nova handles sourcing, menu, and scheduling.
                </p>
                <button
                  className="px-6 py-2.5 font-label text-[9px] tracking-[0.45em] uppercase transition-all duration-300 hover:opacity-80"
                  style={{
                    background: 'rgba(255,169,107,0.1)',
                    border: '1px solid rgba(255,169,107,0.35)',
                    color: '#FFA96B',
                  }}
                >
                  Inquire with Nova
                </button>
              </div>
            </motion.section>
          </>
        )}

        {/* ── Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-16 font-body text-xs italic"
          style={{ color: 'rgba(244,232,208,0.12)' }}
        >
          {isMasc ? 'every great night starts with the right table.' : 'the best meals are the ones you remember forever.'}
        </motion.p>
      </div>

      {/* ── Bottom CTA Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(10,4,6,0.92)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(201,169,97,0.14)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="font-label text-[8px] tracking-[0.4em] uppercase" style={{ color: 'rgba(201,169,97,0.35)' }}>
              {isMasc ? 'Ready to eat?' : 'Ready to dine?'}
            </p>
            <p className="font-body text-xs mt-0.5 italic" style={{ color: 'rgba(244,232,208,0.3)' }}>
              Nova will handle everything.
            </p>
          </div>
          <button
            className="px-7 py-3 font-label text-[9px] tracking-[0.45em] uppercase transition-all duration-300 hover:opacity-80 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${accent}22, ${accent}11)`,
              border: `1px solid ${accent}55`,
              color: accent,
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
