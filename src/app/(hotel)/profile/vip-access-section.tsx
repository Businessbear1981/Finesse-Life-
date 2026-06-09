'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';

interface Props {
  isVip: boolean;
  vipExpiresAt: string | null;
  memberSince: string | null;
  showUpgrade: boolean;
}

export function VipAccessSection({isVip, vipExpiresAt, memberSince, showUpgrade}: Props) {
  const router = useRouter();
  const [showCodeInput, setShowCodeInput] = useState(showUpgrade);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRedeem = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/vip/redeem', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code: trimmed}),
      });
      const data = (await res.json()) as {error?: string; message?: string};

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
      } else {
        setSuccess(data.message ?? 'VIP access granted.');
        setTimeout(() => {
          router.refresh();
        }, 1200);
      }
    } catch {
      setError('Network error — try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isVip) {
    const expiry = vipExpiresAt
      ? new Date(vipExpiresAt).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})
      : null;

    return (
      <div
        className="p-6 mb-6"
        style={{
          border: '1px solid rgba(201,169,97,0.3)',
          background: 'linear-gradient(135deg, rgba(74,25,34,0.15) 0%, rgba(10,4,6,0.8) 100%)',
          boxShadow: '0 0 30px rgba(201,169,97,0.06)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          {/* VIP badge */}
          <span
            className="inline-flex items-center px-3 py-1 font-label text-[9px] tracking-[0.3em] uppercase"
            style={{
              background: 'rgba(201,169,97,0.15)',
              border: '1px solid rgba(201,169,97,0.4)',
              color: '#C9A961',
            }}
          >
            ◆ VIP Member
          </span>
        </div>
        {memberSince && (
          <p
            className="font-body text-sm italic mb-4"
            style={{color: 'rgba(244,232,208,0.4)'}}
          >
            Member since {memberSince}
            {expiry && (
              <span style={{color: 'rgba(244,232,208,0.25)'}}> · active until {expiry}</span>
            )}
          </p>
        )}
        <Link
          href="/vip"
          className="inline-flex items-center gap-2 px-6 py-3 font-label text-[10px] tracking-[0.3em] uppercase transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #C9A961, #E8C87A)',
            color: '#0A0406',
          }}
        >
          Enter The Inner Room →
        </Link>
      </div>
    );
  }

  return (
    <div
      className="p-6 mb-6"
      style={{
        border: '1px solid rgba(201,169,97,0.12)',
        background: 'rgba(10,4,6,0.6)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-1.5 h-1.5 rotate-45"
          style={{background: 'rgba(201,169,97,0.3)'}}
        />
        <h3
          className="font-label text-[10px] tracking-[0.4em] uppercase"
          style={{color: 'rgba(201,169,97,0.5)'}}
        >
          VIP Access
        </h3>
      </div>

      <p
        className="font-body text-sm italic mb-5"
        style={{color: 'rgba(244,232,208,0.3)'}}
      >
        The inner room is reserved for members.
      </p>

      {!showCodeInput ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setShowCodeInput(true)}
            className="flex-1 py-3 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
            style={{
              border: '1px solid rgba(201,169,97,0.2)',
              color: 'rgba(201,169,97,0.6)',
            }}
          >
            Unlock with Code
          </button>
          <Link
            href="/subscribe"
            className="flex-1 py-3 text-center font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
            style={{
              background: 'rgba(201,169,97,0.08)',
              border: '1px solid rgba(201,169,97,0.15)',
              color: 'rgba(201,169,97,0.5)',
            }}
          >
            Subscribe — $24.99/mo
          </Link>
        </div>
      ) : (
        <div>
          <div
            className="flex items-center border overflow-hidden mb-3"
            style={{borderColor: 'rgba(201,169,97,0.2)'}}
          >
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              placeholder="FNS-XXXXXXXX"
              maxLength={12}
              className="flex-1 px-4 py-3 bg-transparent font-label text-sm tracking-[0.2em] placeholder:opacity-20 focus:outline-none"
              style={{color: '#C9A961', background: 'rgba(10,4,6,0.8)'}}
              autoFocus
            />
            <button
              onClick={handleRedeem}
              disabled={loading || !code.trim()}
              className="px-5 py-3 font-label text-[9px] tracking-[0.25em] uppercase transition-all duration-300 disabled:opacity-30"
              style={{
                background: loading ? 'rgba(201,169,97,0.1)' : 'rgba(201,169,97,0.15)',
                borderLeft: '1px solid rgba(201,169,97,0.2)',
                color: '#C9A961',
              }}
            >
              {loading ? '...' : 'Apply'}
            </button>
          </div>

          {error && (
            <p
              className="font-body text-xs italic mb-2"
              style={{color: 'rgba(255,77,125,0.7)'}}
            >
              {error}
            </p>
          )}
          {success && (
            <p
              className="font-body text-xs italic mb-2"
              style={{color: 'rgba(201,169,97,0.8)'}}
            >
              {success}
            </p>
          )}

          <button
            onClick={() => {
              setShowCodeInput(false);
              setCode('');
              setError('');
            }}
            className="font-body text-xs italic transition-colors"
            style={{color: 'rgba(244,232,208,0.2)'}}
          >
            cancel
          </button>
        </div>
      )}
    </div>
  );
}
