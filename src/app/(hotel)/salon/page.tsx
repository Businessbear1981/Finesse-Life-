'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  service: string;
  provider: string;
  venue: string;
  address: string;
  date: string;
  time: string;
  price: number;
  status: 'upcoming' | 'past';
  novaNote?: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  status: 'full' | 'low' | 'out';
  price: number;
}

// ─── Feminine Data ──────────────────────────────────────────────────────────────

const FEMININE_APPOINTMENTS: Appointment[] = [
  {
    id: 'f1',
    service: 'Gloss Genius Full Color',
    provider: 'Mariana Torres',
    venue: 'Nine Zero One Salon',
    address: '8826 Burton Way, West Hollywood, CA',
    date: 'Jun 24',
    time: '11:00 AM',
    price: 285,
    status: 'upcoming',
    novaNote: 'Mariana has a 6-week waitlist. Your slot is protected.',
  },
  {
    id: 'f2',
    service: 'Signature HydraFacial',
    provider: 'Esthetician Kira',
    venue: 'Heyday',
    address: '109 W 17th St, New York, NY',
    date: 'Jun 27',
    time: '2:00 PM',
    price: 165,
    status: 'upcoming',
    novaNote: 'Ask for the Brightening Booster when you arrive. Twenty dollars. Worth every cent.',
  },
  {
    id: 'f3',
    service: 'Keratin Treatment',
    provider: 'Nine Zero One Salon',
    venue: 'WeHo Studio',
    address: '8826 Burton Way, West Hollywood, CA',
    date: 'Apr 12',
    time: '10:00 AM',
    price: 320,
    status: 'past',
  },
  {
    id: 'f4',
    service: 'Brazilian Wax',
    provider: 'European Wax Center',
    venue: 'Beverly Hills',
    address: '357 N Canon Dr, Beverly Hills, CA',
    date: 'May 3',
    time: '1:00 PM',
    price: 72,
    status: 'past',
  },
  {
    id: 'f5',
    service: 'Lash Extensions — Classic Set',
    provider: 'Sugarlash Pro Studio',
    venue: 'West Hollywood',
    address: '7373 Beverly Blvd, Los Angeles, CA',
    date: 'May 19',
    time: '3:00 PM',
    price: 148,
    status: 'past',
  },
  {
    id: 'f6',
    service: 'Gua Sha Restorative Facial',
    provider: 'Le Jolie Spa',
    venue: 'Beverly Hills',
    address: '435 N Roxbury Dr, Beverly Hills, CA',
    date: 'Jun 7',
    time: '12:00 PM',
    price: 165,
    status: 'past',
  },
];

// ─── Masculine Data ─────────────────────────────────────────────────────────────

const MASCULINE_APPOINTMENTS: Appointment[] = [
  {
    id: 'm1',
    service: 'Haircut + Lineup',
    provider: 'Marcus Reid',
    venue: 'Fellow Barber',
    address: '8 Spring St, New York, NY',
    date: 'Fri',
    time: '3:00 PM',
    price: 65,
    status: 'upcoming',
    novaNote: 'Marcus knows you only need 20 minutes. He\'s got 15 booked.',
  },
  {
    id: 'm2',
    service: 'Deep Tissue Massage',
    provider: 'Aire Ancient Baths',
    venue: 'Aire New York',
    address: '88 Franklin St, New York, NY',
    date: 'Sat',
    time: '12:00 PM',
    price: 180,
    status: 'upcoming',
    novaNote: 'Arrive 20 early. Roman pool first — cold to hot is the only sequence.',
  },
  {
    id: 'm3',
    service: 'Cut + Beard Sculpt',
    provider: 'Marcus Reid',
    venue: 'Fellow Barber',
    address: '8 Spring St, New York, NY',
    date: 'May 16',
    time: '4:00 PM',
    price: 95,
    status: 'past',
  },
  {
    id: 'm4',
    service: 'Men\'s Clarifying Facial',
    provider: 'Heyday',
    venue: 'Flatiron',
    address: '57 W 17th St, New York, NY',
    date: 'Jun 1',
    time: '11:00 AM',
    price: 130,
    status: 'past',
  },
];

const MASCULINE_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Shampoo & Conditioner', brand: 'Aesop', status: 'low', price: 62 },
  { id: 'p2', name: 'Oud Wood EDP 50ml', brand: 'Tom Ford', status: 'full', price: 210 },
  { id: 'p3', name: 'Recovery Moisturizer', brand: 'Malin+Goetz', status: 'low', price: 52 },
  { id: 'p4', name: 'Detox Face Wash', brand: 'Malin+Goetz', status: 'full', price: 38 },
];

