'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Plus, X} from 'lucide-react';
import {useHouseRules} from '@/components/moderation';

export function VipPostFabClient() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const rules = useHouseRules();

  const send = () => fetch('/api/vip/posts', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({content: content.trim()}),
  });

  // Posts go through POST /api/vip/posts (house rules, text filter, VIP check) — never straight to the table.
  const handlePost = async () => {
    const text = content.trim();
    if (!text || posting) return;
    setError('');
    if (!(await rules.ensure())) return;
    setPosting(true);

    try {
      let res = await send();
      let data = (await res.json().catch(() => ({}))) as {error?: string; message?: string};
      if (res.status === 403 && data.error === 'terms_required') {
        if (!(await rules.require())) { setError('Accept the house rules to post. Nothing was posted.'); return; }
        res = await send();
        data = (await res.json().catch(() => ({}))) as {error?: string; message?: string};
      }
      if (!res.ok) {
        setError(res.status === 401 ? 'Sign in first. Nothing was posted.' : data.message ?? 'Nothing was posted. Try again.');
      } else {
        setContent('');
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError('The house line is down. Nothing was posted.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      {rules.sheet}
      {/* Post sheet */}
      {open && (
        <div
          className="vip-scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="vip-sheet" role="dialog" aria-modal="true" aria-labelledby="vip-post-title">
            <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12}}>
              <div>
                <p className="ah-eyebrow">The Inner Room</p>
                <p id="vip-post-title" className="ah-serif-i" style={{margin: '4px 0 0', fontSize: 28, lineHeight: 1}}>New post.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="vip-sheet-x" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <label htmlFor="vip-post-text" className="sr-only">Your post</label>
            <textarea
              id="vip-post-text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What’s happening in the Inner Room…"
              rows={4}
              autoFocus
              className="ah-input"
              style={{marginTop: 16, caretColor: 'var(--ah-rose)'}}
            />

            {error && (
              <p role="alert" style={{margin: '10px 0 0', fontSize: 13, color: 'var(--ah-rose)'}}>
                {error}
              </p>
            )}

            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16}}>
              <span
                className="ah-num"
                style={{fontSize: 12, color: content.length > 450 ? 'var(--ah-rose)' : 'var(--ah-faint)'}}
              >
                {content.length}/500
              </span>
              <button
                type="button"
                onClick={handlePost}
                disabled={posting || !content.trim() || content.length > 500}
                className="ah-pill ah-pill-rose"
                style={{minWidth: 120}}
              >
                {posting ? 'Posting\u2026' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button type="button" onClick={() => setOpen(true)} className="vip-fab" title="New post" aria-label="New post">
        <Plus size={22} strokeWidth={2} />
      </button>
    </>
  );
}
