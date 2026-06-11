'use client';

import {useEffect, useState, useRef} from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';

type Message = {id: string; role: 'concierge' | 'guest'; text: string};

/* ─── Finesse Lobby scene — couture house, golden hour ─── */
function FinesseScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0"
        style={{backgroundImage: 'url(/scenes/lobby-finesse.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top'}} />
      <div className="absolute inset-0" style={{background: 'rgba(10,4,6,0.82)'}} />
      <div className="absolute inset-0" style={{background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(255,184,200,0.06) 0%, rgba(26,10,15,0.0) 60%)'}} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[380px] h-[440px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,184,200,0.12) 0%, rgba(232,200,122,0.05) 40%, transparent 70%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite'}} />
      <div className="absolute top-0 left-[12%] w-[180px] h-[280px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,184,200,0.06) 0%, transparent 60%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite', animationDelay: '1.3s'}} />
      <div className="absolute top-0 right-[12%] w-[180px] h-[280px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,184,200,0.06) 0%, transparent 60%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite', animationDelay: '2.6s'}} />
      <div className="absolute bottom-0 left-0 right-0 h-[45%]"
        style={{background: 'linear-gradient(to top, rgba(216,168,160,0.08) 0%, rgba(74,25,34,0.04) 40%, transparent 70%)'}} />
      <div className="absolute left-[4%] top-0 bottom-0 w-[10px]"
        style={{background: 'linear-gradient(to right, #1A0A0F, #2A1520, #1A0A0F)'}}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px]"
          style={{background: 'linear-gradient(to bottom, rgba(255,184,200,0.25), rgba(201,169,97,0.15), rgba(255,184,200,0.1))'}} />
      </div>
      <div className="absolute right-[4%] top-0 bottom-0 w-[10px]"
        style={{background: 'linear-gradient(to right, #1A0A0F, #2A1520, #1A0A0F)'}}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px]"
          style={{background: 'linear-gradient(to bottom, rgba(255,184,200,0.25), rgba(201,169,97,0.15), rgba(255,184,200,0.1))'}} />
      </div>
    </div>
  );
}

/* ─── Carpe Diem scene — old money club, firelight ─── */
function CarpeDiemScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0"
        style={{backgroundImage: 'url(/scenes/lobby-carpe.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top'}} />
      <div className="absolute inset-0" style={{background: 'rgba(10,4,6,0.85)'}} />
      <div className="absolute inset-0" style={{background: 'radial-gradient(ellipse 100% 70% at 50% 0%, rgba(255,169,107,0.07) 0%, transparent 60%)'}} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] h-[380px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,169,107,0.1) 0%, rgba(201,169,97,0.04) 50%, transparent 70%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite'}} />
      <div className="absolute top-0 left-[10%] w-[160px] h-[260px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,169,107,0.09) 0%, transparent 60%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite', animationDelay: '1.5s'}} />
      <div className="absolute top-0 right-[10%] w-[160px] h-[260px]"
        style={{background: 'radial-gradient(ellipse at top, rgba(255,169,107,0.09) 0%, transparent 60%)',
          animation: 'chandelier-pulse 4s ease-in-out infinite', animationDelay: '3s'}} />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[120px] h-[200px]"
        style={{background: 'radial-gradient(ellipse at bottom, rgba(255,100,30,0.06) 0%, transparent 70%)',
          animation: 'chandelier-pulse 2s ease-in-out infinite'}} />
      <div className="absolute bottom-0 left-0 right-0 h-[50%]"
        style={{background: 'linear-gradient(to top, rgba(58,36,24,0.15) 0%, rgba(74,25,34,0.06) 40%, transparent 70%)'}} />
      <div className="absolute left-[4%] top-0 bottom-0 w-[12px]"
        style={{background: 'linear-gradient(to right, #1A0A06, #3A2418, #1A0A06)'}}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px]"
          style={{background: 'linear-gradient(to bottom, rgba(201,169,97,0.3), rgba(201,169,97,0.1), rgba(201,169,97,0.2))'}} />
      </div>
      <div className="absolute right-[4%] top-0 bottom-0 w-[12px]"
        style={{background: 'linear-gradient(to right, #1A0A06, #3A2418, #1A0A06)'}}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px]"
          style={{background: 'linear-gradient(to bottom, rgba(201,169,97,0.3), rgba(201,169,97,0.1), rgba(201,169,97,0.2))'}} />
      </div>
    </div>
  );
}

