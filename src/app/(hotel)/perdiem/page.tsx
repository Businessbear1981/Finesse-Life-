'use client';

import {useState, useEffect, useCallback} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';

/* ─── Types ─── */

type Tab = 'planner' | 'wishlist' | 'verify' | 'split';
type Gender = 'masculine' | 'feminine';
type SplitMode = 'all' | 'fair' | 'cover';

interface DatePlan {
  id: string;
  time: string;
  activity: string;
  venue: string;
  cost_cents: number;
  category: string;
  booked: boolean;
  eventbrite_id?: string; // set for bookable Eventbrite events
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

interface MemberResult {
  found: boolean;
  display_name?: string;
  gender?: string;
  vibe?: string;
  city?: string;
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

const TEAL = '#69C9D0';

function formatPrice(cents: number): string {
  if (cents >= 999999) return 'No limit';
  return `$${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: 0})}`;
}

/* ─── Gender Lock ─── */

function GenderLock() {
  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]"
          style={{background: `radial-gradient(ellipse at center, rgba(105,201,208,0.05) 0%, transparent 65%)`}}
        />
      </div>
      <span className="text-5xl mb-6 inline-block">🎩</span>
      <h1 className="font-display text-3xl tracking-[0.2em] mb-3" style={{color: TEAL}}>
        carpe diem
      </h1>
      <p className="font-label text-[10px] tracking-[0.5em] uppercase mb-6" style={{color: 'rgba(244,232,208,0.2)'}}>
        this room is for him
      </p>
      <p className="font-body text-sm italic mb-10" style={{color: 'rgba(244,232,208,0.3)', maxWidth: '280px'}}>
        Per Diem is a Carpe Diem feature — date planning built for the man who shows up prepared.
      </p>
      <Link
        href="/lobby"
        className="px-8 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-colors"
        style={{border: `1px solid rgba(105,201,208,0.3)`, color: 'rgba(244,232,208,0.4)'}}
      >
        return to lobby
      </Link>
    </motion.div>
  );
}

/* ─── Main Component ─── */

