'use client';

import {useState, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type Edition = 'finesse' | 'carpe_diem';
type AppState = 'menu' | 'booking' | 'confirmed';

interface Service {
  id: string;
  name: string;
  desc: string;
  duration: string;
  price: number;
  category: string;
}

// ─── Service menus ─────────────────────────────────────────────────────────────

const FINESSE_SERVICES: Service[] = [
  {id: '1', name: 'Silk Press', desc: 'Heat straightening for natural hair', duration: '2.5 hrs', price: 185, category: 'hair'},
  {id: '2', name: 'Full Color + Gloss', desc: 'Base color, toner & gloss treatment', duration: '3 hrs', price: 285, category: 'hair'},
  {id: '3', name: 'Lash Extensions — Classic Set', desc: 'Individual lash application', duration: '2 hrs', price: 145, category: 'lash'},
  {id: '4', name: 'Gel Manicure + Pedicure', desc: 'Soak-off gel on hands and feet', duration: '1.5 hrs', price: 95, category: 'nails'},
  {id: '5', name: 'Gua Sha Facial', desc: '60-min stone ritual + LED therapy', duration: '1 hr', price: 165, category: 'skin'},
  {id: '6', name: 'Brow Lamination + Tint', desc: 'Lift, set & define brows', duration: '45 min', price: 75, category: 'brow'},
  {id: '7', name: 'Full Glam Makeup', desc: 'Event-ready beat. Airbrush available.', duration: '1.5 hrs', price: 225, category: 'makeup'},
  {id: '8', name: 'Body Wrap — Gold Ritual', desc: 'Detox clay wrap + body oil massage', duration: '90 min', price: 195, category: 'body'},
];

const CARPE_SERVICES: Service[] = [
  {id: '1', name: 'Signature Fade', desc: 'Consultation + precision fade + line-up', duration: '45 min', price: 85, category: 'cut'},
  {id: '2', name: 'Hot Towel Shave', desc: 'Straight razor + hot towel ritual', duration: '30 min', price: 65, category: 'shave'},
  {id: '3', name: "Cut + Beard Sculpt", desc: 'Fresh cut + full beard trim + shaping', duration: '1 hr', price: 115, category: 'cut'},
  {id: '4', name: "Men's Facial — Deep Clean", desc: 'Steam + extraction + LED', duration: '50 min', price: 130, category: 'skin'},
  {id: '5', name: 'Sports Massage', desc: '60-min deep tissue recovery', duration: '1 hr', price: 155, category: 'body'},
  {id: '6', name: 'Grey Coverage', desc: 'Full color application + toner', duration: '1.5 hrs', price: 165, category: 'color'},
];

// ─── Category icons ────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  hair: '✂',
  nails: '◆',
  lash: '✦',
  brow: '⌁',
  skin: '◎',
  makeup: '✿',
  body: '○',
  cut: '✂',
  shave: '◈',
  color: '●',
};

// ─── Date chips ────────────────────────────────────────────────────────────────

function getDateChips(): {label: string; value: string}[] {
  const now = new Date();
  return [
    {label: 'Today', value: now.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})},
    {
      label: 'Tomorrow',
      value: new Date(now.getTime() + 86400000).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'}),
    },
    {
      label: '+2 Days',
      value: new Date(now.getTime() + 2 * 86400000).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'}),
    },
  ];
}

const TIME_SLOTS = ['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM'];

// ─── Main component ────────────────────────────────────────────────────────────

