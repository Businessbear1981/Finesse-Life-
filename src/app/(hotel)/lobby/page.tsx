'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shirt, ShoppingBag, Scissors, Plane, DollarSign, TrendingUp, Sun, Compass } from 'lucide-react';

/* ─── Gender detection ─── */
const useGender = () => {
  const [isMasc, setIsMasc] = useState(false);
  useEffect(() => {
    setIsMasc(localStorage.getItem('finesse_gender') === 'masculine');
  }, []);
  return isMasc;
};

/* ─── Live clock ─── */
const useClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
};

/* ─── Data ─── */
const FEMININE_PICKS = [
  {
    brand: 'Chanel',
    name: '22 Mini Bag — Black Lambskin',
    price: '$3,800',
    img: '1558618666-fcd25c85cd64',
    tag: 'New Season',
  },
  {
    brand: 'Valentino',
    name: 'Rockstud Slide — Nude Patent',
    price: '$995',
    img: '1594938298603-c8148c4b4e59',
    tag: 'Low Stock',
  },
  {
    brand: 'Bottega Veneta',
    name: 'Andiamo Clutch — Intrecciato',
    price: '$2,450',
    img: '1483985988355-763728e1935b',
    tag: 'Curated',
  },
];

const FEMININE_GRID = [
  { label: 'Wardrobe', href: '/wardrobe', icon: Shirt },
  { label: 'Bag', href: '/bag', icon: ShoppingBag },
  { label: 'Salon', href: '/salon', icon: Scissors },
  { label: 'Departures', href: '/departures', icon: Plane },
];

const MASC_GRID = [
  { label: 'Per Diem', href: '/per-diem', icon: DollarSign },
  { label: 'Market', href: '/market', icon: TrendingUp },
  { label: 'Carpe Diem', href: '/carpe-diem', icon: Sun },
  { label: 'Departures', href: '/departures', icon: Plane },
];

const MASC_BRIEF = [
  { label: 'S&P 500', value: '+1.2%', positive: true },
  { label: 'Portfolio', value: '+$4,840', positive: true },
  { label: 'Unread Deals', value: '1', positive: false },
  { label: 'Dinner Res.', value: '8:00 PM', positive: false },
];

