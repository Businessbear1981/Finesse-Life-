'use client';

import {useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';

/* ─── Types ─── */

interface DatePlan {
  id: string;
  time: string;
  activity: string;
  venue: string;
  cost_cents: number;
  category: string;
  booked: boolean;
}

interface WishlistSuggestion {
  id: string;
  original_name: string;
  original_brand: string;
  original_price: number;
  alt_name: string;
  alt_brand: string;
  alt_price: number;
  match_reason: string;
  image: string;
}

/* ─── Demo Data ─── */

const DEMO_PLAN: DatePlan[] = [
  {id: '1', time: '7:00 PM', activity: 'Black car pickup', venue: 'Your location', cost_cents: 4500, category: 'transport', booked: true},
  {id: '2', time: '7:45 PM', activity: 'Dinner reservation', venue: 'Uchi — omakase bar', cost_cents: 32000, category: 'dining', booked: true},
  {id: '3', time: '9:30 PM', activity: 'Cocktails', venue: 'Roosevelt Room — speakeasy', cost_cents: 8000, category: 'drinks', booked: false},
  {id: '4', time: '11:00 PM', activity: 'Live music', venue: 'Continental Club', cost_cents: 4000, category: 'entertainment', booked: false},
  {id: '5', time: '12:30 AM', activity: 'Black car home', venue: 'Return trip', cost_cents: 4500, category: 'transport', booked: false},
];

const DEMO_WISHLIST: WishlistSuggestion[] = [
  {id: 'w1', original_name: 'Cashmere Throw Wrap', original_brand: 'Loro Piana', original_price: 89500, alt_name: 'Cashmere Travel Wrap', alt_brand: 'Jenni Kayne', alt_price: 28500, match_reason: 'Same weight cashmere, similar drape, neutral palette', image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=200&h=200&fit=crop&q=80'},
  {id: 'w2', original_name: 'Le Labo Santal 33', original_brand: 'Le Labo', original_price: 31000, alt_name: 'Santal Royale', alt_brand: 'Commodity', alt_price: 10500, match_reason: 'Sandalwood-forward, similar dry-down, less sweet', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop&q=80'},
  {id: 'w3', original_name: 'Pearl Drop Earrings', original_brand: 'Sophie Buhai', original_price: 39500, alt_name: 'Baroque Pearl Drops', alt_brand: 'Faris', alt_price: 14800, match_reason: 'Same baroque freshwater pearl, sterling silver, minimal setting', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&h=200&fit=crop&q=80'},
];

const BUDGET_PRESETS = [
  {label: '$100', cents: 10000},
  {label: '$250', cents: 25000},
  {label: '$500', cents: 50000},
  {label: '$1,000', cents: 100000},
  {label: 'No limit', cents: 999999},
];

const VIBE_OPTIONS = ['romantic', 'casual', 'adventurous', 'group night', 'solo treat', 'impress'];

function formatPrice(cents: number): string {
  if (cents >= 999999) return 'No limit';
  return `$${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: 0})}`;
}

/* ─── Component ─── */

export default function PerDiemPage() {
  const [tab, setTab] = useState<'planner' | 'wishlist' | 'tracker'>('planner');
  const [budget, setBudget] = useState(50000);
  const [vibe, setVibe] = useState('romantic');
  const [plan, setPlan] = useState(DEMO_PLAN);

  const totalPlanned = plan.reduce((s, p) => s + p.cost_cents, 0);
  const totalBooked = plan.filter((p) => p.booked).reduce((s, p) => s + p.cost_cents, 0);
  const remaining = budget - totalPlanned;
  const cashback = Math.round(totalPlanned * 0.15);
  const budgetPct = budget >= 999999 ? 0 : Math.min(100, Math.round((totalPlanned / budget) * 100));

  const toggleBooked = (id: string) => {
    setPlan((prev) => prev.map((p) => (p.id === id ? {...p, booked: !p.booked} : p)));
  };

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.6}}
      className="min-h-screen relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
          style={{background: 'radial-gradient(ellipse at center, rgba(201,169,97,0.06) 0%, transparent 65%)'}}
        />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-4 relative z-10">
        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <span className="text-4xl mb-4 inline-block">💰</span>
          <h1 className="font-display text-4xl text-brass tracking-[0.2em]">per diem</h1>
          <p className="font-label text-[10px] tracking-[0.5em] text-cream/20 uppercase mt-2">
            daily budget · date curator
          </p>
        </motion.div>
      </header>

      {/* Budget bar */}
      <div className="max-w-3xl mx-auto px-4 mb-6 relative z-10">
        <div className="brass-border bg-ink/60 backdrop-blur-sm p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="font-label text-[9px] tracking-[0.3em] text-brass/40 uppercase">tonight&apos;s budget</span>
            <span className="font-mono text-2xl text-brass" style={{textShadow: '0 0 12px rgba(201,169,97,0.2)'}}>
              {formatPrice(budget)}
            </span>
          </div>

          {/* Budget presets */}
          <div className="flex gap-2 mb-4">
            {BUDGET_PRESETS.map((b) => (
              <button
                key={b.cents}
                onClick={() => setBudget(b.cents)}
                className={`flex-1 py-1.5 text-[9px] font-label tracking-[0.12em] uppercase transition-all ${
                  budget === b.cents ? 'text-ink bg-brass' : 'text-cream/25 border border-cream/8 hover:border-brass/30'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-cream/5 mb-2">
            <motion.div
              className="h-full"
              style={{background: budgetPct > 90 ? '#FF4D7D' : budgetPct > 70 ? '#FFA96B' : '#00FF88'}}
              animate={{width: `${budgetPct}%`}}
              transition={{duration: 0.5}}
            />
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-cream/30">{formatPrice(totalPlanned)} planned</span>
            <span className={`font-mono text-[10px] ${remaining >= 0 ? 'text-green-500/60' : 'text-neon-pink/60'}`}>
              {budget >= 999999 ? 'no limit' : remaining >= 0 ? formatPrice(remaining) + ' left' : 'over budget'}
            </span>
          </div>

          {/* Cashback preview */}
          <div className="mt-3 pt-3 border-t border-cream/5 flex justify-between">
            <span className="font-label text-[8px] tracking-[0.2em] text-cream/15 uppercase">15% cashback</span>
            <span className="font-mono text-sm text-green-500/60">+{formatPrice(cashback)}</span>
          </div>
        </div>
      </div>

      {/* Vibe selector */}
      <div className="max-w-3xl mx-auto px-4 mb-6 relative z-10">
        <div className="flex gap-2 justify-center flex-wrap">
          {VIBE_OPTIONS.map((v) => (
            <button
              key={v}
              onClick={() => setVibe(v)}
              className={`px-3 py-1.5 text-[9px] font-label tracking-[0.12em] uppercase transition-all ${
                vibe === v ? 'text-ink bg-brass' : 'text-cream/25 border border-cream/8 hover:border-brass/30'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4 mb-8 relative z-10">
        <div className="flex justify-center gap-3">
          {(['planner', 'wishlist', 'tracker'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-[10px] font-label tracking-[0.2em] uppercase transition-all ${
                tab === t ? 'text-ink bg-brass' : 'text-cream/25 border border-cream/8 hover:border-brass/30'
              }`}
            >
              {t === 'wishlist' ? 'her wishlist' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 relative z-10 pb-12">
        <AnimatePresence mode="wait">
          {/* ═══ DATE PLANNER ═══ */}
          {tab === 'planner' && (
            <motion.div key="planner" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-brass/20" />
                <span className="font-label text-[9px] tracking-[0.4em] text-brass/40 uppercase">tonight&apos;s itinerary</span>
                <div className="h-px flex-1 bg-brass/20" />
              </div>

              {/* Timeline */}
              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-brass/15" />
                <div className="space-y-4">
                  {plan.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{opacity: 0, x: -10}}
                      animate={{opacity: 1, x: 0}}
                      transition={{delay: i * 0.06}}
                      className="relative"
                    >
                      <div
                        className={`absolute -left-5 top-4 w-3 h-3 rounded-full border ${
                          item.booked ? 'border-green-500/50 bg-green-500/20' : 'border-brass/30 bg-ink'
                        }`}
                        style={{boxShadow: item.booked ? '0 0 6px #00FF8840' : 'none'}}
                      />
                      <div
                        className={`p-4 border transition-all cursor-pointer ${
                          item.booked ? 'border-green-500/15 bg-ink/50' : 'border-cream/6 bg-ink/30 hover:border-cream/12'
                        }`}
                        onClick={() => toggleBooked(item.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm text-brass/60">{item.time}</span>
                              <span className="font-label text-[7px] tracking-[0.15em] uppercase text-cream/20 px-1.5 py-0.5 border border-cream/6">
                                {item.category}
                              </span>
                            </div>
                            <p className="font-display text-base text-cream/85 tracking-wide mt-1">{item.activity}</p>
                            <p className="font-body text-xs text-cream/30 italic">{item.venue}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-base text-brass">{formatPrice(item.cost_cents)}</p>
                            <span className={`font-label text-[7px] tracking-[0.15em] uppercase ${item.booked ? 'text-green-500/60' : 'text-cream/15'}`}>
                              {item.booked ? 'booked' : 'tap to book'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center px-4 py-3 border border-brass/15 bg-ink/50">
                <span className="font-label text-[9px] tracking-[0.3em] text-cream/30 uppercase">tonight&apos;s total</span>
                <span className="font-mono text-xl text-brass" style={{textShadow: '0 0 10px rgba(201,169,97,0.15)'}}>
                  {formatPrice(totalPlanned)}
                </span>
              </div>
            </motion.div>
          )}

          {/* ═══ HER WISHLIST ═══ */}
          {tab === 'wishlist' && (
            <motion.div key="wishlist" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-brass/20" />
                <span className="font-label text-[9px] tracking-[0.4em] text-brass/40 uppercase">smart picks from her list</span>
                <div className="h-px flex-1 bg-brass/20" />
              </div>
              <p className="text-center font-body text-xs text-cream/25 italic mb-6">
                She picked it. We found the version that fits your budget.
              </p>

              <div className="space-y-5">
                {DEMO_WISHLIST.map((item, i) => {
                  const savings = Math.round(((item.original_price - item.alt_price) / item.original_price) * 100);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{opacity: 0, y: 10}}
                      animate={{opacity: 1, y: 0}}
                      transition={{delay: i * 0.08}}
                      className="border border-cream/6 bg-ink/40 overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 shrink-0 overflow-hidden border border-brass/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex-1">
                            <p className="font-label text-[7px] tracking-[0.2em] text-cream/15 uppercase mb-1">she wants</p>
                            <p className="font-body text-sm text-cream/40 italic line-through">
                              {item.original_name} — {item.original_brand} — {formatPrice(item.original_price)}
                            </p>
                            <p className="font-label text-[7px] tracking-[0.2em] text-brass/40 uppercase mt-3 mb-1">we suggest</p>
                            <p className="font-display text-base text-cream/85 tracking-wide">{item.alt_name}</p>
                            <p className="font-label text-[8px] tracking-[0.15em] text-cream/30 uppercase">{item.alt_brand}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="font-mono text-lg text-brass">{formatPrice(item.alt_price)}</span>
                              <span className="font-label text-[8px] tracking-[0.12em] uppercase px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20">
                                save {savings}%
                              </span>
                            </div>
                            <p className="font-body text-[10px] text-cream/25 italic mt-2">{item.match_reason}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button className="flex-1 py-2 font-label text-[9px] tracking-[0.2em] uppercase text-ink bg-brass hover:bg-brass-highlight transition-colors">
                            add to bag
                          </button>
                          <button className="px-4 py-2 font-label text-[9px] tracking-[0.2em] uppercase text-cream/30 border border-cream/8 hover:border-brass/30 transition-colors">
                            get original
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ LIVE TRACKER ═══ */}
          {tab === 'tracker' && (
            <motion.div key="tracker" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-brass/20" />
                <span className="font-label text-[9px] tracking-[0.4em] text-brass/40 uppercase">live spend</span>
                <div className="h-px flex-1 bg-brass/20" />
              </div>

              <div className="text-center mb-8">
                <div className="inline-block brass-border px-10 py-6 bg-ink/60">
                  <p className="font-label text-[9px] tracking-[0.4em] text-brass/30 uppercase mb-2">spent tonight</p>
                  <p className="font-display text-5xl text-brass" style={{textShadow: '0 0 25px rgba(201,169,97,0.25)'}}>
                    {formatPrice(totalBooked)}
                  </p>
                  <div className="h-px bg-brass/15 my-4" />
                  <div className="flex justify-center gap-8">
                    <div className="text-center">
                      <p className="font-label text-[8px] tracking-[0.2em] text-cream/20 uppercase">budget</p>
                      <p className="font-mono text-sm text-cream/40">{formatPrice(budget)}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-label text-[8px] tracking-[0.2em] text-cream/20 uppercase">remaining</p>
                      <p className={`font-mono text-sm ${remaining >= 0 ? 'text-green-500/60' : 'text-neon-pink/60'}`}>
                        {budget >= 999999 ? '∞' : formatPrice(Math.abs(remaining))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-label text-[8px] tracking-[0.2em] text-cream/20 uppercase">cashback</p>
                      <p className="font-mono text-sm text-green-500/60">+{formatPrice(Math.round(totalBooked * 0.15))}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {['dining', 'drinks', 'transport', 'entertainment'].map((cat) => {
                  const catTotal = plan.filter((p) => p.category === cat && p.booked).reduce((s, p) => s + p.cost_cents, 0);
                  const catPct = budget > 0 && budget < 999999 ? Math.round((catTotal / budget) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-4 px-4 py-2 border border-cream/4 bg-ink/30">
                      <span className="font-label text-[8px] tracking-[0.15em] text-cream/25 uppercase w-24">{cat}</span>
                      <div className="flex-1 h-1.5 bg-cream/5">
                        <div className="h-full bg-brass/40" style={{width: `${catPct}%`}} />
                      </div>
                      <span className="font-mono text-[10px] text-cream/30 w-16 text-right">{formatPrice(catTotal)}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center pb-8 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">
          return to the lobby
        </Link>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
    </motion.div>
  );
}
