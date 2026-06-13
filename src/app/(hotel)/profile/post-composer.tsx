'use client';

import {useState, useRef, useCallback} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {Plus, X, Image, Send} from 'lucide-react';

interface Post {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  likes_count: number;
  created_at: string;
}

interface PostComposerProps {
  onPosted: (post: Post) => void;
}

export function PostComposer({onPosted}: PostComposerProps) {
  const [open, setOpen]         = useState(false);
  const [content, setContent]   = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting]   = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'post');
      const res = await fetch('/api/upload', {method: 'POST', body: fd});
      const data = await res.json() as {url?: string; error?: string};
      if (data.url) setMediaUrl(data.url);
      else setError(data.error ?? 'Upload failed');
    } catch {
      setError('Upload failed');
    }
    setUploading(false);
  }, []);

  const submit = useCallback(async () => {
    if (!content.trim() || posting) return;
    setPosting(true);
    setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          content: content.trim(),
          media_urls: mediaUrl ? [mediaUrl] : [],
        }),
      });
      const data = await res.json() as {post?: Post; error?: string};
      if (!res.ok || !data.post) {
        setError(data.error ?? 'Post failed');
      } else {
        onPosted(data.post);
        setContent('');
        setMediaUrl(null);
        setOpen(false);
      }
    } catch {
      setError('Network error');
    }
    setPosting(false);
  }, [content, mediaUrl, posting, onPosted]);

  const remaining = 500 - content.length;

  return (
    <>
      {/* Floating "+" button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-40 w-12 h-12 flex items-center justify-center transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, #C9A961, #E8C87A)',
          boxShadow: '0 0 20px rgba(201,169,97,0.35)',
        }}
      >
        <Plus size={20} strokeWidth={2} style={{color: '#0A0406'}} />
      </button>

      {/* Compose sheet */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
              className="fixed inset-0 z-50"
              style={{background: 'rgba(10,4,6,0.85)'}}
              onClick={() => setOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{y: '100%'}} animate={{y: 0}} exit={{y: '100%'}}
              transition={{type: 'spring', damping: 28, stiffness: 300}}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
              style={{
                background: '#0F0608',
                border: '1px solid rgba(201,169,97,0.12)',
                borderBottom: 'none',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-8 h-0.5" style={{background: 'rgba(201,169,97,0.2)'}} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3"
                style={{borderBottom: '1px solid rgba(201,169,97,0.08)'}}>
                <span className="font-label text-[9px] tracking-[0.4em] uppercase"
                  style={{color: 'rgba(201,169,97,0.4)'}}>
                  New Moment
                </span>
                <button onClick={() => setOpen(false)}>
                  <X size={16} strokeWidth={1.5} style={{color: 'rgba(201,169,97,0.4)'}} />
                </button>
              </div>

              <div className="px-5 pt-4 pb-6 space-y-4">
                {/* Text */}
                <textarea
                  autoFocus
                  value={content}
                  onChange={e => setContent(e.target.value.slice(0, 500))}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                  placeholder="What's the moment..."
                  rows={4}
                  className="w-full bg-transparent font-body text-sm leading-relaxed resize-none focus:outline-none placeholder:opacity-20"
                  style={{color: '#F4E8D0', caretColor: '#C9A961'}}
                />

                {/* Media preview */}
                {mediaUrl && (
                  <div className="relative w-24 h-24 overflow-hidden"
                    style={{border: '1px solid rgba(201,169,97,0.2)'}}>
                    <img src={mediaUrl} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setMediaUrl(null)}
                      className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center"
                      style={{background: 'rgba(10,4,6,0.8)'}}>
                      <X size={10} style={{color: '#C9A961'}} />
                    </button>
                  </div>
                )}

                {error && (
                  <p className="font-body text-xs italic" style={{color: 'rgba(255,77,125,0.7)'}}>
                    {error}
                  </p>
                )}

                {/* Footer bar */}
                <div className="flex items-center justify-between pt-1"
                  style={{borderTop: '1px solid rgba(201,169,97,0.08)'}}>
                  <div className="flex items-center gap-3">
                    {/* Photo upload */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 transition-opacity disabled:opacity-40"
                    >
                      <Image size={16} strokeWidth={1.5}
                        style={{color: uploading ? 'rgba(201,169,97,0.3)' : 'rgba(201,169,97,0.5)'}} />
                      <span className="font-label text-[8px] tracking-[0.2em] uppercase"
                        style={{color: 'rgba(201,169,97,0.4)'}}>
                        {uploading ? 'uploading…' : 'photo'}
                      </span>
                    </button>

                    {/* Char count */}
                    <span className="font-label text-[8px]"
                      style={{color: remaining < 50 ? 'rgba(255,77,125,0.6)' : 'rgba(201,169,97,0.25)'}}>
                      {remaining}
                    </span>
                  </div>

                  {/* Post button */}
                  <button
                    onClick={submit}
                    disabled={!content.trim() || posting}
                    className="flex items-center gap-2 px-4 py-2 transition-all duration-200 disabled:opacity-30"
                    style={{
                      background: content.trim() ? 'linear-gradient(135deg, #C9A961, #E8C87A)' : 'rgba(201,169,97,0.1)',
                      color: content.trim() ? '#0A0406' : 'rgba(201,169,97,0.4)',
                    }}
                  >
                    <Send size={13} strokeWidth={2} />
                    <span className="font-label text-[9px] tracking-[0.2em] uppercase">
                      {posting ? 'posting…' : 'post'}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  );
}
