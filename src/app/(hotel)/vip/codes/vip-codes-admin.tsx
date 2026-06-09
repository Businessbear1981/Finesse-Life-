'use client';

import {useState, useEffect, useCallback} from 'react';
import {Copy, Check, RefreshCw} from 'lucide-react';

interface VipCode {
  id: string;
  code: string;
  is_active: boolean;
  use_count: number;
  max_uses: number;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
  used_by_profile: {username: string; display_name: string | null} | null;
}

function CodeRow({vipCode}: {vipCode: VipCode}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(vipCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const expired =
    vipCode.expires_at && new Date(vipCode.expires_at) < new Date();
  const exhausted = vipCode.use_count >= vipCode.max_uses;
  const status = !vipCode.is_active
    ? 'disabled'
    : expired
    ? 'expired'
    : exhausted
    ? 'used'
    : 'active';

  const statusColor: Record<string, string> = {
    active: 'rgba(0,255,136,0.7)',
    used: 'rgba(201,169,97,0.5)',
    expired: 'rgba(255,77,125,0.5)',
    disabled: 'rgba(244,232,208,0.15)',
  };

  return (
    <tr style={{borderBottom: '1px solid rgba(201,169,97,0.06)'}}>
      {/* Code */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-sm tracking-widest"
            style={{color: 'rgba(201,169,97,0.85)'}}
          >
            {vipCode.code}
          </span>
          <button
            onClick={copy}
            className="transition-opacity hover:opacity-100 opacity-40"
            style={{color: 'rgba(201,169,97,0.6)'}}
          >
            {copied ? (
              <Check size={12} />
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>
      </td>

      {/* Status */}
      <td className="py-3 pr-4">
        <span
          className="font-label text-[8px] tracking-[0.25em] uppercase px-2 py-0.5"
          style={{
            color: statusColor[status],
            border: `1px solid ${statusColor[status]}40`,
            background: `${statusColor[status]}10`,
          }}
        >
          {status}
        </span>
      </td>

      {/* Uses */}
      <td className="py-3 pr-4">
        <span
          className="font-mono text-xs"
          style={{color: 'rgba(244,232,208,0.3)'}}
        >
          {vipCode.use_count}/{vipCode.max_uses}
        </span>
      </td>

      {/* Used by */}
      <td className="py-3 pr-4">
        {vipCode.used_by_profile ? (
          <span
            className="font-body text-xs italic"
            style={{color: 'rgba(244,232,208,0.4)'}}
          >
            @{vipCode.used_by_profile.username}
          </span>
        ) : (
          <span style={{color: 'rgba(244,232,208,0.1)'}}>—</span>
        )}
      </td>

      {/* Expires */}
      <td className="py-3">
        <span
          className="font-mono text-[10px]"
          style={{color: 'rgba(244,232,208,0.2)'}}
        >
          {vipCode.expires_at
            ? new Date(vipCode.expires_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: '2-digit',
              })
            : '∞'}
        </span>
      </td>
    </tr>
  );
}

export function VipCodesAdmin() {
  const [codes, setCodes] = useState<VipCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(1);
  const [expiresDays, setExpiresDays] = useState<number | ''>('');
  const [maxUses, setMaxUses] = useState(1);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [error, setError] = useState('');

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vip/codes');
      if (!res.ok) {
        setError('Failed to load codes.');
        return;
      }
      const data = (await res.json()) as {codes: VipCode[]};
      setCodes(data.codes ?? []);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError('');
    setNewCodes([]);

    try {
      const res = await fetch('/api/vip/codes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          count,
          expires_days: expiresDays !== '' ? Number(expiresDays) : undefined,
          max_uses: maxUses,
        }),
      });
      const data = (await res.json()) as {codes?: string[]; error?: string};

      if (!res.ok) {
        setError(data.error ?? 'Generation failed.');
        return;
      }
      setNewCodes(data.codes ?? []);
      await fetchCodes();
    } catch {
      setError('Network error.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Generate section ── */}
      <div
        className="p-6"
        style={{
          border: '1px solid rgba(201,169,97,0.15)',
          background: 'rgba(13,8,9,0.8)',
        }}
      >
        <h2
          className="font-label text-[10px] tracking-[0.4em] uppercase mb-5"
          style={{color: 'rgba(201,169,97,0.4)'}}
        >
          Generate Codes
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-5">
          {/* Count */}
          <div>
            <label
              className="block font-label text-[8px] tracking-[0.3em] uppercase mb-2"
              style={{color: 'rgba(201,169,97,0.3)'}}
            >
              How many
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value))))}
              className="w-full px-3 py-2.5 font-mono text-sm focus:outline-none"
              style={{
                background: 'rgba(6,2,3,0.9)',
                border: '1px solid rgba(201,169,97,0.12)',
                color: '#C9A961',
                caretColor: '#C9A961',
              }}
            />
          </div>

          {/* Expiry */}
          <div>
            <label
              className="block font-label text-[8px] tracking-[0.3em] uppercase mb-2"
              style={{color: 'rgba(201,169,97,0.3)'}}
            >
              Expires in (days)
            </label>
            <input
              type="number"
              min={1}
              placeholder="never"
              value={expiresDays}
              onChange={(e) =>
                setExpiresDays(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3 py-2.5 font-mono text-sm placeholder:opacity-20 focus:outline-none"
              style={{
                background: 'rgba(6,2,3,0.9)',
                border: '1px solid rgba(201,169,97,0.12)',
                color: '#C9A961',
                caretColor: '#C9A961',
              }}
            />
          </div>

          {/* Max uses */}
          <div>
            <label
              className="block font-label text-[8px] tracking-[0.3em] uppercase mb-2"
              style={{color: 'rgba(201,169,97,0.3)'}}
            >
              Max uses
            </label>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2.5 font-mono text-sm focus:outline-none"
              style={{
                background: 'rgba(6,2,3,0.9)',
                border: '1px solid rgba(201,169,97,0.12)',
                color: '#C9A961',
                caretColor: '#C9A961',
              }}
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-8 py-3 font-label text-[9px] tracking-[0.35em] uppercase transition-all duration-300 disabled:opacity-30"
          style={{
            background: 'linear-gradient(135deg, #C9A961, #E8C87A)',
            color: '#0A0406',
          }}
        >
          {generating ? 'Generating...' : `Generate ${count} Code${count !== 1 ? 's' : ''}`}
        </button>

        {error && (
          <p
            className="mt-3 font-body text-sm italic"
            style={{color: 'rgba(255,77,125,0.7)'}}
          >
            {error}
          </p>
        )}

        {/* Newly generated codes */}
        {newCodes.length > 0 && (
          <div className="mt-5">
            <p
              className="font-label text-[8px] tracking-[0.3em] uppercase mb-3"
              style={{color: 'rgba(201,169,97,0.4)'}}
            >
              New Codes
            </p>
            <div className="space-y-2">
              {newCodes.map((c) => (
                <NewCodeRow key={c} code={c} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Codes table ── */}
      <div
        className="p-6"
        style={{
          border: '1px solid rgba(201,169,97,0.1)',
          background: 'rgba(13,8,9,0.6)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="font-label text-[10px] tracking-[0.4em] uppercase"
            style={{color: 'rgba(201,169,97,0.4)'}}
          >
            All Codes
            <span
              className="ml-2 font-mono text-[9px]"
              style={{color: 'rgba(201,169,97,0.25)'}}
            >
              ({codes.length})
            </span>
          </h2>
          <button
            onClick={fetchCodes}
            disabled={loading}
            className="transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{color: 'rgba(201,169,97,0.4)'}}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <p
            className="font-label text-[9px] tracking-[0.3em] uppercase animate-pulse"
            style={{color: 'rgba(201,169,97,0.2)'}}
          >
            loading...
          </p>
        ) : codes.length === 0 ? (
          <p
            className="font-body text-sm italic"
            style={{color: 'rgba(244,232,208,0.2)'}}
          >
            no codes yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{borderBottom: '1px solid rgba(201,169,97,0.1)'}}>
                  {['Code', 'Status', 'Uses', 'Redeemed By', 'Expires'].map((h) => (
                    <th
                      key={h}
                      className="pb-3 pr-4 text-left font-label text-[8px] tracking-[0.3em] uppercase"
                      style={{color: 'rgba(201,169,97,0.25)'}}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <CodeRow key={c.id} vipCode={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function NewCodeRow({code}: {code: string}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{
        border: '1px solid rgba(201,169,97,0.2)',
        background: 'rgba(201,169,97,0.04)',
      }}
    >
      <span
        className="font-mono text-sm tracking-widest"
        style={{color: '#C9A961'}}
      >
        {code}
      </span>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 px-3 py-1 font-label text-[8px] tracking-[0.2em] uppercase transition-all duration-200"
        style={{
          border: '1px solid rgba(201,169,97,0.2)',
          color: copied ? 'rgba(0,255,136,0.7)' : 'rgba(201,169,97,0.5)',
        }}
      >
        {copied ? <Check size={10} /> : <Copy size={10} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
