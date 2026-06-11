'use client';

import {useState, useEffect, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {motion, AnimatePresence} from 'framer-motion';
import Link from 'next/link';

/* ─── Types ─── */

type Tab = 'portfolio' | 'fantasy' | 'garage';

interface AlpacaSnapshot {
  equity: number;
  cash: number;
  portfolio_value: number;
  buying_power: number;
  pnl_today: number;
  top_positions: {
    symbol: string;
    qty: number;
    market_value: number;
    unrealized_pl: number;
    current_price: number;
    change_today_pct: number;
  }[];
  fetched_at: string;
}

interface FantasySnapshot {
  demo: boolean;
  league_name: string;
  team_name: string;
  rank: number;
  record: {wins: number; losses: number; ties: number};
  projected_points: number;
  week_matchup: {
    week: number;
    opponent: string;
    opponent_projected: number;
    my_projected: number;
    status: string;
  };
  top_players: {name: string; position: string; projected_pts: number}[];
}

interface GarageProfile {
  car_make: string;
  car_model: string;
  car_year: string;
  sneaker_size: string;
  golf_handicap: string;
}

/* ─── Constants ─── */

const ACCENT = '#FFA96B';
const BG = '#0A0406';
const CREAM = '#F4E8D0';
const BRASS = '#C9A961';

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2}).format(n);
}

function pnlColor(n: number) {
  if (n > 0) return 'rgba(0,255,136,0.8)';
  if (n < 0) return 'rgba(255,77,125,0.8)';
  return `rgba(${CREAM},0.4)`;
}

/* ─── Sub-components ─── */

function SectionDivider({label}: {label: string}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="h-px flex-1" style={{background: `rgba(255,169,107,0.2)`}} />
      <span className="font-label text-[9px] tracking-[0.4em] uppercase" style={{color: `rgba(255,169,107,0.5)`}}>
        {label}
      </span>
      <div className="h-px flex-1" style={{background: `rgba(255,169,107,0.2)`}} />
    </div>
  );
}

/* ─── Portfolio Tab ─── */

