'use client';

import {useEffect, useState, useRef} from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';

/* ─── Edition-aware door configs ─── */
const FINESSE_LOBBY_DOORS = [
  {path: '/lounge',    label: 'The Lounge',     sub: 'cocktails & conversation',  glow: '#FFB8C8'},
  {path: '/salon',     label: 'The Salon',       sub: 'beauty & appointments',     glow: '#FFB8C8'},
  {path: '/scale',     label: 'The Scale',       sub: 'group buying',              glow: '#E8C87A'},
  {path: '/market',    label: 'The Market',      sub: 'buy & sell',                glow: '#E8C87A'},
];

const CARPE_DIEM_LOBBY_DOORS = [
  {path: '/lounge',    label: 'The Lounge',      sub: 'whiskey & conversation',   glow: '#FFA96B'},
  {path: '/clubhouse', label: 'The Card Room',   sub: 'coming soon · mmxxvii',    glow: '#C9A961', soon: true},
  {path: '/scale',     label: 'The Scale',       sub: 'group buying',             glow: '#E8C87A'},
  {path: '/market',    label: 'The Market',      sub: 'buy & sell',               glow: '#E8C87A'},
];

const FINESSE_MEZZANINE = [
  {path: '/wardrobe',   label: 'Wardrobe'},
  {path: '/vault',      label: 'Vault'},
  {path: '/bag',        label: 'The Bag'},
  {path: '/lab',        label: 'The Lab'},
  {path: '/archive',    label: 'Scrapbook'},
  {path: '/entourage',  label: 'Entourage'},
];

const CARPE_DIEM_MEZZANINE = [
  {path: '/wardrobe',   label: 'Wardrobe'},
  {path: '/vault',      label: 'Vault'},
  {path: '/perdiem',    label: 'Per Diem'},
  {path: '/bag',        label: 'The Bag'},
  {path: '/lab',        label: 'The Lab'},
  {path: '/archive',    label: 'Scrapbook'},
  {path: '/entourage',  label: 'Entourage'},
];

type Message = {id: string; role: 'concierge' | 'guest'; text: string};