/* ─── Main ─── */
export default function LobbyPage() {
  const isMasc = useGender();
  const time = useClock();

  const accent = isMasc ? '#FFA96B' : '#FF4D7D';
  const gridItems = isMasc ? MASC_GRID : FEMININE_GRID;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="min-h-screen relative"
      style={{ background: '#0A0406', color: '#F4E8D0' }}
    >
      {/* ── Hero background ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80&fit=crop"
          className="w-full h-full object-cover"
          alt="Lobby"
          style={{ opacity: 0.18 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,4,6,0.5) 0%, rgba(10,4,6,0.92) 55%, #0A0406 100%)',
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
          style={{
            background: `radial-gradient(ellipse at top, ${accent}12 0%, transparent 65%)`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-12 pb-36 space-y-8">

        {/* ── Header row ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between"
        >
          <span
            className="font-label uppercase tracking-widest"
            style={{ fontSize: '9px', color: 'rgba(201,169,97,0.35)' }}
          >
            {isMasc ? 'Carpe Diem · Members Club' : 'Finesse · Members Club'}
          </span>
          <span
            className="font-display italic"
            style={{ fontSize: '18px', color: 'rgba(201,169,97,0.6)', letterSpacing: '0.06em' }}
          >
            {time}
          </span>
        </motion.div>

        {/* ── Nova welcome ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="text-center py-8"
        >
          <p
            className="font-label uppercase tracking-widest mb-4"
            style={{ fontSize: '8px', color: `${accent}60` }}
          >
            Nova
          </p>
          <h1
            className="font-display italic"
            style={{
              fontSize: 'clamp(28px, 8vw, 44px)',
              color: '#E8C87A',
              letterSpacing: '0.06em',
              lineHeight: 1.2,
            }}
          >
            {isMasc ? "You're back." : 'Good evening,'}
          </h1>
          {isMasc ? (
            <p
              className="font-display italic mt-1"
              style={{
                fontSize: 'clamp(18px, 5vw, 28px)',
                color: 'rgba(201,169,97,0.55)',
                letterSpacing: '0.06em',
              }}
            >
              The floor knows your name.
            </p>
          ) : (
            <p
              className="font-display italic mt-1"
              style={{
                fontSize: 'clamp(28px, 8vw, 44px)',
                color: '#FF4D7D',
                letterSpacing: '0.06em',
              }}
            >
              beautiful.
            </p>
          )}
          <div
            className="mx-auto mt-6"
            style={{
              width: '48px',
              height: '1px',
              background: `linear-gradient(to right, transparent, ${accent}40, transparent)`,
            }}
          />
          {!isMasc && (
            <p
              className="font-body italic mt-4"
              style={{ fontSize: '13px', color: 'rgba(244,232,208,0.35)', letterSpacing: '0.04em' }}
            >
              847 members checked in tonight.
            </p>
          )}
        </motion.div>

        {/* ── Gender-split section ── */}
        {isMasc ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p
              className="font-label uppercase tracking-widest mb-4"
              style={{ fontSize: '8px', color: 'rgba(201,169,97,0.35)' }}
            >
              Today&apos;s Brief
            </p>
            <div
              className="border p-5"
              style={{
                borderColor: 'rgba(255,169,107,0.15)',
                background: 'rgba(10,4,6,0.7)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                {MASC_BRIEF.map((item) => (
                  <div key={item.label}>
                    <p
                      className="font-label uppercase"
                      style={{
                        fontSize: '7px',
                        letterSpacing: '0.3em',
                        color: 'rgba(244,232,208,0.25)',
                        marginBottom: '4px',
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="font-display"
                      style={{
                        fontSize: '18px',
                        color: item.positive ? '#FFA96B' : '#E8C87A',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p
              className="font-label uppercase tracking-widest mb-4"
              style={{ fontSize: '8px', color: 'rgba(201,169,97,0.35)' }}
            >
              Today&apos;s Picks — Curated for You
            </p>
            <div className="space-y-3">
              {FEMININE_PICKS.map((pick) => (
                <div
                  key={pick.name}
                  className="flex gap-4 border overflow-hidden"
                  style={{
                    borderColor: 'rgba(201,169,97,0.1)',
                    background: 'rgba(10,4,6,0.6)',
                  }}
                >
                  <div className="w-20 h-20 flex-shrink-0 overflow-hidden">
                    <img
                      src={`https://images.unsplash.com/photo-${pick.img}?w=200&q=80&fit=crop`}
                      className="w-full h-full object-cover"
                      alt={pick.name}
                    />
                  </div>
                  <div className="flex-1 py-3 pr-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className="font-label uppercase"
                          style={{
                            fontSize: '7px',
                            letterSpacing: '0.25em',
                            color: '#FF4D7D',
                            marginBottom: '3px',
                          }}
                        >
                          {pick.brand}
                        </p>
                        <p
                          className="font-body"
                          style={{ fontSize: '12px', color: 'rgba(244,232,208,0.75)', lineHeight: 1.3 }}
                        >
                          {pick.name}
                        </p>
                      </div>
                      <span
                        className="font-label uppercase flex-shrink-0"
                        style={{
                          fontSize: '6px',
                          letterSpacing: '0.2em',
                          color: '#FF4D7D',
                          border: '1px solid rgba(255,77,125,0.3)',
                          padding: '2px 6px',
                        }}
                      >
                        {pick.tag}
                      </span>
                    </div>
                    <p
                      className="font-display mt-1"
                      style={{ fontSize: '14px', color: '#E8C87A' }}
                    >
                      {pick.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Featured event ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52 }}
        >
          <p
            className="font-label uppercase tracking-widest mb-3"
            style={{ fontSize: '8px', color: 'rgba(201,169,97,0.35)' }}
          >
            Featured Tonight
          </p>
          <div
            className="relative overflow-hidden border"
            style={{ borderColor: `${accent}20`, background: 'rgba(10,4,6,0.7)' }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${accent}08 0%, transparent 60%)`,
              }}
            />
            <div className="relative p-5">
              <span
                className="font-label uppercase"
                style={{ fontSize: '7px', letterSpacing: '0.3em', color: `${accent}80` }}
              >
                {isMasc ? 'Sat · 10 PM' : 'Fri · 9 PM'}
              </span>
              <p
                className="font-display italic mt-1"
                style={{ fontSize: '20px', color: '#E8C87A', letterSpacing: '0.06em' }}
              >
                {isMasc ? 'Private Screening' : 'Rooftop Tasting'}
              </p>
              <p
                className="font-body mt-1"
                style={{ fontSize: '13px', color: 'rgba(244,232,208,0.45)' }}
              >
                {isMasc
                  ? 'Metrograph · 7 Ludlow St, New York, NY'
                  : '1 Hotel Brooklyn Bridge · 60 Furman St, Brooklyn'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.7)' }}
                />
                <span
                  className="font-label uppercase"
                  style={{ fontSize: '7px', letterSpacing: '0.2em', color: 'rgba(244,232,208,0.3)' }}
                >
                  {isMasc ? '12 seats remaining' : '34 members attending'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Quick access grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.64 }}
        >
          <p
            className="font-label uppercase tracking-widest mb-3"
            style={{ fontSize: '8px', color: 'rgba(201,169,97,0.35)' }}
          >
            Quick Access
          </p>
          <div className="grid grid-cols-4 gap-2">
            {gridItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex flex-col items-center gap-2 py-4 border transition-all duration-300"
                style={{ borderColor: 'rgba(201,169,97,0.1)', background: 'rgba(10,4,6,0.5)' }}
              >
                <Icon size={18} strokeWidth={1.2} style={{ color: `${accent}70` }} />
                <span
                  className="font-label uppercase text-center"
                  style={{ fontSize: '7px', letterSpacing: '0.2em', color: 'rgba(244,232,208,0.3)' }}
                >
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Compass / explore nudge ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.78 }}
          className="flex items-center gap-3 px-4 py-3 border"
          style={{ borderColor: 'rgba(201,169,97,0.08)', background: 'rgba(201,169,97,0.03)' }}
        >
          <Compass size={14} strokeWidth={1.2} style={{ color: `${accent}50`, flexShrink: 0 }} />
          <p
            className="font-body italic"
            style={{ fontSize: '12px', color: 'rgba(244,232,208,0.3)', lineHeight: 1.4 }}
          >
            {isMasc
              ? 'Dinner reservation at Nobu 57 confirmed for 8 PM. Dress accordingly.'
              : 'Your stylist added 2 new pieces to your wishlist while you were out.'}
          </p>
        </motion.div>

      </div>

      {/* ── Fixed CTA bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-4"
        style={{ background: 'linear-gradient(to top, #0A0406 60%, transparent)' }}
      >
        <div className="max-w-lg mx-auto">
          <Link
            href="/lounge"
            className="block w-full py-4 text-center font-label uppercase tracking-widest transition-all duration-300"
            style={{
              fontSize: '10px',
              letterSpacing: '0.4em',
              background: accent,
              color: '#0A0406',
              boxShadow: `0 0 32px ${accent}40`,
            }}
          >
            Enter the Floor
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
