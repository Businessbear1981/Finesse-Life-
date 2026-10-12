'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {Plus, X} from 'lucide-react';

export function VipPostFabClient() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handlePost = async () => {
    const text = content.trim();
    if (!text || posting) return;
    setPosting(true);
    setError('');

    try {
      const supabase = createClient();
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated.');
        return;
      }

      const {error: insertErr} = await supabase.from('vip_posts').insert({
        author_id: user.id,
        content: text,
      });

      if (insertErr) {
        setError(insertErr.message);
      } else {
        setContent('');
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError('Failed to post. Try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
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