const TRENDING_FEMININE = [
  { name: 'Ice Roller Facial', brand: 'Tata Harper', venue: 'Bergdorf Goodman Spa, 5th Ave NYC', price: '$195' },
  { name: 'Collagen Lip Treatment', brand: 'Joanna Czech', venue: 'Upper East Side Studio, NYC', price: '$350' },
  { name: 'Bespoke Brow Architecture', brand: 'Shaping Room', venue: 'NoHo, New York', price: '$125' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function statusDot(status: 'full' | 'low' | 'out'): string {
  if (status === 'full') return '#4ADE80';
  if (status === 'low') return '#F59E0B';
  return '#EF4444';
}

function statusLabel(status: 'full' | 'low' | 'out'): string {
  if (status === 'full') return 'Stocked';
  if (status === 'low') return 'Running low';
  return 'Out';
}

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function SalonPage() {
  const [isMasc, setIsMasc] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  useEffect(() => {
    setIsMasc(localStorage.getItem('finesse_gender') === 'masculine');
  }, []);

  const accent = isMasc ? '#FFA96B' : '#FF4D7D';
  const appointments = isMasc ? MASCULINE_APPOINTMENTS : FEMININE_APPOINTMENTS;
  const upcoming = appointments.filter(a => a.status === 'upcoming');
  const past = appointments.filter(a => a.status === 'past');
  const yearSpend = past.reduce((s, a) => s + a.price, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      style={{ minHeight: '100vh', background: '#0A0406', paddingBottom: '100px' }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '420px',
          background: `radial-gradient(ellipse at top, ${accent}0D 0%, transparent 65%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Hero image */}
      <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
        <img
          src={
            isMasc
              ? 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80&fit=crop'
              : 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80&fit=crop'
          }
          className="w-full h-full object-cover"
          alt={isMasc ? 'Grooming suite' : 'Luxury salon'}
          style={{ opacity: 0.45 }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,4,6,0.1), rgba(10,4,6,0.92))',
          }}
        />
        <div style={{ position: 'absolute', bottom: '28px', left: 0, right: 0, textAlign: 'center' }}>
          <p
            className="font-label uppercase"
            style={{ fontSize: '0.6rem', letterSpacing: '0.5em', color: `${accent}99`, marginBottom: '6px' }}
          >
            {isMasc ? 'your grooming suite' : 'beauty · wellness'}
          </p>
          <h1
            className="font-display italic"
            style={{ fontSize: '2.4rem', color: 'rgba(244,232,208,0.92)', letterSpacing: '0.1em' }}
          >
            {isMasc ? 'The Grooming Suite' : 'The Salon'}
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 10 }}>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '40px',
            padding: '20px 0 24px',
            borderBottom: '1px solid rgba(201,169,97,0.1)',
          }}
        >
          {[
            { label: 'Upcoming', value: String(upcoming.length) },
            { label: 'Visits This Year', value: String(past.length) },
            { label: 'Year Spend', value: `$${yearSpend.toLocaleString()}` },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <p className="font-mono" style={{ fontSize: '1.3rem', color: accent, marginBottom: '2px' }}>{stat.value}</p>
              <p className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.22)' }}>{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '2px', margin: '20px 0' }}>
          {(['upcoming', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="font-label uppercase"
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '0.6rem',
                letterSpacing: '0.25em',
                cursor: 'pointer',
                transition: 'all 0.25s',
                background: activeTab === tab ? accent : 'transparent',
                color: activeTab === tab ? '#0A0406' : 'rgba(244,232,208,0.3)',
                border: activeTab === tab ? 'none' : '1px solid rgba(244,232,208,0.08)',
              }}
            >
              {tab === 'upcoming' ? 'Upcoming' : isMasc ? 'Visit History' : 'Service History'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── UPCOMING ── */}
          {activeTab === 'upcoming' && (
            <motion.div
              key="upcoming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {upcoming.map((appt, i) => (
                  <motion.div
                    key={appt.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                      border: `1px solid ${accent}28`,
                      background: `${accent}05`,
                      padding: '20px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Top accent bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: `linear-gradient(90deg, ${accent}80, transparent)`,
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <p className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: `${accent}80`, marginBottom: '4px' }}>
                          {appt.date} · {appt.time}
                        </p>
                        <h3 className="font-display italic" style={{ fontSize: '1.15rem', color: 'rgba(244,232,208,0.9)' }}>
                          {appt.service}
                        </h3>
                        <p className="font-body" style={{ fontSize: '0.78rem', color: 'rgba(244,232,208,0.45)', marginTop: '2px' }}>
                          {appt.provider} · {appt.venue}
                        </p>
                        <p className="font-body" style={{ fontSize: '0.68rem', color: 'rgba(244,232,208,0.22)', marginTop: '2px' }}>
                          {appt.address}
                        </p>
                      </div>
                      <span className="font-mono" style={{ fontSize: '1rem', color: '#C9A84C', flexShrink: 0, marginLeft: '12px' }}>
                        ${appt.price}
                      </span>
                    </div>

                    {/* Nova note */}
                    {appt.novaNote && (
                      <div
                        style={{
                          borderTop: '1px solid rgba(244,232,208,0.06)',
                          paddingTop: '10px',
                          marginTop: '10px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                        }}
                      >
                        <span className="font-label uppercase" style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: `${accent}70`, flexShrink: 0, paddingTop: '2px' }}>
                          Nova
                        </span>
                        <p
                          className="font-body italic"
                          style={{ fontSize: '0.78rem', color: 'rgba(244,232,208,0.5)', lineHeight: 1.6 }}
                        >
                          &ldquo;{appt.novaNote}&rdquo;
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Masculine: Products */}
              {isMasc && (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.12)' }} />
                    <span className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(201,169,97,0.3)' }}>
                      Your Products
                    </span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.12)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {MASCULINE_PRODUCTS.map(prod => (
                      <div
                        key={prod.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          border: '1px solid rgba(244,232,208,0.06)',
                          background: 'rgba(244,232,208,0.02)',
                        }}
                      >
                        <div>
                          <p className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(244,232,208,0.28)', marginBottom: '2px' }}>
                            {prod.brand}
                          </p>
                          <p className="font-body" style={{ fontSize: '0.82rem', color: 'rgba(244,232,208,0.7)' }}>{prod.name}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusDot(prod.status) }} />
                          <span className="font-label uppercase" style={{ fontSize: '0.5rem', letterSpacing: '0.2em', color: statusDot(prod.status) }}>
                            {statusLabel(prod.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feminine: Trending */}
              {!isMasc && (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.12)' }} />
                    <span className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(201,169,97,0.3)' }}>
                      Trending in Your City
                    </span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.12)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {TRENDING_FEMININE.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.07 }}
                        style={{
                          padding: '14px 16px',
                          border: '1px solid rgba(244,232,208,0.06)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <p className="font-label uppercase" style={{ fontSize: '0.5rem', letterSpacing: '0.25em', color: `${accent}60`, marginBottom: '3px' }}>
                            {item.brand}
                          </p>
                          <p className="font-body" style={{ fontSize: '0.82rem', color: 'rgba(244,232,208,0.72)' }}>{item.name}</p>
                          <p className="font-body" style={{ fontSize: '0.68rem', color: 'rgba(244,232,208,0.28)', marginTop: '2px' }}>{item.venue}</p>
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.85rem', color: '#C9A84C' }}>{item.price}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── HISTORY ── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div
                style={{
                  padding: '16px 18px',
                  border: '1px solid rgba(201,169,97,0.15)',
                  background: 'rgba(201,169,97,0.04)',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(244,232,208,0.28)', marginBottom: '4px' }}>
                    2026 Total
                  </p>
                  <p className="font-display italic" style={{ fontSize: '1.5rem', color: '#C9A84C' }}>
                    ${yearSpend.toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(244,232,208,0.28)', marginBottom: '4px' }}>
                    Visits
                  </p>
                  <p className="font-mono" style={{ fontSize: '1.5rem', color: accent }}>{past.length}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {past.map((appt, i) => (
                  <motion.div
                    key={appt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      border: '1px solid rgba(244,232,208,0.05)',
                      background: 'rgba(244,232,208,0.018)',
                    }}
                  >
                    <div>
                      <p className="font-body" style={{ fontSize: '0.85rem', color: 'rgba(244,232,208,0.68)' }}>{appt.service}</p>
                      <p className="font-body" style={{ fontSize: '0.68rem', color: 'rgba(244,232,208,0.3)', marginTop: '2px' }}>
                        {appt.venue} · {appt.date}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="font-mono" style={{ fontSize: '0.85rem', color: 'rgba(201,169,97,0.6)' }}>${appt.price}</span>
                      <span className="font-label uppercase" style={{ fontSize: '0.48rem', letterSpacing: '0.2em', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)', padding: '2px 6px' }}>
                        Done
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <p
                className="font-body italic text-center"
                style={{ fontSize: '0.72rem', color: 'rgba(244,232,208,0.12)', marginTop: '28px' }}
              >
                {isMasc ? 'consistency is the flex.' : 'your beauty is a ritual, not a routine.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Return link */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link
            href="/lobby"
            className="font-body"
            style={{ fontSize: '0.8rem', color: 'rgba(244,232,208,0.18)', textDecoration: 'none' }}
          >
            return to the lobby
          </Link>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 20px',
          background: 'rgba(10,4,6,0.96)',
          borderTop: `1px solid ${accent}22`,
          backdropFilter: 'blur(12px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <button
          className="font-label uppercase"
          style={{
            padding: '14px 40px',
            background: accent,
            color: '#0A0406',
            border: 'none',
            fontSize: '0.6rem',
            letterSpacing: '0.3em',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            flex: 1,
            maxWidth: '360px',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {isMasc ? 'Book Grooming' : 'Book Next Appointment'}
        </button>
      </div>
    </motion.div>
  );
}
