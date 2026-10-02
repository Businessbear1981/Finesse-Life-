import {redirect} from 'next/navigation';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';
import {buildReport, clampDays, sinceFor, type Bucket, type DailyRow} from '@/lib/ai-usage-report';

export const dynamic = 'force-dynamic';

const fmt = new Intl.NumberFormat('en-US');
const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;
const RANGES = [7, 30, 90] as const;

function Table({title, rows}: {title: string; rows: Bucket[]}) {
  return (
    <section className="mt-10">
      <h2 className="font-[family-name:var(--font-playfair)] italic text-2xl text-brass">{title}</h2>
      <div className="mt-3 overflow-x-auto rounded border border-brass/30">
        <table className="w-full text-sm">
          <thead className="text-left text-brass-highlight/80">
            <tr>
              <th className="p-2">Name</th><th className="p-2 text-right">Calls</th><th className="p-2 text-right">Failed</th>
              <th className="p-2 text-right">Input</th><th className="p-2 text-right">Output</th><th className="p-2 text-right">Cache read</th>
              <th className="p-2 text-right">Total</th><th className="p-2 text-right">Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="p-2 opacity-60" colSpan={8}>No calls recorded in this range.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-brass/15">
                <td className="p-2 font-mono">{r.key}</td>
                <td className="p-2 text-right">{fmt.format(r.calls)}</td>
                <td className="p-2 text-right">{fmt.format(r.failures)}</td>
                <td className="p-2 text-right">{fmt.format(r.inputTokens)}</td>
                <td className="p-2 text-right">{fmt.format(r.outputTokens)}</td>
                <td className="p-2 text-right">{fmt.format(r.cacheReadTokens)}</td>
                <td className="p-2 text-right">{fmt.format(r.totalTokens)}</td>
                <td className="p-2 text-right">{usd(r.estCostUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AiUsagePage({searchParams}: {searchParams: Promise<{days?: string}>}) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const {data: profile} = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return (
      <main className="p-8 bg-ink text-brass-highlight min-h-screen">
        <h1 className="text-2xl">403</h1>
        <p className="opacity-70">Only admins can view AI usage.</p>
      </main>
    );
  }

  const days = clampDays((await searchParams).days ?? null);
  const since = sinceFor(days);
  const {data, error} = await createServiceClient()
    .from('ai_usage_daily')
    .select('day, feature, model, calls, failures, input_tokens, output_tokens, cache_read_tokens, total_tokens, est_cost_micros')
    .gte('day', since)
    .order('day', {ascending: true})
    .limit(20_000);

  const report = buildReport((data ?? []) as DailyRow[], since, days);
  const peak = Math.max(1, ...report.byDay.map((d) => d.totalTokens));

  return (
    <main className="min-h-screen bg-ink text-brass-highlight p-6 md:p-10">
      <p className="font-mono text-xs tracking-[0.3em] text-brass/70">SETTINGS · THE LEDGER</p>
      <h1 className="font-[family-name:var(--font-playfair)] italic text-4xl text-brass mt-2">AI token usage</h1>
      <p className="mt-2 text-sm opacity-70 max-w-2xl">
        Counts come from the model provider on every call. Costs are estimates from list prices; the provider invoice is the
        source of truth. No prompts or replies are stored here.
      </p>

      <nav className="mt-6 flex gap-3 text-sm">
        {RANGES.map((d) => (
          <Link key={d} href={`/settings/ai-usage?days=${d}`}
            className={`px-3 py-1 rounded border ${d === days ? 'border-brass bg-brass/15' : 'border-brass/30 opacity-70'}`}>
            {d} days
          </Link>
        ))}
      </nav>

      {error && <p className="mt-6 text-neon-pink">Usage ledger unavailable. Has migration 20261005_ai_usage_events.sql been applied?</p>}

      <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Calls', fmt.format(report.totals.calls)],
          ['Total tokens', fmt.format(report.totals.totalTokens)],
          ['Est. cost', usd(report.totals.estCostUsd)],
          ['Failed calls', fmt.format(report.totals.failures)],
        ].map(([k, v]) => (
          <div key={k} className="rounded border border-brass/30 p-4">
            <div className="text-xs font-mono tracking-widest text-brass/70">{k}</div>
            <div className="mt-1 text-2xl">{v}</div>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-playfair)] italic text-2xl text-brass">By day</h2>
        <div className="mt-4 flex items-end gap-1 h-40" aria-label="Tokens per day">
          {report.byDay.map((d) => (
            <div key={d.key} title={`${d.key}: ${fmt.format(d.totalTokens)} tokens · ${usd(d.estCostUsd)}`}
              className="flex-1 bg-brass/70 rounded-t" style={{height: `${Math.max(2, (d.totalTokens / peak) * 100)}%`}} />
          ))}
        </div>
      </section>

      <Table title="By feature" rows={report.byFeature} />
      <Table title="By model" rows={report.byModel} />
      {report.unpricedModels.length > 0 && (
        <p className="mt-4 text-sm text-neon-pink">No price on file for: {report.unpricedModels.join(', ')} — set AI_PRICING_JSON.</p>
      )}
    </main>
  );
}
