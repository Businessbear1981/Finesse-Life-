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
      {/* Post Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center pb-8 px-4"
          style={{background: 'rgba(6,2,3,0.85)'}}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg"
            style={{
              border: '1px solid rgba(201,169,97,0.25)',
              background:
                'linear-gradient(135deg, rgba(74,25,34,0.15) 0%, rgba(6,2,3,0.98) 100%)',
              boxShadow: '0 0 40px rgba(201,169,97,0.08)',
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{borderBottom: '1px solid rgba(201,169,97,0.1)'}}
            >
              <span
                className="font-label text-[9px] tracking-[0.4em] uppercase"
                style={{color: 'rgba(201,169,97,0.4)'}}
              >
                New Inner Room Post
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{color: 'rgba(244,232,208,0.25)'}}
              >
                <X size={16} />
              </button>
            </div>

            {/* Textarea */}
            <div className="px-5 py-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's happening in the inner room..."
                rows={4}
                autoFocus
                className="w-full bg-transparent font-body text-sm leading-relaxed placeholder:opacity-20 focus:outline-none resize-none"
                style={{color: '#F4E8D0', caretColor: '#C9A961'}}
              />
            </div>

            {error && (
              <p
                className="px-5 pb-2 font-body text-xs italic"
                style={{color: 'rgba(255,77,125,0.7)'}}
              >
                {error}
              </p>
            )}

            {/* Footer */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{borderTop: '1px solid rgba(201,169,97,0.08)'}}
            >
              <span
                className="font-mono text-[9px]"
                style={{
                  color:
                    content.length > 450
                      ? 'rgba(255,77,125,0.6)'
                      : 'rgba(244,232,208,0.15)',
                }}
              >
                {content.length}/500
              </span>
              <button
                onClick={handlePost}
                disabled={posting || !content.trim() || content.length > 500}
                className="px-6 py-2.5 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300 disabled:opacity-30"
                style={{
                  background: 'linear-gradient(135deg, #C9A961, #E8C87A)',
                  color: '#06020A',
                }}
              >
                {posting ? 'posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-[72px] z-50 w-12 h-12 flex items-center justify-center transition-all duration-300 group"
        style={{
          background: 'linear-gradient(135deg, #C9A961, #E8C87A)',
          boxShadow: '0 0 20px rgba(201,169,97,0.3), 0 4px 12px rgba(0,0,0,0.6)',
        }}
        title="New post"
      >
        <Plus
          size={20}
          strokeWidth={2}
          style={{color: '#06020A'}}
          className="group-hover:rotate-90 transition-transform duration-300"
        />
      </button>
    </>
  );
}
