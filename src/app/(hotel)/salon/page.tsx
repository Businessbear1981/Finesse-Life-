'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {roomCall} from '@/lib/room-client';
import {SALON_STATUS, splitBookings, type SalonBooking} from '@/lib/salon';
import {NovaPlan} from '@/components/hotel/nova-plan';

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

// ─── Sample (signed-out preview only) ───────────────────────────────────────────
// Shown only to visitors who aren't signed in, and labelled as sample. Members see their own requests.

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

type Mode = 'loading' | 'live' | 'signed_out' | 'closed' | 'error';
const fieldStyle: React.CSSProperties = { padding: '10px 12px', background: '#0A0406', border: '1px solid rgba(244,232,208,0.12)', color: 'rgba(244,232,208,0.85)', fontSize: '0.8rem', outline: 'none' };
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function prettyWhen(date: string, time: string) {
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? `${date} · ${time}` : `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.12)' }} />
      <span className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(201,169,97,0.45)' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(201,169,97,0.12)' }} />
    </div>
  );
}

/** One of the member's own requests. Pending ones can be withdrawn; nothing here claims a salon confirmed it. */
function BookingCard({ b, accent, onCancel, busy }: { b: SalonBooking; accent: string; onCancel?: () => void; busy: boolean }) {
  const confirmed = b.status === 'confirmed';
  return (
    <div style={{ border: `1px solid ${confirmed ? 'rgba(74,222,128,0.3)' : `${accent}28`}`, background: `${accent}05`, padding: '18px 20px', position: 'relative' }}>
      <p className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: `${accent}AA`, marginBottom: '4px' }}>
        {prettyWhen(b.requested_date, b.requested_time)}
      </p>
      <h3 className="font-display italic" style={{ fontSize: '1.15rem', color: 'rgba(244,232,208,0.9)' }}>{b.service_name}</h3>
      {b.notes && <p className="font-body" style={{ fontSize: '0.75rem', color: 'rgba(244,232,208,0.45)', marginTop: '4px' }}>{b.notes}</p>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px' }}>
        <span className="font-label uppercase" style={{ fontSize: '0.5rem', letterSpacing: '0.22em', color: confirmed ? '#4ADE80' : b.status === 'pending' ? 'rgba(244,232,208,0.6)' : 'rgba(244,232,208,0.35)' }}>
          {SALON_STATUS[b.status] ?? b.status}
        </span>
        {onCancel && b.status === 'pending' && (
          <button type="button" onClick={onCancel} disabled={busy} className="font-label uppercase disabled:opacity-40"
            style={{ minHeight: '36px', padding: '0 12px', fontSize: '0.5rem', letterSpacing: '0.25em', color: 'rgba(244,232,208,0.55)', background: 'none', border: '1px solid rgba(244,232,208,0.15)', cursor: 'pointer' }}>
            Withdraw request
          </button>
        )}
      </div>
    </div>
  );
}

export default function SalonPage() {
  const [isMasc, setIsMasc] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [mode, setMode] = useState<Mode>('loading');
  const [bookings, setBookings] = useState<SalonBooking[]>([]);
  const [rowBusy, setRowBusy] = useState(false);
  const [rowMsg, setRowMsg] = useState<string | null>(null);

  // Booking request — POST /api/salon/bookings records a *pending request*.
  // No salon partner confirms it yet, so the UI never says "booked".
  const [bookOpen, setBookOpen] = useState(false);
  const [bookService, setBookService] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookSending, setBookSending] = useState(false);
  const [bookResult, setBookResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    const r = await roomCall<{ bookings?: SalonBooking[] }>('/api/salon/bookings');
    if (r.ok) { setBookings(r.body.bookings ?? []); setMode('live'); }
    else setMode(r.status === 401 ? 'signed_out' : r.status === 503 ? 'closed' : 'error');
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the awaited fetch
  useEffect(() => { void load(); }, [load]);

  async function submitBooking() {
    if (!bookService.trim() || !bookDate || !bookTime || bookSending) return;
    setBookSending(true);
    setBookResult(null);
    const r = await roomCall('/api/salon/bookings', {
      method: 'POST',
      json: {
        service_name: bookService.trim(),
        requested_date: bookDate,
        requested_time: bookTime,
        notes: bookNotes.trim() || undefined,
        category: isMasc ? 'grooming' : 'beauty',
        edition: isMasc ? 'carpe_diem' : 'finesse',
      },
    });
    setBookSending(false);
    if (r.ok) {
      setBookResult({ ok: true, message: 'Requested — the salon confirms. Nothing is booked until they do.' });
      setBookService(''); setBookDate(''); setBookTime(''); setBookNotes('');
      setActiveTab('upcoming');
      void load();
    } else {
      setBookResult({ ok: false, message: r.status === 401 ? 'Sign in to send a booking request. Nothing was saved.' : r.status === 400 ? 'Check the service, date and time. Nothing was saved.' : "Your request couldn't be saved. Nothing was booked — try again." });
    }
  }

  async function cancel(id: string) {
    setRowBusy(true); setRowMsg(null);
    const r = await roomCall<{ message?: string }>(`/api/salon/bookings/${id}/cancel`, { method: 'POST' });
    setRowBusy(false);
    setRowMsg(r.ok ? 'Request withdrawn. Nothing was booked.' : r.body.message ?? 'Nothing was changed.');
    void load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only side preference
    setIsMasc(localStorage.getItem('finesse_gender') === 'masculine');
  }, []);

  const accent = isMasc ? '#FFA96B' : '#FF4D7D';
  const live = mode === 'live';
  const { upcoming: myUpcoming, history: myHistory } = splitBookings(bookings, localToday());

  // Signed-out preview only.
  const appointments = isMasc ? MASCULINE_APPOINTMENTS : FEMININE_APPOINTMENTS;
  const upcoming = appointments.filter(a => a.status === 'upcoming');
  const past = appointments.filter(a => a.status === 'past');
  const yearSpend = past.reduce((s, a) => s + a.price, 0);

  const stats = live
    ? [
      { label: 'Requested', value: String(bookings.filter(b => b.status === 'pending').length) },
      { label: 'Confirmed', value: String(bookings.filter(b => b.status === 'confirmed').length) },
      { label: 'Visits', value: String(bookings.filter(b => b.status === 'completed').length) },
    ]
    : [
      { label: 'Upcoming', value: String(upcoming.length) },
      { label: 'Visits This Year', value: String(past.length) },
      { label: 'Year Spend', value: `$${yearSpend.toLocaleString()}` },
    ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      style={{ minHeight: '100vh', background: '#0A0406', paddingBottom: '140px' }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          maxWidth: '100%',
          height: '420px',
          background: `radial-gradient(ellipse at top, ${accent}0D 0%, transparent 65%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Hero image */}
      <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,4,6,0.1), rgba(10,4,6,0.92))' }} />
        <div style={{ position: 'absolute', bottom: '28px', left: 0, right: 0, textAlign: 'center' }}>
          <p className="font-label uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.5em', color: `${accent}99`, marginBottom: '6px' }}>
            {isMasc ? 'your grooming suite' : 'beauty · wellness'}
          </p>
          <h1 className="font-display italic" style={{ fontSize: '2.4rem', color: 'rgba(244,232,208,0.92)', letterSpacing: '0.1em' }}>
            {isMasc ? 'The Grooming Suite' : 'The Salon'}
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 10 }}>

        {mode === 'loading' && <div className="mt-6 h-24 animate-pulse border border-brass/10" role="status" aria-label="Loading your salon" />}
        {mode === 'error' && (
          <div role="alert" className="mt-6 border border-neon-pink/40 p-4">
            <p className="font-body text-sm text-cream/80">The salon desk did not answer. Nothing was changed.</p>
            <button type="button" onClick={() => { setMode('loading'); void load(); }} className="mt-2 min-h-11 font-label text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>Try again</button>
          </div>
        )}
        {mode === 'closed' && <p className="mt-6 border border-brass/15 p-4 font-body text-sm italic text-cream/70">Your salon requests open once this room is fitted out.</p>}
        {mode === 'signed_out' && (
          <p className="mt-5 text-center font-label text-[9px] uppercase tracking-[0.35em] text-cream/40">
            Sign in to see your own requests · below is a sample, not your appointments
          </p>
        )}
        {live && (
          <p className="mt-5 text-center font-body text-xs italic text-cream/50">
            Requests reach a salon once a salon partner is connected. Until then every request says &ldquo;Requested — the salon confirms&rdquo;; nothing is booked or charged.
          </p>
        )}

        {mode !== 'loading' && mode !== 'error' && mode !== 'closed' && (
          <>
            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ display: 'flex', justifyContent: 'center', gap: '40px', padding: '20px 0 24px', borderBottom: '1px solid rgba(201,169,97,0.1)' }}
            >
              {stats.map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <p className="font-mono" style={{ fontSize: '1.3rem', color: accent, marginBottom: '2px' }}>{stat.value}</p>
                  <p className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.35)' }}>{stat.label}</p>
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
                    flex: 1, minHeight: '44px', padding: '10px', fontSize: '0.6rem', letterSpacing: '0.25em', cursor: 'pointer', transition: 'all 0.25s',
                    background: activeTab === tab ? accent : 'transparent',
                    color: activeTab === tab ? '#0A0406' : 'rgba(244,232,208,0.45)',
                    border: activeTab === tab ? 'none' : '1px solid rgba(244,232,208,0.08)',
                  }}
                >
                  {tab === 'upcoming' ? 'Upcoming' : isMasc ? 'Visit History' : 'Service History'}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── LIVE: the member's own requests ── */}
        {live && (
          <div>
            {activeTab === 'upcoming' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                {myUpcoming.length === 0
                  ? <p className="font-body italic text-center" style={{ fontSize: '0.85rem', color: 'rgba(244,232,208,0.5)', padding: '20px 0' }}>No appointments requested yet — request one below, or ask Nova to plan it.</p>
                  : myUpcoming.map(b => <BookingCard key={b.id} b={b} accent={accent} busy={rowBusy} onCancel={() => cancel(b.id)} />)}
              </div>
            )}
            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                {myHistory.length === 0
                  ? <p className="font-body italic text-center" style={{ fontSize: '0.85rem', color: 'rgba(244,232,208,0.5)', padding: '20px 0' }}>No history yet.</p>
                  : myHistory.map(b => <BookingCard key={b.id} b={b} accent={accent} busy={rowBusy} onCancel={() => cancel(b.id)} />)}
              </div>
            )}
            {rowMsg && <p role="status" className="mb-6 font-body text-sm italic text-cream/75">{rowMsg}</p>}
            <NovaPlan room="salon" topic="appointment" title={isMasc ? 'Grooming' : 'Salon'} label="Plan my appointment · Nova" accent={accent} withWhen
              placeholder={isMasc ? 'Cut and beard sculpt before Friday, near the office' : 'Gloss and blow-out before Saturday’s dinner, mornings only'} />
          </div>
        )}

        {/* ── SIGNED OUT: labelled sample ── */}
        {mode === 'signed_out' && (
          <AnimatePresence mode="wait">
            {activeTab === 'upcoming' && (
              <motion.div key="upcoming" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                <Divider label="Sample appointments" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  {upcoming.map(appt => (
                    <div key={appt.id} style={{ border: `1px solid ${accent}28`, background: `${accent}05`, padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <p className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: `${accent}80`, marginBottom: '4px' }}>{appt.date} · {appt.time}</p>
                          <h3 className="font-display italic" style={{ fontSize: '1.15rem', color: 'rgba(244,232,208,0.9)' }}>{appt.service}</h3>
                          <p className="font-body" style={{ fontSize: '0.78rem', color: 'rgba(244,232,208,0.45)', marginTop: '2px' }}>{appt.provider} · {appt.venue}</p>
                        </div>
                        <span className="font-mono" style={{ fontSize: '1rem', color: '#C9A84C', flexShrink: 0, marginLeft: '12px' }}>${appt.price}</span>
                      </div>
                      {appt.novaNote && <p className="font-body italic" style={{ fontSize: '0.78rem', color: 'rgba(244,232,208,0.5)', lineHeight: 1.6 }}>&ldquo;{appt.novaNote}&rdquo;</p>}
                    </div>
                  ))}
                </div>
                <Divider label={isMasc ? 'Products · sample' : 'Trending · sample'} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                  {isMasc
                    ? MASCULINE_PRODUCTS.map(prod => (
                      <div key={prod.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid rgba(244,232,208,0.06)' }}>
                        <div>
                          <p className="font-label uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(244,232,208,0.35)', marginBottom: '2px' }}>{prod.brand}</p>
                          <p className="font-body" style={{ fontSize: '0.82rem', color: 'rgba(244,232,208,0.7)' }}>{prod.name}</p>
                        </div>
                        <span className="font-label uppercase" style={{ fontSize: '0.5rem', letterSpacing: '0.2em', color: statusDot(prod.status) }}>{statusLabel(prod.status)}</span>
                      </div>
                    ))
                    : TRENDING_FEMININE.map(item => (
                      <div key={item.name} style={{ padding: '14px 16px', border: '1px solid rgba(244,232,208,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p className="font-label uppercase" style={{ fontSize: '0.5rem', letterSpacing: '0.25em', color: `${accent}80`, marginBottom: '3px' }}>{item.brand}</p>
                          <p className="font-body" style={{ fontSize: '0.82rem', color: 'rgba(244,232,208,0.72)' }}>{item.name}</p>
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.85rem', color: '#C9A84C' }}>{item.price}</span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                <Divider label="Sample history" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {past.map(appt => (
                    <div key={appt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', border: '1px solid rgba(244,232,208,0.05)' }}>
                      <div>
                        <p className="font-body" style={{ fontSize: '0.85rem', color: 'rgba(244,232,208,0.68)' }}>{appt.service}</p>
                        <p className="font-body" style={{ fontSize: '0.68rem', color: 'rgba(244,232,208,0.35)', marginTop: '2px' }}>{appt.venue} · {appt.date}</p>
                      </div>
                      <span className="font-mono" style={{ fontSize: '0.85rem', color: 'rgba(201,169,97,0.6)' }}>${appt.price}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Return link */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link href="/lobby" className="font-body" style={{ fontSize: '0.8rem', color: 'rgba(244,232,208,0.35)', textDecoration: 'none' }}>
            return to the lobby
          </Link>
        </div>
      </div>

      {/* Bottom CTA bar — the request form (members only) */}
      {live && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px calc(14px + env(safe-area-inset-bottom, 0px))',
            background: 'rgba(10,4,6,0.96)', borderTop: `1px solid ${accent}22`, backdropFilter: 'blur(12px)', zIndex: 50,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {bookOpen && (
            <div style={{ width: '100%', maxWidth: '360px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p className="font-label uppercase" style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(244,232,208,0.45)' }}>
                Booking request · pending until a salon confirms
              </p>
              <input aria-label="Service" type="text" value={bookService} onChange={e => setBookService(e.target.value)} maxLength={120}
                placeholder={isMasc ? 'Haircut + lineup' : 'Full colour, facial, lashes…'} className="font-body" style={fieldStyle} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input aria-label="Date" type="date" min={localToday()} value={bookDate} onChange={e => setBookDate(e.target.value)} className="font-body" style={{ ...fieldStyle, flex: 1, minWidth: 0, colorScheme: 'dark' }} />
                <input aria-label="Time" type="time" value={bookTime} onChange={e => setBookTime(e.target.value)} className="font-body" style={{ ...fieldStyle, flex: 1, minWidth: 0, colorScheme: 'dark' }} />
              </div>
              <input aria-label="Notes" type="text" value={bookNotes} onChange={e => setBookNotes(e.target.value)} maxLength={500} placeholder="Notes (optional)" className="font-body" style={fieldStyle} />
            </div>
          )}
          {bookResult && (
            <p role="status" className="font-body italic" style={{ width: '100%', maxWidth: '360px', fontSize: '0.72rem', lineHeight: 1.5, marginBottom: '10px', color: bookResult.ok ? 'rgba(244,232,208,0.7)' : `${accent}CC` }}>
              {bookResult.message}
            </p>
          )}
          <button
            onClick={() => {
              if (!bookOpen) { setBookOpen(true); setBookResult(null); return; }
              void submitBooking();
            }}
            disabled={bookOpen && (bookSending || !bookService.trim() || !bookDate || !bookTime)}
            className="font-label uppercase disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ minHeight: '48px', padding: '14px 40px', background: accent, color: '#0A0406', border: 'none', fontSize: '0.6rem', letterSpacing: '0.3em', cursor: 'pointer', width: '100%', maxWidth: '360px' }}
          >
            {bookOpen ? (bookSending ? 'Sending request…' : 'Send Request') : (isMasc ? 'Request Grooming' : 'Request Next Appointment')}
          </button>
          {bookOpen && (
            <button onClick={() => { setBookOpen(false); setBookResult(null); }} className="font-body"
              style={{ marginTop: '8px', minHeight: '36px', background: 'none', border: 'none', fontSize: '0.72rem', color: 'rgba(244,232,208,0.45)', cursor: 'pointer' }}>
              close
            </button>
          )}
        </div>
      )}
      {mode === 'signed_out' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px calc(14px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,4,6,0.96)', borderTop: `1px solid ${accent}22`, zIndex: 50, display: 'flex', justifyContent: 'center' }}>
          <Link href="/login" className="font-label uppercase text-center" style={{ minHeight: '48px', lineHeight: '48px', width: '100%', maxWidth: '360px', background: accent, color: '#0A0406', fontSize: '0.6rem', letterSpacing: '0.3em' }}>
            Sign in to request
          </Link>
        </div>
      )}
    </motion.div>
  );
}