/* ─── Time-aware greeting ─── */
function greeting(hour: number, masc: boolean): string {
  if (hour < 12) return masc ? 'Good morning, sir.' : 'Good morning.';
  if (hour < 17) return masc ? 'Good afternoon.' : 'Good afternoon.';
  if (hour < 21) return masc ? 'Good evening, sir.' : 'Good evening.';
  return masc ? 'Late night, sir.' : 'The night is yours.';
}

/* ─── Feature tile ─── */
function FeatureTile({href, label, sub, accent, delay}: {href: string; label: string; sub: string; accent: string; delay: number}) {
  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      transition={{delay}}
    >
      <Link href={href}
        className="block border p-4 transition-all duration-500 group relative overflow-hidden"
        style={{borderColor: 'rgba(201,169,97,0.08)', background: 'rgba(10,4,6,0.55)'}}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{background: `radial-gradient(ellipse at center, ${accent}08 0%, transparent 70%)`}} />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="font-display italic text-base tracking-[0.08em] mb-0.5"
              style={{color: 'rgba(201,169,97,0.75)'}}>
              {label}
            </p>
            <p className="font-body text-[11px] italic"
              style={{color: 'rgba(244,224,160,0.32)'}}>
              {sub}
            </p>
          </div>
          <span className="font-label text-[8px] tracking-[0.25em] uppercase opacity-0 group-hover:opacity-100 transition-opacity"
            style={{color: accent}}>
            enter →
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{background: `linear-gradient(to right, transparent, ${accent}20, transparent)`}} />
      </Link>
    </motion.div>
  );
}