function PortfolioTab() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<AlpacaSnapshot | null>(null);

  const connect = useCallback(async () => {
    if (!apiKey.trim() || !apiSecret.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/integrations/alpaca', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({api_key: apiKey.trim(), api_secret: apiSecret.trim()}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Connection failed');
      } else {
        setSnapshot(data as AlpacaSnapshot);
      }
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }, [apiKey, apiSecret]);

  if (!snapshot) {
    return (
      <motion.div key="alpaca-connect" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
        <SectionDivider label="connect alpaca" />

        <div className="p-6 border" style={{borderColor: `rgba(255,169,107,0.15)`, background: 'rgba(10,4,6,0.6)'}}>
          <p className="font-display text-xl tracking-wide mb-1" style={{color: `rgba(${CREAM},0.9)`}}>
            Alpaca Portfolio
          </p>
          <p className="font-body text-xs italic mb-6" style={{color: `rgba(244,232,208,0.3)`}}>
            Paste your Alpaca Paper Trading API keys. Keys are never stored server-side.
          </p>

          <div className="space-y-3 mb-5">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key ID"
              className="w-full px-4 py-3 bg-transparent font-mono text-sm outline-none"
              style={{border: `1px solid rgba(255,169,107,0.25)`, color: `rgba(244,232,208,0.85)`}}
            />
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="API Secret Key"
              className="w-full px-4 py-3 bg-transparent font-mono text-sm outline-none"
              style={{border: `1px solid rgba(255,169,107,0.25)`, color: `rgba(244,232,208,0.85)`}}
            />
          </div>

          {error && (
            <p className="font-body text-xs mb-4" style={{color: 'rgba(255,77,125,0.8)'}}>
              {error}
            </p>
          )}

          <button
            onClick={connect}
            disabled={loading || !apiKey.trim() || !apiSecret.trim()}
            className="w-full py-3 font-label text-[10px] tracking-[0.3em] uppercase transition-all"
            style={{
              background: loading ? 'transparent' : ACCENT,
              color: loading ? ACCENT : BG,
              border: loading ? `1px solid rgba(255,169,107,0.4)` : 'none',
              opacity: !apiKey.trim() || !apiSecret.trim() ? 0.4 : 1,
            }}
          >
            {loading ? 'connecting...' : 'connect portfolio'}
          </button>

          <p className="text-center font-body text-[10px] italic mt-3" style={{color: 'rgba(244,232,208,0.15)'}}>
            alpaca.markets → API → Paper Trading keys
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div key="alpaca-data" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
      <SectionDivider label="portfolio overview" />

      {/* Equity hero */}
      <div className="text-center mb-6 p-6" style={{border: `1px solid rgba(255,169,107,0.2)`, background: 'rgba(10,4,6,0.7)'}}>
        <p className="font-label text-[9px] tracking-[0.4em] uppercase mb-2" style={{color: `rgba(255,169,107,0.5)`}}>
          portfolio value
        </p>
        <p className="font-display text-5xl tracking-wide" style={{color: ACCENT, textShadow: `0 0 30px rgba(255,169,107,0.2)`}}>
          {fmt$(snapshot.portfolio_value)}
        </p>
        <div className="flex justify-center items-center gap-2 mt-2">
          <span
            className="font-mono text-base"
            style={{color: pnlColor(snapshot.pnl_today)}}
          >
            {snapshot.pnl_today >= 0 ? '+' : ''}{fmt$(snapshot.pnl_today)}
          </span>
          <span className="font-label text-[8px] tracking-[0.2em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>
            today
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          {label: 'equity', value: fmt$(snapshot.equity)},
          {label: 'cash', value: fmt$(snapshot.cash)},
          {label: 'buying power', value: fmt$(snapshot.buying_power)},
        ].map(({label, value}) => (
          <div key={label} className="p-3 text-center" style={{border: `1px solid rgba(255,169,107,0.08)`, background: 'rgba(10,4,6,0.4)'}}>
            <p className="font-label text-[7px] tracking-[0.2em] uppercase mb-1" style={{color: `rgba(255,169,107,0.4)`}}>
              {label}
            </p>
            <p className="font-mono text-sm" style={{color: `rgba(244,232,208,0.8)`}}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Top positions */}
      {snapshot.top_positions.length > 0 && (
        <>
          <SectionDivider label="top positions" />
          <div className="space-y-2">
            {snapshot.top_positions.map((pos, i) => (
              <motion.div
                key={pos.symbol}
                initial={{opacity: 0, x: -8}}
                animate={{opacity: 1, x: 0}}
                transition={{delay: i * 0.06}}
                className="flex items-center justify-between px-4 py-3"
                style={{border: `1px solid rgba(244,232,208,0.05)`, background: 'rgba(10,4,6,0.4)'}}
              >
                <div>
                  <span className="font-mono text-base font-bold" style={{color: ACCENT}}>
                    {pos.symbol}
                  </span>
                  <span className="font-label text-[8px] tracking-[0.15em] uppercase ml-2" style={{color: 'rgba(244,232,208,0.2)'}}>
                    {pos.qty} shares
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm" style={{color: 'rgba(244,232,208,0.8)'}}>
                    {fmt$(pos.market_value)}
                  </p>
                  <p className="font-mono text-[10px]" style={{color: pnlColor(pos.unrealized_pl)}}>
                    {pos.unrealized_pl >= 0 ? '+' : ''}{fmt$(pos.unrealized_pl)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => setSnapshot(null)}
        className="mt-6 w-full py-2 font-label text-[8px] tracking-[0.25em] uppercase"
        style={{color: 'rgba(244,232,208,0.2)', border: '1px solid rgba(244,232,208,0.06)'}}
      >
        reconnect
      </button>
    </motion.div>
  );
}

/* ─── Fantasy Tab ─── */

function FantasyTab() {
  const [leagueId, setLeagueId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<FantasySnapshot | null>(null);

  const connect = useCallback(async () => {
    if (!leagueId.trim() || !teamId.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/integrations/yahoo-fantasy', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({league_id: leagueId.trim(), team_id: teamId.trim()}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to load');
      } else {
        setSnapshot(data as FantasySnapshot);
      }
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }, [leagueId, teamId]);

  if (!snapshot) {
    return (
      <motion.div key="fantasy-connect" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
        <SectionDivider label="connect yahoo fantasy" />

        <div className="p-6 border" style={{borderColor: `rgba(255,169,107,0.15)`, background: 'rgba(10,4,6,0.6)'}}>
          <p className="font-display text-xl tracking-wide mb-1" style={{color: `rgba(244,232,208,0.9)`}}>
            Yahoo Fantasy Football
          </p>
          <p className="font-body text-xs italic mb-1" style={{color: `rgba(244,232,208,0.3)`}}>
            Find your League ID + Team ID in the Yahoo Fantasy URL.
          </p>
          <p className="font-body text-[10px] mb-6" style={{color: `rgba(255,169,107,0.4)`}}>
            Demo mode — OAuth2 coming in phase 2
          </p>

          <div className="space-y-3 mb-5">
            <input
              type="text"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              placeholder="League ID (e.g. 12345)"
              className="w-full px-4 py-3 bg-transparent font-mono text-sm outline-none"
              style={{border: `1px solid rgba(255,169,107,0.25)`, color: `rgba(244,232,208,0.85)`}}
            />
            <input
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="Team ID (e.g. 7)"
              className="w-full px-4 py-3 bg-transparent font-mono text-sm outline-none"
              style={{border: `1px solid rgba(255,169,107,0.25)`, color: `rgba(244,232,208,0.85)`}}
            />
          </div>

          {error && (
            <p className="font-body text-xs mb-4" style={{color: 'rgba(255,77,125,0.8)'}}>
              {error}
            </p>
          )}

          <button
            onClick={connect}
            disabled={loading || !leagueId.trim() || !teamId.trim()}
            className="w-full py-3 font-label text-[10px] tracking-[0.3em] uppercase transition-all"
            style={{
              background: loading ? 'transparent' : ACCENT,
              color: loading ? ACCENT : BG,
              border: loading ? `1px solid rgba(255,169,107,0.4)` : 'none',
              opacity: !leagueId.trim() || !teamId.trim() ? 0.4 : 1,
            }}
          >
            {loading ? 'loading...' : 'load my team'}
          </button>
        </div>
      </motion.div>
    );
  }

  const {record, week_matchup} = snapshot;

  return (
    <motion.div key="fantasy-data" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
      {snapshot.demo && (
        <div className="mb-4 px-3 py-2 text-center" style={{background: `rgba(255,169,107,0.08)`, border: `1px solid rgba(255,169,107,0.15)`}}>
          <span className="font-label text-[8px] tracking-[0.3em] uppercase" style={{color: `rgba(255,169,107,0.6)`}}>
            demo mode — yahoo oauth2 in phase 2
          </span>
        </div>
      )}

      <SectionDivider label="your team" />

      {/* Team hero */}
      <div className="p-6 mb-4" style={{border: `1px solid rgba(255,169,107,0.2)`, background: 'rgba(10,4,6,0.7)'}}>
        <p className="font-label text-[8px] tracking-[0.3em] uppercase mb-1" style={{color: `rgba(255,169,107,0.4)`}}>
          {snapshot.league_name}
        </p>
        <p className="font-display text-3xl tracking-wide mb-2" style={{color: 'rgba(244,232,208,0.9)'}}>
          {snapshot.team_name}
        </p>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-mono text-2xl" style={{color: ACCENT}}>
              {record.wins}-{record.losses}
            </p>
            <p className="font-label text-[7px] tracking-[0.2em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>
              record
            </p>
          </div>
          <div className="h-8 w-px" style={{background: 'rgba(255,169,107,0.2)'}} />
          <div className="text-center">
            <p className="font-mono text-2xl" style={{color: ACCENT}}>
              #{snapshot.rank}
            </p>
            <p className="font-label text-[7px] tracking-[0.2em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>
              rank
            </p>
          </div>
          <div className="h-8 w-px" style={{background: 'rgba(255,169,107,0.2)'}} />
          <div className="text-center">
            <p className="font-mono text-2xl" style={{color: ACCENT}}>
              {snapshot.projected_points.toFixed(1)}
            </p>
            <p className="font-label text-[7px] tracking-[0.2em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>
              proj pts
            </p>
          </div>
        </div>
      </div>

      {/* Current matchup */}
      <SectionDivider label={`week ${week_matchup.week} matchup`} />
      <div className="p-5 mb-4" style={{border: `1px solid rgba(255,169,107,0.12)`, background: 'rgba(10,4,6,0.5)'}}>
        <div className="flex justify-between items-center">
          <div className="text-center">
            <p className="font-display text-xl" style={{color: 'rgba(244,232,208,0.9)'}}>
              {snapshot.team_name}
            </p>
            <p className="font-mono text-3xl mt-1" style={{color: ACCENT}}>
              {week_matchup.my_projected.toFixed(1)}
            </p>
            <p className="font-label text-[7px] tracking-[0.2em] uppercase" style={{color: 'rgba(244,232,208,0.2)'}}>
              projected
            </p>
          </div>
          <div className="text-center">
            <p className="font-label text-[8px] tracking-[0.3em] uppercase" style={{color: `rgba(255,169,107,0.5)`}}>
              vs
            </p>
            <p
              className="font-label text-[8px] tracking-[0.15em] uppercase mt-1 px-2 py-1"
              style={{
                background: week_matchup.my_projected > week_matchup.opponent_projected ? 'rgba(0,255,136,0.1)' : 'rgba(255,77,125,0.1)',
                color: week_matchup.my_projected > week_matchup.opponent_projected ? 'rgba(0,255,136,0.7)' : 'rgba(255,77,125,0.7)',
              }}
            >
              {week_matchup.my_projected > week_matchup.opponent_projected ? 'projected win' : 'projected loss'}
            </p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl" style={{color: 'rgba(244,232,208,0.6)'}}>
              {week_matchup.opponent}
            </p>
            <p className="font-mono text-3xl mt-1" style={{color: 'rgba(244,232,208,0.4)'}}>
              {week_matchup.opponent_projected.toFixed(1)}
            </p>
            <p className="font-label text-[7px] tracking-[0.2em] uppercase" style={{color: 'rgba(244,232,208,0.15)'}}>
              projected
            </p>
          </div>
        </div>
      </div>

      {/* Top players */}
      <SectionDivider label="starters" />
      <div className="space-y-2">
        {snapshot.top_players.map((p, i) => (
          <div
            key={i}
            className="flex justify-between items-center px-4 py-3"
            style={{border: `1px solid rgba(244,232,208,0.05)`, background: 'rgba(10,4,6,0.4)'}}
          >
            <div className="flex items-center gap-3">
              <span
                className="font-label text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5"
                style={{background: `rgba(255,169,107,0.15)`, color: ACCENT}}
              >
                {p.position}
              </span>
              <span className="font-body text-sm" style={{color: 'rgba(244,232,208,0.8)'}}>
                {p.name}
              </span>
            </div>
            <span className="font-mono text-sm" style={{color: ACCENT}}>
              {p.projected_pts.toFixed(1)} pts
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setSnapshot(null)}
        className="mt-6 w-full py-2 font-label text-[8px] tracking-[0.25em] uppercase"
        style={{color: 'rgba(244,232,208,0.2)', border: '1px solid rgba(244,232,208,0.06)'}}
      >
        change league
      </button>
    </motion.div>
  );
}

/* ─── Garage Tab ─── */

function GarageTab() {
  const [form, setForm] = useState<GarageProfile>({
    car_make: '',
    car_model: '',
    car_year: '',
    sneaker_size: '',
    golf_handicap: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const save = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/carpe-diem/garage', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          car_make: form.car_make || null,
          car_model: form.car_model || null,
          car_year: form.car_year ? parseInt(form.car_year, 10) : null,
          sneaker_size: form.sneaker_size || null,
          golf_handicap: form.golf_handicap ? parseFloat(form.golf_handicap) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Save failed');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }, [form]);

  const field = (
    key: keyof GarageProfile,
    label: string,
    placeholder: string,
    type = 'text',
  ) => (
    <div>
      <label className="block font-label text-[8px] tracking-[0.25em] uppercase mb-1" style={{color: `rgba(255,169,107,0.4)`}}>
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((prev) => ({...prev, [key]: e.target.value}))}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-transparent font-body text-sm outline-none"
        style={{border: `1px solid rgba(255,169,107,0.2)`, color: `rgba(244,232,208,0.85)`}}
      />
    </div>
  );

  return (
    <motion.div key="garage" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}}>
      <SectionDivider label="your garage" />

      <div className="p-6" style={{border: `1px solid rgba(255,169,107,0.12)`, background: 'rgba(10,4,6,0.6)'}}>
        <p className="font-body text-xs italic mb-6" style={{color: 'rgba(244,232,208,0.3)'}}>
          Nova uses this to personalize your briefings.
        </p>

        <div className="space-y-4 mb-6">
          {field('car_make', 'Make', 'Porsche')}
          {field('car_model', 'Model', '911 GT3')}
          {field('car_year', 'Year', '2024', 'number')}
          {field('sneaker_size', 'Sneaker Size', '11')}
          {field('golf_handicap', 'Golf Handicap', '8.4', 'number')}
        </div>

        {error && (
          <p className="font-body text-xs mb-4" style={{color: 'rgba(255,77,125,0.8)'}}>
            {error}
          </p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 font-label text-[10px] tracking-[0.3em] uppercase transition-all"
          style={{
            background: saved ? 'rgba(0,255,136,0.15)' : saving ? 'transparent' : ACCENT,
            color: saved ? 'rgba(0,255,136,0.8)' : saving ? ACCENT : BG,
            border: saving || saved ? `1px solid ${saved ? 'rgba(0,255,136,0.3)' : 'rgba(255,169,107,0.4)'}` : 'none',
          }}
        >
          {saved ? 'saved' : saving ? 'saving...' : 'save profile'}
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Nova Briefing ─── */

function NovaBriefing({
  alpacaConnected,
  fantasyConnected,
  garage,
}: {
  alpacaConnected: boolean;
  fantasyConnected: boolean;
  garage: GarageProfile;
}) {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const getBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const contextParts: string[] = [];
      if (alpacaConnected) contextParts.push('his Alpaca portfolio is connected and actively tracking positions');
      if (fantasyConnected) contextParts.push('his Yahoo Fantasy Football team is live with an upcoming matchup');
      if (garage.car_make) contextParts.push(`he drives a ${garage.car_year} ${garage.car_make} ${garage.car_model}`);
      if (garage.golf_handicap) contextParts.push(`his golf handicap is ${garage.golf_handicap}`);
      if (garage.sneaker_size) contextParts.push(`sneaker size ${garage.sneaker_size}`);

      const context = contextParts.length > 0
        ? contextParts.join('. ') + '.'
        : 'He has not yet connected his portfolio or fantasy lineup.';

      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          system: 'You are Nova, the intelligence concierge at Finesse — a members-only luxury lifestyle platform. You speak in short, sharp, masculine prose. No fluff. Direct. Confident. 2-3 sentences max.',
          prompt: `Give a sharp weekly briefing for this member. Context: ${context} Start with "This week" and reference his actual data. Keep it under 60 words.`,
        }),
      });
      const data = await res.json();
      setBriefing(data.text ?? '');
      setFetched(true);
    } catch {
      setBriefing('Nova is offline. Check back shortly.');
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, [alpacaConnected, fantasyConnected, garage]);

  return (
    <div className="mt-10 p-6" style={{border: `1px solid rgba(255,169,107,0.15)`, background: 'rgba(10,4,6,0.7)'}}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-label text-[9px] tracking-[0.4em] uppercase" style={{color: `rgba(255,169,107,0.5)`}}>
            nova briefing
          </p>
          <p className="font-body text-xs italic mt-0.5" style={{color: 'rgba(244,232,208,0.2)'}}>
            based on your portfolio & lineup
          </p>
        </div>
        {!fetched && (
          <button
            onClick={getBriefing}
            disabled={loading}
            className="px-4 py-2 font-label text-[9px] tracking-[0.2em] uppercase transition-all"
            style={{
              background: loading ? 'transparent' : ACCENT,
              color: loading ? ACCENT : BG,
              border: loading ? `1px solid rgba(255,169,107,0.4)` : 'none',
            }}
          >
            {loading ? '...' : 'brief me'}
          </button>
        )}
      </div>

      {briefing ? (
        <motion.p
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          className="font-body text-sm leading-relaxed"
          style={{color: 'rgba(244,232,208,0.7)', fontStyle: 'italic'}}
        >
          &ldquo;{briefing}&rdquo;
        </motion.p>
      ) : (
        <p className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.2)'}}>
          Connect your portfolio or fantasy lineup, then tap Brief Me.
        </p>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export default function CarpeDiemPage() {
  const router = useRouter();
  const [gender, setGender] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('portfolio');
  const [alpacaConnected, setAlpacaConnected] = useState(false);
  const [fantasyConnected, setFantasyConnected] = useState(false);
  const [garage, setGarage] = useState<GarageProfile>({
    car_make: '',
    car_model: '',
    car_year: '',
    sneaker_size: '',
    golf_handicap: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('finesse_gender');
    if (stored !== 'masculine') {
      router.replace('/perdiem');
    } else {
      setGender('masculine');
    }
  }, [router]);

  if (gender === null) return null;

  const TABS: {key: Tab; label: string}[] = [
    {key: 'portfolio', label: 'PORTFOLIO'},
    {key: 'fantasy', label: 'FANTASY'},
    {key: 'garage', label: 'GARAGE'},
  ];

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.6}}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
          style={{background: `radial-gradient(ellipse at center, rgba(255,169,107,0.06) 0%, transparent 65%)`}}
        />
      </div>

      {/* Header */}
      <header className="text-center pt-12 pb-6 relative z-10">
        <motion.div initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
          <p className="font-label text-[8px] tracking-[0.5em] uppercase mb-3" style={{color: `rgba(255,169,107,0.3)`}}>
            masculine intelligence
          </p>
          <h1
            className="font-display text-5xl tracking-[0.25em] uppercase"
            style={{
              color: ACCENT,
              fontStyle: 'italic',
              textShadow: `0 0 40px rgba(255,169,107,0.15)`,
            }}
          >
            CARPE DIEM
          </h1>
          <p className="font-label text-[9px] tracking-[0.4em] uppercase mt-3" style={{color: `rgba(201,169,97,0.4)`}}>
            portfolio · fantasy · garage
          </p>
        </motion.div>
      </header>

      {/* Tab Nav */}
      <div className="max-w-3xl mx-auto px-4 mb-8 relative z-10">
        <div className="flex gap-1">
          {TABS.map(({key, label}) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-3 font-label text-[10px] tracking-[0.2em] uppercase transition-all"
              style={{
                background: tab === key ? ACCENT : 'transparent',
                color: tab === key ? BG : `rgba(244,232,208,0.25)`,
                border: tab === key ? 'none' : `1px solid rgba(255,169,107,0.12)`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-3xl mx-auto px-4 relative z-10">
        <AnimatePresence mode="wait">
          {tab === 'portfolio' && (
            <motion.div key="portfolio">
              <PortfolioTab />
            </motion.div>
          )}
          {tab === 'fantasy' && (
            <motion.div key="fantasy">
              <FantasyTab />
            </motion.div>
          )}
          {tab === 'garage' && (
            <motion.div key="garage">
              <GarageTab />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nova briefing — always visible */}
        <NovaBriefing
          alpacaConnected={alpacaConnected}
          fantasyConnected={fantasyConnected}
          garage={garage}
        />
      </div>

      {/* Footer */}
      <div className="text-center py-10 relative z-10">
        <Link href="/lobby" className="font-body text-sm transition-colors" style={{color: 'rgba(244,232,208,0.2)'}}>
          return to the lobby
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
    </motion.div>
  );
}