/* ─── Finesse Lobby — couture house at golden hour ─── */
function FinesseScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Pale warm base */}
      <div className="absolute inset-0" style={{background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(255,184,200,0.06) 0%, rgba(26,10,15,0.0) 60%)'}} />
      {/* Three chandeliers — pink-gold glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[380px] h-[440px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,184,200,0.12) 0%, rgba(232,200,122,0.05) 40%, transparent 70%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite'}} />
      <div className="absolute top-0 left-[12%] w-[180px] h-[280px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,184,200,0.06) 0%, transparent 60%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite', animationDelay: '1.3s'}} />
      <div className="absolute top-0 right-[12%] w-[180px] h-[280px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,184,200,0.06) 0%, transparent 60%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite', animationDelay: '2.6s'}} />
      {/* Blush carpet glow at floor */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%]"
        style={{background: 'linear-gradient(to top, rgba(216,168,160,0.08) 0%, rgba(74,25,34,0.04) 40%, transparent 70%)'}} />
      {/* Brass columns */}
      <div className="absolute left-[4%] top-0 bottom-0 w-[10px]"
        style={{background: 'linear-gradient(to right, #1A0A0F, #2A1520, #1A0A0F)',
          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.6), inset -2px 0 4px rgba(0,0,0,0.6)'}}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px]"
          style={{background: 'linear-gradient(to bottom, rgba(255,184,200,0.25), rgba(201,169,97,0.15), rgba(255,184,200,0.1))'}} />
      </div>
      <div className="absolute right-[4%] top-0 bottom-0 w-[10px]"
        style={{background: 'linear-gradient(to right, #1A0A0F, #2A1520, #1A0A0F)',
          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.6), inset -2px 0 4px rgba(0,0,0,0.6)'}}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px]"
          style={{background: 'linear-gradient(to bottom, rgba(255,184,200,0.25), rgba(201,169,97,0.15), rgba(255,184,200,0.1))'}} />
      </div>
      {/* Carpet pattern */}
      <div className="absolute bottom-0 left-[6%] right-[6%] h-[180px] opacity-8">
        <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
          <defs>
            <pattern id="carpet-f" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#4A1922" />
              <polygon points="20,0 40,20 20,40 0,20" fill="none" stroke="#FFB8C8" strokeWidth="0.4" opacity="0.5"/>
              <polygon points="20,6 34,20 20,34 6,20" fill="none" stroke="#C9A961" strokeWidth="0.25" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="400" height="100" fill="url(#carpet-f)" />
        </svg>
      </div>
    </div>
  );
}

/* ─── Carpe Diem Lobby — old-money men's club ─── */
function CarpeDiemScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Warm amber base */}
      <div className="absolute inset-0" style={{background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(255,169,107,0.08) 0%, rgba(10,4,6,0.0) 60%)'}} />
      {/* Crystal chandelier — warmer gold */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[360px] h-[420px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,169,107,0.18) 0%, rgba(201,169,97,0.06) 45%, transparent 70%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite'}} />
      <div className="absolute top-0 left-[10%] w-[160px] h-[260px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,169,107,0.09) 0%, transparent 60%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite', animationDelay: '1.5s'}} />
      <div className="absolute top-0 right-[10%] w-[160px] h-[260px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,169,107,0.09) 0%, transparent 60%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite', animationDelay: '3s'}} />
      {/* Fireplace glow at back wall */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[120px] h-[200px]"
        style={{background: 'radial-gradient(ellipse at bottom, rgba(255,100,30,0.06) 0%, transparent 70%)',
          animation: 'chandelier-pulse 2s ease-in-out infinite'}} />
      {/* Deep oxblood carpet glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[50%]"
        style={{background: 'linear-gradient(to top, rgba(58,36,24,0.15) 0%, rgba(74,25,34,0.06) 40%, transparent 70%)'}} />
      {/* Mahogany columns */}
      <div className="absolute left-[4%] top-0 bottom-0 w-[12px]"
        style={{background: 'linear-gradient(to right, #1A0A06, #3A2418, #1A0A06)',
          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.7), inset -2px 0 4px rgba(0,0,0,0.7)'}}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px]"
          style={{background: 'linear-gradient(to bottom, rgba(201,169,97,0.3), rgba(201,169,97,0.1), rgba(201,169,97,0.2))'}} />
      </div>
      <div className="absolute right-[4%] top-0 bottom-0 w-[12px]"
        style={{background: 'linear-gradient(to right, #1A0A06, #3A2418, #1A0A06)',
          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.7), inset -2px 0 4px rgba(0,0,0,0.7)'}}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px]"
          style={{background: 'linear-gradient(to bottom, rgba(201,169,97,0.3), rgba(201,169,97,0.1), rgba(201,169,97,0.2))'}} />
      </div>
      {/* Persian rug pattern */}
      <div className="absolute bottom-0 left-[6%] right-[6%] h-[180px] opacity-10">
        <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
          <defs>
            <pattern id="carpet-cd" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#3A2418" />
              <polygon points="20,0 40,20 20,40 0,20" fill="none" stroke="#C9A961" strokeWidth="0.5" opacity="0.6"/>
              <polygon points="20,5 35,20 20,35 5,20" fill="none" stroke="#6B1E2E" strokeWidth="0.3" opacity="0.4"/>
              <rect x="17" y="17" width="6" height="6" fill="none" stroke="#C9A961" strokeWidth="0.3" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="400" height="100" fill="url(#carpet-cd)" />
        </svg>
      </div>
    </div>
  );
}

/* ─── Doorway card ─── */
function Door({path, label, sub, glow, soon}: {path: string; label: string; sub: string; glow: string; soon?: boolean}) {
  const inner = (
    <div className={`group relative border bg-ink/50 backdrop-blur-sm p-5 text-center transition-all duration-500 overflow-hidden ${
      soon ? 'border-cream/5 opacity-50 cursor-default' : 'border-brass/10 hover:border-brass/30 hover:bg-oxblood/10'
    }`}>
      {/* Deco arch top */}
      <div className="absolute top-0 left-0 right-0 h-[3px]">
        <div className="h-px bg-gradient-to-r from-transparent via-brass/20 to-transparent" />
        <div className="h-px mt-px bg-gradient-to-r from-transparent via-oxblood/30 to-transparent mx-6" />
      </div>
      {/* Hover glow */}
      {!soon && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{background: `radial-gradient(ellipse at center, ${glow}10 0%, transparent 70%)`}} />
      )}
      <h3 className="relative z-10 font-display text-lg tracking-[0.12em] mb-1 transition-colors"
        style={{color: soon ? '#C9A96140' : '#C9A961AA',
          textShadow: soon ? 'none' : `0 0 8px ${glow}20`}}>
        {label}
      </h3>
      <p className="relative z-10 font-body text-[10px] italic"
        style={{color: soon ? '#F4E0A020' : '#F4E0A040'}}>
        {sub}
      </p>
      {soon && (
        <p className="relative z-10 font-label text-[7px] tracking-[0.3em] uppercase mt-1"
          style={{color: '#C9A96130'}}>mmxxvii</p>
      )}
    </div>
  );

  if (soon) return inner;
  return <Link href={path}>{inner}</Link>;
}

/* ─── Main Lobby ─── */
export default function LobbyPage() {
  const [edition, setEdition] = useState<'finesse' | 'carpe_diem'>('finesse');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    const ed = g === 'masculine' ? 'carpe_diem' : 'finesse';
    setEdition(ed);

    const greeting = ed === 'carpe_diem'
      ? 'Evening, sir. What\'s the plan tonight?'
      : 'Welcome back. What can I arrange for you?';

    setMessages([{id: 'welcome', role: 'concierge', text: greeting}]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, {id: crypto.randomUUID(), role: 'guest', text}]);
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    const fallbacks = edition === 'carpe_diem'
      ? ['Consider it handled.', 'I\'ll make the call.', 'Noted. Give me a moment.']
      : ['On it. I\'ll confirm shortly.', 'Noted. Leave it with me.', 'I\'ll have that arranged.'];
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: 'concierge',
      text: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    }]);
    setSending(false);
  };

  const isMasc = edition === 'carpe_diem';
  const doors = isMasc ? CARPE_DIEM_LOBBY_DOORS : FINESSE_LOBBY_DOORS;
  const mezzanine = isMasc ? CARPE_DIEM_MEZZANINE : FINESSE_MEZZANINE;
  const accentGlow = isMasc ? 'rgba(255,169,107,0.15)' : 'rgba(255,184,200,0.12)';
  const tagline = isMasc ? 'The gentleman who arranges the evening' : 'The woman who deserves it';

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.9}}
      className="min-h-screen relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
      {/* Edition scene background */}
      {isMasc ? <CarpeDiemScene /> : <FinesseScene />}

      <div className="relative z-10 max-w-2xl mx-auto px-5">

        {/* Chandelier ornament */}
        <motion.div initial={{opacity: 0, y: -16}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}}
          className="flex flex-col items-center pt-5 mb-4">
          <div className="w-px h-5 bg-gradient-to-b from-brass/40 to-brass/15" />
          <div className="w-2.5 h-2.5 rotate-45 border mb-0.5"
            style={{borderColor: 'rgba(201,169,97,0.35)', boxShadow: `0 0 10px ${accentGlow}`}} />
          <div className="w-8 h-1.5 border-x border-b" style={{borderColor: 'rgba(201,169,97,0.2)', background: 'rgba(201,169,97,0.04)'}} />
          <div className="w-12 h-1.5 border-x border-b" style={{borderColor: 'rgba(201,169,97,0.12)', background: 'rgba(201,169,97,0.02)'}} />
        </motion.div>

        {/* Hotel nameplate */}
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.5}}
          className="text-center mb-7">
          <h1 className="font-display text-4xl italic tracking-[0.22em]"
            style={{color: '#E8C87A', textShadow: `0 0 30px rgba(232,200,122,0.2), 0 0 60px ${accentGlow}, 0 2px 4px rgba(0,0,0,0.9)`}}>
            {isMasc ? 'CARPE DIEM' : 'FINESSE'}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="w-8 h-px bg-brass/20" />
            <div className="w-1 h-1 rotate-45 border" style={{borderColor: 'rgba(201,169,97,0.3)'}} />
            <span className="font-label text-[7px] tracking-[0.5em] uppercase" style={{color: 'rgba(201,169,97,0.22)'}}>
              mmxxvi
            </span>
            <div className="w-1 h-1 rotate-45 border" style={{borderColor: 'rgba(201,169,97,0.3)'}} />
            <div className="w-8 h-px bg-brass/20" />
          </div>
          <p className="font-body text-xs italic mt-3" style={{color: 'rgba(244,224,160,0.18)'}}>
            {tagline}
          </p>
        </motion.div>

        {/* Lobby floor doorways */}
        <div className="grid grid-cols-2 gap-3 mb-7">
          {doors.map((door, i) => (
            <motion.div key={door.path}
              initial={{opacity: 0, y: 12}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: 0.65 + i * 0.08}}>
              <Door {...door} />
            </motion.div>
          ))}
        </div>

        {/* Mezzanine */}
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 1.0}} className="mb-6">
          <div className="flex items-center gap-3 mb-3 justify-center">
            <div className="w-10 h-px bg-brass/10" />
            <span className="font-label text-[7px] tracking-[0.4em] uppercase" style={{color: 'rgba(201,169,97,0.18)'}}>
              mezzanine
            </span>
            <div className="w-10 h-px bg-brass/10" />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {mezzanine.map(door => (
              <Link key={door.path} href={door.path}
                className="px-3 py-1.5 border transition-all duration-300"
                style={{borderColor: 'rgba(201,169,97,0.07)',
                  color: 'rgba(201,169,97,0.28)',
                  fontSize: '8px',
                  letterSpacing: '0.15em',
                  fontFamily: 'var(--font-label)',
                  textTransform: 'uppercase'}}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,169,97,0.28)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(201,169,97,0.65)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,169,97,0.07)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(201,169,97,0.28)';
                }}
              >
                {door.label}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Concierge front desk */}
        <motion.div initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{delay: 1.2}}>
          <div className="flex items-center gap-3 mb-2.5 justify-center">
            <div className="w-6 h-px bg-brass/12" />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
                style={{boxShadow: '0 0 5px rgba(0,255,136,0.6)'}} />
              <span className="font-label text-[8px] tracking-[0.28em] uppercase"
                style={{color: 'rgba(201,169,97,0.28)'}}>
                Nova · at the desk
              </span>
            </div>
            <div className="w-6 h-px bg-brass/12" />
          </div>

          <div className="border border-brass/10 bg-ink/55 backdrop-blur-sm"
            style={{boxShadow: '0 0 20px rgba(201,169,97,0.03), inset 0 0 15px rgba(0,0,0,0.4)'}}>
            <div className="max-h-[160px] overflow-y-auto p-4 space-y-2.5">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'guest' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] px-3.5 py-2 ${
                    msg.role === 'concierge'
                      ? 'bg-oxblood/10 border border-brass/8'
                      : 'bg-brass/6 border border-brass/12'
                  }`}>
                    {msg.role === 'concierge' && (
                      <p className="font-label text-[7px] tracking-[0.22em] mb-0.5 uppercase"
                        style={{color: 'rgba(201,169,97,0.32)'}}>Nova</p>
                    )}
                    <p className="font-body text-sm leading-relaxed"
                      style={{color: 'rgba(244,224,160,0.68)'}}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-oxblood/10 border border-brass/8 px-3.5 py-2">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-brass/25 animate-pulse"
                          style={{animationDelay: `${d}ms`}} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t flex items-center" style={{borderColor: 'rgba(201,169,97,0.07)'}}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask Nova anything..."
                className="flex-1 px-4 py-3 bg-transparent text-sm focus:outline-none font-body"
                style={{color: '#F4E0A0', caretColor: '#C9A961'}}
              />
              <button onClick={send} disabled={sending || !input.trim()}
                className="px-4 py-3 font-label text-[9px] tracking-[0.22em] uppercase transition-colors disabled:opacity-20"
                style={{color: 'rgba(201,169,97,0.45)'}}>
                send
              </button>
            </div>
          </div>

          <Link href="/concierge" className="block text-center mt-1.5">
            <span className="font-label text-[7px] tracking-[0.2em] uppercase transition-colors"
              style={{color: 'rgba(201,169,97,0.14)'}}>
              full concierge →
            </span>
          </Link>
        </motion.div>

        {/* Bottom ornament */}
        <div className="flex items-center justify-center gap-2 mt-7 mb-6">
          <div className="w-10 h-px bg-oxblood/12" />
          <div className="w-1 h-1 rotate-45 bg-brass/10" />
          <div className="w-1.5 h-1.5 rotate-45 border border-brass/10" />
          <div className="w-1 h-1 rotate-45 bg-brass/10" />
          <div className="w-10 h-px bg-oxblood/12" />
        </div>
      </div>

      <style jsx>{`
        @keyframes chandelier-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