/* ─── Main Lobby ─── */
export default function LobbyPage() {
  const [edition, setEdition] = useState<'finesse' | 'carpe_diem'>('finesse');
  const [hour, setHour] = useState(12);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [memberCount] = useState(() => 47 + Math.floor(Math.random() * 30));
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    const ed = g === 'masculine' ? 'carpe_diem' : 'finesse';
    setEdition(ed);
    setHour(new Date().getHours());

    const isMasc = ed === 'carpe_diem';
    setMessages([{
      id: 'welcome',
      role: 'concierge',
      text: isMasc
        ? 'The card room opens at nine. Shall I hold a seat?'
        : 'Your usual table is available. What can I arrange?',
    }]);
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
    try {
      const system = edition === 'carpe_diem'
        ? 'You are Nova, the concierge at Carpe Diem, an old-money men\'s club. Speak with understated authority. Short, direct. One or two sentences max.'
        : 'You are Nova, the concierge at Finesse, a luxury lifestyle hotel. Warm and elegant. Short, graceful responses. One or two sentences max.';
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt: text, system}),
      });
      const data = await res.json() as {text?: string};
      setMessages(prev => [...prev, {id: crypto.randomUUID(), role: 'concierge', text: data.text ?? 'Leave it with me.'}]);
    } catch {
      const fallbacks = edition === 'carpe_diem'
        ? ['Consider it handled.', 'I\'ll make the call.', 'Noted.']
        : ['On it. I\'ll confirm shortly.', 'Leave it with me.', 'Noted — give me a moment.'];
      setMessages(prev => [...prev, {id: crypto.randomUUID(), role: 'concierge', text: fallbacks[Math.floor(Math.random() * fallbacks.length)]}]);
    }
    setSending(false);
  };

  const isMasc = edition === 'carpe_diem';
  const accentColor = isMasc ? '#FFA96B' : '#FFB8C8';

  const featureTiles = isMasc
    ? [
        {href: '/lounge',   label: 'The Lounge',    sub: 'whiskey & conversation',   accent: '#FFA96B'},
        {href: '/perdiem',  label: 'Per Diem',       sub: 'tonight\'s itinerary',     accent: '#E8C87A'},
        {href: '/scale',    label: 'Scale',          sub: 'big moves · members only', accent: '#00FF88'},
        {href: '/clubhouse',label: 'The Card Room',  sub: 'high stakes',              accent: '#C9A961'},
      ]
    : [
        {href: '/lounge',   label: 'The Lounge',    sub: 'cocktails & conversation', accent: '#FFB8C8'},
        {href: '/salon',    label: 'The Salon',     sub: 'beauty & appointments',    accent: '#E8C87A'},
        {href: '/scale',    label: 'Scale',         sub: 'big moves · members only', accent: '#00FF88'},
        {href: '/vip',      label: 'VIP',           sub: 'members only',             accent: '#FF4D7D'},
      ];

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.9}}
      className="min-h-screen relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
      {isMasc ? <CarpeDiemScene /> : <FinesseScene />}

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-6 pb-10">

        {/* ── Arrival greeting ── */}
        <motion.div
          initial={{opacity: 0, y: -12}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.3}}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-px" style={{background: `rgba(201,169,97,0.2)`}} />
            <span className="font-label text-[7px] tracking-[0.5em] uppercase"
              style={{color: 'rgba(201,169,97,0.2)'}}>
              {new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})}
            </span>
            <div className="w-6 h-px" style={{background: `rgba(201,169,97,0.2)`}} />
          </div>

          <h2 className="font-display italic text-2xl tracking-[0.12em]"
            style={{color: '#E8C87A', textShadow: `0 0 30px rgba(232,200,122,0.15), 0 0 60px ${accentColor}08`}}>
            {greeting(hour, isMasc)}
          </h2>

          <div className="flex items-center gap-3 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
              style={{boxShadow: '0 0 6px rgba(0,255,136,0.7)'}} />
            <span className="font-body text-[11px] italic"
              style={{color: 'rgba(244,224,160,0.28)'}}>
              {memberCount} members in the building
            </span>
          </div>
        </motion.div>

        {/* ── Divider ── */}
        <motion.div
          initial={{scaleX: 0}} animate={{scaleX: 1}} transition={{delay: 0.5, duration: 0.6}}
          className="flex items-center gap-2 mb-6"
          style={{transformOrigin: 'left'}}
        >
          <div className="flex-1 h-px" style={{background: 'linear-gradient(to right, rgba(201,169,97,0.15), transparent)'}} />
          <div className="w-1 h-1 rotate-45 border" style={{borderColor: 'rgba(201,169,97,0.25)'}} />
          <div className="flex-1 h-px" style={{background: 'linear-gradient(to left, rgba(201,169,97,0.15), transparent)'}} />
        </motion.div>

        {/* ── Tonight ── */}
        <motion.div
          initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.55}}
          className="mb-1"
        >
          <span className="font-label text-[7px] tracking-[0.5em] uppercase"
            style={{color: 'rgba(201,169,97,0.18)'}}>tonight</span>
        </motion.div>

        <div className="space-y-2 mb-6">
          {featureTiles.map((tile, i) => (
            <FeatureTile key={tile.href} {...tile} delay={0.6 + i * 0.07} />
          ))}
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 h-px" style={{background: 'linear-gradient(to right, rgba(201,169,97,0.08), transparent)'}} />
          <span className="font-label text-[6px] tracking-[0.4em] uppercase"
            style={{color: 'rgba(201,169,97,0.1)'}}>front desk</span>
          <div className="flex-1 h-px" style={{background: 'linear-gradient(to left, rgba(201,169,97,0.08), transparent)'}} />
        </div>

        {/* ── Nova front desk ── */}
        <motion.div
          initial={{opacity: 0, y: 12}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.9}}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
              style={{boxShadow: '0 0 5px rgba(0,255,136,0.6)'}} />
            <span className="font-label text-[8px] tracking-[0.28em] uppercase"
              style={{color: 'rgba(201,169,97,0.28)'}}>
              Nova · at the desk
            </span>
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
              <button
                onClick={send}
                disabled={sending || !input.trim()}
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
        <div className="flex items-center justify-center gap-2 mt-8">
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