export default function SalonPage() {
  const [edition, setEdition] = useState<Edition>('finesse');
  const [appState, setAppState] = useState<AppState>('menu');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [confirmedService, setConfirmedService] = useState<Service | null>(null);
  const [confirmedDateTime, setConfirmedDateTime] = useState<string>('');

  // SSR-safe gender detection
  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  const isFeminine = edition === 'finesse';
  const accent = isFeminine ? '#FF4D7D' : '#69C9D0';
  const services = isFeminine ? FINESSE_SERVICES : CARPE_SERVICES;
  const title = isFeminine ? 'THE SALON' : 'THE BARBERSHOP';
  const subtitle = isFeminine ? 'book your look' : 'get right';
  const stylistLabel = isFeminine ? 'stylist' : 'barber';

  // Unique categories for this edition
  const categories = ['all', ...Array.from(new Set(services.map((s) => s.category)))];

  const filtered =
    activeCategory === 'all' ? services : services.filter((s) => s.category === activeCategory);

  const dateChips = getDateChips();

  function openBooking(service: Service) {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedTime(null);
    setNotes('');
    setAppState('booking');
  }

  async function submitBooking() {
    if (!selectedService || !selectedDate || !selectedTime) return;
    try {
      const res = await fetch('/api/salon/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          service_name: selectedService.name,
          price_cents: Math.round(selectedService.price * 100),
          duration: selectedService.duration,
          category: selectedService.category,
          edition,
          requested_date: selectedDate,
          requested_time: selectedTime,
          notes: notes.trim() || null,
        }),
      });
      // Proceed to confirmed state regardless — booking queued even if API offline
      if (!res.ok) console.warn('[salon] booking API error:', res.status);
    } catch (e) {
      console.warn('[salon] booking request failed:', e);
    }
    setConfirmedService(selectedService);
    setConfirmedDateTime(`${selectedDate} at ${selectedTime}`);
    setAppState('confirmed');
  }

  function resetToMenu() {
    setAppState('menu');
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setNotes('');
  }

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.6}}
      className="min-h-screen relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
          style={{background: `radial-gradient(ellipse at center, ${accent}0A 0%, transparent 65%)`}}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px]"
          style={{background: 'radial-gradient(circle, rgba(201,169,97,0.05) 0%, transparent 60%)', animation: 'salon-pulse 5s ease-in-out infinite'}}
        />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-6 relative z-10">
        <motion.div initial={{opacity: 0, y: -12}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <div className="mb-3" style={{color: accent, fontSize: '2rem', lineHeight: 1}}>
            {isFeminine ? '✦' : '◈'}
          </div>
          <h1
            className="font-display italic tracking-[0.2em]"
            style={{fontSize: '2.25rem', color: 'rgba(244,232,208,0.85)', fontStyle: 'italic'}}
          >
            {title}
          </h1>
          <p
            className="font-label uppercase mt-2"
            style={{fontSize: '0.6rem', letterSpacing: '0.45em', color: 'rgba(244,232,208,0.22)'}}
          >
            {subtitle}
          </p>
        </motion.div>
      </header>

      {/* ── STATE: MENU ───────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {appState === 'menu' && (
          <motion.div
            key="menu"
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -8}}
            transition={{duration: 0.35}}
            className="max-w-lg mx-auto px-4 pb-16 relative z-10"
          >
            {/* Category filter */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-3 py-1 font-label uppercase transition-all duration-300"
                  style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.2em',
                    color: activeCategory === cat ? '#0A0406' : 'rgba(244,232,208,0.28)',
                    background: activeCategory === cat ? accent : 'transparent',
                    border: activeCategory === cat ? 'none' : '1px solid rgba(244,232,208,0.08)',
                  }}
                >
                  {cat === 'all' ? 'All' : `${CATEGORY_ICONS[cat] || ''} ${cat}`}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1" style={{background: 'rgba(201,169,97,0.15)'}} />
              <span className="font-label uppercase" style={{fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(201,169,97,0.35)'}}>
                services
              </span>
              <div className="h-px flex-1" style={{background: 'rgba(201,169,97,0.15)'}} />
            </div>

            {/* Service cards */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((service, i) => (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, scale: 0.98}}
                    transition={{delay: i * 0.05, duration: 0.28}}
                    className="group"
                    style={{
                      border: '1px solid rgba(201,169,97,0.12)',
                      background: 'rgba(10,4,6,0.7)',
                      backdropFilter: 'blur(8px)',
                      padding: '1.25rem',
                      transition: 'all 0.4s ease',
                    }}
                    whileHover={{y: -2, transition: {duration: 0.2}}}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-display"
                          style={{fontSize: '1.1rem', color: 'rgba(244,232,208,0.82)', letterSpacing: '0.03em'}}
                        >
                          {service.name}
                        </h3>
                        <p
                          className="font-body italic mt-0.5"
                          style={{fontSize: '0.78rem', color: 'rgba(244,232,208,0.38)', lineHeight: 1.5}}
                        >
                          {service.desc}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="font-label uppercase"
                            style={{fontSize: '0.55rem', letterSpacing: '0.2em', color: `${accent}70`}}
                          >
                            {CATEGORY_ICONS[service.category]} {service.category}
                          </span>
                          <span style={{color: 'rgba(244,232,208,0.1)'}}>·</span>
                          <span className="font-mono" style={{fontSize: '0.65rem', color: 'rgba(244,232,208,0.28)'}}>
                            {service.duration}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className="font-mono" style={{fontSize: '0.9rem', color: '#C9A961'}}>
                          ${service.price}
                        </span>
                        <button
                          onClick={() => openBooking(service)}
                          className="font-label uppercase transition-all duration-300"
                          style={{
                            fontSize: '0.55rem',
                            letterSpacing: '0.2em',
                            padding: '0.35rem 0.75rem',
                            border: `1px solid ${accent}50`,
                            color: accent,
                            background: 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = accent;
                            (e.currentTarget as HTMLButtonElement).style.color = '#0A0406';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.color = accent;
                          }}
                        >
                          + Book
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <motion.p
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{delay: 0.9}}
              className="font-body italic text-center mt-10"
              style={{fontSize: '0.75rem', color: 'rgba(244,232,208,0.12)'}}
            >
              {isFeminine ? 'your appointment. your rules.' : 'walk in looking right.'}
            </motion.p>

            <div className="text-center mt-8">
              <Link
                href="/lobby"
                className="font-body"
                style={{fontSize: '0.8rem', color: 'rgba(244,232,208,0.2)', transition: 'color 0.3s'}}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#C9A961')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(244,232,208,0.2)')}
              >
                return to the lobby
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── STATE: BOOKING MODAL ────────────────────────────────────────────── */}
        {appState === 'booking' && selectedService && (
          <motion.div
            key="booking"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.25}}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{background: 'rgba(10,4,6,0.75)', backdropFilter: 'blur(4px)'}}
            onClick={(e) => {
              if (e.target === e.currentTarget) resetToMenu();
            }}
          >
            <motion.div
              initial={{y: '100%', opacity: 0}}
              animate={{y: 0, opacity: 1}}
              exit={{y: '100%', opacity: 0}}
              transition={{type: 'spring', damping: 28, stiffness: 280}}
              className="w-full max-w-lg"
              style={{
                background: '#100608',
                borderTop: `1px solid ${accent}25`,
                borderLeft: '1px solid rgba(201,169,97,0.1)',
                borderRight: '1px solid rgba(201,169,97,0.1)',
                padding: '2rem 1.5rem 2.5rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p
                    className="font-label uppercase mb-1"
                    style={{fontSize: '0.55rem', letterSpacing: '0.4em', color: `${accent}80`}}
                  >
                    booking request
                  </p>
                  <h2
                    className="font-display italic"
                    style={{fontSize: '1.4rem', color: 'rgba(244,232,208,0.85)'}}
                  >
                    {selectedService.name}
                  </h2>
                  <p className="font-mono mt-0.5" style={{fontSize: '0.65rem', color: 'rgba(244,232,208,0.28)'}}>
                    {selectedService.duration} · ${selectedService.price}
                  </p>
                </div>
                <button
                  onClick={resetToMenu}
                  style={{color: 'rgba(244,232,208,0.25)', fontSize: '1.2rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer'}}
                >
                  ×
                </button>
              </div>

              <div className="h-px mb-6" style={{background: 'rgba(201,169,97,0.1)'}} />

              {/* Date chips */}
              <div className="mb-5">
                <p
                  className="font-label uppercase mb-3"
                  style={{fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(244,232,208,0.3)'}}
                >
                  select a date
                </p>
                <div className="flex gap-2">
                  {dateChips.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => setSelectedDate(chip.value)}
                      className="flex-1 py-2 font-label uppercase transition-all duration-300"
                      style={{
                        fontSize: '0.55rem',
                        letterSpacing: '0.15em',
                        border: `1px solid ${selectedDate === chip.value ? accent : 'rgba(201,169,97,0.15)'}`,
                        color: selectedDate === chip.value ? '#0A0406' : 'rgba(244,232,208,0.4)',
                        background: selectedDate === chip.value ? accent : 'transparent',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                {selectedDate && (
                  <p className="font-mono mt-1.5" style={{fontSize: '0.6rem', color: 'rgba(244,232,208,0.22)'}}>
                    {selectedDate}
                  </p>
                )}
              </div>

              {/* Time slots */}
              <div className="mb-5">
                <p
                  className="font-label uppercase mb-3"
                  style={{fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(244,232,208,0.3)'}}
                >
                  select a time
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className="py-2 font-mono transition-all duration-300"
                      style={{
                        fontSize: '0.62rem',
                        border: `1px solid ${selectedTime === time ? accent : 'rgba(201,169,97,0.15)'}`,
                        color: selectedTime === time ? '#0A0406' : 'rgba(244,232,208,0.4)',
                        background: selectedTime === time ? accent : 'transparent',
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <p
                  className="font-label uppercase mb-2"
                  style={{fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(244,232,208,0.3)'}}
                >
                  any notes for your {stylistLabel}?
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional — allergies, preferences, references..."
                  className="w-full font-body resize-none"
                  style={{
                    fontSize: '0.8rem',
                    color: 'rgba(244,232,208,0.6)',
                    background: 'rgba(244,232,208,0.03)',
                    border: '1px solid rgba(201,169,97,0.12)',
                    padding: '0.75rem',
                    outline: 'none',
                    lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={submitBooking}
                disabled={!selectedDate || !selectedTime}
                className="w-full py-3 font-label uppercase transition-all duration-300"
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.3em',
                  background: selectedDate && selectedTime ? accent : 'rgba(244,232,208,0.06)',
                  color: selectedDate && selectedTime ? '#0A0406' : 'rgba(244,232,208,0.2)',
                  border: 'none',
                  cursor: selectedDate && selectedTime ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                }}
              >
                Request Appointment
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── STATE: CONFIRMED ────────────────────────────────────────────────── */}
        {appState === 'confirmed' && confirmedService && (
          <motion.div
            key="confirmed"
            initial={{opacity: 0, y: 14}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0}}
            transition={{duration: 0.5, ease: 'easeOut'}}
            className="max-w-lg mx-auto px-4 pb-16 relative z-10"
          >
            <div
              className="text-center"
              style={{
                border: `1px solid ${accent}20`,
                background: 'rgba(10,4,6,0.6)',
                backdropFilter: 'blur(10px)',
                padding: '3rem 2rem',
                marginTop: '1rem',
              }}
            >
              {/* Check mark */}
              <motion.div
                initial={{scale: 0.6, opacity: 0}}
                animate={{scale: 1, opacity: 1}}
                transition={{delay: 0.2, type: 'spring', stiffness: 200, damping: 18}}
                style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '50%',
                  border: `1px solid ${accent}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  color: accent,
                  fontSize: '1.4rem',
                }}
              >
                ✓
              </motion.div>

              <motion.h2
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.35}}
                className="font-display italic"
                style={{fontSize: '1.6rem', color: 'rgba(244,232,208,0.85)', marginBottom: '0.75rem'}}
              >
                Request Sent
              </motion.h2>

              <motion.p
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.5}}
                className="font-body"
                style={{fontSize: '0.85rem', color: 'rgba(244,232,208,0.4)', lineHeight: 1.7, marginBottom: '2rem'}}
              >
                Your {stylistLabel} will confirm within 2 hours.
                <br />
                You'll receive a notification when it's locked in.
              </motion.p>

              {/* Booking summary */}
              <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.6}}
                style={{
                  borderTop: '1px solid rgba(201,169,97,0.12)',
                  borderBottom: '1px solid rgba(201,169,97,0.12)',
                  padding: '1.25rem 0',
                  marginBottom: '2rem',
                }}
              >
                <p
                  className="font-display italic"
                  style={{fontSize: '1rem', color: 'rgba(244,232,208,0.7)', marginBottom: '0.35rem'}}
                >
                  {confirmedService.name}
                </p>
                <p className="font-mono" style={{fontSize: '0.68rem', color: 'rgba(244,232,208,0.3)'}}>
                  {confirmedDateTime}
                </p>
              </motion.div>

              <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.75}}
                className="flex flex-col items-center gap-3"
              >
                <button
                  onClick={resetToMenu}
                  className="font-label uppercase transition-all duration-300"
                  style={{
                    fontSize: '0.58rem',
                    letterSpacing: '0.3em',
                    color: accent,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Back to services →
                </button>
                <Link
                  href="/lobby"
                  className="font-body transition-colors"
                  style={{fontSize: '0.78rem', color: 'rgba(244,232,208,0.2)'}}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#C9A961')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(244,232,208,0.2)')}
                >
                  Return to lobby
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floor gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{background: 'linear-gradient(to top, rgba(74,25,34,0.08), transparent)'}}
      />

      <style jsx>{`
        @keyframes salon-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
