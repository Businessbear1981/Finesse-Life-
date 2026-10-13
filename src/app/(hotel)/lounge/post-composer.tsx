'use client';

import {useState, useRef} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {useHouseRules} from '@/components/moderation';
import type {Post} from './post-card';

const MAX = 500;

/** The composer (After Hours): a glass prompt that opens into a note. */
export function PostComposer({onPost, defaultOpen = false}: {userId: string; onPost: (post: Post) => void; defaultOpen?: boolean}) {
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const rules = useHouseRules();

  const send = () => fetch('/api/posts', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({content: text.trim()}),
  });

  const submit = async () => {
    if (!text.trim() || submitting) return;
    setError('');
    // The house rules & terms sheet shows once, before a member's first post.
    if (!(await rules.ensure())) return;
    setSubmitting(true);
    try {
      let res = await send();
      let data = await res.json();
      if (res.status === 403 && data.error === 'terms_required') {
        if (!(await rules.require())) {setError('Accept the house rules to post. Nothing was posted.'); return;}
        res = await send();
        data = await res.json();
      }
      if (!res.ok) {setError(data.message || data.error || 'Nothing was posted. Try again.'); return;}
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
    <div style={{marginBottom: 22}}>
      {rules.sheet}
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="trigger"
            type="button"
            initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
            onClick={() => {setOpen(true); setTimeout(() => textRef.current?.focus(), 100);}}
            className="ah-card ah-focus"
            style={{display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', cursor: 'text', padding: '14px 16px', color: 'var(--ah-faint)', fontSize: 15, fontFamily: 'var(--ah-sans)'}}
          >
            <span style={{flex: 1}}>Share a moment with the lounge…</span>
            <span aria-hidden className="ah-pill ah-pill-solid" style={{minHeight: 34, padding: '0 14px', fontSize: 13}}>Post</span>
          </motion.button>
        ) : (
          <motion.div
            key="composer"
            initial={{opacity: 0, y: -8}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -8}}
            className="ah-card"
            style={{padding: 16}}
          >
            <textarea
              ref={textRef}
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX))}
              placeholder="What’s the moment…"
              aria-label="Your moment"
              rows={4}
              className="ah-input"
              style={{resize: 'none', border: 0, background: 'transparent', padding: 0, minHeight: 96}}
              onKeyDown={e => {if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();}}
            />
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTop: '1px solid var(--ah-line)'}}>
              <span className="ah-num" style={{fontSize: 12, color: text.length > MAX * 0.9 ? '#ff8aa0' : 'var(--ah-faint)'}}>{MAX - text.length}</span>
              {error && <span role="alert" style={{fontSize: 13, color: '#ff8aa0'}}>{error}</span>}
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <button
                  type="button"
                  onClick={() => {setOpen(false); setText(''); setError('');}}
                  className="ah-pill ah-pill-ghost"
                  style={{minHeight: 40, fontSize: 13}}
                >
                  Cancel
                </button>
                <button type="button" className="ah-pill ah-pill-solid" style={{minHeight: 40, fontSize: 13}} onClick={submit} disabled={!text.trim() || submitting}>
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
