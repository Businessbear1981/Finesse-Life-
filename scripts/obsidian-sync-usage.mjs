#!/usr/bin/env node
// Pull AI token usage from the live app and write it into an Obsidian vault.
//
//   AI_USAGE_EXPORT_TOKEN=... OBSIDIAN_VAULT="C:/Users/you/Obsidian/Finesse" \
//     node scripts/obsidian-sync-usage.mjs [--days 30] [--base https://finesselife.vip]
//
// Writes:  <vault>/Token Usage/App/YYYY-MM-DD.md   (one note per day, Dataview frontmatter)
//          <vault>/Token Usage/App/_latest.md       (range summary, by feature + model)
// Only counts and estimated cost leave the app — never prompts, replies, or member ids.

import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const token = process.env.AI_USAGE_EXPORT_TOKEN;
const vault = process.env.OBSIDIAN_VAULT;
const base = flag('base', process.env.FINESSE_BASE_URL ?? 'https://finesselife.vip').replace(/\/+$/, '');
const days = Math.min(Math.max(Number.parseInt(flag('days', '30'), 10) || 30, 1), 365);

if (!token || token.length < 32) {
  console.error('Set AI_USAGE_EXPORT_TOKEN (the same >= 32-char value configured in Vercel).');
  process.exit(1);
}
if (!vault) {
  console.error('Set OBSIDIAN_VAULT to the folder of your Obsidian vault.');
  process.exit(1);
}
if (!base.startsWith('https://') && !base.startsWith('http://localhost')) {
  console.error('Refusing to send the export token over a non-HTTPS URL.');
  process.exit(1);
}

const res = await fetch(`${base}/api/admin/ai-usage?days=${days}`, {
  headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'},
  redirect: 'error',
});
if (!res.ok) {
  console.error(`Export failed: HTTP ${res.status}`);
  process.exit(1);
}
const report = await res.json();

const dir = path.join(vault, 'Token Usage', 'App');
await mkdir(dir, {recursive: true});

const n = (x) => Number(x ?? 0);
const yaml = (o) => Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`).join('\n');
const table = (rows) => [
  '| Name | Calls | Failed | Input | Output | Cache read | Total | Est. cost |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...rows.map((r) => `| \`${r.key}\` | ${n(r.calls)} | ${n(r.failures)} | ${n(r.inputTokens)} | ${n(r.outputTokens)} | ${n(r.cacheReadTokens)} | ${n(r.totalTokens)} | $${n(r.estCostUsd).toFixed(4)} |`),
].join('\n');

let written = 0;
for (const d of report.byDay ?? []) {
  const body = `---\n${yaml({
    type: 'token-usage',
    source: 'app',
    date: d.key,
    calls: n(d.calls),
    failures: n(d.failures),
    input_tokens: n(d.inputTokens),
    output_tokens: n(d.outputTokens),
    cache_read_tokens: n(d.cacheReadTokens),
    total_tokens: n(d.totalTokens),
    est_cost_usd: n(d.estCostUsd),
    synced_at: new Date().toISOString(),
  })}\ntags: [token-usage, app]\n---\n\n# App AI usage — ${d.key}\n\nSynced from \`${base}\`. Cost is an estimate from list prices.\n`;
  await writeFile(path.join(dir, `${d.key}.md`), body, 'utf8');
  written++;
}

const t = report.totals ?? {};
const latest = `---\n${yaml({type: 'token-usage-summary', source: 'app', since: report.range?.since ?? '', days, total_tokens: n(t.totalTokens), est_cost_usd: n(t.estCostUsd), synced_at: new Date().toISOString()})}\n---\n\n# App AI usage — last ${days} days\n\n**${n(t.calls)} calls · ${n(t.totalTokens).toLocaleString('en-US')} tokens · est. $${n(t.estCostUsd).toFixed(2)}** (${n(t.failures)} failed)\n\n## By feature\n\n${table(report.byFeature ?? [])}\n\n## By model\n\n${table(report.byModel ?? [])}\n${(report.unpricedModels ?? []).length ? `\n> [!warning] No price on file for: ${report.unpricedModels.join(', ')}\n` : ''}`;
await writeFile(path.join(dir, '_latest.md'), latest, 'utf8');

console.log(`Wrote ${written} daily notes + _latest.md to ${dir}`);
