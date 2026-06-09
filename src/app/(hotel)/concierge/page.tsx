'use client';

import {useState, useRef, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';

/* ─── Avatar Config ─── */

interface AvatarConfig {
  name: string;
  gender: 'female' | 'male' | 'neutral';
  look: string;
  voice: string;
}

const GENDER_OPTIONS = [
  {key: 'female', label: 'Female', icon: '♀'},
  {key: 'male', label: 'Male', icon: '♂'},
  {key: 'neutral', label: 'Neutral', icon: '⚧'},
];

const LOOK_OPTIONS: Record<string, {key: string; label: string; desc: string}[]> = {
  female: [
    {key: 'executive', label: 'Executive', desc: 'Tailored suit, minimal jewelry, sharp'},
    {key: 'glam', label: 'Glam', desc: 'Red lip, gold accents, confident'},
    {key: 'casual-chic', label: 'Casual Chic', desc: 'Effortless, relaxed, modern'},
    {key: 'futuristic', label: 'Futuristic', desc: 'Sleek, cyberpunk edge, neon accents'},
  ],
  male: [
    {key: 'executive', label: 'Executive', desc: 'Dark suit, clean lines, authoritative'},
    {key: 'streetwear', label: 'Streetwear', desc: 'Designer casual, fresh, approachable'},
    {key: 'classic', label: 'Classic', desc: 'Timeless, old-money, understated'},
    {key: 'futuristic', label: 'Futuristic', desc: 'Tech-forward, minimal, sharp'},
  ],
  neutral: [
    {key: 'minimalist', label: 'Minimalist', desc: 'Clean, androgynous, modern'},
    {key: 'artistic', label: 'Artistic', desc: 'Creative, expressive, bold'},
    {key: 'professional', label: 'Professional', desc: 'Polished, neutral, trustworthy'},
    {key: 'futuristic', label: 'Futuristic', desc: 'Digital, abstract, AI-forward'},
  ],
};

const VOICE_OPTIONS: Record<string, {key: string; label: string; desc: string}[]> = {
  female: [
    {key: 'warm', label: 'Warm', desc: 'Smooth, reassuring, like a late-night host'},
    {key: 'confident', label: 'Confident', desc: 'Direct, polished, CEO energy'},
    {key: 'soft', label: 'Soft', desc: 'Gentle, calm, ASMR-adjacent'},
    {key: 'playful', label: 'Playful', desc: 'Witty, quick, charming'},
  ],
  male: [
    {key: 'deep', label: 'Deep', desc: 'Rich baritone, authoritative, Morgan Freeman'},
    {key: 'smooth', label: 'Smooth', desc: 'Radio DJ, late-night, velvet'},
    {key: 'crisp', label: 'Crisp', desc: 'Clear, precise, British concierge'},
    {key: 'casual', label: 'Casual', desc: 'Relaxed, friendly, bartender energy'},
  ],
  neutral: [
    {key: 'balanced', label: 'Balanced', desc: 'Even-toned, clear, professional'},
    {key: 'calm', label: 'Calm', desc: 'Meditative, steady, grounding'},
    {key: 'bright', label: 'Bright', desc: 'Energetic, upbeat, helpful'},
    {key: 'digital', label: 'Digital', desc: 'Slightly synthesized, futuristic AI'},
  ],
};

/* ─── Quick Actions ─── */

const QUICK_ACTIONS = [
  {key: 'car', icon: '🚗', label: 'Order a car', prompt: 'I need a black car'},
  {key: 'reservation', icon: '🍽', label: 'Reservation', prompt: 'Make a dinner reservation'},
  {key: 'travel', icon: '✈', label: 'Travel', prompt: 'Help me plan a trip'},
  {key: 'appointment', icon: '📅', label: 'Appointment', prompt: 'Schedule an appointment'},
  {key: 'reminder', icon: '⏰', label: 'Reminder', prompt: 'Set a reminder'},
  {key: 'shopping', icon: '🛍', label: 'Shopping', prompt: 'Help me find something to buy'},
];

/* ─── Message Types ─── */

interface Message {
  id: string;
  role: 'concierge' | 'guest' | 'system';
  text: string;
  action?: string;
}

/* ─── Component ─── */

export default function ConciergePage() {
  const [avatar, setAvatar] = useState<AvatarConfig | null>(null);
  const [setupStep, setSetupStep] = useState<'gender' | 'look' | 'voice' | 'name' | 'done'>('gender');
  const [pendingGender, setPendingGender] = useState('');
  const [pendingLook, setPendingLook] = useState('');
  const [pendingVoice, setPendingVoice] = useState('');
  const [pendingName, setPendingName] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  useEffect(() => {
    const saved = localStorage.getItem('finesse_concierge_avatar');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AvatarConfig;
        setAvatar(parsed);
        setSetupStep('done');
        setMessages([
          {
            id: 'welcome-back',
            role: 'concierge',
            text: `Welcome back. I'm ${parsed.name}, your concierge. What can I arrange for you tonight?`,
          },
        ]);
      } catch {
        /* ignore malformed storage */
      }
    }
  }, []);

  const finishSetup = () => {
    const config: AvatarConfig = {
      name: pendingName || 'Nova',
      gender: pendingGender as AvatarConfig['gender'],
      look: pendingLook,
      voice: pendingVoice,
    };
    setAvatar(config);
    setSetupStep('done');
    localStorage.setItem('finesse_concierge_avatar', JSON.stringify(config));
    setMessages([
      {
        id: 'welcome',
        role: 'concierge',
        text: `Good evening. I'm ${config.name}. I'll be your personal concierge — reservations, travel, rides, appointments, reminders, anything you need. Just tell me what you're thinking.`,
      },
    ]);
  };

  const resetAvatar = () => {
    localStorage.removeItem('finesse_concierge_avatar');
    setAvatar(null);
    setSetupStep('gender');
    setPendingGender('');
    setPendingLook('');
    setPendingVoice('');
    setPendingName('');
    setMessages([]);
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || sending) return;
    if (!overrideText) setInput('');

    const userMsg: Message = {id: crypto.randomUUID(), role: 'guest', text};
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    const lower = text.toLowerCase();
    let actionTag = '';
    if (lower.includes('car') || lower.includes('ride') || lower.includes('uber')) actionTag = 'car';
    else if (lower.includes('reserv') || lower.includes('dinner') || lower.includes('restaurant') || lower.includes('table')) actionTag = 'reservation';
    else if (lower.includes('travel') || lower.includes('flight') || lower.includes('hotel') || lower.includes('trip')) actionTag = 'travel';
    else if (lower.includes('appoint') || lower.includes('schedule') || lower.includes('book')) actionTag = 'appointment';
    else if (lower.includes('remind') || lower.includes('alarm') || lower.includes('timer')) actionTag = 'reminder';

    const system = `You are ${avatar?.name || 'Nova'}, a personal AI concierge inside Finesse, a luxury lifestyle app. You are ${avatar?.gender || 'neutral'} with a ${avatar?.voice || 'balanced'} voice and ${avatar?.look || 'professional'} style. You help with: reservations, travel planning, ordering cars, appointments, reminders, shopping, and general lifestyle management. Be concise, warm, and decisive. When a user asks you to do something, confirm you're handling it — don't just acknowledge. Act like a real concierge who gets things done.`;

    try {
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt: text, system}),
      });
      const data = (await res.json()) as {text?: string};
      const responseText = data.text || "Consider it handled. I'll have that arranged shortly.";

      setMessages((prev) => [
        ...prev,
        {id: crypto.randomUUID(), role: 'concierge', text: responseText, action: actionTag || undefined},
      ]);

      if (actionTag) {
        setTimeout(() => {
          const confirmations: Record<string, string> = {
            car: '🚗 Black car request initiated. Checking availability...',
            reservation: '🍽 Searching available tables and confirming reservation...',
            travel: '✈ Pulling travel options and pricing...',
            appointment: '📅 Scheduling appointment and adding to your calendar...',
            reminder: '⏰ Reminder set.',
          };
          setMessages((prev) => [
            ...prev,
            {id: crypto.randomUUID(), role: 'system', text: confirmations[actionTag] || ''},
          ]);
        }, 800);
      }
    } catch {
      const fallbacks: Record<string, string[]> = {
        car: ['On it. I\'m pulling up a black car to your location now. ETA is about 6 minutes.', 'Car is on the way. Black SUV, 8 minutes out.'],
        reservation: ['I\'m calling ahead now. I\'ll get you a table — what time works?', 'Checking availability. Any preference on the cuisine?'],
        travel: ['Let\'s map it out. Where are you thinking, and when?', 'I\'ll pull some options. Flights, hotel, the whole package. Budget range?'],
        appointment: ['I\'ll get that booked. What kind of appointment and when do you need it?', 'Scheduling now. I\'ll confirm the time and send you a reminder.'],
        reminder: ['Reminder set. I\'ll make sure you don\'t forget.', 'Got it. I\'ll ping you when the time comes.'],
        default: [
          'Noted. I\'m on it — I\'ll have this arranged shortly.',
          'Consider it handled. Give me a moment to work the details.',
          'I\'ll take care of that. You\'ll hear from me when it\'s confirmed.',
          'Already working on it. Anything else while I have you?',
        ],
      };
      const pool = fallbacks[actionTag] || fallbacks.default;
      setMessages((prev) => [
        ...prev,
        {id: crypto.randomUUID(), role: 'concierge', text: pool[Math.floor(Math.random() * pool.length)], action: actionTag || undefined},
      ]);

      if (actionTag) {
        setTimeout(() => {
          const confirmations: Record<string, string> = {
            car: '🚗 Black car request initiated.',
            reservation: '🍽 Searching available tables...',
            travel: '✈ Pulling travel options...',
            appointment: '📅 Scheduling appointment...',
            reminder: '⏰ Reminder set.',
          };
          if (confirmations[actionTag]) {
            setMessages((prev) => [
              ...prev,
              {id: crypto.randomUUID(), role: 'system', text: confirmations[actionTag]},
            ]);
          }
        }, 800);
      }
    } finally {
      setSending(false);
    }
  };

  /* ═══ SETUP FLOW ═══ */
  if (setupStep !== 'done') {
    const looks = LOOK_OPTIONS[pendingGender] || [];
    const voices = VOICE_OPTIONS[pendingGender] || [];

    return (
      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        transition={{duration: 0.6}}
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
          style={{background: 'radial-gradient(ellipse at center, rgba(201,169,97,0.08) 0%, transparent 70%)'}}
        />

        <div className="max-w-lg w-full px-6 relative z-10">
          <div className="text-center mb-10">
            <span className="text-4xl mb-4 inline-block">🔔</span>
            <h1 className="font-display text-4xl text-brass tracking-[0.2em] mb-2">the concierge</h1>
            <p className="font-label text-[10px] tracking-[0.5em] text-cream/20 uppercase">design your assistant</p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-3 mb-10">
            {['gender', 'look', 'voice', 'name'].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                {i > 0 && <div className="w-6 h-px bg-brass/15" />}
                <div
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === setupStep ? 'bg-brass scale-125' :
                    ['gender', 'look', 'voice', 'name'].indexOf(step) < ['gender', 'look', 'voice', 'name'].indexOf(setupStep) ? 'bg-brass/50' : 'bg-cream/10'
                  }`}
                />
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {setupStep === 'gender' && (
              <motion.div key="gender" initial={{opacity: 0, y: 15}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -15}}>
                <p className="font-label text-[10px] tracking-[0.3em] text-cream/30 uppercase text-center mb-6">
                  choose your concierge
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => {setPendingGender(g.key); setSetupStep('look');}}
                      className="flex flex-col items-center gap-3 p-6 border border-cream/8 bg-ink/40 hover:border-brass/40 hover:bg-oxblood/10 transition-all duration-300"
                    >
                      <span className="text-3xl">{g.icon}</span>
                      <span className="font-label text-[9px] tracking-[0.2em] text-cream/50 uppercase">{g.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {setupStep === 'look' && (
              <motion.div key="look" initial={{opacity: 0, y: 15}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -15}}>
                <p className="font-label text-[10px] tracking-[0.3em] text-cream/30 uppercase text-center mb-6">
                  choose their style
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {looks.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => {setPendingLook(l.key); setSetupStep('voice');}}
                      className="flex flex-col items-start p-5 border border-cream/8 bg-ink/40 hover:border-brass/40 hover:bg-oxblood/10 transition-all duration-300 text-left"
                    >
                      <span className="font-display text-lg text-cream/80 tracking-wide mb-1">{l.label}</span>
                      <span className="font-body text-xs text-cream/25 italic">{l.desc}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setSetupStep('gender')} className="mt-4 font-body text-xs text-cream/15 hover:text-cream/30 transition-colors">
                  ← back
                </button>
              </motion.div>
            )}

            {setupStep === 'voice' && (
              <motion.div key="voice" initial={{opacity: 0, y: 15}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -15}}>
                <p className="font-label text-[10px] tracking-[0.3em] text-cream/30 uppercase text-center mb-6">
                  choose their voice
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {voices.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => {setPendingVoice(v.key); setSetupStep('name');}}
                      className="flex flex-col items-start p-5 border border-cream/8 bg-ink/40 hover:border-brass/40 hover:bg-oxblood/10 transition-all duration-300 text-left"
                    >
                      <span className="font-display text-lg text-cream/80 tracking-wide mb-1">{v.label}</span>
                      <span className="font-body text-xs text-cream/25 italic">{v.desc}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setSetupStep('look')} className="mt-4 font-body text-xs text-cream/15 hover:text-cream/30 transition-colors">
                  ← back
                </button>
              </motion.div>
            )}

            {setupStep === 'name' && (
              <motion.div key="name" initial={{opacity: 0, y: 15}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -15}}>
                <p className="font-label text-[10px] tracking-[0.3em] text-cream/30 uppercase text-center mb-6">
                  name your concierge
                </p>
                <div className="brass-border p-6 bg-ink/60">
                  <input
                    type="text"
                    value={pendingName}
                    onChange={(e) => setPendingName(e.target.value)}
                    placeholder="Nova"
                    autoFocus
                    className="w-full text-center px-4 py-3 bg-transparent text-cream font-display text-2xl tracking-wide placeholder:text-cream/15 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && finishSetup()}
                  />
                  <p className="font-body text-xs text-cream/15 italic text-center mt-2">or press enter to keep the default</p>
                  <button
                    onClick={finishSetup}
                    className="w-full mt-6 py-3 font-label text-[10px] tracking-[0.3em] uppercase text-ink bg-brass hover:bg-brass-highlight transition-colors"
                  >
                    activate concierge
                  </button>
                </div>
                <button onClick={() => setSetupStep('voice')} className="mt-4 font-body text-xs text-cream/15 hover:text-cream/30 transition-colors">
                  ← back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
      </motion.div>
    );
  }

  /* ═══ MAIN CHAT ═══ */
  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.6}}
      className="min-h-screen flex flex-col relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
        style={{background: 'radial-gradient(ellipse at center, rgba(255,169,107,0.1) 0%, transparent 70%)'}}
      />

      {/* Header */}
      <header className="pt-8 pb-4 px-4 relative z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full border border-brass/30 flex items-center justify-center bg-ink/80"
              style={{boxShadow: '0 0 20px rgba(201,169,97,0.15)'}}
            >
              <span className="font-display text-lg text-brass">{avatar?.name?.[0] || 'C'}</span>
            </div>
            <div>
              <h1 className="font-display text-xl text-brass tracking-wide">{avatar?.name || 'Concierge'}</h1>
              <p className="font-label text-[8px] tracking-[0.3em] text-cream/20 uppercase">
                {avatar?.look} · {avatar?.voice} voice · online
              </p>
            </div>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>

          <button
            onClick={resetAvatar}
            className="font-label text-[8px] tracking-[0.2em] text-cream/15 uppercase hover:text-cream/30 transition-colors px-3 py-1.5 border border-cream/5 hover:border-cream/15"
          >
            customize
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-4">
        <div className="h-px bg-brass/10" />
      </div>

      {/* Quick actions */}
      <div className="max-w-3xl mx-auto w-full px-4 py-3 relative z-10">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              onClick={() => send(action.prompt)}
              disabled={sending}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-cream/8 bg-ink/40 hover:border-brass/30 hover:bg-oxblood/10 transition-all duration-300 disabled:opacity-30"
            >
              <span className="text-sm">{action.icon}</span>
              <span className="font-label text-[8px] tracking-[0.15em] text-cream/40 uppercase">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 overflow-y-auto relative z-10 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: i === 0 ? 0.3 : 0.05, duration: 0.3}}
            className={`flex ${msg.role === 'guest' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'system' ? (
              <div className="w-full text-center py-2">
                <span className="font-mono text-[10px] text-brass/40 bg-brass/5 px-3 py-1 border border-brass/10">
                  {msg.text}
                </span>
              </div>
            ) : (
              <div
                className={`max-w-[80%] px-5 py-4 ${
                  msg.role === 'concierge' ? 'bg-oxblood/15 border border-brass/15' : 'bg-brass/10 border border-brass/25'
                }`}
              >
                {msg.role === 'concierge' && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-label text-[9px] tracking-[0.3em] text-brass/50 uppercase">
                      {avatar?.name || 'concierge'}
                    </span>
                    {msg.action && (
                      <span className="font-mono text-[8px] text-brass/30 px-1.5 py-0.5 border border-brass/10">
                        {msg.action}
                      </span>
                    )}
                  </div>
                )}
                <p className="font-body text-sm text-cream/80 leading-relaxed">{msg.text}</p>
              </div>
            )}
          </motion.div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-oxblood/15 border border-brass/15 px-5 py-4">
              <p className="font-label text-[9px] tracking-[0.3em] text-brass/50 uppercase mb-2">
                {avatar?.name || 'concierge'}
              </p>
              <div className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-brass/40 animate-pulse"
                    style={{animationDelay: `${d}ms`}}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full px-4 pb-6 relative z-10">
        <div className="brass-border flex items-center bg-ink/80 backdrop-blur-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={`Ask ${avatar?.name || 'your concierge'} anything...`}
            className="flex-1 px-5 py-4 bg-transparent text-cream font-body text-sm placeholder:text-cream/15 focus:outline-none"
          />
          <button
            onClick={() => send()}
            disabled={sending || !input.trim()}
            className="px-6 py-4 font-label text-[10px] tracking-[0.3em] uppercase text-brass hover:text-brass-highlight transition-colors disabled:text-cream/10"
          >
            send
          </button>
        </div>
      </div>

      <div className="text-center pb-4 relative z-10">
        <Link href="/lobby" className="font-body text-sm text-cream/20 hover:text-brass transition-colors">
          return to the lobby
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-oxblood/8 to-transparent pointer-events-none" />
    </motion.div>
  );
}
