'use client';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";


interface Listing {
  id: string;
  title: string;
  seller: string;
  seller_initials: string;
  price_cents: number;
  original_price_cents: number;
  condition: "new" | "like-new" | "good" | "fair";
  category: string;
  image: string;
  posted: string;
  saved: boolean;
}


const CATEGORIES = ["all", "fragrance", "watches", "sneakers", "bags", "tech", "skincare", "clothing", "jewelry", "art"] as const;

const CONDITION_COLORS: Record<string, string> = {
  "new": "#00FF88",
  "like-new": "#69C9D0",
  "good": "#C9A961",
  "fair": "#FFA96B",
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

export default function Market() {
  // Live listings from the Exchange (no demo rows).
  const [listings, setListings] = useState<Listing[]>([]);
  useEffect(() => {
    let live = true;
    fetch('/api/exchange/listings?page=1')
      .then((r) => (r.ok ? r.json() : {listings: []}))
      .then((j: {listings?: Record<string, unknown>[]}) => {
        if (!live) return;
        setListings((j.listings ?? []).map((l) => ({
          id: String(l.id), title: String(l.title ?? ''), seller: String(l.seller_name ?? 'Member'),
          seller_initials: String(l.seller_name ?? 'M').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
          price_cents: Number(l.price_cents ?? l.ask_cents ?? 0), original_price_cents: Number(l.original_price_cents ?? l.retail_cents ?? l.price_cents ?? 0),
          condition: (l.condition as Listing['condition']) ?? 'good', category: String(l.category ?? 'other'),
          image: String((l.photo_urls as string[] | undefined)?.[0] ?? l.image_url ?? ''), posted: String(l.created_at ?? ''), saved: false,
        })));
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  const [category, setCategory] = useState<string>("all");
  const [tab, setTab] = useState<"browse" | "sell" | "saved">("browse");
  const [sellTitle, setSellTitle] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellPosted, setSellPosted] = useState(false);

  const filtered = category === "all" ? listings : listings.filter((l) => l.category === category);
  const savedItems = listings.filter((l) => l.saved);

  const toggleSave = (id: string) => {
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, saved: !l.saved } : l));
  };

  const postListing = async () => {
    if (!sellTitle.trim() || !sellPrice.trim()) return;
    const cents = Math.round(Number(sellPrice.replace(/[^0-9.]/g, '')) * 100);
    const r = await fetch('/api/exchange/list', {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({title: sellTitle.trim(), asking_price_cents: cents, category: category === 'all' ? undefined : category})}).catch(() => null);
    if (!r?.ok) return;
    setSellPosted(true);
    setTimeout(() => { setSellPosted(false); setSellTitle(""); setSellPrice(""); setTab("browse"); }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
      className="min-h-screen relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
          style={{ background: "radial-gradient(ellipse at center, rgba(201,169,97,0.06) 0%, transparent 65%)" }}
        />
      </div>

      <header className="text-center pt-12 pb-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="text-4xl mb-4 inline-block">&#x1F3AA;</span>
          <h1 className="font-display text-4xl text-brass tracking-[0.2em]">the market</h1>
          <p className="font-label text-[10px] tracking-[0.5em] text-cream/20 uppercase mt-2">buy &middot; sell &middot; trade</p>
        </motion.div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mb-6 relative z-10">
        <div className="flex justify-center gap-10 border-b border-brass/10 pb-5">
          <div className="text-center">
            <p className="font-mono text-xl text-brass">{listings.length}</p>
            <p className="font-label text-[8px] tracking-[0.3em] text-cream/20 uppercase mt-1">listings</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-xl text-cream/40">{savedItems.length}</p>
            <p className="font-label text-[8px] tracking-[0.3em] text-cream/20 uppercase mt-1">saved</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-xl text-green-500/60">15%</p>
            <p className="font-label text-[8px] tracking-[0.3em] text-cream/20 uppercase mt-1">cashback</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mb-6 relative z-10">
        <div className="flex justify-center gap-3">
          {(["browse", "sell", "saved"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 text-[10px] font-label tracking-[0.2em] uppercase transition-all ${
                tab === t ? "text-ink bg-brass" : "text-cream/25 border border-cream/8 hover:border-brass/30"
              }`}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 relative z-10 pb-12">
        <AnimatePresence mode="wait">
          {tab === "browse" && (
            <motion.div key="browse" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex flex-wrap gap-1.5 justify-center mb-8">
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 text-[8px] font-label tracking-[0.12em] uppercase transition-all ${
                      category === cat ? "text-ink bg-brass" : "text-cream/20 border border-cream/6 hover:border-brass/20"
                    }`}
                  >{cat}</button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((item, i) => {
                  const discount = Math.round(((item.original_price_cents - item.price_cents) / item.original_price_cents) * 100);
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="border border-cream/6 bg-ink/40 overflow-hidden group hover:border-cream/15 transition-all"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                        <button onClick={() => toggleSave(item.id)}
                          className={`absolute top-2 right-2 text-lg transition-all ${item.saved ? "text-brass" : "text-cream/15 hover:text-cream/40"}`}
                        >{item.saved ? "★" : "☆"}</button>
                        <span className="absolute bottom-2 left-2 font-label text-[7px] tracking-[0.12em] uppercase px-1.5 py-0.5 border"
                          style={{ color: CONDITION_COLORS[item.condition], borderColor: `${CONDITION_COLORS[item.condition]}30`, background: "rgba(10,4,6,0.8)" }}
                        >{item.condition}</span>
                      </div>

                      <div className="p-3">
                        <p className="font-display text-sm text-cream/80 tracking-wide leading-tight truncate">{item.title}</p>
                        <p className="font-label text-[7px] tracking-[0.12em] text-cream/20 uppercase mt-1">{item.seller} &middot; {item.posted}</p>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="font-mono text-base text-brass">{formatPrice(item.price_cents)}</span>
                          <span className="font-mono text-[10px] text-cream/20 line-through">{formatPrice(item.original_price_cents)}</span>
                          <span className="font-label text-[7px] text-green-400 uppercase">-{discount}%</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === "sell" && (
            <motion.div key="sell" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="max-w-lg mx-auto">
                <div className="border border-brass/15 bg-ink/60 backdrop-blur-sm p-8">
                  <h3 className="font-display text-2xl text-brass tracking-wide mb-2">List an Item</h3>
                  <p className="font-body text-sm text-cream/25 italic mb-6">Sell to other Finesse members. 0% seller fees during beta.</p>

                  <div className="space-y-4">
                    <div>
                      <label className="font-label text-[9px] tracking-[0.3em] text-cream/25 uppercase block mb-2">what are you selling?</label>
                      <input type="text" value={sellTitle} onChange={(e) => setSellTitle(e.target.value)} placeholder="Tom Ford Oud Wood 50ml"
                        className="w-full px-4 py-3 bg-ink border border-cream/10 text-cream font-body text-sm placeholder:text-cream/12 focus:border-brass focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-label text-[9px] tracking-[0.3em] text-cream/25 uppercase block mb-2">your price</label>
                      <input type="text" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="$160"
                        className="w-full px-4 py-3 bg-ink border border-cream/10 text-cream font-body text-sm placeholder:text-cream/12 focus:border-brass focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-label text-[9px] tracking-[0.3em] text-cream/25 uppercase block mb-2">condition</label>
                      <div className="flex gap-2">
                        {["new", "like-new", "good", "fair"].map((c) => (
                          <button key={c} className="flex-1 py-2 text-[9px] font-label tracking-[0.12em] uppercase text-cream/30 border border-cream/8 hover:border-brass/30 transition-all">{c}</button>
                        ))}
                      </div>
                    </div>
                    <button onClick={postListing} disabled={!sellTitle.trim() || !sellPrice.trim()}
                      className="w-full py-3 mt-2 font-label text-[10px] tracking-[0.3em] uppercase text-ink bg-brass hover:bg-brass-highlight transition-colors disabled:opacity-20"
                    >{sellPosted ? "listed ✓" : "list item"}</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "saved" && (
            <motion.div key="saved" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {savedItems.length === 0 ? (
                <p className="text-center font-body text-sm text-cream/15 italic py-12">no saved items yet. browse and tap the star.</p>
              ) : (
                <div className="space-y-3">
                  {savedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-cream/6 bg-ink/40">
                      <div className="w-16 h-16 shrink-0 overflow-hidden border border-brass/10">
                        <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-base text-cream/80 tracking-wide truncate">{item.title}</p>
                        <p className="font-label text-[8px] tracking-[0.15em] text-cream/20 uppercase">{item.seller}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-base text-brass">{formatPrice(item.price_cents)}</p>
                        <button onClick={() => toggleSave(item.id)} className="font-label text-[7px] text-cream/20 hover:text-neon-pink transition-colors uppercase">remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center pb-8 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">return to the lobby</Link>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
    </motion.div>
  );
}
