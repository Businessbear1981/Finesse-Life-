'use client';

import {useState, useRef} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import type {Post} from './post-card';

const MAX = 500;

export function PostComposer({userId, onPost}: {userId: string; onPost: (post: Post) => void}) {
  const [open, setOpen] = useState(false);
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
            initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
            onClick={() => {setOpen(true); setTimeout(() => textRef.current?.focus(), 100);}}
            className="w-full px-5 py-4 border border-cream/8 text-left font-body text-sm text-cream/25 italic hover:border-brass/25 hover:text-cream/40 transition-all duration-300 bg-ink/40"
          >
            Share a moment with the lounge...
          </motion.button>
        ) : (
          <motion.div
            key="composer"
            initial={{opacity: 0, y: -8}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -8}}
            className="border border-brass/20 bg-ink/60 backdrop-blur-sm"
            style={{boxShadow: '0 0 30px rgba(201,169,97,0.05)'}}
          >
            <div className="p-5">
              <textarea
                ref={textRef}
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX))}
                placeholder="What's the moment..."
                rows={4}
                className="w-full bg-transparent font-body text-sm text-cream/80 italic placeholder-cream/20 resize-none outline-none leading-relaxed"
                onKeyDown={e => {if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();}}
              />
              <div className="flex items-center justify-between pt-3 border-t border-cream/6">
                <span className={`font-mono text-[10px] ${text.length > MAX * 0.9 ? 'text-neon-pink' : 'text-cream/20'}`}>
                  {MAX - text.length}
                </span>
                {error && <span className="font-body text-xs text-neon-pink italic">{error}</span>}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {setOpen(false); setText(''); setError('');}}
                    className="font-label text-[9px] tracking-[0.3em] uppercase text-cream/20 hover:text-cream/40 transition-colors"
                  >
                    cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={!text.trim() || submitting}
                    className="px-5 py-2 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300 disabled:opacity-30"
                    style={{
                      background: text.trim() && !submitting ? 'linear-gradient(135deg, #C9A961, #E8C87A)' : undefined,
                      color: text.trim() && !submitting ? '#0A0406' : undefined,
                      border: text.trim() && !submitting ? 'none' : '1px solid rgba(201,169,97,0.2)',
                    }}
                  >
                    {submitting ? 'posting...' : 'post'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
