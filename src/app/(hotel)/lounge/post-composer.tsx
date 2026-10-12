'use client';

import {useState, useRef} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import type {Post} from './post-card';
import {BrassButton, PaperSurface} from '@/components/continental';

const MAX = 500;

/** Fountain-pen nib, engraved. */
function Nib({className}: {className?: string}) {
  return (
    <svg aria-hidden viewBox="0 0 24 48" className={className}>
      <defs>
        <linearGradient id="ct-nib" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a6a2e" />
          <stop offset="0.45" stopColor="#f3dc9c" />
          <stop offset="1" stopColor="#7a5a26" />
        </linearGradient>
      </defs>
      <path d="M12 47L3 22Q3 12 7 6h10q4 6 4 16Z" fill="url(#ct-nib)" stroke="#5b4219" strokeWidth="0.6" />
      <path d="M12 47V24" stroke="#2c1f0b" strokeWidth="0.8" />
      <circle cx="12" cy="22" r="1.8" fill="#2c1f0b" />
      <path d="M6.5 14Q12 11 17.5 14M6 18Q12 15 18 18" stroke="#5b4219" strokeWidth="0.4" fill="none" />
      <rect x="6" y="0" width="12" height="6.5" rx="1" fill="#120c0e" />
    </svg>
  );
}

const RULED = 'repeating-linear-gradient(180deg, transparent 0px, transparent 27px, rgb(91 70 48 / 22%) 27px, rgb(91 70 48 / 22%) 28px)';

/** The composer: a correspondence card and a fountain pen. */
export function PostComposer({onPost, defaultOpen = false}: {userId: string; onPost: (post: Post) => void; defaultOpen?: boolean}) {
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  const submit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({content: text.trim()}),
      });
      const data = await res.json();
      if (!res.ok) {setError(data.error || 'Failed'); return;}
      onPost(data.post);
      setText('');
      setOpen(false);
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-8">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="trigger"
            type="button"
            initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
            onClick={() => {setOpen(true); setTimeout(() => textRef.current?.focus(), 100);}}
            className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brass-200)]"
          >
            <PaperSurface className="flex items-center gap-4 px-5 py-4 transition-transform duration-500 hover:-translate-y-0.5">
              <div className="pointer-events-none absolute inset-[5px] border border-[rgb(30_20_12/0.18)]" />
              <span className="relative flex-1 font-display text-[17px] italic text-[var(--ivory-ink-soft)]">Share a moment with the lounge...</span>
              <Nib className="relative h-10 w-5 shrink-0 rotate-[30deg]" />
            </PaperSurface>
          </motion.button>
        ) : (
          <motion.div
            key="composer"
            initial={{opacity: 0, y: -8}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -8}}
          >
            <PaperSurface className="px-5 pb-4 pt-5">
              <div className="pointer-events-none absolute inset-[5px] border border-[rgb(30_20_12/0.18)]" />
              <div className="relative mb-2 flex items-center justify-between">
                <span className="font-label text-[9px] uppercase tracking-[0.36em] text-[var(--ivory-ink-soft)]">With the compliments of</span>
                <Nib className="h-8 w-4 rotate-[30deg]" />
              </div>
              <textarea
                ref={textRef}
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX))}
                placeholder="What's the moment..."
                aria-label="Your moment"
                rows={4}
                className="relative w-full resize-none bg-transparent font-display text-[17px] italic text-[var(--ivory-ink)] outline-none placeholder:text-[rgb(91_70_48/0.6)]"
                style={{lineHeight: '28px', backgroundImage: RULED, backgroundAttachment: 'local'}}
                onKeyDown={e => {if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();}}
              />
              <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(30_20_12/0.15)] pt-3">
                <span className={`font-label text-[10px] tracking-[0.1em] ${text.length > MAX * 0.9 ? 'text-[var(--oxblood-600)]' : 'text-[var(--ivory-ink-soft)]'}`}>
                  {MAX - text.length}
                </span>
                {error && <span role="alert" className="font-body text-[14px] italic text-[var(--oxblood-600)]">{error}</span>}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {setOpen(false); setText(''); setError('');}}
                    className="min-h-11 px-2 font-label text-[9px] uppercase tracking-[0.3em] text-[var(--ivory-ink-soft)] transition-colors hover:text-[var(--ivory-ink)]"
                  >
                    cancel
                  </button>
                  <BrassButton size="sm" onClick={submit} disabled={!text.trim() || submitting}>
                    {submitting ? 'posting...' : 'post'}
                  </BrassButton>
                </div>
              </div>
            </PaperSurface>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