export default function PerDiemPage() {
  const [gender, setGender] = useState<Gender | null>(null);
  const [tab, setTab] = useState<Tab>('planner');
  const [budget, setBudget] = useState(50000);
  const [vibe, setVibe] = useState('romantic');
  const [plan, setPlan] = useState<DatePlan[]>(DEMO_PLAN);
  const [generating, setGenerating] = useState(false);

  /* verify state */
  const [verifyQuery, setVerifyQuery] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<MemberResult | null>(null);

  /* split state */
  const [splitMode, setSplitMode] = useState<SplitMode>('all');
  const [splitParty, setSplitParty] = useState(2);
  const [mySharePct, setMySharePct] = useState(70);

  /* resolve gender from localStorage — SSR safe */
  useEffect(() => {
    const stored = localStorage.getItem('finesse_gender');
    setGender(stored === 'feminine' ? 'feminine' : 'masculine');
  }, []);

  /* load Eventbrite checkout widget script once */
  useEffect(() => {
    if (document.getElementById('eb-widget-script')) return;
    const s = document.createElement('script');
    s.id = 'eb-widget-script';
    s.src = 'https://www.eventbrite.com/static/widgets/eb_widgets.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  /* Bernard AI itinerary generation */
  const generateItinerary = useCallback(async () => {
    setGenerating(true);
    try {
      const budgetLabel = budget >= 999999 ? 'unlimited budget' : `$${(budget / 100).toLocaleString()} budget`;
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: `Generate a ${vibe} date night itinerary with a ${budgetLabel}. Return ONLY a raw JSON array — no markdown, no explanation. Format: [{"id":"1","time":"7:00 PM","activity":"Black car pickup","venue":"Your location","cost_cents":4500,"category":"transport","booked":false}]. Categories: transport, dining, drinks, entertainment, experience. Include 4-6 stops. Total cost must fit within the budget.`,
          system: 'You are Nova, the AI concierge at Finesse — a members-only lifestyle platform for people who live well. Return only raw JSON arrays, never markdown fences or explanations.',
        }),
      });
      const {text} = await res.json();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed: DatePlan[] = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlan(
            parsed.map((item, i) => ({
              id: String(i + 1),
              time: item.time ?? '',
              activity: item.activity ?? '',
              venue: item.venue ?? '',
              cost_cents: typeof item.cost_cents === 'number' ? item.cost_cents : 0,
              category: item.category ?? 'experience',
              booked: false,
            }))
          );
        }
      }
    } catch {
      /* keep demo plan on error */
    } finally {
      setGenerating(false);
    }
  }, [budget, vibe]);

  /* Member verify */
  const runVerify = useCallback(async () => {
    if (!verifyQuery.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/member?username=${encodeURIComponent(verifyQuery.trim())}`);
      const data: MemberResult = await res.json();
      setVerifyResult(data);
    } catch {
      setVerifyResult({found: false});
    } finally {
      setVerifying(false);
    }
  }, [verifyQuery]);

  /* Derived values */
  const totalPlanned = plan.reduce((s, p) => s + p.cost_cents, 0);
  const totalBooked = plan.filter((p) => p.booked).reduce((s, p) => s + p.cost_cents, 0);
  const remaining = budget - totalPlanned;
  const cashback = Math.round(totalPlanned * 0.15);
  const budgetPct = budget >= 999999 ? 0 : Math.min(100, Math.round((totalPlanned / budget) * 100));

  const splitTotal = totalBooked || totalPlanned;
  const myShareAmount =
    splitMode === 'all'
      ? splitTotal
      : splitMode === 'fair'
      ? Math.round(splitTotal / splitParty)
      : Math.round(splitTotal * (mySharePct / 100));

  const toggleBooked = (id: string) => {
    setPlan((prev) => prev.map((p) => (p.id === id ? {...p, booked: !p.booked} : p)));
  };

  /* Eventbrite branded checkout modal */
  const openEventbriteCheckout = useCallback((eventbriteId: string, stopId: string) => {
    const w = window as Window & {EBWidgets?: {createWidget: (opts: Record<string, unknown>) => void}};
    if (!w.EBWidgets) return;
    w.EBWidgets.createWidget({
      widgetType: 'checkout',
      eventId: eventbriteId,
      modal: true,
      modalTriggerElementId: `eb-trigger-${stopId}`,
      onOrderComplete: () => toggleBooked(stopId),
      themeSettings: {
        brandColor: '#69C9D0',
        fontColor: '#F4E8D0',
        background: '#0A0406',
      },
    });
  }, []);

  if (gender === null) return null;
  if (gender === 'feminine') return <GenderLock />;

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
          style={{background: `radial-gradient(ellipse at center, rgba(105,201,208,0.07) 0%, transparent 65%)`}}
        />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-4 relative z-10">
        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <span className="text-4xl mb-4 inline-block">🎩</span>
          <h1 className="font-display text-4xl tracking-[0.2em]" style={{color: TEAL}}>
            per diem
          </h1>
          <p className="font-label text-[10px] tracking-[0.5em] uppercase mt-2" style={{color: 'rgba(244,232,208,0.2)'}}>
            date curator · carpe diem
          </p>
        </motion.div>
      </header>

      {/* Budget bar */}
      <div className="max-w-3xl mx-auto px-4 mb-6 relative z-10">
        <div className="brass-border bg-ink/60 backdrop-blur-sm p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="font-label text-[9px] tracking-[0.3em] uppercase" style={{color: `rgba(105,201,208,0.4)`}}>
              tonight&apos;s budget
            </span>
            <span className="font-mono text-2xl" style={{color: TEAL, textShadow: `0 0 12px rgba(105,201,208,0.2)`}}>
              {formatPrice(budget)}
            </span>
          </div>

          <div className="flex gap-2 mb-4">
            {BUDGET_PRESETS.map((b) => (
              <button
                key={b.cents}
                onClick={() => setBudget(b.cents)}
                className="flex-1 py-1.5 text-[9px] font-label tracking-[0.12em] uppercase transition-all"
                style={{
                  background: budget === b.cents ? TEAL : 'transparent',
                  color: budget === b.cents ? '#0A0406' : 'rgba(244,232,208,0.25)',
                  border: budget === b.cents ? 'none' : '1px solid rgba(244,232,208,0.08)',
                }}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="relative h-2 bg-cream/5 mb-2">
            <motion.div
              className="h-full"
              style={{background: budgetPct > 90 ? '#FF4D7D' : budgetPct > 70 ? '#FFA96B' : TEAL}}
              animate={{width: `${budgetPct}%`}}
              transition={{duration: 0.5}}
            />
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[10px]" style={{color: 'rgba(244,232,208,0.3)'}}>
              {formatPrice(totalPlanned)} planned
            </span>
            <span className="font-mono text-[10px]" style={{color: remaining >= 0 ? 'rgba(0,255,136,0.6)' : 'rgba(255,77,125,0.6)'}}>
              {budget >= 999999 ? 'no limit' : remaining >= 0 ? formatPrice(remaining) + ' left' : 'over budget'}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-cream/5 flex justify-between">
            <span className="font-label text-[8px] tracking-[0.2em] uppercase" style={{color: 'rgba(244,232,208,0.15)'}}>
              15% cashback
            </span>
            <span className="font-mono text-sm" style={{color: 'rgba(0,255,136,0.6)'}}>
              +{formatPrice(cashback)}
            </span>
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
              className="px-3 py-1.5 text-[9px] font-label tracking-[0.12em] uppercase transition-all"
              style={{
                background: vibe === v ? TEAL : 'transparent',
                color: vibe === v ? '#0A0406' : 'rgba(244,232,208,0.25)',
                border: vibe === v ? 'none' : '1px solid rgba(244,232,208,0.08)',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4 mb-8 relative z-10">
        <div className="flex justify-center gap-2 flex-wrap">
          {(
            [
              {key: 'planner', label: 'planner'},
              {key: 'wishlist', label: 'her wishlist'},
              {key: 'verify', label: 'verify her'},
              {key: 'split', label: 'finesse split'},
            ] as const
          ).map(({key, label}) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-4 py-2 text-[10px] font-label tracking-[0.2em] uppercase transition-all"
              style={{
                background: tab === key ? TEAL : 'transparent',
                color: tab === key ? '#0A0406' : 'rgba(244,232,208,0.25)',
                border: tab === key ? 'none' : '1px solid rgba(244,232,208,0.08)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 relative z-10 pb-12">
        <AnimatePresence mode="wait">

          {/* ═══ DATE PLANNER ═══ */}
          {tab === 'planner' && (
            <motion.div key="planner" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              {/* Nova generate */}
              <div className="text-center mb-8">
                <button
                  onClick={generateItinerary}
                  disabled={generating}
                  className="px-8 py-3 font-label text-[10px] tracking-[0.3em] uppercase transition-all"
                  style={{
                    background: generating ? 'transparent' : TEAL,
                    color: generating ? TEAL : '#0A0406',
                    border: generating ? `1px solid rgba(105,201,208,0.4)` : 'none',
                    opacity: generating ? 0.7 : 1,
                  }}
                >
                  {generating ? 'nova is curating your night...' : 'generate with nova'}
                </button>
                {!generating && (
                  <p className="font-body text-[10px] italic mt-2" style={{color: 'rgba(244,232,208,0.2)'}}>
                    tailored to your vibe and budget
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
                <span className="font-label text-[9px] tracking-[0.4em] uppercase" style={{color: `rgba(105,201,208,0.4)`}}>
                  tonight&apos;s itinerary
                </span>
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
              </div>

              {/* Timeline */}
              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-px" style={{background: `rgba(105,201,208,0.15)`}} />
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
                        className="absolute -left-5 top-4 w-3 h-3 rounded-full border"
                        style={{
                          borderColor: item.booked ? 'rgba(0,255,136,0.5)' : `rgba(105,201,208,0.3)`,
                          background: item.booked ? 'rgba(0,255,136,0.2)' : '#0A0406',
                          boxShadow: item.booked ? '0 0 6px #00FF8840' : 'none',
                        }}
                      />
                      <div
                        id={item.eventbrite_id ? `eb-trigger-${item.id}` : undefined}
                        className="p-4 border transition-all cursor-pointer"
                        style={{
                          borderColor: item.booked ? 'rgba(0,255,136,0.15)' : 'rgba(244,232,208,0.06)',
                          background: item.booked ? 'rgba(10,4,6,0.5)' : 'rgba(10,4,6,0.3)',
                        }}
                        onClick={() =>
                          item.eventbrite_id
                            ? openEventbriteCheckout(item.eventbrite_id, item.id)
                            : toggleBooked(item.id)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm" style={{color: `rgba(105,201,208,0.7)`}}>
                                {item.time}
                              </span>
                              <span
                                className="font-label text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 border"
                                style={{color: 'rgba(244,232,208,0.2)', borderColor: 'rgba(244,232,208,0.06)'}}
                              >
                                {item.category}
                              </span>
                            </div>
                            <p className="font-display text-base tracking-wide mt-1" style={{color: 'rgba(244,232,208,0.85)'}}>
                              {item.activity}
                            </p>
                            <p className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.3)'}}>
                              {item.venue}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-base" style={{color: TEAL}}>
                              {formatPrice(item.cost_cents)}
                            </p>
                            <span
                              className="font-label text-[7px] tracking-[0.15em] uppercase"
                              style={{color: item.booked ? 'rgba(0,255,136,0.6)' : 'rgba(244,232,208,0.15)'}}
                            >
                              {item.booked ? 'confirmed' : item.eventbrite_id ? 'get tickets' : 'tap to confirm'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div
                className="mt-6 flex justify-between items-center px-4 py-3 border"
                style={{borderColor: `rgba(105,201,208,0.2)`, background: 'rgba(10,4,6,0.5)'}}
              >
                <span className="font-label text-[9px] tracking-[0.3em] uppercase" style={{color: 'rgba(244,232,208,0.3)'}}>
                  tonight&apos;s total
                </span>
                <span className="font-mono text-xl" style={{color: TEAL, textShadow: `0 0 10px rgba(105,201,208,0.2)`}}>
                  {formatPrice(totalPlanned)}
                </span>
              </div>
            </motion.div>
          )}

          {/* ═══ HER WISHLIST ═══ */}
          {tab === 'wishlist' && (
            <motion.div key="wishlist" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
                <span className="font-label text-[9px] tracking-[0.4em] uppercase" style={{color: `rgba(105,201,208,0.4)`}}>
                  smart picks from her list
                </span>
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
              </div>
              <p className="text-center font-body text-xs italic mb-6" style={{color: 'rgba(244,232,208,0.25)'}}>
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
                      className="border overflow-hidden"
                      style={{borderColor: 'rgba(244,232,208,0.06)', background: 'rgba(10,4,6,0.4)'}}
                    >
                      <div className="p-5">
                        <div className="flex gap-4">
                          <div
                            className="w-20 h-20 shrink-0 overflow-hidden"
                            style={{border: `1px solid rgba(105,201,208,0.15)`}}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex-1">
                            <p className="font-label text-[7px] tracking-[0.2em] uppercase mb-1" style={{color: 'rgba(244,232,208,0.15)'}}>
                              she wants
                            </p>
                            <p className="font-body text-sm italic line-through" style={{color: 'rgba(244,232,208,0.4)'}}>
                              {item.original_name} — {item.original_brand} — {formatPrice(item.original_price)}
                            </p>
                            <p className="font-label text-[7px] tracking-[0.2em] uppercase mt-3 mb-1" style={{color: `rgba(105,201,208,0.6)`}}>
                              we suggest
                            </p>
                            <p className="font-display text-base tracking-wide" style={{color: 'rgba(244,232,208,0.85)'}}>
                              {item.alt_name}
                            </p>
                            <p className="font-label text-[8px] tracking-[0.15em] uppercase" style={{color: 'rgba(244,232,208,0.3)'}}>
                              {item.alt_brand}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="font-mono text-lg" style={{color: TEAL}}>
                                {formatPrice(item.alt_price)}
                              </span>
                              <span
                                className="font-label text-[8px] tracking-[0.12em] uppercase px-2 py-0.5 border"
                                style={{color: 'rgba(0,255,136,0.8)', borderColor: 'rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.08)'}}
                              >
                                save {savings}%
                              </span>
                            </div>
                            <p className="font-body text-[10px] italic mt-2" style={{color: 'rgba(244,232,208,0.25)'}}>
                              {item.match_reason}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            className="flex-1 py-2 font-label text-[9px] tracking-[0.2em] uppercase transition-colors"
                            style={{background: TEAL, color: '#0A0406'}}
                          >
                            add to bag
                          </button>
                          <button
                            className="px-4 py-2 font-label text-[9px] tracking-[0.2em] uppercase transition-colors"
                            style={{color: 'rgba(244,232,208,0.3)', border: '1px solid rgba(244,232,208,0.08)'}}
                          >
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

          {/* ═══ VERIFY HER ═══ */}
          {tab === 'verify' && (
            <motion.div key="verify" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
                <span className="font-label text-[9px] tracking-[0.4em] uppercase" style={{color: `rgba(105,201,208,0.4)`}}>
                  member verification
                </span>
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
              </div>
              <p
                className="text-center font-body text-xs italic mb-8"
                style={{color: 'rgba(244,232,208,0.25)', maxWidth: '300px', margin: '0 auto 2rem'}}
              >
                Confirm she&apos;s a real Finesse member before you invest the night.
              </p>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={verifyQuery}
                  onChange={(e) => {
                    setVerifyQuery(e.target.value);
                    setVerifyResult(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && runVerify()}
                  placeholder="her username or display name"
                  className="flex-1 px-4 py-3 bg-ink/60 font-body text-sm outline-none"
                  style={{border: `1px solid rgba(105,201,208,0.25)`, color: 'rgba(244,232,208,0.8)'}}
                />
                <button
                  onClick={runVerify}
                  disabled={verifying || !verifyQuery.trim()}
                  className="px-6 font-label text-[9px] tracking-[0.2em] uppercase transition-all"
                  style={{
                    background: verifying ? 'transparent' : TEAL,
                    color: verifying ? TEAL : '#0A0406',
                    border: verifying ? `1px solid rgba(105,201,208,0.4)` : 'none',
                    opacity: !verifyQuery.trim() ? 0.4 : 1,
                  }}
                >
                  {verifying ? '...' : 'check'}
                </button>
              </div>

              <AnimatePresence>
                {verifyResult && (
                  <motion.div
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0}}
                    className="p-6 border"
                    style={{
                      borderColor: verifyResult.found ? `rgba(105,201,208,0.3)` : 'rgba(255,77,125,0.3)',
                      background: verifyResult.found ? `rgba(105,201,208,0.05)` : 'rgba(255,77,125,0.05)',
                    }}
                  >
                    {verifyResult.found ? (
                      <>
                        <div className="flex items-center gap-4 mb-4">
                          <div
                            className="w-12 h-12 flex items-center justify-center font-display text-xl"
                            style={{background: `rgba(105,201,208,0.15)`, color: TEAL, border: `1px solid rgba(105,201,208,0.3)`}}
                          >
                            {verifyResult.display_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-display text-lg tracking-wide" style={{color: 'rgba(244,232,208,0.9)'}}>
                              {verifyResult.display_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="font-label text-[8px] tracking-[0.2em] uppercase px-2 py-0.5"
                                style={{background: `rgba(105,201,208,0.15)`, color: TEAL}}
                              >
                                verified member
                              </span>
                              {verifyResult.city && (
                                <span className="font-body text-[10px] italic" style={{color: 'rgba(244,232,208,0.3)'}}>
                                  {verifyResult.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {verifyResult.vibe && (
                          <div className="flex items-center gap-2">
                            <span className="font-label text-[8px] tracking-[0.15em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>
                              vibe
                            </span>
                            <span className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.5)'}}>
                              {verifyResult.vibe}
                            </span>
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t" style={{borderColor: `rgba(105,201,208,0.15)`}}>
                          <p className="font-label text-[8px] tracking-[0.2em] uppercase" style={{color: `rgba(105,201,208,0.7)`}}>
                            she checks out. proceed with the evening.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-3xl mb-3">⚠️</div>
                        <p className="font-display text-base tracking-wide mb-2" style={{color: 'rgba(255,77,125,0.8)'}}>
                          member not found
                        </p>
                        <p className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.3)'}}>
                          No Finesse member matches that name. Proceed with caution.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {!verifyResult && (
                <div className="text-center mt-10 space-y-2">
                  <p className="font-label text-[8px] tracking-[0.3em] uppercase mb-4" style={{color: 'rgba(244,232,208,0.12)'}}>
                    what we check
                  </p>
                  {['active membership status', 'verified profile photo', 'account age & activity', 'platform reputation score'].map((c) => (
                    <p key={c} className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.2)'}}>
                      — {c}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ FINESSE SPLIT ═══ */}
          {tab === 'split' && (
            <motion.div key="split" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
                <span className="font-label text-[9px] tracking-[0.4em] uppercase" style={{color: `rgba(105,201,208,0.4)`}}>
                  finesse split
                </span>
                <div className="h-px flex-1" style={{background: `rgba(105,201,208,0.2)`}} />
              </div>

              <div className="text-center mb-6">
                <div className="inline-block px-10 py-6" style={{border: `1px solid rgba(105,201,208,0.2)`, background: 'rgba(10,4,6,0.6)'}}>
                  <p className="font-label text-[9px] tracking-[0.4em] uppercase mb-2" style={{color: `rgba(105,201,208,0.4)`}}>
                    total tonight
                  </p>
                  <p className="font-display text-5xl" style={{color: TEAL, textShadow: `0 0 25px rgba(105,201,208,0.2)`}}>
                    {formatPrice(splitTotal)}
                  </p>
                </div>
              </div>

              {/* Mode selector */}
              <div className="flex gap-2 mb-6">
                {(
                  [
                    {key: 'all', label: "I've got it"},
                    {key: 'fair', label: 'fair split'},
                    {key: 'cover', label: 'my share'},
                  ] as const
                ).map(({key, label}) => (
                  <button
                    key={key}
                    onClick={() => setSplitMode(key)}
                    className="flex-1 py-2.5 font-label text-[9px] tracking-[0.15em] uppercase transition-all"
                    style={{
                      background: splitMode === key ? TEAL : 'transparent',
                      color: splitMode === key ? '#0A0406' : 'rgba(244,232,208,0.25)',
                      border: splitMode === key ? 'none' : '1px solid rgba(244,232,208,0.08)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {splitMode === 'fair' && (
                  <motion.div
                    initial={{opacity: 0, height: 0}}
                    animate={{opacity: 1, height: 'auto'}}
                    exit={{opacity: 0, height: 0}}
                    className="overflow-hidden mb-6"
                  >
                    <div className="p-4" style={{border: '1px solid rgba(244,232,208,0.06)', background: 'rgba(10,4,6,0.4)'}}>
                      <p className="font-label text-[8px] tracking-[0.3em] uppercase mb-3" style={{color: 'rgba(244,232,208,0.2)'}}>
                        party size
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSplitParty(Math.max(2, splitParty - 1))}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{border: `1px solid rgba(105,201,208,0.3)`, color: TEAL}}
                        >
                          −
                        </button>
                        <span className="font-mono text-2xl flex-1 text-center" style={{color: 'rgba(244,232,208,0.8)'}}>
                          {splitParty}
                        </span>
                        <button
                          onClick={() => setSplitParty(Math.min(10, splitParty + 1))}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{border: `1px solid rgba(105,201,208,0.3)`, color: TEAL}}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {splitMode === 'cover' && (
                  <motion.div
                    initial={{opacity: 0, height: 0}}
                    animate={{opacity: 1, height: 'auto'}}
                    exit={{opacity: 0, height: 0}}
                    className="overflow-hidden mb-6"
                  >
                    <div className="p-4" style={{border: '1px solid rgba(244,232,208,0.06)', background: 'rgba(10,4,6,0.4)'}}>
                      <p className="font-label text-[8px] tracking-[0.3em] uppercase mb-3" style={{color: 'rgba(244,232,208,0.2)'}}>
                        my share
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setMySharePct(Math.max(10, mySharePct - 10))}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{border: `1px solid rgba(105,201,208,0.3)`, color: TEAL}}
                        >
                          −
                        </button>
                        <span className="font-mono text-2xl flex-1 text-center" style={{color: 'rgba(244,232,208,0.8)'}}>
                          {mySharePct}%
                        </span>
                        <button
                          onClick={() => setMySharePct(Math.min(100, mySharePct + 10))}
                          className="w-8 h-8 flex items-center justify-center"
                          style={{border: `1px solid rgba(105,201,208,0.3)`, color: TEAL}}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result rows */}
              <div className="space-y-2">
                <div
                  className="flex justify-between px-4 py-3"
                  style={{border: '1px solid rgba(244,232,208,0.04)', background: 'rgba(10,4,6,0.4)'}}
                >
                  <span className="font-label text-[9px] tracking-[0.25em] uppercase" style={{color: 'rgba(244,232,208,0.3)'}}>
                    you pay
                  </span>
                  <span className="font-mono text-lg" style={{color: TEAL}}>
                    {formatPrice(myShareAmount)}
                  </span>
                </div>

                {splitMode !== 'all' && (
                  <div
                    className="flex justify-between px-4 py-3"
                    style={{border: '1px solid rgba(244,232,208,0.04)', background: 'rgba(10,4,6,0.3)'}}
                  >
                    <span className="font-label text-[9px] tracking-[0.25em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>
                      she covers
                    </span>
                    <span className="font-mono text-base" style={{color: 'rgba(244,232,208,0.4)'}}>
                      {formatPrice(splitTotal - myShareAmount)}
                    </span>
                  </div>
                )}

                <div
                  className="flex justify-between px-4 py-3"
                  style={{border: '1px solid rgba(0,255,136,0.08)', background: 'rgba(0,255,136,0.04)'}}
                >
                  <span className="font-label text-[9px] tracking-[0.25em] uppercase" style={{color: 'rgba(0,255,136,0.4)'}}>
                    your cashback
                  </span>
                  <span className="font-mono text-base" style={{color: 'rgba(0,255,136,0.7)'}}>
                    +{formatPrice(Math.round(myShareAmount * 0.15))}
                  </span>
                </div>
              </div>

              <p className="text-center font-body text-[10px] italic mt-6" style={{color: 'rgba(244,232,208,0.15)'}}>
                15% cashback posts to your Vault on all confirmed spends
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div className="text-center pb-8 relative z-10">
        <Link href="/lobby" className="font-body text-sm transition-colors" style={{color: 'rgba(244,232,208,0.2)'}}>
          return to the lobby
        </Link>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
    </motion.div>
  );
}
