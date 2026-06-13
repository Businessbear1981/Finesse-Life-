'use client';

import {useState, useRef, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {motion, AnimatePresence, useAnimation} from 'framer-motion';

interface Props {
  isVip: boolean;
  vipExpiresAt: string | null;
  memberSince: string | null;
  showUpgrade: boolean;
}

/* ─── KeyCard — animates when VIP code is entered ─── */
function KeyCard({
  code, setCode, onRedeem, loading, error, success,
}: {
  code: string;
  setCode: (v: string) => void;
  onRedeem: () => void;
  loading: boolean;
  error: string;
  success: string;
}) {
  const shakeCtrl = useAnimation();

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onRedeem();
  }, [onRedeem]);

  return (
    <div className="space-y-3">
      <motion.div animate={shakeCtrl}
        className="relative border overflow-hidden"
        style={{borderColor: error ? 'rgba(255,77,125,0.35)' : 'rgba(201,169,97,0.2)', background: 'rgba(10,4,6,0.85)'}}>
        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{background: 'linear-gradient(to right, transparent, rgba(201,169,97,0.25), transparent)'}}
          animate={{top: ['0%', '100%', '0%']}}
          transition={{duration: 3.5, repeat: Infinity, ease: 'linear'}}
        />

        <div className="flex items-center">
          {/* Lock icon side panel */}
          <div className="w-10 h-full flex items-center justify-center flex-shrink-0 py-3.5"
            style={{borderRight: '1px solid rgba(201,169,97,0.1)', background: 'rgba(201,169,97,0.03)'}}>
            <span className="font-label text-[10px]" style={{color: 'rgba(201,169,97,0.3)'}}>⬡</span>
          </div>

          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="FNS-XXXXXXXX"
            maxLength={12}
            autoFocus
            className="flex-1 px-4 py-3.5 bg-transparent font-label text-sm tracking-[0.25em] placeholder:opacity-15 focus:outline-none"
            style={{color: '#C9A961'}}
          />

          <button onClick={onRedeem} disabled={loading || !code.trim()}
            className="flex-shrink-0 px-4 py-3.5 font-label text-[9px] tracking-[0.25em] uppercase transition-all duration-300 disabled:opacity-30"
            style={{
              borderLeft: '1px solid rgba(201,169,97,0.15)',
              color: loading ? 'rgba(201,169,97,0.4)' : 'rgba(201,169,97,0.7)',
              background: loading ? 'transparent' : 'rgba(201,169,97,0.05)',
            }}>
            {loading ? '·  ·  ·' : 'Unlock'}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {(error || success) && (
          <motion.p initial={{opacity: 0, y: -4}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}
            className="font-body text-xs italic text-center"
            style={{color: error ? 'rgba(255,77,125,0.7)' : 'rgba(201,169,97,0.8)'}}>
            {error || success}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── VIP Access (not yet VIP) ─── */
function VipGate({showUpgrade}: {showUpgrade: boolean}) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'code'>(showUpgrade ? 'code' : 'idle');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRedeem = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || loading) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/vip/redeem', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code: trimmed}),
      });
      const data = await res.json() as {error?: string; message?: string};
      if (!res.ok) {
        setError(data.error ?? 'Code not recognised.');
      } else {
        setSuccess(data.message ?? 'Access granted. Welcome.');
        setTimeout(() => router.refresh(), 1400);
      }
    } catch {
      setError('Network error — try again.');
    }
    setLoading(false);
  }, [code, loading, router]);

  return (
    <div className="relative overflow-hidden mb-6"
      style={{
        border: '1px solid rgba(201,169,97,0.1)',
        background: 'linear-gradient(145deg, rgba(10,4,6,0.9) 0%, rgba(20,8,12,0.95) 100%)',
      }}>

      {/* Corner markers */}
      {[['top-0 left-0', 'border-t border-l'], ['top-0 right-0', 'border-t border-r'],
        ['bottom-0 left-0', 'border-b border-l'], ['bottom-0 right-0', 'border-b border-r']].map(([pos, border], i) => (
        <div key={i} className={`absolute ${pos} w-4 h-4 ${border}`}
          style={{borderColor: 'rgba(201,169,97,0.2)'}} />
      ))}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative w-8 h-8 border flex items-center justify-center"
            style={{borderColor: 'rgba(201,169,97,0.2)', background: 'rgba(201,169,97,0.04)'}}>
            <span className="font-display text-sm" style={{color: 'rgba(201,169,97,0.4)'}}>⬡</span>
          </div>
          <div>
            <p className="font-label text-[9px] tracking-[0.45em] uppercase"
              style={{color: 'rgba(201,169,97,0.5)'}}>
              Inner Room
            </p>
            <p className="font-body text-[11px] italic mt-0.5"
              style={{color: 'rgba(244,232,208,0.2)'}}>
              Access restricted to members
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{background: 'rgba(201,169,97,0.06)'}} />
          <div className="w-1 h-1 rotate-45" style={{background: 'rgba(201,169,97,0.15)'}} />
          <div className="flex-1 h-px" style={{background: 'rgba(201,169,97,0.06)'}} />
        </div>

        {/* Benefits teaser */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            ['Backstage Profile', 'Private persona layer'],
            ['The Vault', 'Prepaid lifestyle card'],
            ['Priority Access', 'Exclusive rooms first'],
            ['Scale Events', 'Group buy privileges'],
          ].map(([title, sub]) => (
            <div key={title} className="px-3 py-2.5"
              style={{border: '1px solid rgba(201,169,97,0.06)', background: 'rgba(201,169,97,0.02)'}}>
              <p className="font-label text-[8px] tracking-[0.2em] uppercase"
                style={{color: 'rgba(201,169,97,0.45)'}}>{title}</p>
              <p className="font-body text-[10px] italic mt-0.5"
                style={{color: 'rgba(244,232,208,0.2)'}}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <AnimatePresence mode="wait">
          {mode === 'idle' ? (
            <motion.div key="idle" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
              className="flex gap-2">
              <button onClick={() => setMode('code')}
                className="flex-1 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
                style={{border: '1px solid rgba(201,169,97,0.18)', color: 'rgba(201,169,97,0.55)'}}>
                I Have a Code
              </button>
              <Link href="/subscribe"
                className="flex-1 py-3 text-center font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,169,97,0.12), rgba(232,200,122,0.08))',
                  border: '1px solid rgba(201,169,97,0.2)',
                  color: '#C9A961',
                }}>
                $24.99 / month
              </Link>
            </motion.div>
          ) : (
            <motion.div key="code" initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
              <KeyCard code={code} setCode={setCode}
                onRedeem={handleRedeem} loading={loading} error={error} success={success} />
              {!success && (
                <button onClick={() => { setMode('idle'); setCode(''); setError(''); }}
                  className="mt-3 w-full text-center font-body text-[11px] italic transition-colors"
                  style={{color: 'rgba(244,232,208,0.18)'}}>
                  back
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── VIP Card (active member) ─── */
function VipCard({vipExpiresAt, memberSince}: {vipExpiresAt: string | null; memberSince: string | null}) {
  const expiry = vipExpiresAt
    ? new Date(vipExpiresAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})
    : null;

  return (
    <div className="relative overflow-hidden mb-6"
      style={{
        background: 'linear-gradient(135deg, #1A0C0E 0%, #0A0406 40%, #1C1008 100%)',
        border: '1px solid rgba(201,169,97,0.35)',
        boxShadow: '0 0 40px rgba(201,169,97,0.08), inset 0 0 60px rgba(201,169,97,0.03)',
      }}>

      {/* Holographic shimmer bar */}
      <motion.div className="absolute top-0 left-0 right-0 h-[1px]"
        style={{background: 'linear-gradient(to right, transparent, #E8C87A, #FFA96B, #C9A961, transparent)'}}
        animate={{opacity: [0.4, 1, 0.4]}}
        transition={{duration: 3, repeat: Infinity, ease: 'easeInOut'}}
      />

      {/* Gold foil background pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #C9A961 0px, #C9A961 1px, transparent 1px, transparent 8px)',
        }}
      />

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <motion.span
                className="font-label text-[8px] tracking-[0.5em] uppercase px-2 py-0.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,169,97,0.2), rgba(232,200,122,0.12))',
                  border: '1px solid rgba(201,169,97,0.4)',
                  color: '#E8C87A',
                }}
                animate={{boxShadow: ['0 0 6px rgba(201,169,97,0.2)', '0 0 14px rgba(201,169,97,0.4)', '0 0 6px rgba(201,169,97,0.2)']}}
                transition={{duration: 2.5, repeat: Infinity}}
              >
                ◆ VIP Member
              </motion.span>
            </div>
            {memberSince && (
              <p className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.3)'}}>
                Since {memberSince}
              </p>
            )}
          </div>

          {/* Chip */}
          <div className="w-10 h-8 border grid grid-cols-2 gap-[2px] p-1"
            style={{
              borderColor: 'rgba(201,169,97,0.4)',
              background: 'linear-gradient(135deg, rgba(201,169,97,0.15), rgba(232,200,122,0.08))',
            }}>
            {Array.from({length: 6}).map((_, i) => (
              <div key={i} className="rounded-[1px]"
                style={{background: 'rgba(201,169,97,0.2)'}} />
            ))}
          </div>
        </div>

        {/* Card number style */}
        <div className="flex gap-3 mb-5">
          {['∙∙∙∙', '∙∙∙∙', '∙∙∙∙', 'FINESSE'].map((seg, i) => (
            <span key={i} className="font-label text-[9px] tracking-[0.2em]"
              style={{color: i === 3 ? 'rgba(201,169,97,0.6)' : 'rgba(201,169,97,0.2)'}}>
              {seg}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <div>
            {expiry && (
              <>
                <p className="font-label text-[7px] tracking-[0.3em] uppercase"
                  style={{color: 'rgba(201,169,97,0.3)'}}>Valid thru</p>
                <p className="font-label text-xs tracking-[0.15em]" style={{color: '#C9A961'}}>{expiry}</p>
              </>
            )}
          </div>

          <Link href="/vip"
            className="flex items-center gap-2 px-5 py-2.5 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #C9A961, #E8C87A)',
              color: '#0A0406',
              boxShadow: '0 0 16px rgba(201,169,97,0.25)',
            }}>
            Inner Room →
          </Link>
        </div>
      </div>

      {/* Bottom shimmer */}
      <motion.div className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{background: 'linear-gradient(to right, transparent, #C9A961, transparent)'}}
        animate={{opacity: [0.2, 0.6, 0.2]}}
        transition={{duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5}}
      />
    </div>
  );
}

/* ─── Export ─── */
export function VipAccessSection({isVip, vipExpiresAt, memberSince, showUpgrade}: Props) {
  if (isVip) {
    return <VipCard vipExpiresAt={vipExpiresAt} memberSince={memberSince} />;
  }
  return <VipGate showUpgrade={showUpgrade} />;
}
