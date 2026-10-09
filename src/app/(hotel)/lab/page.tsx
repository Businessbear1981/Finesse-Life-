'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const TOOLS = [
  {
    id: 'voice',
    name: 'Voice Studio',
    sub: 'Text to speech',
    icon: '🎙',
    placeholder: 'Type what you want Nova to say...',
    outputType: 'audio',
  },
  {
    id: 'video',
    name: 'Video Studio',
    sub: 'Text to video',
    icon: '▶',
    placeholder: 'Describe your cinematic shot...',
    outputType: 'video',
  },
  {
    id: 'image',
    name: 'Image Studio',
    sub: 'Text to image',
    icon: '◈',
    placeholder: 'Describe the image you see...',
    outputType: 'image',
  },
  {
    id: '3d',
    name: '3D Studio',
    sub: 'Text to 3D',
    icon: '△',
    placeholder: 'Describe your 3D object...',
    outputType: '3d',
  },
  {
    id: 'music',
    name: 'Music Studio',
    sub: 'Text to music',
    icon: '♫',
    placeholder: 'Describe the vibe, genre, or lyrics...',
    outputType: 'audio',
  },
] as const;

// No media-generation provider is connected yet, so every studio is shown as
// "opens soon" and nothing is sent anywhere.

type Tool = (typeof TOOLS)[number];

const STYLE_OPTIONS: Record<string, string[]> = {
  voice: ['Warm', 'Confident', 'Dramatic', 'Playful'],
  video: ['Cinematic', 'Documentary', 'Fashion editorial', 'Lo-fi'],
  image: ['Editorial', 'Moody', 'Golden hour', 'Studio'],
  '3d': ['Realistic', 'Stylized', 'Minimal', 'Luxury'],
  music: ['Lo-fi', 'Hip-hop', 'Afrobeats', 'Cinematic', 'R&B'],
};

export default function Lab() {
  const [edition, setEdition] = useState<'finesse' | 'carpe_diem'>('finesse');
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');

  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  const accent = edition === 'carpe_diem' ? '#69C9D0' : '#FF4D7D';

  const openTool = (tool: Tool) => {
    setActiveTool(tool);
    setPrompt('');
    setSelectedStyle('');
  };

  const closeTool = () => {
    setActiveTool(null);
    setPrompt('');
    setSelectedStyle('');
  };

  const styles: string[] = activeTool ? (STYLE_OPTIONS[activeTool.id] ?? []) : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#0A0406' }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse at center, ${accent}10 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1
            className="text-5xl tracking-[0.25em] mb-2"
            style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', color: '#C9A961' }}
          >
            THE LAB
          </h1>
          <p
            className="text-[10px] tracking-[0.5em] uppercase"
            style={{ fontFamily: '"Cinzel", serif', color: 'rgba(244,232,208,0.25)' }}
          >
            create. generate. drop.
          </p>
          <p className="mt-4 font-label text-[9px] uppercase tracking-[0.35em] text-cream/40">
            Studios open soon · preview only
          </p>
        </motion.div>
      </header>

      {/* Main content */}
      <div className="max-w-xl mx-auto px-4 relative z-10 pb-16">
        <AnimatePresence mode="wait">
          {/* Tool grid */}
          {!activeTool && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div className="grid grid-cols-2 gap-4">
                {TOOLS.map((tool, i) => {
                  const isLast = i === TOOLS.length - 1;
                  const isOdd = TOOLS.length % 2 !== 0;
                  return (
                    <motion.button
                      key={tool.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.07 }}
                      onClick={() => openTool(tool)}
                      className={`flex flex-col items-center gap-3 p-6 border transition-all duration-300 hover:border-opacity-60 active:scale-95${
                        isLast && isOdd ? ' col-span-2 max-w-[calc(50%-8px)] mx-auto w-full' : ''
                      }`}
                      style={{
                        borderColor: 'rgba(201,169,97,0.2)',
                        background: 'rgba(10,4,6,0.7)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}60`;
                        (e.currentTarget as HTMLButtonElement).style.background = `${accent}08`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,97,0.2)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,4,6,0.7)';
                      }}
                    >
                      <span className="text-4xl leading-none">{tool.icon}</span>
                      <span
                        className="text-lg text-center leading-snug"
                        style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', color: '#C9A961' }}
                      >
                        {tool.name}
                      </span>
                      <span
                        className="text-xs text-center italic"
                        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: 'rgba(244,232,208,0.4)' }}
                      >
                        {tool.sub}
                      </span>
                      <span
                        className="text-[8px] tracking-[0.25em] uppercase"
                        style={{ fontFamily: '"Cinzel", serif', color: 'rgba(244,232,208,0.3)' }}
                      >
                        opens soon
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Studio panel */}
          {activeTool && (
            <motion.div
              key="studio"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              {/* Back button */}
              <button
                onClick={closeTool}
                className="mb-8 text-sm transition-colors duration-200"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: 'rgba(244,232,208,0.4)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#C9A961'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(244,232,208,0.4)'; }}
              >
                ← all tools
              </button>

              {/* Studio header */}
              <div className="text-center mb-8">
                <span className="text-5xl mb-3 block">{activeTool.icon}</span>
                <h2
                  className="text-3xl mb-1"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', color: '#C9A961' }}
                >
                  {activeTool.name}
                </h2>
                <p
                  className="text-xs italic"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: 'rgba(244,232,208,0.35)' }}
                >
                  {activeTool.sub}
                </p>
              </div>

              {/* Prompt area */}
              <div
                className="border p-5 mb-5"
                style={{ borderColor: 'rgba(201,169,97,0.25)', background: 'rgba(10,4,6,0.8)' }}
              >
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={activeTool.placeholder}
                  rows={4}
                  className="w-full bg-transparent focus:outline-none resize-none text-sm lab-textarea"
                  style={{
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    color: '#F4E8D0',
                    caretColor: accent,
                  }}
                />
              </div>

              {/* Style chips */}
              {styles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {styles.map((s) => {
                    const isActive = selectedStyle === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setSelectedStyle(isActive ? '' : s)}
                        className="px-3 py-1 text-[10px] tracking-[0.15em] uppercase transition-all duration-200"
                        style={{
                          fontFamily: '"Cinzel", serif',
                          color: isActive ? '#0A0406' : 'rgba(244,232,208,0.35)',
                          background: isActive ? accent : 'transparent',
                          border: `1px solid ${isActive ? accent : 'rgba(244,232,208,0.12)'}`,
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Generate — disabled until a provider is connected */}
              <button
                disabled
                aria-disabled="true"
                className="w-full py-3 text-[11px] tracking-[0.35em] uppercase transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  fontFamily: '"Cinzel", serif',
                  background: accent,
                  color: '#0A0406',
                  border: `1px solid ${accent}`,
                }}
              >
                Studio opens soon
              </button>

              <div
                className="mt-6 text-center py-8 border"
                style={{ borderColor: 'rgba(201,169,97,0.15)', background: 'rgba(201,169,97,0.03)' }}
              >
                <p
                  className="text-sm italic mb-2"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: 'rgba(244,232,208,0.5)' }}
                >
                  The {activeTool.name} isn&apos;t open yet.
                </p>
                <p
                  className="text-xs"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: 'rgba(244,232,208,0.25)' }}
                >
                  Nothing is generated or sent from here until a studio partner is connected.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center pb-10 relative z-10">
        <Link
          href="/lobby"
          className="text-sm transition-colors duration-200"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: 'rgba(244,232,208,0.2)' }}
        >
          return to the lobby
        </Link>
      </div>
    </motion.div>
  );
}
